// =====================================================================
// Resolver v2 — pipeline unifié pour toutes les actions (rôles & objets).
//
// Une action est décrite par : { category, timing, source, preconditions,
// effet }. Le resolver :
//   1. Lit toutes les intentions tour=N, resolved_at IS NULL, category!=NULL
//      (les lignes legacy sans category sont IGNORÉES — pas de double effet).
//   2. Re-vérifie les préconditions LIVE (cible vivante, possession objet,
//      statut bloqué).
//   3. Trie par layer puis created_at.
//   4. Applique couche par couche : PROTECT/CURE → ATTACK → CASCADE.
//   5. Écrit `resolution` + `resolved_at` sur chaque ligne, décrémente les
//      objets consommables, met à jour `player_statuses`.
//
// Le vote (L4) reste piloté par le flux de vote existant — il n'est pas
// résolu ici.
// =====================================================================
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { notify, notifyMJ } from "./notify";
import { getMeta, type RoleMeta } from "./roleMeta";

type RoleActionRow = Database["public"]["Tables"]["role_actions"]["Row"];
type PlayerRow = Database["public"]["Tables"]["players"]["Row"];

export type IntentCategory =
  | "ATTACK"
  | "PROTECT"
  | "CURE"
  | "INVESTIGATE"
  | "BLOCK"
  | "FALSIFY"
  | "CASCADE"
  | "TRANSFER"
  | "CONVERT"
  | "META";

export type IntentTiming = "INSTANT" | "ANTICIPATED" | "DEFERRED";

const LAYER_BY_CATEGORY: Record<IntentCategory, number> = {
  PROTECT: 1,
  CURE: 1,
  ATTACK: 2,
  CASCADE: 3,
  // Conversion vampire : APRÈS les attaques (layer 2) → si le Vampire meurt ce
  // tour (ex. Chasseur), sa morsure est annulée par l'applier (le kill prime).
  CONVERT: 3,
  // Hors batch deferred : les autres ne sont pas résolus par cette boucle.
  INVESTIGATE: 99,
  BLOCK: 99,
  FALSIFY: 99,
  TRANSFER: 99,
  META: 99,
};

export interface SubmitIntentInput {
  gameId: string;
  tour: number;
  phase: Database["public"]["Tables"]["role_actions"]["Row"]["phase"];
  actorId: string;
  targetId?: string | null;
  targetId2?: string | null;
  category: IntentCategory;
  timing: IntentTiming;
  source: string; // ex: "role:tueur", "item:fiole_mort"
  itemId?: string | null; // ligne inventory associée si applicable
  preconditions?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}

/**
 * Pose une intention dans `role_actions`. AUCUN effet immédiat — l'effet
 * réel est appliqué par `resolveDeferredIntents()` à la prochaine
 * Annonce (ou au clic pour les INSTANT, hors scope de ce batch).
 */
export async function submitIntent(input: SubmitIntentInput): Promise<string> {
  const layer = LAYER_BY_CATEGORY[input.category];
  const { data, error } = await supabase
    .from("role_actions")
    .insert({
      game_id: input.gameId,
      tour: input.tour,
      phase: input.phase,
      actor_player_id: input.actorId,
      target_player_id: input.targetId ?? null,
      target_player_id_2: input.targetId2 ?? null,
      category: input.category,
      timing: input.timing,
      source: input.source,
      item_id: input.itemId ?? null,
      preconditions: (input.preconditions ?? {}) as never,
      payload: (input.payload ?? {}) as never,
      layer,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

// ─────────────── Statut helpers ───────────────
async function setStatus(opts: {
  gameId: string;
  playerId: string;
  statusSlug: string;
  source: string;
  fromTour: number;
  untilTour?: number | null;
  payload?: Record<string, unknown>;
}) {
  await supabase.from("player_statuses").insert({
    game_id: opts.gameId,
    player_id: opts.playerId,
    status_slug: opts.statusSlug,
    source: opts.source,
    active_from_tour: opts.fromTour,
    active_until_tour: opts.untilTour ?? null,
    payload: (opts.payload ?? {}) as never,
  });
}

async function decrementCharge(itemId: string | null | undefined): Promise<void> {
  if (!itemId) return;
  const { data } = await supabase.from("inventory").select("charges").eq("id", itemId).single();
  const c = (data as { charges: number | null } | null)?.charges;
  if (c == null) return; // non consommable
  const next = Math.max(0, c - 1);
  if (next === 0) {
    await supabase.from("inventory").delete().eq("id", itemId);
  } else {
    await supabase
      .from("inventory")
      .update({ charges: next, updated_at: new Date().toISOString() })
      .eq("id", itemId);
  }
}

// Dénouement joueur (message + ton fiable) à partir de la résolution différée.
// Copie non-genrée. Renvoie null pour les catégories sans retour joueur dédié.
function deferredPlayerResult(
  cat: IntentCategory,
  status: string,
): { summary: string; outcome: "success" | "fail" | "info" } | null {
  if (cat === "ATTACK") {
    // On confirme la mort (déjà publique via les annonces) mais on ne révèle PAS
    // le mécanisme de survie (protection) — ce serait une fuite d'info de jeu.
    if (status === "applied")
      return { summary: "Attaque réussie — ta cible n'a pas survécu.", outcome: "success" };
    if (status === "protected")
      return { summary: "Échec : ta cible a survécu à ton attaque.", outcome: "fail" };
    return { summary: "Ton attaque n'a pas pu aboutir ce tour.", outcome: "fail" };
  }
  if (cat === "PROTECT") {
    if (status === "applied")
      return { summary: "Protection posée sur ta cible ce tour.", outcome: "success" };
    return { summary: "Ta protection n'a pas pu se poser.", outcome: "fail" };
  }
  if (cat === "CURE") {
    if (status === "applied") return { summary: "Soin appliqué sur ta cible.", outcome: "success" };
    return { summary: "Le soin n'a pas pu être appliqué.", outcome: "fail" };
  }
  if (cat === "CASCADE") {
    // Malédiction de l'Empoisonneur (non létale).
    if (status === "applied") return { summary: "Ta cible a été empoisonnée.", outcome: "success" };
    if (status === "protected")
      return { summary: "Échec : ta cible était protégée.", outcome: "fail" };
    return { summary: "Ta malédiction n'a pas pu aboutir ce tour.", outcome: "fail" };
  }
  return null;
}

async function writeResolution(
  intentId: string,
  resolution: Record<string, unknown>,
  result?: Record<string, unknown>,
): Promise<void> {
  await supabase
    .from("role_actions")
    .update({
      resolved_at: new Date().toISOString(),
      resolution: resolution as never,
      ...(result ? { result: result as never } : {}),
    })
    .eq("id", intentId);
}

// La carte « Résultat » du joueur affiche la DERNIÈRE action du tour. Pour un
// rôle différé, l'intention (ATTACK) et la ligne de log sont 2 lignes distinctes ;
// le resolver met à jour l'intention, mais la carte lit le log (plus récent). On
// recopie donc le dénouement sur la dernière action du joueur ce tour-là.
async function applyResultToLatestAction(
  gameId: string,
  actorId: string,
  tour: number,
  result: Record<string, unknown>,
): Promise<void> {
  const { data: latest } = await supabase
    .from("role_actions")
    .select("id")
    .eq("game_id", gameId)
    .eq("actor_player_id", actorId)
    .eq("tour", tour)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const id = (latest as { id: string } | null)?.id;
  if (id)
    await supabase
      .from("role_actions")
      .update({ result: result as never })
      .eq("id", id);
}

// ─────────────── Préconditions LIVE ───────────────
async function checkPreconditions(
  intent: RoleActionRow,
  alivePlayers: Map<string, PlayerRow>,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const actor = alivePlayers.get(intent.actor_player_id);
  if (!actor) return { ok: false, reason: "actor_dead" };
  if (actor.is_imprisoned) return { ok: false, reason: "actor_imprisoned" };

  // Blocage : si l'acteur est blocked/blackmailed pour ce tour ET la source est
  // un rôle (pas un objet), on annule. Le blocage NE touche PAS les objets.
  const m = getMeta(actor);
  const isRoleSource = (intent.source ?? "").startsWith("role:");
  const isItemSource = (intent.source ?? "").startsWith("item:");
  if (isRoleSource) {
    const blockedUntil = m.blocked_until_cycle ?? -1;
    const blockedFrom = m.blocked_from_cycle ?? -Infinity;
    const blackmailUntil = m.blackmail_until_cycle ?? -1;
    const blackmailFrom = m.blackmail_from_cycle ?? -Infinity;
    if (blockedUntil >= intent.tour && blockedFrom <= intent.tour)
      return { ok: false, reason: "blocked" };
    if (blackmailUntil >= intent.tour && blackmailFrom <= intent.tour)
      return { ok: false, reason: "blackmailed" };
  }

  // Cible vivante (si nécessaire pour la catégorie)
  if (intent.target_player_id) {
    const tgt = alivePlayers.get(intent.target_player_id);
    if (!tgt) return { ok: false, reason: "target_dead" };
  }

  // Possession objet (si l'intent vient d'un objet)
  if (isItemSource && intent.item_id) {
    const { data } = await supabase
      .from("inventory")
      .select("id, holder_player_id, charges")
      .eq("id", intent.item_id)
      .maybeSingle();
    const inv = data as { id: string; holder_player_id: string; charges: number | null } | null;
    if (!inv) return { ok: false, reason: "item_missing" };
    if (inv.holder_player_id !== intent.actor_player_id)
      return { ok: false, reason: "item_transferred" };
    if (inv.charges != null && inv.charges <= 0) return { ok: false, reason: "item_empty" };
  }

  return { ok: true };
}

// ─────────────── Appliers par catégorie ───────────────
async function applyProtect(intent: RoleActionRow): Promise<Record<string, unknown>> {
  const targetId = intent.target_player_id;
  if (!targetId) return { status: "cancelled", reason: "no_target" };
  // Pose le bouclier pour ce tour ET le tour suivant (un tour complet de protection).
  // Le Saint protège plus longtemps : 2 tours complets.
  const isSaint = intent.source === "role:saint";
  const shieldUntil = intent.tour + (isSaint ? 2 : 1);
  const { data: tgt } = await supabase
    .from("players")
    .select("role_meta")
    .eq("id", targetId)
    .single();
  const m = getMeta(tgt);
  const nextMeta: RoleMeta = { ...m, protected_until_cycle: shieldUntil };
  // Majordome : flag `guarded_by` pour activer la riposte (cible épargnée, tueur + majordome meurent).
  if (intent.source === "role:majordome") {
    nextMeta.guarded_by = intent.actor_player_id;
    nextMeta.guarded_by_cycle = intent.tour;
  }
  // Aubergiste (lot 1) : tag la cible hébergée → si une attaque est bloquée
  // pendant la fenêtre de protection, l'Aubergiste apprend qu'on a frappé (jamais qui).
  if (intent.source === "role:aubergiste") {
    nextMeta.innkeeper_by = intent.actor_player_id;
    nextMeta.innkeeper_by_cycle = intent.tour;
  }
  await supabase
    .from("players")
    .update({
      role_meta: nextMeta as never,
    })
    .eq("id", targetId);
  await setStatus({
    gameId: intent.game_id,
    playerId: targetId,
    statusSlug: "protected",
    source: intent.source ?? "unknown",
    fromTour: intent.tour,
    untilTour: shieldUntil,
  });
  await decrementCharge(intent.item_id);
  return { status: "applied", effect: "protect", target: targetId };
}

async function applyCure(intent: RoleActionRow): Promise<Record<string, unknown>> {
  const targetId = intent.target_player_id;
  if (!targetId) return { status: "cancelled", reason: "no_target" };
  const { data: tgt } = await supabase
    .from("players")
    .select("role_meta")
    .eq("id", targetId)
    .single();
  const m = getMeta(tgt);
  // Nettoie poison + pose protection ce tour et le suivant (un tour complet).
  const shieldUntil = intent.tour + 1;
  await supabase
    .from("players")
    .update({
      role_meta: {
        ...m,
        poison_resolves_cycle: null,
        poisoned: false,
        protected_until_cycle: shieldUntil,
      } as never,
    })
    .eq("id", targetId);
  await setStatus({
    gameId: intent.game_id,
    playerId: targetId,
    statusSlug: "protected",
    source: intent.source ?? "unknown",
    fromTour: intent.tour,
    untilTour: shieldUntil,
  });
  await decrementCharge(intent.item_id);
  return { status: "applied", effect: "cure", target: targetId };
}

async function applyAttack(
  intent: RoleActionRow,
  killer: (
    gameId: string,
    playerId: string,
    reason: string,
    attackerId?: string,
    extra?: Record<string, unknown>,
  ) => Promise<boolean>,
): Promise<Record<string, unknown>> {
  const targetId = intent.target_player_id;
  if (!targetId) return { status: "cancelled", reason: "no_target" };
  // Re-check protection LIVE (un PROTECT vient d'être appliqué dans la même couche précédente).
  const { data: tgt } = await supabase
    .from("players")
    .select("role_meta, is_alive, role_slug, pseudo")
    .eq("id", targetId)
    .single();
  const tRow = tgt as {
    role_meta: Record<string, unknown>;
    is_alive: boolean;
    role_slug: string | null;
    pseudo: string;
  } | null;
  if (!tRow || !tRow.is_alive) {
    await decrementCharge(intent.item_id); // fiole utilisée même si rate
    return { status: "cancelled", reason: "target_dead" };
  }
  const tMeta = getMeta(tRow);

  // ── Riposte du Garde-chasse (lot 2) : si la cible est PATROUILLÉE ce tour,
  // l'attaquant meurt — que l'attaque aboutisse, soit bloquée ou parée. La
  // cible n'est jamais sauvée par la patrouille elle-même. Garde-chasse mort ou
  // condamné ce tour → pas de riposte (symétrie « acteur mort → effet annulé »).
  const ripostePatrol = async (): Promise<void> => {
    const gcId = tMeta.patrolled_by;
    if (typeof gcId !== "string" || gcId.length === 0) return;
    if ((tMeta.patrolled_by_cycle ?? -1) !== intent.tour) return;
    if (gcId === intent.actor_player_id) return; // il ne s'embusque pas lui-même
    const { data: gcRow } = await supabase
      .from("players")
      .select("is_alive, role_meta, pseudo")
      .eq("id", gcId)
      .single();
    const gc = gcRow as { is_alive: boolean; role_meta: unknown; pseudo: string } | null;
    if (!gc?.is_alive || getMeta(gc as { role_meta?: unknown }).pending_death) return;
    await killer(intent.game_id, intent.actor_player_id, "garde_chasse", gcId);
    await notify({
      gameId: intent.game_id,
      playerId: gcId,
      type: "patrol_riposte",
      title: "🌲 Ta patrouille a frappé",
      body: `Quelqu'un s'en est pris à ${tRow.pseudo} — tu l'as abattu sur place.`,
      mjTitle: "🌲 Garde-chasse",
      mjBody: `${gc.pseudo} (Garde-chasse) abat l'attaquant de ${tRow.pseudo}.`,
    });
  };

  // ── Parade du Bretteur (lot 2) : garde levée CE tour → l'attaque échoue ET
  // l'attaquant est embroché. La balle perforante du Franc-tireur (payload.pierce)
  // passe outre la parade — l'acier ne pare pas le plomb.
  const intentPayload = (intent.payload as Record<string, unknown> | null) ?? {};
  const pierce = intentPayload.pierce === true;
  if (
    !pierce &&
    tRow.role_slug === "bretteur" &&
    (tMeta.bretteur_guard_cycle ?? -1) === intent.tour
  ) {
    await decrementCharge(intent.item_id);
    await killer(intent.game_id, intent.actor_player_id, "bretteur_parade", targetId);
    await notify({
      gameId: intent.game_id,
      playerId: targetId,
      type: "bretteur_parry",
      title: "🤺 Parade !",
      body: "On est venu pour toi cette nuit — ta lame a répondu. L'attaquant est mort.",
      mjTitle: "🤺 Bretteur",
      mjBody: `${tRow.pseudo} (Bretteur) pare l'attaque (${intent.source ?? "?"}) et embroche l'attaquant.`,
    });
    await ripostePatrol();
    return { status: "protected", reason: "bretteur_parade" };
  }

  const prot = tMeta.protected_until_cycle ?? -1;
  const blessedUntil = tMeta.blessed_until_cycle ?? -1;
  const isBlessed = tMeta.blessed_by_saint === true && blessedUntil >= intent.tour;
  // Balle perforante (lot 3) : ignore boucliers, bénédiction ET le sacrifice du
  // Majordome (la protection ne se déclenche pas — la cible meurt, le Majordome
  // survit sans riposter). Décision actée docs/NOUVEAUX_ROLES.md §11.
  if (!pierce && (prot >= intent.tour || isBlessed)) {
    await decrementCharge(intent.item_id); // fiole consommée même si protégée
    // MJ-only : la cible ne doit pas savoir qu'elle a été protégée.
    await notifyMJ({
      gameId: intent.game_id,
      type: "shielded",
      title: "🛡️ Attaque bloquée",
      body: `${(intent.payload as Record<string, unknown> | null)?.target_pseudo ?? "Cible"} a été attaqué (${intent.source ?? "?"}) mais une protection l'a sauvé.`,
    });
    // Aubergiste (lot 1) : sa chambre vient d'encaisser une attaque → il apprend
    // qu'on a frappé à la porte (jamais QUI, jamais quelle arme). Fenêtre = même
    // durée que la protection standard (tour de pose + le suivant).
    const innkeeperId = tMeta.innkeeper_by;
    const innkeeperCycle = tMeta.innkeeper_by_cycle ?? -1;
    if (typeof innkeeperId === "string" && innkeeperId.length > 0 && intent.tour <= innkeeperCycle + 1) {
      await notify({
        gameId: intent.game_id,
        playerId: innkeeperId,
        type: "innkeeper_knock",
        title: "🏨 On a frappé à la porte",
        body: `Quelqu'un s'en est pris à ${tRow.pseudo} cette nuit — la chambre a tenu bon.`,
        mjTitle: "🏨 Aubergiste",
        mjBody: `La chambre de l'Aubergiste a bloqué une attaque sur ${tRow.pseudo} (${intent.source ?? "?"}).`,
      });
    }
    // Si la cible est bénite et l'attaque vient d'une source hostile, notifie le Saint avec auteur.
    const saintId = tMeta.blessed_by_saint_id;
    if (isBlessed && saintId) {
      const { data: attackerRow } = await supabase
        .from("players")
        .select("pseudo")
        .eq("id", intent.actor_player_id)
        .maybeSingle();
      const attackerPseudo = (attackerRow as { pseudo: string } | null)?.pseudo ?? "?";
      const targetPseudo =
        (intent.payload as Record<string, unknown> | null)?.target_pseudo ?? "ta cible";
      await notify({
        gameId: intent.game_id,
        playerId: saintId,
        type: "saint_block_log",
        title: "✨ Bénédiction active",
        body: `${attackerPseudo} a tenté une attaque (${intent.source ?? "?"}) sur ${targetPseudo} — annulée.`,
        payload: {
          actor_id: intent.actor_player_id,
          actor_pseudo: attackerPseudo,
          target_id: targetId,
          target_pseudo: targetPseudo,
          action: intent.source ?? "attaque",
          tour: intent.tour,
        },
      });
      await notify({
        gameId: intent.game_id,
        playerId: intent.actor_player_id,
        type: "saint_block",
        title: "✨ Cible bénie",
        body: `${targetPseudo} est sous bénédiction — ton action ne fonctionne pas.`,
      });
    }
    // Majordome trade : si l'attaque provient d'une mécanique méchante (Tueur,
    // Croque-mitaine, couteau d'origine méchante) et que la cible est protégée
    // par le Majordome (`guarded_by`), alors le Majordome ET l'attaquant meurent.
    const guardedBy = tMeta.guarded_by;
    const payloadAttack = (intent.payload as Record<string, unknown> | null) ?? {};
    const isMechantAttack =
      intent.source === "role:tueur" ||
      intent.source === "role:croque_mitaine" ||
      payloadAttack.mechant_mechanic === true;
    if (isMechantAttack && typeof guardedBy === "string" && guardedBy.length > 0) {
      await killer(intent.game_id, guardedBy, "majordome_trade", intent.actor_player_id);
      await killer(intent.game_id, intent.actor_player_id, "majordome_riposte", guardedBy);
      return {
        status: "protected",
        reason: "majordome_trade",
        guard: guardedBy,
        killer: intent.actor_player_id,
      };
    }
    // Patrouille : l'attaquant est abattu même si sa cible était protégée.
    await ripostePatrol();
    return { status: "protected", reason: isBlessed ? "blessed" : "shield" };
  }

  // ⚠️ Poison LÉTAL différé (fiole de l'apothicaire). La malédiction NON-létale
  // de l'Empoisonneur ne passe PLUS ici : elle est résolue en couche CASCADE
  // (layer 3, voir applyPoison) pour respecter la protection ET être annulée si
  // l'Empoisonneur meurt ce tour — symétrie avec la morsure du Vampire (CONVERT).
  const subEffect = (intent.payload as Record<string, unknown> | null)?.sub_effect;
  if (subEffect === "poison_delayed") {
    const cur = tMeta;
    const delay = Number((intent.payload as Record<string, unknown> | null)?.delay ?? 1);
    const resolvesAt = intent.tour + Math.max(1, delay);
    await supabase
      .from("players")
      .update({
        role_meta: { ...cur, poison_resolves_cycle: resolvesAt } as never,
      })
      .eq("id", targetId);
    await decrementCharge(intent.item_id);
    return {
      status: "applied",
      effect: "poison_delayed",
      target: targetId,
      resolves_at: resolvesAt,
    };
  }
  // Chat du Manoir (lot 1) : une vie. La PREMIÈRE attaque qui le vise est
  // absorbée (après les protections classiques — un bouclier posé sur le chat
  // épargne sa vie de réserve). Le tour est mémorisé : l'onglet Annonces en
  // tire l'annonce publique anonyme « un miaulement dans la nuit ».
  // La balle perforante du Franc-tireur (payload.pierce) « perce tout » (décision
  // Jason, docs §11) : elle traverse aussi la vie de réserve → le Chat meurt sans
  // la consommer. Cohérence avec bénédiction/bouclier/Majordome déjà percés.
  if (!pierce && tRow.role_slug === "chat_du_manoir" && tMeta.chat_life_used !== true) {
    await supabase
      .from("players")
      .update({
        role_meta: {
          ...tMeta,
          chat_life_used: true,
          chat_life_lost_cycle: intent.tour,
        } as never,
      })
      .eq("id", targetId);
    await decrementCharge(intent.item_id); // l'arme est consommée : elle a « touché »
    await notify({
      gameId: intent.game_id,
      playerId: targetId,
      type: "chat_life_lost",
      title: "😾 Une vie de moins",
      body: "On a tenté de te tuer cette nuit. Tu retombes sur tes pattes — c'était ta seule vie de réserve.",
      mjTitle: "🐈 Chat du Manoir",
      mjBody: `${tRow.pseudo} (Chat du Manoir) absorbe une attaque (${intent.source ?? "?"}) — vie consommée.`,
    });
    // Pour l'attaquant : même retour que « protégé » (aucune fuite du mécanisme).
    await ripostePatrol();
    return { status: "protected", reason: "chat_life" };
  }

  // Kill direct (Tueur, fiole_mort, marionnette forcée).
  const payload = (intent.payload as Record<string, unknown> | null) ?? {};
  const reason =
    (payload.kill_reason as string | undefined) ??
    (intent.source?.startsWith("item:")
      ? intent.source.replace("item:", "")
      : (intent.source?.replace("role:", "") ?? "engine"));
  // Notifications puppet (marionnettiste/puppet) avant le kill.
  if (payload.puppet === true) {
    const puppeteerId = payload.puppeteer_id as string | undefined;
    const { data: tgtP } = await supabase
      .from("players")
      .select("pseudo")
      .eq("id", targetId)
      .single();
    const tgtPseudo = (tgtP as { pseudo: string } | null)?.pseudo ?? "?";
    await notify({
      gameId: intent.game_id,
      playerId: intent.actor_player_id,
      type: "puppet_forced",
      title: "🎭 Tu as été manipulé",
      body: `Tu as frappé ${tgtPseudo} sans le vouloir.`,
      mjTitle: "🎭 Marionnette",
      mjBody: `${payload.puppet_pseudo ?? "?"} (manipulé) frappe ${tgtPseudo}.`,
    });
    if (puppeteerId) {
      await notify({
        gameId: intent.game_id,
        playerId: puppeteerId,
        type: "puppet_mirror",
        title: "🎭 Reflet de la marionnette",
        body: `${payload.puppet_pseudo ?? "?"} a frappé ${tgtPseudo}.`,
      });
    }
  }
  const weaponFromSlug = (payload.weapon_from_slug as string | null | undefined) ?? null;
  const ok = await killer(
    intent.game_id,
    targetId,
    reason,
    intent.actor_player_id,
    weaponFromSlug ? { weapon_from_slug: weaponFromSlug } : undefined,
  );
  await decrementCharge(intent.item_id);
  if (ok) await ripostePatrol();
  // ── Pyromane (lot 5) : chaque mort par le feu nourrit sa victoire (barème
  // scalé lu par evaluateWin). Compté ICI, à la résolution — une cible protégée
  // ou sauvée ne compte pas.
  if (ok && intent.source === "role:pyromane") {
    const { data: pyRow } = await supabase
      .from("players")
      .select("id, role_meta")
      .eq("id", intent.actor_player_id)
      .single();
    const py = pyRow as { id: string; role_meta: unknown } | null;
    if (py) {
      const pm = getMeta(py as { role_meta?: unknown });
      await supabase
        .from("players")
        .update({ role_meta: { ...pm, pyro_kills: (pm.pyro_kills ?? 0) + 1 } as never })
        .eq("id", py.id);
    }
  }
  // ── Poltergeist (lot 4) : la victime est morte d'un objet déplacé depuis
  // l'au-delà → le fantôme tient sa co-victoire (drapeau lu par winConditions).
  if (ok && payload.polt_moved === true) {
    const { data: poltRow } = await supabase
      .from("players")
      .select("id, pseudo, role_meta")
      .eq("game_id", intent.game_id)
      .eq("role_slug", "poltergeist")
      .maybeSingle();
    const polt = poltRow as { id: string; pseudo: string; role_meta: unknown } | null;
    if (polt) {
      const pm = getMeta(polt as { role_meta?: unknown });
      await supabase
        .from("players")
        .update({ role_meta: { ...pm, polt_win: true } as never })
        .eq("id", polt.id);
      await notify({
        gameId: intent.game_id,
        playerId: polt.id,
        type: "polt_win",
        title: "👻 L'objet a frappé",
        body: "Un objet que tu as déplacé vient de tuer. Ta hantise est accomplie — victoire assurée à la fin.",
        mjTitle: "👻 Poltergeist",
        mjBody: `${polt.pseudo} (Poltergeist) : un objet déplacé a tué — co-victoire acquise.`,
      });
    }
  }
  // ── Détrousseur (lot 3) : le kill emporte le butin — dernier objet reçu, ou
  // TOUT l'inventaire en mode braquage (payload.loot = "all"). Transfert direct
  // de méta à méta ; les objets gardent leur nature, marqués « reçus de » la victime.
  if (ok && intent.source === "role:detrousseur") {
    const lootMode = payload.loot === "all" ? "all" : "last";
    const { data: vRow } = await supabase
      .from("players")
      .select("role_meta, pseudo")
      .eq("id", targetId)
      .single();
    const vMetaAll = ((vRow as { role_meta: unknown } | null)?.role_meta ?? {}) as Record<
      string,
      unknown
    >;
    const vInv = (vMetaAll.inventory as Array<Record<string, unknown>> | undefined) ?? [];
    const lootable = vInv.filter((it) => it.consumed !== true);
    if (lootable.length > 0) {
      const taken = lootMode === "all" ? lootable : [lootable[0]];
      const keep = vInv.filter((it) => !taken.includes(it));
      await supabase
        .from("players")
        .update({ role_meta: { ...vMetaAll, inventory: keep } as never })
        .eq("id", targetId);
      const { data: aRow } = await supabase
        .from("players")
        .select("role_meta")
        .eq("id", intent.actor_player_id)
        .single();
      const aMetaAll = ((aRow as { role_meta: unknown } | null)?.role_meta ?? {}) as Record<
        string,
        unknown
      >;
      const aInv = (aMetaAll.inventory as Array<Record<string, unknown>> | undefined) ?? [];
      const vPseudo = (vRow as { pseudo: string } | null)?.pseudo ?? "?";
      const stamped = taken.map((it) => ({
        ...it,
        received_from: vPseudo,
        received_at: new Date().toISOString(),
      }));
      await supabase
        .from("players")
        .update({
          role_meta: { ...aMetaAll, inventory: [...stamped, ...aInv] } as never,
        })
        .eq("id", intent.actor_player_id);
      await notify({
        gameId: intent.game_id,
        playerId: intent.actor_player_id,
        type: "detrousse_loot",
        title: lootMode === "all" ? "💰 Braquage complet" : "💰 Butin empoché",
        body:
          lootMode === "all"
            ? `Tu rafles toute la malle de ${vPseudo} (${stamped.length} objet(s)).`
            : `Tu empoches le dernier objet de ${vPseudo}.`,
        mjTitle: "💰 Détrousseur",
        mjBody: `Le Détrousseur pille ${vPseudo} (${stamped.length} objet(s), mode ${lootMode}).`,
      });
    }
  }
  return { status: ok ? "applied" : "cancelled", effect: "kill", target: targetId, reason };
}

// ─────────────── Conversion vampire (CONVERT, layer 3) ───────────────
// La morsure du Vampire est différée : elle se résout APRÈS les attaques.
// Si le Vampire a été tué dans CE même batch (ex. par le Chasseur en layer 2),
// la conversion est annulée — le kill prime. On relit donc `is_alive` du Vampire
// en LIVE (le snapshot `alive` du batch ne reflète pas un kill intra-batch),
// exactement comme `applyAttack` relit sa cible.
async function applyConvert(
  intent: RoleActionRow,
  converter: (
    gameId: string,
    vampireId: string,
    targetId: string,
    tour: number,
  ) => Promise<boolean>,
): Promise<Record<string, unknown>> {
  const targetId = intent.target_player_id;
  if (!targetId) return { status: "cancelled", reason: "no_target" };
  const { data: actorRow } = await supabase
    .from("players")
    .select("is_alive, role_meta")
    .eq("id", intent.actor_player_id)
    .single();
  const actor = actorRow as { is_alive: boolean; role_meta: Record<string, unknown> } | null;
  // « Le kill prime » : un Vampire tué CE tour n'infecte pas. Le kill peut être
  // IMMÉDIAT (is_alive déjà false) OU DIFFÉRÉ — condamné par l'Exécuteur en
  // Enquête, il garde is_alive=true jusqu'au flush qui suit ce resolver, mais
  // porte déjà `pending_death`. Sans ce second test, un Vampire condamné mordait
  // quand même (audit 2026-07-16).
  if (!actor?.is_alive || getMeta(actor).pending_death) {
    return { status: "cancelled", reason: "biter_killed" };
  }
  const { data: tgtRow } = await supabase
    .from("players")
    .select("is_alive, role_meta")
    .eq("id", targetId)
    .single();
  const tRow = tgtRow as { is_alive: boolean; role_meta: Record<string, unknown> } | null;
  if (!tRow?.is_alive) {
    return { status: "cancelled", reason: "target_dead" };
  }
  // Symétrie avec le poison (applyPoison) : une cible PROTÉGÉE (bouclier de l'Ange
  // Gardien) ou BÉNIE (Saint) n'est PAS convertie — le bouclier arrête aussi les
  // crocs. Décision design 2026-07-16 : cohérence protection ↔ morsure, annoncée
  // sur les cartes Vampire et Empoisonneur.
  const tMeta = getMeta(tRow);
  const prot = tMeta.protected_until_cycle ?? -1;
  const blessedUntil = tMeta.blessed_until_cycle ?? -1;
  const isBlessed = tMeta.blessed_by_saint === true && blessedUntil >= intent.tour;
  if (prot >= intent.tour || isBlessed) {
    await notifyMJ({
      gameId: intent.game_id,
      type: "shielded",
      title: "🛡️ Morsure bloquée",
      body: `${(intent.payload as Record<string, unknown> | null)?.target_pseudo ?? "Cible"} était protégé(e) — la conversion n'a pas pris.`,
    });
    return { status: "protected", reason: isBlessed ? "blessed" : "shield" };
  }
  const ok = await converter(intent.game_id, intent.actor_player_id, targetId, intent.tour);
  return { status: ok ? "applied" : "cancelled", effect: "convert", target: targetId };
}

// ─────────────── Empoisonnement (CASCADE, layer 3) ───────────────
// Malédiction NON-létale de l'Empoisonneur. Résolue APRÈS les attaques (layer 2) :
//   • si l'Empoisonneur a été tué ce tour, la malédiction est annulée (symétrie
//     avec la morsure du Vampire — on relit `is_alive` en LIVE) ;
//   • une cible protégée/bénite est immunisée (le poison ne se pose pas).
async function applyPoison(intent: RoleActionRow): Promise<Record<string, unknown>> {
  const targetId = intent.target_player_id;
  if (!targetId) return { status: "cancelled", reason: "no_target" };
  // Empoisonneur mort ce tour → malédiction annulée. Kill immédiat (is_alive
  // false) OU différé (condamné par l'Exécuteur en Enquête → `pending_death` posé
  // avant le flush qui suit ce resolver) : les deux annulent (audit 2026-07-16).
  const { data: actorRow } = await supabase
    .from("players")
    .select("is_alive, role_meta")
    .eq("id", intent.actor_player_id)
    .single();
  const actor = actorRow as { is_alive: boolean; role_meta: Record<string, unknown> } | null;
  if (!actor?.is_alive || getMeta(actor).pending_death) {
    return { status: "cancelled", reason: "poisoner_killed" };
  }
  const { data: tgt } = await supabase
    .from("players")
    .select("role_meta, is_alive")
    .eq("id", targetId)
    .single();
  const tRow = tgt as { role_meta: Record<string, unknown>; is_alive: boolean } | null;
  if (!tRow || !tRow.is_alive) return { status: "cancelled", reason: "target_dead" };
  const tMeta = getMeta(tRow);
  const prot = tMeta.protected_until_cycle ?? -1;
  const blessedUntil = tMeta.blessed_until_cycle ?? -1;
  const isBlessed = tMeta.blessed_by_saint === true && blessedUntil >= intent.tour;
  if (prot >= intent.tour || isBlessed) {
    await notifyMJ({
      gameId: intent.game_id,
      type: "shielded",
      title: "🛡️ Empoisonnement bloqué",
      body: `${(intent.payload as Record<string, unknown> | null)?.target_pseudo ?? "Cible"} était protégé(e) — la malédiction n'a pas pris.`,
    });
    return { status: "protected", reason: isBlessed ? "blessed" : "shield" };
  }
  const cur = tMeta;
  await supabase
    .from("players")
    .update({
      role_meta: {
        ...cur,
        poisoned: true,
        poisoned_by: intent.actor_player_id,
        poisoned_at_cycle: intent.tour,
      } as never,
    })
    .eq("id", targetId);
  await setStatus({
    gameId: intent.game_id,
    playerId: targetId,
    statusSlug: "poisoned",
    source: intent.source ?? "unknown",
    fromTour: intent.tour,
    untilTour: null,
  });
  return { status: "applied", effect: "poison_curse", target: targetId };
}

// ─────────────── Cleaner pré-traitement ───────────────
async function preprocessCleaner(
  gameId: string,
  intents: RoleActionRow[],
  alive: Map<string, PlayerRow>,
): Promise<void> {
  // 1) Cherche un Cleaner vivant qui a armé son effaçage.
  const { data: cleanersRows } = await supabase
    .from("players")
    .select("*")
    .eq("game_id", gameId)
    .eq("role_slug", "cleaner")
    .eq("is_alive", true);
  const cleaners = (cleanersRows ?? []) as PlayerRow[];
  const armed = cleaners.find((c) => getMeta(c).clean_armed === true);
  if (!armed) return;

  // 2) Calcule les uses restantes (1 si <10 joueurs, 2 si ≥10).
  const { count } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true })
    .eq("game_id", gameId)
    .eq("is_mj", false);
  const maxUses = (count ?? 0) >= 10 ? 2 : 1;
  const cleanerMeta = getMeta(armed);
  const usesMap = { ...(cleanerMeta.uses ?? {}) };
  const usedSoFar = usesMap["cleaner"] ?? 0;
  const remaining = Math.max(0, maxUses - usedSoFar);
  if (remaining <= 0) {
    // Plus d'uses : on désarme silencieusement.
    await supabase
      .from("players")
      .update({
        role_meta: { ...cleanerMeta, clean_armed: false } as never,
      })
      .eq("id", armed.id);
    return;
  }

  // 3) Filtre les ATTACK éligibles (mechant_mechanic === true), cible vivante.
  const eligible = intents.filter((i) => {
    if (i.category !== "ATTACK") return false;
    if (!i.target_player_id) return false;
    if (!alive.has(i.target_player_id)) return false;
    const p = (i.payload ?? {}) as Record<string, unknown>;
    return p.mechant_mechanic === true;
  });
  if (eligible.length === 0) return;

  // 4) Choisit aléatoirement min(remaining, eligible.length) intents à nettoyer.
  //    Si plusieurs intents visent la même cible, on dédoublonne par target.
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  const picked: RoleActionRow[] = [];
  const seenTargets = new Set<string>();
  for (const it of shuffled) {
    if (picked.length >= remaining) break;
    const tid = it.target_player_id!;
    if (seenTargets.has(tid)) continue;
    seenTargets.add(tid);
    picked.push(it);
  }

  // 5) Pour chaque cible choisie, pose `cleaned: true` sur la meta, notifie le Cleaner.
  for (const it of picked) {
    const tid = it.target_player_id!;
    const tgt = alive.get(tid)!;
    const tMeta = getMeta(tgt);
    await supabase
      .from("players")
      .update({
        role_meta: { ...tMeta, cleaned: true } as never,
      })
      .eq("id", tid);
    await notify({
      gameId,
      playerId: armed.id,
      type: "clean_done",
      title: "🧹 Corps nettoyé",
      body: `${tgt.pseudo} a été éliminé — l'identité a été effacée.`,
      mjTitle: "🧹 Cleaner",
      mjBody: `${armed.pseudo} (Cleaner) efface la mort de ${tgt.pseudo} — aucune annonce publique.`,
    });
  }

  // 6) Met à jour les uses + désarme le Cleaner.
  usesMap["cleaner"] = usedSoFar + picked.length;
  await supabase
    .from("players")
    .update({
      role_meta: { ...cleanerMeta, clean_armed: false, uses: usesMap } as never,
    })
    .eq("id", armed.id);
}

export async function resolveDeferredIntents(
  gameId: string,
  tour: number,
  killer: (
    gameId: string,
    playerId: string,
    reason: string,
    attackerId?: string,
    extra?: Record<string, unknown>,
  ) => Promise<boolean>,
  converter: (
    gameId: string,
    vampireId: string,
    targetId: string,
    tour: number,
  ) => Promise<boolean>,
): Promise<{ resolved: number; applied: number; protected: number; cancelled: number }> {
  // Lit TOUTES les intentions différées non résolues des tours ≤ courant.
  // Une protection posée au gathering du T1 (intent.tour=1) doit être résolue
  // au gathering du T2 (current_tour=2) pour couvrir les attaques du T2.
  // Les couches (PROTECT=1 → ATTACK=2 → CASCADE=3) garantissent l'ordre intra-batch.
  const { data: rows } = await supabase
    .from("role_actions")
    .select("*")
    .eq("game_id", gameId)
    .lte("tour", tour)
    .is("resolved_at", null)
    .not("category", "is", null)
    .eq("timing", "DEFERRED")
    .order("tour", { ascending: true })
    .order("layer", { ascending: true })
    .order("created_at", { ascending: true });

  const intents = (rows ?? []) as RoleActionRow[];
  if (intents.length === 0) return { resolved: 0, applied: 0, protected: 0, cancelled: 0 };

  // Snapshot des joueurs vivants pour préconditions
  const { data: ps } = await supabase
    .from("players")
    .select("*")
    .eq("game_id", gameId)
    .eq("is_alive", true);
  const alive = new Map<string, PlayerRow>(((ps ?? []) as PlayerRow[]).map((p) => [p.id, p]));

  // ── Cleaner pré-traitement : sélectionne quelles morts méchantes seront nettoyées.
  // Règles :
  //   • Seules les attaques tagguées `mechant_mechanic: true` sont éligibles
  //     (Tueur, Croque-mitaine, couteau d'Armurier — pas Vengeur/Cuisinier).
  //   • Si plusieurs attaques éligibles et moins d'uses Cleaner restants, on
  //     choisit aléatoirement parmi les cibles éligibles.
  //   • Le flag `clean_armed` doit être actif sur un Cleaner vivant.
  await preprocessCleaner(gameId, intents, alive);

  let applied = 0,
    prot = 0,
    cancelled = 0;

  for (const intent of intents) {
    const cat = intent.category as IntentCategory | null;
    if (!cat) continue;
    const layer = LAYER_BY_CATEGORY[cat];
    if (layer >= 99) continue; // pas géré dans ce batch

    // Parieur tricheur : le statut « Perdant aux dés » est levé dès que l'attaque
    // différée est traitée ici (à l'annonce) — que la cible meure, soit protégée,
    // ou que l'intention soit annulée. Le statut ne survit pas à l'annonce N.
    if (cat === "ATTACK" && intent.source === "role:parieur_tricheur" && intent.target_player_id) {
      await supabase
        .from("player_statuses")
        .delete()
        .eq("game_id", gameId)
        .eq("player_id", intent.target_player_id)
        .eq("status_slug", "dice_loser");
    }

    const pre = await checkPreconditions(intent, alive);
    if (!pre.ok) {
      // Fioles : consommées même en cas d'échec de précondition d'attaque.
      if (cat === "ATTACK") await decrementCharge(intent.item_id);
      {
        const pr = deferredPlayerResult(cat, "cancelled");
        await writeResolution(
          intent.id,
          { status: "cancelled", reason: pre.reason },
          pr ?? undefined,
        );
        if (pr) await applyResultToLatestAction(gameId, intent.actor_player_id, intent.tour, pr);
      }
      cancelled++;
      continue;
    }

    let res: Record<string, unknown>;
    if (cat === "PROTECT") res = await applyProtect(intent);
    else if (cat === "CURE") res = await applyCure(intent);
    else if (cat === "ATTACK") res = await applyAttack(intent, killer);
    else if (cat === "CONVERT") res = await applyConvert(intent, converter);
    else if (cat === "CASCADE") res = await applyPoison(intent);
    else {
      res = { status: "cancelled", reason: "unsupported_category" };
    }

    {
      const pr = deferredPlayerResult(cat, res.status as string);
      await writeResolution(intent.id, res, pr ?? undefined);
      if (pr) await applyResultToLatestAction(gameId, intent.actor_player_id, intent.tour, pr);
    }
    if (res.status === "applied") applied++;
    else if (res.status === "protected") prot++;
    else cancelled++;
  }

  // Récap MJ
  await notifyMJ({
    gameId,
    type: "resolver_recap",
    title: `🧮 Résolution — TOUR ${tour}`,
    body: `${applied} appliquée(s) · ${prot} bloquée(s) par protection · ${cancelled} annulée(s).`,
    payload: { tour, applied, protected: prot, cancelled, total: intents.length },
  });

  return { resolved: intents.length, applied, protected: prot, cancelled };
}
