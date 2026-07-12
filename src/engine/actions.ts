// Pure engine actions. Single source of truth for mutations on a game.
// Both real player UI and Dev Sandbox call THESE. No parallel mock paths.
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { notify, notifyMJ } from "./notify";
import { checkAndEndGame } from "./winConditions";
import { submitIntent, resolveDeferredIntents } from "./resolver";
import { INTRO_S, VOTE_RESULT_S } from "@/lib/phaseTiming";
import { serverNow, serverNowISO } from "@/lib/serverTime";

export type Phase = "lobby" | "free" | "annonce" | "gathering" | "vote" | "ended";
export type RoleRow = Database["public"]["Tables"]["roles"]["Row"];
export type PlayerRow = Database["public"]["Tables"]["players"]["Row"];
export type GameRow = Database["public"]["Tables"]["games"]["Row"];

export type EngineEvent = {
  ts: number;
  kind: string;
  message: string;
  meta?: Record<string, unknown>;
};

type Listener = (e: EngineEvent) => void;
const listeners = new Set<Listener>();
export function onEngineEvent(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}
function emit(kind: string, message: string, meta?: Record<string, unknown>) {
  const e: EngineEvent = { ts: Date.now(), kind, message, meta };
  listeners.forEach((l) => l(e));
}

// ─────────────── role_meta helpers ───────────────
export type Meta = Record<string, unknown>;
const meta = (p: { role_meta: unknown } | null | undefined): Meta => (p?.role_meta ?? {}) as Meta;

// Réinitialise role_meta pour une nouvelle partie SANS perdre les choix
// cosmétiques du joueur (avatar choisi dans le salon). Sans ça, le tirage des
// rôles effaçait l'avatar → fallback par hash = "avatar aléatoire" au lancement.
function keepCosmeticMeta(rm: unknown): Meta {
  const av = (rm as Record<string, unknown> | null)?.avatar;
  return typeof av === "string" ? { avatar: av } : {};
}

async function patchMeta(playerId: string, patch: Meta) {
  const { data } = await supabase.from("players").select("role_meta").eq("id", playerId).single();
  const cur = meta(data as { role_meta: unknown });
  const next = { ...cur, ...patch };
  await supabase
    .from("players")
    .update({ role_meta: next as never })
    .eq("id", playerId);
  return next;
}

// ─────────────── Bénédiction du Saint ───────────────
/** Faction "hostile" pour les checks de bénédiction : Méchants + Neutres MAL/CHAOS. */
function isHostileFactionType(
  faction: string | null | undefined,
  type: string | null | undefined,
): boolean {
  if (faction === "Méchant") return true;
  if (faction === "Neutre" && (type === "MAL" || type === "CHAOS")) return true;
  return false;
}

const PHASE_IDX: Record<string, number> = { free: 0, annonce: 1, gathering: 2, vote: 3 };
function isBlessActive(targetMeta: Meta, tour: number, phase: string): boolean {
  if (targetMeta.blessed_by_saint !== true) return false;
  const until = (targetMeta.blessed_until_cycle as number | undefined) ?? -1;
  const untilPhase = (targetMeta.blessed_until_phase as string | undefined) ?? "vote";
  if (tour < until) return true;
  if (tour === until && (PHASE_IDX[phase] ?? 99) <= (PHASE_IDX[untilPhase] ?? -1)) return true;
  return false;
}

/**
 * Vérifie si une action hostile vers `target` doit être bloquée par la bénédiction.
 * Notifie le Saint (avec auteur + nature) et l'agresseur si bloquée.
 * Retourne true si l'action doit être annulée par l'appelant.
 */
export async function tryBlessingBlock(opts: {
  gameId: string;
  tour: number;
  phase: string;
  actor: { id: string; pseudo: string };
  actorRole:
    | { faction: string | null; secondary_type?: string | null }
    | { faction: string | null; type?: string | null };
  target: { id: string; pseudo: string; role_meta: unknown };
  actionLabel: string;
}): Promise<boolean> {
  // type field can be 'type' (game stored) or 'secondary_type'; here we use the role row's `type` (MAL/CHAOS marker is on neutre rows).
  const ar = opts.actorRole as { faction: string | null; type?: string | null };
  if (!isHostileFactionType(ar.faction, ar.type ?? null)) return false;
  const tm = meta({ role_meta: opts.target.role_meta });
  if (!isBlessActive(tm, opts.tour, opts.phase)) return false;
  const saintId = tm.blessed_by_saint_id as string | undefined;
  if (saintId) {
    await notify({
      gameId: opts.gameId,
      playerId: saintId,
      type: "saint_block_log",
      title: "✨ Bénédiction active",
      body: `${opts.actor.pseudo} a tenté « ${opts.actionLabel} » sur ${opts.target.pseudo} — action annulée.`,
      payload: {
        actor_id: opts.actor.id,
        actor_pseudo: opts.actor.pseudo,
        target_id: opts.target.id,
        target_pseudo: opts.target.pseudo,
        action: opts.actionLabel,
        tour: opts.tour,
        phase: opts.phase,
      },
    });
  }
  await notify({
    gameId: opts.gameId,
    playerId: opts.actor.id,
    type: "saint_block",
    title: "✨ Cible bénite",
    body: `${opts.target.pseudo} est sous bénédiction — ton action ne fonctionne pas.`,
  });
  return true;
}

export function usesOf(m: Meta, slug: string): number {
  const u = (m.uses ?? {}) as Record<string, number>;
  return u[slug] ?? 0;
}
function lastUseOf(m: Meta, slug: string): number {
  const l = (m.last_use ?? {}) as Record<string, number>;
  return l[slug] ?? -99;
}

/** Parse usage_label → max uses for the entire game. Returns Infinity if per-tour. */
export function parseTotalLimit(role: RoleRow, playerCount: number): number {
  const lbl = role.usage_label ?? "";
  // Cleaner : 1 charge < 10 joueurs, 2 charges à 10+ joueurs (spec).
  if (role.slug === "cleaner") return playerCount >= 10 ? 2 : 1;
  // Mouchard : 1×/partie active (capacité au lieu de l'auto-révélation au setup).
  if (role.slug === "mouchard") return 1;
  if (/1×\/partie/i.test(lbl)) return 1;
  const maxMatch = lbl.match(/max\s*(\d+)/i);
  if (maxMatch) return parseInt(maxMatch[1], 10);
  if (role.slug === "apothicaire") return 3;
  if (role.slug === "executeur" || role.slug === "juge") {
    if (playerCount <= 10) return 1;
    if (playerCount <= 13) return 2;
    return 3;
  }
  return Infinity;
}
function isPerCycle(role: RoleRow): boolean {
  // Couvre "1×/TOUR", "1×/Enquête", "1×/Débat" et — tant que la base n'est pas
  // migrée — les anciens libellés "phase libre"/"rassemblement".
  return /\/\s*(tour|phase\s*libre|rassemblement|enqu[eê]te|d[eé]bat)/i.test(
    role.usage_label ?? "",
  );
}
function cooldownCycles(role: RoleRow): number {
  const lbl = (role.usage_label ?? "") + " " + (role.capacite_full_text ?? "");
  const m = lbl.match(/cooldown\s*(\d+)/i);
  if (m) return parseInt(m[1], 10);
  if (/1×\s*\/\s*2\s*tours/i.test(role.usage_label ?? "")) return 2;
  if (role.slug === "marionnettiste") return 0;
  return 0;
}

/**
 * Rôles dont l'action programme un effet sur le PROCHAIN tour d'autrui.
 * Refonte boucle : ils se jouent désormais en ENQUÊTE (phase `free`) comme tous
 * les autres, mais leur effet (blocage / protection / marquage) ne tombe qu'au
 * tour suivant — conséquence directe : aucun ne peut bloquer/protéger au tour 1.
 * (Anciennement joués au Rassemblement ; le timing "tour+1" est porté par les
 * handlers eux-mêmes via `opts.tour + 1`, pas par la phase.)
 */
export const SCHEDULES_NEXT_TOUR = new Set<string>([
  "maitre_chanteur",
  "barman",
  "babysitter",
  "accusateur",
  "veuve_noire",
  "marionnettiste",
  "falsificateur",
]);

/**
 * Refonte boucle : TOUTES les capacités actives se jouent en ENQUÊTE (phase
 * `free`). Le Débat (`gathering`) ne porte plus aucune capacité active — c'est
 * une phase 100 % sociale. Cette fonction retourne donc toujours `{ free }`
 * pour tout rôle actif, ce qui verrouille l'usage hors Enquête côté UI/moteur.
 *
 * (Auparavant la phase était déduite du texte français "phase libre"/"rassemblement" ;
 * ce couplage est supprimé — l'unique phase d'action est l'Enquête. Les rôles à
 * effet différé — cf. SCHEDULES_NEXT_TOUR — se jouent aussi ici, leur effet
 * tombant au tour suivant.)
 */
export function allowedActivePhases(_role: RoleRow): Set<Phase> {
  return new Set<Phase>(["free"]);
}

/** Renvoie true si la cible est falsifiée (flag posé par le Falsificateur, permanent). */
function isFalsified(m: Meta): boolean {
  return m?.falsified === true;
}
const FALSIFIED_MSG = "Le joueur a été falsifié";

/**
 * Verdict binaire du Policier : « suspicieux » / « innocent » / « na ».
 * Source de vérité = texte du rôle Policier :
 *  - Les TUEURS Méchants sont MASQUÉS → non-suspects : Tueur, Croque-mitaine,
 *    Stratège ET Armurier (tout rôle faction Méchant + type TUEUR).
 *  - L'Usurpateur reste SUSPECT : son masquage ne trompe que les enquêtes qui
 *    révèlent un rôle (Assistant du détective, Mouchard), pas le verdict binaire.
 *  - Tous les autres acolytes Méchants, tous les Neutres, et les Civils Boulets → suspects.
 *  - Les autres Civils → non-suspects.
 *  - `override` (ex : Cuisinier ayant tué un Civil) est prioritaire.
 */
export function policierVerdict(
  role: RoleRow | undefined,
  override?: "suspicious" | "innocent",
): "suspicious" | "innocent" | "na" {
  if (override) return override;
  if (!role) return "na";
  if (role.faction === "Civil") return role.type === "BOULET" ? "suspicious" : "innocent";
  if (role.faction === "Neutre") return "suspicious";
  if (role.faction === "Méchant") {
    // Tous les tueurs Méchants sont camouflés ; les autres acolytes ressortent suspects.
    return role.type === "TUEUR" ? "innocent" : "suspicious";
  }
  return "na";
}

/** Nombre d'utilisations autorisées par tour pour les rôles "per cycle". */
function perCycleLimit(role: RoleRow): number {
  // Conservateur : ses 2 distributions de reliques se jouent désormais en Enquête
  // (auparavant 1× phase libre + 1× rassemblement) → 2×/tour, même phase.
  if (role.slug === "conservateur") return 2;
  const m = (role.usage_label ?? "").match(/(\d+)\s*×\s*\/\s*(tour|phase\s*libre|enqu[eê]te)/i);
  if (m) return parseInt(m[1], 10);
  return 1;
}

/** Returns null if usable, else reason. */
export function whyCannotUse(
  role: RoleRow,
  m: Meta,
  tour: number,
  playerCount: number,
  phase?: Phase,
): string | null {
  if (
    ((m.blackmail_until_cycle as number | undefined) ?? -1) >= tour &&
    ((m.blackmail_from_cycle as number | undefined) ?? -Infinity) <= tour
  )
    return "Sous chantage";
  if (
    ((m.blocked_until_cycle as number | undefined) ?? -1) >= tour &&
    ((m.blocked_from_cycle as number | undefined) ?? -Infinity) <= tour
  )
    return "Capacité bloquée";
  if (phase && !allowedActivePhases(role).has(phase)) {
    // Toutes les capacités actives se jouent en Enquête (phase `free`).
    return "À utiliser en Enquête";
  }
  const total = parseTotalLimit(role, playerCount);
  if (usesOf(m, role.slug) >= total) return "Capacité épuisée";
  const cd = cooldownCycles(role);
  if (cd > 0 && tour - lastUseOf(m, role.slug) < cd) return "En cooldown";
  if (isPerCycle(role)) {
    const limit = perCycleLimit(role);
    const counts = (m.used_cycle_count ?? {}) as Record<string, { tour: number; count: number }>;
    const entry = counts[role.slug];
    const usedNow = entry && entry.tour === tour ? entry.count : 0;
    if (usedNow >= limit)
      return limit > 1 ? `Déjà utilisé ${limit}× ce tour` : "Déjà utilisé ce tour";
  }
  return null;
}

async function markUsage(actor: PlayerRow, role: RoleRow, tour: number) {
  const m = meta(actor);
  const uses = { ...((m.uses ?? {}) as Record<string, number>) };
  uses[role.slug] = (uses[role.slug] ?? 0) + 1;
  const last_use = { ...((m.last_use ?? {}) as Record<string, number>) };
  last_use[role.slug] = tour;
  const used_cycle = { ...((m.used_cycle ?? {}) as Record<string, number>) };
  used_cycle[role.slug] = tour;
  const used_cycle_count = {
    ...((m.used_cycle_count ?? {}) as Record<string, { tour: number; count: number }>),
  };
  const prev = used_cycle_count[role.slug];
  used_cycle_count[role.slug] =
    prev && prev.tour === tour ? { tour, count: prev.count + 1 } : { tour, count: 1 };
  await patchMeta(actor.id, { uses, last_use, used_cycle, used_cycle_count });
}

// ─────────────── Role drawing ───────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Tirage pondéré : retire `count` rôles d'un pool, en respectant draw_weight (default 1).
function weightedDraw(pool: RoleRow[], count: number): RoleRow[] {
  const picked: RoleRow[] = [];
  const remaining = [...pool];
  for (let k = 0; k < count && remaining.length > 0; k++) {
    const total = remaining.reduce((s, r) => s + (Number(r.draw_weight ?? 1) || 0.0001), 0);
    let t = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < remaining.length; i++) {
      t -= Number(remaining[i].draw_weight ?? 1) || 0.0001;
      if (t <= 0) {
        idx = i;
        break;
      }
    }
    picked.push(remaining.splice(idx, 1)[0]);
  }
  return picked;
}

// Tire selon des quotas par type pour une faction donnée.
// Stratégie :
//   1) garantit les `min` de chaque type
//   2) puis remplit les slots restants en piochant aléatoirement parmi les types
//      qui ne sont pas saturés (≤ max)
function drawByQuotas(
  pool: RoleRow[],
  quotas: import("./constants").FactionQuotas,
  totalSlots: number,
  preCounted: Record<string, number> = {},
): RoleRow[] {
  const byType = new Map<string, RoleRow[]>();
  for (const r of pool) {
    const t = r.type ?? "AUTRE";
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t)!.push(r);
  }
  const picked: RoleRow[] = [];
  // Pré-compte les rôles MUST déjà placés (ex: base civile Assistant/Majordome) :
  // les quotas min/max deviennent des TOTAUX réels incluant cette base.
  const countByType: Record<string, number> = { ...preCounted };

  // 1) min par type (en tenant compte de la base déjà pré-comptée)
  for (const [type, q] of Object.entries(quotas)) {
    const bucket = byType.get(type) ?? [];
    const need = Math.min(
      Math.max(0, q.min - (countByType[type] ?? 0)),
      bucket.length,
      totalSlots - picked.length,
    );
    if (need <= 0) continue;
    const drawn = weightedDraw(bucket, need);
    picked.push(...drawn);
    countByType[type] = (countByType[type] ?? 0) + drawn.length;
    for (const r of drawn) {
      const i = bucket.indexOf(r);
      if (i >= 0) bucket.splice(i, 1);
    }
  }

  // 2) remplir les slots restants
  while (picked.length < totalSlots) {
    const candidates: RoleRow[] = [];
    for (const [type, bucket] of byType.entries()) {
      const q = quotas[type];
      const max = q?.max ?? 0; // types non listés = exclus (max 0)
      if ((countByType[type] ?? 0) >= max) continue;
      candidates.push(...bucket);
    }
    if (candidates.length === 0) break;
    const [r] = weightedDraw(candidates, 1);
    if (!r) break;
    picked.push(r);
    countByType[r.type ?? "AUTRE"] = (countByType[r.type ?? "AUTRE"] ?? 0) + 1;
    const bucket = byType.get(r.type ?? "AUTRE");
    if (bucket) {
      const i = bucket.indexOf(r);
      if (i >= 0) bucket.splice(i, 1);
    }
  }

  return picked;
}

// Tirage neutre : pour chaque slot, on choisit d'abord un TYPE selon
// `typeWeights`, puis un rôle dans ce type via `draw_weight`.
function drawNeutresByTypeWeights(
  pool: RoleRow[],
  count: number,
  typeWeights: Record<string, number>,
): RoleRow[] {
  const byType = new Map<string, RoleRow[]>();
  for (const r of pool) {
    const t = r.type ?? "AUTRE";
    if (!(t in typeWeights)) continue;
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t)!.push(r);
  }
  const picked: RoleRow[] = [];
  for (let k = 0; k < count; k++) {
    const availableTypes = [...byType.entries()].filter(([, b]) => b.length > 0);
    if (availableTypes.length === 0) break;
    const total = availableTypes.reduce((s, [t]) => s + (typeWeights[t] ?? 0), 0);
    if (total <= 0) break;
    let t = Math.random() * total;
    let chosenType = availableTypes[0][0];
    for (const [type] of availableTypes) {
      t -= typeWeights[type] ?? 0;
      if (t <= 0) {
        chosenType = type;
        break;
      }
    }
    const bucket = byType.get(chosenType)!;
    const [r] = weightedDraw(bucket, 1);
    if (!r) break;
    picked.push(r);
    // Empêche le slot suivant de retirer un neutre du même TYPE :
    // on retire entièrement le bucket de ce type.
    byType.delete(chosenType);
  }

  return picked;
}

export async function drawRoles(
  playerCount: number,
  modeDetectivePlayer: boolean,
  bannedSlugs: string[] = [],
): Promise<string[]> {
  const { acolyteQuotasFor, civilQuotasFor, acolytesCountFor, neutresCountFor } =
    await import("./constants");

  const { data: rolesData, error } = await supabase
    .from("roles")
    .select("*")
    .eq("set_id", "set1")
    .eq("emergent", false)
    .eq("is_disabled", false);
  if (error) throw error;
  const roles = (rolesData ?? []) as RoleRow[];

  const banned = new Set(bannedSlugs);
  // Rôles MUST : jamais bannissables (Tueur principal + base Assistant/Majordome).
  banned.delete("tueur");
  banned.delete("majordome");
  banned.delete("assistant_du_detective");
  // Les rôles retirés/désactivés sont déjà exclus via `is_disabled` dans la
  // requête ci-dessus (source de vérité unique) — pas de liste en dur à maintenir.
  // Référence au paramètre conservé pour signature stable.
  void modeDetectivePlayer;

  const eligible = roles.filter((r) => (r.min_players ?? 6) <= playerCount && !banned.has(r.slug));

  const slugs: string[] = [];

  // ─── Tueur méchant principal (1 seul par partie, pondéré par draw_weight) ───
  // Le Tueur classique a un poids dominant ; Croque-mitaine / Armurier sont des alternatives plus rares.
  const tueurs = eligible.filter((r) => r.type === "TUEUR" && r.faction === "Méchant");
  if (tueurs.length === 0) throw new Error("Aucun Tueur disponible (seed roles).");
  const [leTueur] = weightedDraw(tueurs, 1);
  slugs.push(leTueur.slug);

  // Assistant du Détective : MUST dans les deux modes (le Détective immortel n'existe plus).
  const assistant = roles.find((r) => r.slug === "assistant_du_detective");
  if (assistant && !slugs.includes(assistant.slug)) slugs.push(assistant.slug);

  const majordome = roles.find((r) => r.slug === "majordome");
  if (majordome && !slugs.includes(majordome.slug)) slugs.push(majordome.slug);

  // Exécuteur : plus MUST. C'est désormais un Civil/TUEUR ordinaire, tiré via les
  // quotas civils (il concourt avec Cuisinier/Vengeur pour le slot tueur civil).
  // Seuls Assistant du détective + Majordome restent la base 100% présente.

  // ─── Acolytes méchants (hors Tueur principal, jamais de TUEUR secondaire) ───
  const nAcolytes = acolytesCountFor(playerCount);
  const acolytePool = eligible.filter(
    (r) => r.faction === "Méchant" && r.type !== "TUEUR" && !slugs.includes(r.slug),
  );
  const acolytePicked = drawByQuotas(acolytePool, acolyteQuotasFor(playerCount), nAcolytes);
  slugs.push(...acolytePicked.map((r) => r.slug));

  // ─── Neutres (pondéré par type + par draw_weight) ───
  // Chasseur de Vampire est exclu du pool normal : il n'est tiré
  // qu'en couple avec le Vampire (voir plus bas).
  const nNeutres = neutresCountFor(playerCount);
  const { NEUTRE_TYPE_WEIGHTS } = await import("./constants");
  const neutresPool = eligible.filter(
    (r) => r.faction === "Neutre" && r.slug !== "chasseur_de_vampire" && !slugs.includes(r.slug),
  );
  const neutresPicked = drawNeutresByTypeWeights(neutresPool, nNeutres, NEUTRE_TYPE_WEIGHTS);
  const neutresSlugs = neutresPicked.map((r) => r.slug);

  // ─── Chasseur de Vampire : plus tiré au pool ───
  // Si le Vampire est présent, un civil est secrètement désigné « Chasseur
  // latent » au setup (applySetupEffects) ; il joue sa couverture civile et
  // s'éveille en Chasseur à la 1ère morsure (voir handler "vampire"). Il
  // n'occupe donc plus de slot visible au tirage.
  slugs.push(...neutresSlugs);

  // ─── Civils (avec quotas par type) ───
  const remaining = playerCount - slugs.length;
  const civilPool = eligible.filter((r) => r.faction === "Civil" && !slugs.includes(r.slug));
  // Pré-compte la base civile déjà placée (Assistant=INVESTIGATION, Majordome=PROTECTEUR)
  // pour que les civils tirés diversifient au lieu de doubler ces types.
  const baseCivilTypes: Record<string, number> = {};
  for (const s of slugs) {
    const r = roles.find((rr) => rr.slug === s);
    if (r?.faction === "Civil" && r.type)
      baseCivilTypes[r.type] = (baseCivilTypes[r.type] ?? 0) + 1;
  }
  const civilPicked = drawByQuotas(
    civilPool,
    civilQuotasFor(playerCount),
    remaining,
    baseCivilTypes,
  );
  const civilSlugs = civilPicked.map((r) => r.slug);
  slugs.push(...civilSlugs);

  // Filet de sécurité : si les quotas civils n'ont pas rempli tous les slots
  // (par ex. banissements importants), on complète avec n'importe quel civil.
  if (slugs.length < playerCount) {
    const fallback = civilPool.filter((r) => !slugs.includes(r.slug));
    slugs.push(...weightedDraw(fallback, playerCount - slugs.length).map((r) => r.slug));
  }

  return shuffle(slugs);
}

// ─────────────── Game lifecycle ───────────────

/**
 * Distribue les rôles sans démarrer la partie. Réutilisable depuis le menu démo
 * pour tester la génération à l'infini avant de cliquer sur "Lancer".
 */
export async function rollRoles(gameId: string): Promise<string[]> {
  const { data: g, error: gErr } = await supabase.from("games").select().eq("id", gameId).single();
  if (gErr) throw gErr;
  const game = g as GameRow;

  const { data: ps, error: pErr } = await supabase
    .from("players")
    .select()
    .eq("game_id", gameId)
    .order("joined_at", { ascending: true });
  if (pErr) throw pErr;
  const players = (ps ?? []) as PlayerRow[];

  // Le MJ classique (is_mj=true) est hors tirage : il pilote la partie sans rôle.
  // En Sans MJ : tous les joueurs (hôte inclus) tirent un rôle normal.
  const drawablePlayers = game.mode_detective_player ? players : players.filter((p) => !p.is_mj);
  const manuallyAssigned = drawablePlayers.filter((p) => p.role_slug);
  const unassigned = drawablePlayers.filter((p) => !p.role_slug);

  const bannedSlugs = (game as unknown as { banned_roles?: string[] }).banned_roles ?? [];
  // On bannit aussi les rôles déjà assignés manuellement pour éviter les doublons.
  const allBanned = [
    ...bannedSlugs,
    ...manuallyAssigned.map((p) => p.role_slug).filter((s): s is string => !!s),
  ];

  let drawnSlugs: string[] = [];
  if (unassigned.length > 0) {
    // ─── Branche pool_config : slots définis par le configurateur ───
    const { asPoolConfig } = await import("@/lib/poolConfig");
    const cfg = asPoolConfig((game as unknown as { pool_config?: unknown }).pool_config);
    if (cfg && cfg.slots.length > 0) {
      const { data: rolesData } = await supabase
        .from("roles")
        .select("*")
        .eq("set_id", "set1")
        .eq("emergent", false);
      const allRoles = (rolesData ?? []) as RoleRow[];
      const bannedSet = new Set(allBanned);
      // Base MUST jamais bannissable, même dans un pool configuré à la main
      // (parité avec drawRoles) : la base Assistant/Majordome + Tueur reste garantie.
      bannedSet.delete("tueur");
      bannedSet.delete("assistant_du_detective");
      bannedSet.delete("majordome");
      const usedSlugs = new Set<string>(manuallyAssigned.map((p) => p.role_slug as string));
      // Mélange les slots pour répartir aléatoirement entre les joueurs.
      const slots = shuffle([...cfg.slots]);
      const picked: string[] = [];
      // 1) Slots avec slug exact d'abord (priorité aux choix fermes du lead).
      for (const slot of slots) {
        if (picked.length >= unassigned.length) break;
        if (slot.slug && !usedSlugs.has(slot.slug) && !bannedSet.has(slot.slug)) {
          picked.push(slot.slug);
          usedSlugs.add(slot.slug);
        }
      }
      // 2) Slots auto : tirage pondéré dans le pool faction+type.
      const { expandSlotTypes } = await import("@/lib/poolConfig");
      for (const slot of slots) {
        if (picked.length >= unassigned.length) break;
        if (slot.slug) continue;
        const acceptedTypes = expandSlotTypes(slot.type);
        const pool = allRoles.filter(
          (r) =>
            r.faction === slot.faction &&
            acceptedTypes.includes(r.type) &&
            !usedSlugs.has(r.slug) &&
            !bannedSet.has(r.slug) &&
            (r.min_players ?? 6) <= unassigned.length,
        );
        const [chosen] = weightedDraw(pool, 1);
        if (chosen) {
          picked.push(chosen.slug);
          usedSlugs.add(chosen.slug);
        }
      }
      // 3) Filet : si encore manquant (moins de joueurs que prévu ou pool vide), fallback drawRoles.
      if (picked.length < unassigned.length) {
        const extra = await drawRoles(
          unassigned.length - picked.length,
          game.mode_detective_player,
          [...allBanned, ...picked],
        );
        picked.push(...extra);
      }
      drawnSlugs = shuffle(picked).slice(0, unassigned.length);
    } else {
      drawnSlugs = await drawRoles(unassigned.length, game.mode_detective_player, allBanned);
    }
    for (let i = 0; i < unassigned.length; i++) {
      await supabase
        .from("players")
        .update({
          role_slug: drawnSlugs[i],
          is_alive: true,
          is_imprisoned: false,
          role_meta: keepCosmeticMeta(unassigned[i].role_meta) as never,
        })
        .eq("id", unassigned[i].id);
    }
  }
  // Pour les joueurs déjà assignés manuellement : on garantit l'état initial propre.
  for (const p of manuallyAssigned) {
    await supabase
      .from("players")
      .update({
        is_alive: true,
        is_imprisoned: false,
        role_meta: keepCosmeticMeta(p.role_meta) as never,
      })
      .eq("id", p.id);
  }
  emit(
    "roll",
    `🎲 Rôles tirés — ${drawablePlayers.length} joueurs (${manuallyAssigned.length} manuels)`,
    { gameId, slugs: drawnSlugs },
  );
  return drawnSlugs;
}

export async function startGame(gameId: string) {
  const { data: g, error: gErr } = await supabase.from("games").select().eq("id", gameId).single();
  if (gErr) throw gErr;
  const game = g as GameRow;

  const { data: ps, error: pErr } = await supabase
    .from("players")
    .select()
    .eq("game_id", gameId)
    .order("joined_at", { ascending: true });
  if (pErr) throw pErr;
  const players = (ps ?? []) as PlayerRow[];

  const drawablePlayers = game.mode_detective_player ? players : players.filter((p) => !p.is_mj);

  // Si tous les joueurs ont déjà un rôle (via rollRoles ou attribution manuelle), on ne re-tire pas.
  const allHaveRole = drawablePlayers.length > 0 && drawablePlayers.every((p) => !!p.role_slug);
  if (!allHaveRole) {
    await rollRoles(gameId);
  }

  const freeDur = await phaseDurationFor(gameId, "free");
  // Salle d'attente : la partie est ARMÉE (rôles distribués) mais PAS encore
  // démarrée. On NE tamponne PAS le chrono ici — `started_at` et
  // `phase_started_at` restent nuls tant que tout le monde n'est pas entré.
  // La bascule vers `in_progress` + l'armement du chrono se font atomiquement
  // dans `beginGame`, déclenchable par n'importe quel client (voir PlayerShell)
  // pour ne plus dépendre de la présence d'un host connecté.
  await supabase
    .from("games")
    .update({
      status: "awaiting_players",
      current_phase: "free",
      current_tour: 1,
      started_at: null,
      phase_started_at: null,
      phase_duration_s: freeDur,
    })
    .eq("id", gameId);

  await applySetupEffects(gameId);
  emit("game_started", `Rôles distribués — en attente des joueurs (${drawablePlayers.length})`, {
    gameId,
  });
}

/**
 * Bascule « salle d'attente → partie en cours ». Appelée dès que tous les
 * joueurs humains sont entrés (revealed_at). ATOMIQUE et IDEMPOTENTE : la garde
 * `.eq("status", "awaiting_players")` fait que seul le premier appelant arme le
 * chrono ; les autres clients qui la déclenchent en même temps ne matchent
 * aucune ligne. Le compte à rebours de l'Enquête part donc à la seconde EXACTE
 * où la partie commence réellement — plus de temps grignoté pendant l'attente,
 * plus de dépendance à un host connecté.
 * @returns true si CE client a effectué la bascule.
 */
export async function beginGame(gameId: string): Promise<boolean> {
  const { data } = await supabase
    .from("games")
    .update({
      status: "in_progress",
      started_at: new Date().toISOString(),
      phase_started_at: serverNowISO(),
    })
    .eq("id", gameId)
    .eq("status", "awaiting_players")
    .select("id");
  const flipped = (data ?? []).length > 0;
  if (flipped) emit("game_begin", "Partie commencée — tout le monde est entré", { gameId });
  return flipped;
}

// Default per-phase durations in seconds. Can be overridden per-game at creation.
export const PHASE_DURATIONS: Record<Phase, number> = {
  lobby: 0,
  free: 180,
  annonce: 10,
  gathering: 180,
  vote: 30,
  ended: 0,
};

/** Lit la durée custom d'une phase pour une partie, fallback sur PHASE_DURATIONS. */
async function phaseDurationFor(gameId: string, phase: Phase): Promise<number> {
  if (phase === "lobby" || phase === "ended") return 0;
  const { data } = await supabase
    .from("games")
    .select("phase_duration_free_s, phase_duration_gathering_s, phase_duration_vote_s")
    .eq("id", gameId)
    .maybeSingle();
  const row = (data ?? {}) as {
    phase_duration_free_s: number | null;
    phase_duration_gathering_s: number | null;
    phase_duration_vote_s: number | null;
  };
  if (phase === "free") return row.phase_duration_free_s ?? PHASE_DURATIONS.free;
  if (phase === "gathering") return row.phase_duration_gathering_s ?? PHASE_DURATIONS.gathering;
  if (phase === "vote") return row.phase_duration_vote_s ?? PHASE_DURATIONS.vote;
  return PHASE_DURATIONS[phase];
}

/** Effects to apply once at game start. */
async function applySetupEffects(gameId: string) {
  const { data: ps } = await supabase.from("players").select().eq("game_id", gameId);
  const { data: rs } = await supabase.from("roles").select().eq("set_id", "set1");
  const players = (ps ?? []) as PlayerRow[];
  const rolesBySlug = new Map<string, RoleRow>();
  for (const r of (rs ?? []) as RoleRow[]) rolesBySlug.set(r.slug, r);
  const alive = players.filter((p) => p.is_alive && !p.is_mj);
  const ofSlug = (s: string) => alive.find((p) => p.role_slug === s);
  const allSlugs = new Set(alive.map((p) => p.role_slug ?? ""));

  // Reporte une info passive de setup dans role_actions (tour 1, phase free) afin
  // qu'elle apparaisse dans le bandeau "Dernier résultat" et l'onglet Historique.
  const logSetup = async (
    actorId: string,
    summary: string,
    opts?: { targetId?: string | null; target2Id?: string | null; effect?: string },
  ) => {
    await supabase.from("role_actions").insert({
      game_id: gameId,
      actor_player_id: actorId,
      tour: 1,
      phase: "free",
      target_player_id: opts?.targetId ?? null,
      target_player_id_2: opts?.target2Id ?? null,
      payload: { effect: opts?.effect ?? "setup_info", setup: true } as never,
      result: { summary } as never,
    });
  };

  // ── Indices : objets distribués au setup pour relancer l'Enquête. ──
  // Info TOUJOURS VRAIE sur la compo (voir src/engine/indices.ts), distribution
  // aveugle à la faction. Le type « fragmenté » coupe une info en 2 moitiés
  // (recollées à la table, IRL — aucune fusion codée).
  {
    const { grantItem, buildItem } = await import("./items");
    const { distributeIndices } = await import("./indices");
    const grants = distributeIndices(alive, rolesBySlug);
    for (const g of grants) {
      await grantItem(
        g.playerId,
        buildItem("indice", {
          from: "Manoir",
          originFaction: "Système", // distribué par le jeu au setup, pas par un rôle

          nameOverride: g.name,
          descriptionOverride: g.text,
          iconOverride: g.icon,
          payload: { indice: true, fragment: g.fragment ?? false, half: g.half ?? null },
        }),
      );
      const who = alive.find((p) => p.id === g.playerId)?.pseudo ?? "?";
      await notify({
        gameId,
        playerId: g.playerId,
        type: "indice_setup",
        title: "🧩 Indice reçu",
        body: "Tu as reçu un indice. Consulte-le dans ton inventaire.",
        mjTitle: "🧩 Indice",
        mjBody: `${who} a reçu un indice${g.fragment ? " (fragment)" : ""}.`,
      });
      await logSetup(g.playerId, g.text, { effect: "indice_setup" });
    }
  }

  // Témoin → reconnaît 1 Civil aléatoire (jamais un Méchant).
  const temoin = ofSlug("temoin");
  if (temoin) {
    const civils = alive.filter((p) => {
      if (p.id === temoin.id) return false;
      const r = rolesBySlug.get(p.role_slug ?? "");
      return r?.faction === "Civil";
    });
    const pick = civils[Math.floor(Math.random() * civils.length)];
    if (pick) {
      const r = rolesBySlug.get(pick.role_slug ?? "");
      const body = `Tu reconnais ${pick.pseudo} : ${r?.icon ?? ""} ${r?.name_fr ?? ""}`;
      await notify({
        gameId,
        playerId: temoin.id,
        type: "temoin_reveal",
        title: "👁️ Témoin",
        body,
        mjTitle: "👁️ Témoin",
        mjBody: `${temoin.pseudo} reconnaît ${pick.pseudo} (${r?.icon ?? ""} ${r?.name_fr ?? ""}).`,
      });
      await logSetup(temoin.id, body, { targetId: pick.id, effect: "temoin_reveal" });
    }
  }

  // Chasseur de Vampire : PAS de pré-désignation. Il est choisi aléatoirement
  // à la 1ère morsure (résolue à l'Annonce) — voir applyVampireConversion.

  // Entremetteur → choix manuel à la 1ère Enquête. Pas d'auto-lien.
  const entremetteur = ofSlug("entremetteur");
  if (entremetteur) {
    await patchMeta(entremetteur.id, { pending_link_choice: true, linked_pair: null });
    await notify({
      gameId,
      playerId: entremetteur.id,
      type: "entremetteur_setup",
      title: "💞 Tisse tes liens",
      body: "À la 1ère Enquête, choisis 2 joueurs (autres que toi) à lier. Si l'un meurt, l'autre suit. Vous gagnez ensemble si le couple et toi survivez.",
      mjTitle: "💞 Entremetteur",
      mjBody: `${entremetteur.pseudo} (Entremetteur) doit lier 2 joueurs à la 1ère Enquête.`,
    });
    await logSetup(entremetteur.id, "Tu choisiras 2 joueurs à lier à la 1ère Enquête.", {
      effect: "entremetteur_pending",
    });
  }

  // Vengeur → propose 2 Civils au hasard (≠ Vengeur) : il en choisira 1 comme être
  // cher à la 1ère Enquête. Limite la fuite d'info (il sait que ces 2-là sont
  // Civils, sans cartographier toute la table comme avec une liste complète).
  const vengeur = ofSlug("vengeur");
  if (vengeur) {
    const civils = alive.filter((p) => {
      if (p.id === vengeur.id) return false;
      return rolesBySlug.get(p.role_slug ?? "")?.faction === "Civil";
    });
    const choices = shuffle(civils)
      .slice(0, 2)
      .map((p) => p.id);
    const choiceNames = choices
      .map((id) => alive.find((p) => p.id === id)?.pseudo ?? "?")
      .join(" · ");
    await patchMeta(vengeur.id, {
      pending_beloved_choice: true,
      etre_cher: null,
      beloved_id: null,
      vengeur_choices: choices,
    });
    await notify({
      gameId,
      playerId: vengeur.id,
      type: "vengeur_setup",
      title: "🤍 Choisis ton être cher",
      body:
        choices.length >= 2
          ? `À la 1ère Enquête, choisis ton être cher parmi 2 Civils : ${choiceNames}. Tu sais donc que ces deux-là sont des Civils. S'il/elle meurt, tu recevras un couteau pour te venger.`
          : "À la 1ère Enquête, choisis ton être cher. S'il/elle meurt, tu recevras un couteau pour te venger.",
      mjTitle: "🤍 Vengeur",
      mjBody: `${vengeur.pseudo} (Vengeur) choisira son être cher parmi : ${choiceNames || "(aucun civil)"}.`,
    });
    await logSetup(
      vengeur.id,
      `Tu choisiras ton être cher${choiceNames ? ` parmi 2 Civils : ${choiceNames}` : ""} à la 1ère Enquête.`,
      { effect: "vengeur_pending" },
    );
  }

  // Usurpateur → 3 couvertures tirées au sort parmi rôles Citoyens absents.
  // Le joueur choisira sa cover à la 1ère Enquête via l'UI.
  const usurpateur = ofSlug("usurpateur");
  if (usurpateur) {
    const absent = shuffle(
      Array.from(rolesBySlug.values()).filter(
        (r) => !allSlugs.has(r.slug) && r.faction === "Civil" && !r.emergent,
      ),
    );
    const choices = absent.slice(0, 3).map((r) => r.slug);
    if (choices.length > 0) {
      await patchMeta(usurpateur.id, { cover_choices: choices });
      const labels = choices
        .map((s) => {
          const r = rolesBySlug.get(s);
          return `${r?.icon ?? ""} ${r?.name_fr ?? s}`;
        })
        .join(" · ");
      await notify({
        gameId,
        playerId: usurpateur.id,
        type: "cover_pending",
        title: "🎭 Choisis ta couverture",
        body: `À la prochaine Enquête : ${labels}`,
        mjTitle: "🎭 Usurpateur",
        mjBody: `${usurpateur.pseudo} (Usurpateur) doit choisir parmi : ${labels}.`,
      });
      await logSetup(
        usurpateur.id,
        `À la prochaine Enquête, choisis ta couverture parmi : ${labels}.`,
        { effect: "cover_pending" },
      );
    }
  }

  // Ange Gardien → cible révélée (1 vivant ≠ lui)
  const ange = ofSlug("ange_gardien");
  if (ange) {
    // Cible aléatoire OBLIGATOIREMENT civile (≠ Ange Gardien lui-même).
    const civils = alive.filter((p) => {
      if (p.id === ange.id) return false;
      const r = rolesBySlug.get(p.role_slug ?? "");
      return r?.faction === "Civil";
    });
    const tgt = civils[Math.floor(Math.random() * civils.length)];
    if (tgt) {
      const r = rolesBySlug.get(tgt.role_slug ?? "");
      await patchMeta(ange.id, { ward: tgt.id, protege_id: tgt.id, ward_pseudo: tgt.pseudo });
      await notify({
        gameId,
        playerId: ange.id,
        type: "ward",
        title: "🛡️ Ta cible",
        body: `Tu veilles sur ${tgt.pseudo}.`,
        mjTitle: "🛡️ Ange Gardien",
        mjBody: `${ange.pseudo} (Ange Gardien) surveille ${tgt.pseudo} (${r?.icon} ${r?.name_fr}).`,
      });
      await logSetup(ange.id, `Protégé : ${tgt.pseudo}.`, { targetId: tgt.id, effect: "ward" });
    }
  }

  // Paranoïaque → cible aléatoire (toutes factions confondues), à protéger OU tuer 1× dans la partie.
  const parano = ofSlug("paranoiaque");
  if (parano) {
    const others = alive.filter((p) => p.id !== parano.id);
    const tgt = others[Math.floor(Math.random() * others.length)];
    if (tgt) {
      await patchMeta(parano.id, {
        paranoid_target_id: tgt.id,
        paranoid_target_pseudo: tgt.pseudo,
      });
      const body = `Ta cible : ${tgt.pseudo}. À toi de deviner s'il est de ton côté. 1× dans la partie : protège-le ou tue-le.`;
      await notify({
        gameId,
        playerId: parano.id,
        type: "paranoid_target",
        title: "🎯 Ta cible",
        body,
        mjTitle: "🎯 Paranoïaque",
        mjBody: `${parano.pseudo} (Paranoïaque) surveille ${tgt.pseudo}.`,
      });
      await logSetup(parano.id, body, { targetId: tgt.id, effect: "paranoid_target" });
    }
  }

  // Mouchard → notif d'activation (capacité active en Enquête : choisir 1 joueur).
  const mouchard = ofSlug("mouchard");
  if (mouchard) {
    const body = "À la première Enquête, désigne 1 joueur : tu apprendras son rôle exact.";
    await notify({
      gameId,
      playerId: mouchard.id,
      type: "mouchard_setup",
      title: "📢 Mouchard",
      body,
      mjTitle: "📢 Mouchard",
      mjBody: `${mouchard.pseudo} (Mouchard) doit désigner 1 joueur en Enquête.`,
    });
    await logSetup(mouchard.id, body, { effect: "mouchard_setup" });
  }

  // Oracle → choisit une faction à prophétiser (gagne avec elle).
  const oracle = ofSlug("oracle");
  if (oracle) {
    const body =
      "À la première Enquête, prédis quelle faction (Civils, Méchants ou Neutres) remportera la partie. Tu gagneras avec elle si tu es en vie à la fin.";
    await notify({
      gameId,
      playerId: oracle.id,
      type: "oracle_setup",
      title: "🔮 Oracle",
      body,
      mjTitle: "🔮 Oracle",
      mjBody: `${oracle.pseudo} (Oracle) attend de lancer sa prophétie (faction à prédire).`,
    });
    await logSetup(oracle.id, body, { effect: "oracle_setup" });
  }

  // Stratège → tueur « embuscade ». Reçoit un couteau (kill immédiat) au setup,
  // et marque ses cibles via sa capacité (kill télégraphié) — voir Phase 2.

  // Veuve noire → notif d'activation. Pas de mariage auto au setup : elle choisit 2 cibles à chaque Enquête.
  const veuve = ofSlug("veuve_noire");
  if (veuve) {
    const body =
      "À chaque Enquête, choisis 2 cibles. Si l'une d'elles vote contre toi au vote suivant, les deux meurent à la prochaine Annonce.";
    await notify({
      gameId,
      playerId: veuve.id,
      type: "veuve_setup",
      title: "🕷️ Veuve noire",
      body,
      mjTitle: "🕷️ Veuve noire",
      mjBody: `${veuve.pseudo} (Veuve noire) prête à désigner ses cibles en Enquête.`,
    });
    await logSetup(veuve.id, body, { effect: "veuve_setup" });
  }

  // ── Phase 2 — Inventaires de départ ─────────────────────────────────────
  const { grantItem, buildItem } = await import("./items");

  // Cuisinier → reçoit un couteau d'office
  const cuisinier = ofSlug("cuisinier");
  if (cuisinier) {
    await grantItem(
      cuisinier.id,
      buildItem("couteau", {
        from: "Cuisine",
        originFaction: "Civil",
        nameOverride: "Couteau de cuisine",
        descriptionOverride: "Cible un joueur à tuer",
      }),
    );
  }

  // Stratège → tueur « embuscade » : reçoit un couteau (kill immédiat) + marque
  // ses cibles via sa capacité (kill télégraphié résolu un tour plus tard).
  const stratege = ofSlug("stratege");
  if (stratege) {
    await grantItem(
      stratege.id,
      buildItem("couteau", {
        from: "Stratège",
        originFaction: "Méchant",
        nameOverride: "Couteau du Stratège",
        descriptionOverride:
          "Ton arme. Frappe immédiatement une cible, ou utilise ta capacité pour la marquer (mort différée d'un tour).",
        payload: { mechant_origin: true },
      }),
    );
    const body =
      "Tu es le Stratège. Chaque Enquête, marque une cible (elle sera prévenue et mourra à l'Annonce du tour suivant), ou frappe immédiatement avec ton couteau.";
    await notify({
      gameId,
      playerId: stratege.id,
      type: "stratege_setup",
      title: "♟️ Stratège — éveillé",
      body,
      mjTitle: "♟️ Stratège",
      mjBody: `${stratege.pseudo} (Stratège) reçoit un couteau et peut marquer ses cibles.`,
    });
    await logSetup(stratege.id, body, { effect: "stratege_setup" });
  }

  // Apothicaire → reçoit 3 fioles en inventaire, tagguées `apo_own` (les siennes).
  // Elle peut soit les UTILISER elle-même depuis son Carnet (1 seule au maximum),
  // soit les OFFRIR via sa capacité (≥ 2 doivent être offertes). Le tag distingue
  // ses propres fioles des fioles qu'un joueur a reçues en cadeau (sans limite).
  const apo = ofSlug("apothicaire");
  if (apo) {
    await grantItem(
      apo.id,
      buildItem("fiole_vie", {
        from: "Apothicairerie",
        originFaction: "Civil",
        payload: { apo_own: true },
      }),
    );
    await grantItem(
      apo.id,
      buildItem("fiole_mort", {
        from: "Apothicairerie",
        originFaction: "Civil",
        payload: { apo_own: true },
      }),
    );
    await grantItem(
      apo.id,
      buildItem("fiole_clairvoyance", {
        from: "Apothicairerie",
        originFaction: "Civil",
        payload: { apo_own: true },
      }),
    );
  }

  // Conservateur → ne reçoit RIEN au setup. Il distribuera les reliques à d'autres
  // joueurs via sa capacité active (2×/Enquête). S'il distribue Le Cœur du
  // Manoir, la partie se termine immédiatement avec une victoire spéciale.
  const conserv = ofSlug("conservateur");
  if (conserv) {
    const body =
      "Deux fois par Enquête, désigne un joueur : il recevra une relique maudite au hasard. Tu gagnes si Le Cœur du Manoir est distribué.";
    await notify({
      gameId,
      playerId: conserv.id,
      type: "conservateur_setup",
      title: "🗝️ Conservateur — éveillé",
      body,
      mjTitle: "🗝️ Conservateur",
      mjBody: `${conserv.pseudo} (Conservateur) distribue des reliques aux autres joueurs.`,
    });
    await logSetup(conserv.id, body, { effect: "conservateur_setup" });
  }
}

export async function setPhase(gameId: string, phase: Phase, phaseStartedAt = serverNowISO()) {
  const dur = await phaseDurationFor(gameId, phase);
  await supabase
    .from("games")
    .update({
      current_phase: phase,
      phase_started_at: phaseStartedAt,
      phase_duration_s: dur,
    })
    .eq("id", gameId);
  emit("phase_change", `Phase → ${phase}`, { gameId, phase });
}

export async function nextCycle(gameId: string, phaseStartedAt = serverNowISO()) {
  // Resolve pending effects first (poisons, expirations)
  await resolveCycleTransition(gameId);
  const { data: g } = await supabase.from("games").select("current_tour").eq("id", gameId).single();
  const tour = ((g as { current_tour: number } | null)?.current_tour ?? 0) + 1;
  const freeDur = await phaseDurationFor(gameId, "free");
  await supabase
    .from("games")
    .update({
      current_tour: tour,
      current_phase: "free",
      phase_started_at: phaseStartedAt,
      phase_duration_s: freeDur,
    })
    .eq("id", gameId);
  emit("tour", `Tour ${tour}`, { gameId, tour });
  await checkAndEndGame(gameId);
}

/** Auto-tick appelé depuis les clients. Fait avancer la phase si la frontière
 *  est franchie. Peut être appelé par N'IMPORTE quel client au premier plan :
 *  un verrou SERVEUR (claim_phase_tick) garantit qu'un seul exécute réellement la
 *  transition. Plus de pilote unique élu qui gèle la partie s'il passe en veille. */
// Verrou local de ré-entrance (par onglet) : évite qu'un même client relance
// tickPhase pendant qu'il résout déjà. Le verrou SERVEUR (ci-dessous) couvre, lui,
// la concurrence INTER-clients — indispensable car sans lui un 2e/3e client
// lirait la MÊME phase expirée et relancerait tout le resolver → notifications en
// double/triple. Les deux se complètent : local = pas d'aller-retour inutile,
// serveur = correction.
const TICK_LOCK_TTL_MS = 30_000;
const _tickInFlight = new Map<string, number>();
const MAX_TICK_TRANSITIONS = 6;

/** Lecture seule : une transition est-elle due maintenant ? Pré-contrôle bon
 *  marché pour ne PAS solliciter le verrou serveur à chaque sondage de chaque
 *  client (seulement à l'approche d'une frontière de phase). */
async function phaseTickDue(gameId: string): Promise<boolean> {
  const { data: g } = await supabase
    .from("games")
    .select("phase_started_at, phase_duration_s, status, paused")
    .eq("id", gameId)
    .single();
  const game = g as {
    phase_started_at: string | null;
    phase_duration_s: number | null;
    status: string;
    paused?: boolean;
  } | null;
  if (!game || game.status === "ended" || game.paused) return false;
  if (!game.phase_started_at || !game.phase_duration_s) return false;
  const started = new Date(game.phase_started_at).getTime();
  // Le compteur ne démarre qu'après la frame d'intro (INTRO_S), comme dans la boucle.
  const elapsed = (serverNow() - started) / 1000 - INTRO_S;
  return elapsed >= game.phase_duration_s;
}

export async function tickPhase(gameId: string): Promise<void> {
  const now = Date.now();
  const lockedAt = _tickInFlight.get(gameId);
  if (lockedAt && now - lockedAt < TICK_LOCK_TTL_MS) return;
  _tickInFlight.set(gameId, now);
  try {
    // Rien à faire tant que la frontière n'est pas atteinte : on évite de prendre
    // le verrou serveur à chaque sondage (tous les clients sondent en continu).
    if (!(await phaseTickDue(gameId))) return;
    // Verrou SERVEUR inter-clients : un seul client exécute la transition.
    const { data: won, error: claimErr } = await supabase.rpc(
      "claim_phase_tick" as never,
      {
        p_game_id: gameId,
      } as never,
    );
    if (claimErr || !won) return;
    try {
      for (let transitionCount = 0; transitionCount < MAX_TICK_TRANSITIONS; transitionCount++) {
        const { data: g } = await supabase
          .from("games")
          .select("current_phase, phase_started_at, phase_duration_s, status, paused")
          .eq("id", gameId)
          .single();
        const game = g as {
          current_phase: Phase;
          phase_started_at: string | null;
          phase_duration_s: number | null;
          status: string;
          paused?: boolean;
        } | null;
        if (!game || game.status === "ended") return;
        if (game.paused) return;
        if (!game.phase_started_at || !game.phase_duration_s) return;
        const started = new Date(game.phase_started_at).getTime();
        // Le compteur de phase ne démarre qu'après la frame d'intro (INTRO_S, source
        // unique dans lib/phaseTiming — alignée sur l'affichage UI de la frame).
        const elapsed = (serverNow() - started) / 1000 - INTRO_S;
        if (elapsed < game.phase_duration_s) return;

        const nextPhaseStartedAt = new Date(
          started + (INTRO_S + game.phase_duration_s) * 1000,
        ).toISOString();

        if (game.current_phase === "free") {
          await ringGathering(gameId, "Auto", nextPhaseStartedAt);
        } else if (game.current_phase === "annonce") {
          await openGathering(gameId, nextPhaseStartedAt);
        } else if (game.current_phase === "gathering") {
          await openVote(gameId, nextPhaseStartedAt);
        } else if (game.current_phase === "vote") {
          // Fin de la fenêtre de vote → on clôt (verdict + emprisonnement, idempotent)
          // et on laisse l'écran de résultat s'afficher pendant VOTE_RESULT_S AVANT de
          // passer au tour suivant. Le verdict est donc montré à la FIN du vote, plus
          // au début de l'Enquête suivante.
          await closeVote(gameId);
          if (elapsed < game.phase_duration_s + VOTE_RESULT_S) return;
          await nextCycle(
            gameId,
            new Date(
              started + (INTRO_S + game.phase_duration_s + VOTE_RESULT_S) * 1000,
            ).toISOString(),
          );
        } else {
          return;
        }
      }
    } finally {
      // Libère le verrou serveur quoi qu'il arrive (return anticipé, throw…).
      await supabase.rpc("release_phase_tick" as never, { p_game_id: gameId } as never);
    }
  } finally {
    _tickInFlight.delete(gameId);
  }
}

export async function setPaused(gameId: string, paused: boolean): Promise<void> {
  await supabase
    .from("games")
    .update({ paused } as never)
    .eq("id", gameId);
}

/** MJ pousse (ou libère) un onglet pour tous les joueurs. */
export async function setForcedFrame(gameId: string, frame: string | null): Promise<void> {
  await supabase
    .from("games")
    .update({ forced_frame: frame } as never)
    .eq("id", gameId);
}

/** Termine la partie immédiatement avec un gagnant arbitraire (déclenché par fin spéciale). */
export async function endGameWithWinner(
  gameId: string,
  winner: string,
  reason: string,
): Promise<void> {
  const { data: g } = await supabase.from("games").select("status").eq("id", gameId).single();
  if ((g as { status: string } | null)?.status === "ended") return;
  await supabase
    .from("role_actions")
    .update({
      resolved_at: new Date().toISOString(),
      resolution: { status: "cancelled", reason: "game_ended", winner } as never,
      result: {
        summary: "La partie s'est terminée avant le dénouement de cette action.",
        outcome: "info",
      } as never,
    })
    .eq("game_id", gameId)
    .is("resolved_at", null)
    .eq("timing", "DEFERRED")
    .not("category", "is", null);
  await supabase
    .from("games")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", gameId);
  const { data: ps } = await supabase.from("players").select("id").eq("game_id", gameId);
  const rows = (ps ?? []).map((p: { id: string }) => ({
    game_id: gameId,
    player_id: p.id,
    type: "game_end",
    title: `🏆 ${winner} a gagné`,
    body: reason,
    payload: { winner, special: true } as never,
  }));
  if (rows.length) await supabase.from("notifications").insert(rows);
  emit("game_end", `🏆 ${winner} — ${reason}`, { winner });
}

/** Apply pending poisons, decay statuses. Called BEFORE tour++. */
async function resolveCycleTransition(gameId: string) {
  const { data: g } = await supabase.from("games").select("current_tour").eq("id", gameId).single();
  const curCycle = (g as { current_tour: number } | null)?.current_tour ?? 0;
  const nextCycleN = curCycle + 1;

  const { data: ps } = await supabase.from("players").select().eq("game_id", gameId);
  const allPs = (ps ?? []) as PlayerRow[];
  for (const p of allPs) {
    if (!p.is_alive) continue;
    const m = meta(p);
    if ((m.poison_resolves_cycle as number | undefined) === nextCycleN) {
      // protected ?
      const protUntil = (m.protected_until_cycle as number | undefined) ?? -1;
      if (protUntil >= nextCycleN) {
        await patchMeta(p.id, { poison_resolves_cycle: null, poisoned: false });
        await notify({
          gameId,
          playerId: p.id,
          type: "saved",
          title: "🛡️ Sauvé du poison",
          body: "Une protection t'a sauvé.",
          mjTitle: "🛡️ Poison neutralisé",
          mjBody: `${p.pseudo} a été sauvé du poison par une protection.`,
        });
      } else {
        await patchMeta(p.id, { poison_resolves_cycle: null, poisoned: false });
        await killPlayer(gameId, p.id, "poison");
      }
    }
  }

  // ── Juge : applique les libérations programmées au tour précédent.
  // Si la cible est morte ou déjà libérée entre-temps, on no-op silencieusement.
  for (const p of allPs) {
    const m = meta(p);
    if ((m.pending_release_for_cycle as number | undefined) !== nextCycleN) continue;
    // Nettoie le flag dans tous les cas (évite de re-déclencher).
    await patchMeta(p.id, { pending_release_for_cycle: null, pending_release_by: null });
    if (!p.is_alive || !p.is_imprisoned) continue;
    await supabase.from("players").update({ is_imprisoned: false }).eq("id", p.id);
    await notify({
      gameId,
      playerId: p.id,
      type: "released",
      title: "🔓 Libéré",
      body: "Le Juge t'a libéré de prison.",
      mjTitle: "⚖️ Juge",
      mjBody: `${p.pseudo} est libéré de prison (ordre du Juge au tour ${nextCycleN - 1}).`,
    });
  }

  // ── Marionnettiste : applique la manipulation programmée pour le tour à venir.
  // À la transition tour N → N+1, si un Marionnettiste a verrouillé une cible avec
  // puppet_active_tour === nextCycleN, on bloque la capacité de la cible et on lui
  // applique le statut visible "Manipulé" pour ce prochain tour.
  for (const pup of allPs) {
    if (!pup.is_alive) continue;
    const pm = meta(pup);
    const puppetId = pm.puppet_id as string | undefined;
    const activeTour = pm.puppet_active_tour as number | undefined;
    if (!puppetId || activeTour !== nextCycleN) continue;
    const target = allPs.find((q) => q.id === puppetId);
    if (!target || !target.is_alive) continue;
    await patchMeta(target.id, {
      blocked_until_cycle: nextCycleN,
      blocked_from_cycle: nextCycleN,
      forced_by: pup.id,
      forced_action_cycle: nextCycleN,
      manipulated_by: pup.id,
      manipulated_tour: nextCycleN,
    });
    await supabase.from("player_statuses").insert({
      game_id: gameId,
      player_id: target.id,
      status_slug: "manipulated",
      source: "role:marionnettiste",
      active_from_tour: nextCycleN,
      active_until_tour: nextCycleN,
    });
    await notify({
      gameId,
      playerId: target.id,
      type: "manipulated",
      title: "🎭 Tu as été manipulé",
      body: "Quelqu'un prend le contrôle de ta capacité ce tour. Tu ne peux rien faire.",
      mjTitle: "🎭 Marionnettiste",
      mjBody: `${pup.pseudo} (Marionnettiste) prend le contrôle de ${target.pseudo} ce tour.`,
    });
  }
}

/** Si le Mouchard n'a pas utilisé sa capacité ce tour, choisit une cible aléatoire (alive ≠ self) et la révèle. */
async function autoPickMouchard(gameId: string, tour: number): Promise<void> {
  const { data: mRow } = await supabase
    .from("players")
    .select()
    .eq("game_id", gameId)
    .eq("role_slug", "mouchard")
    .maybeSingle();
  const mouchard = mRow as PlayerRow | null;
  if (!mouchard || !mouchard.is_alive) return;
  const m = meta(mouchard);
  if (usesOf(m, "mouchard") > 0) return;
  const { data: ps } = await supabase.from("players").select().eq("game_id", gameId);
  const all = (ps ?? []) as PlayerRow[];
  const pool = all.filter((p) => p.is_alive && !p.is_mj && p.id !== mouchard.id);
  if (pool.length === 0) return;
  const t1 = pool[Math.floor(Math.random() * pool.length)];

  // Marque comme utilisé.
  const newUses = { ...((m.uses as Record<string, number> | undefined) ?? {}), mouchard: 1 };
  const newLast = { ...((m.last_use as Record<string, number> | undefined) ?? {}), mouchard: tour };
  await patchMeta(mouchard.id, { uses: newUses, last_use: newLast });

  const tMeta = meta(t1);
  if (isFalsified(tMeta)) {
    await supabase.from("role_actions").insert({
      game_id: gameId,
      actor_player_id: mouchard.id,
      tour,
      phase: "free",
      target_player_id: t1.id,
      payload: { effect: "mouchard_falsified", auto: true, target: t1.id } as never,
      result: { message: FALSIFIED_MSG, summary: FALSIFIED_MSG } as never,
    });
    await notify({
      gameId,
      playerId: mouchard.id,
      type: "mouchard_reveal",
      title: "📢 Mouchard (auto)",
      body: `Cible auto : ${t1.pseudo}. ${FALSIFIED_MSG}.`,
      mjTitle: "📢 Mouchard auto",
      mjBody: `${mouchard.pseudo} (Mouchard) → cible auto ${t1.pseudo} — piste falsifiée.`,
    });
    return;
  }
  const { data: rs } = await supabase.from("roles").select().eq("set_id", "set1");
  const rolesBySlug = new Map<string, RoleRow>();
  for (const r of (rs ?? []) as RoleRow[]) rolesBySlug.set(r.slug, r);
  const r = rolesBySlug.get(t1.role_slug ?? "");
  const label = r ? `${r.icon} ${r.name_fr}` : "?";
  const summary = `Cible auto : ${t1.pseudo} = ${label}`;
  await supabase.from("role_actions").insert({
    game_id: gameId,
    actor_player_id: mouchard.id,
    tour,
    phase: "free",
    target_player_id: t1.id,
    payload: { effect: "mouchard_reveal", auto: true, target: t1.id, slug: t1.role_slug } as never,
    result: { message: summary, summary } as never,
  });
  await notify({
    gameId,
    playerId: mouchard.id,
    type: "mouchard_reveal",
    title: "📢 Mouchard (auto)",
    body: `Aucun choix : cible tirée au sort. ${t1.pseudo} est : ${label}.`,
    mjTitle: "📢 Mouchard auto",
    mjBody: `${mouchard.pseudo} (Mouchard) → auto-cible ${t1.pseudo} (${label}).`,
  });
}

async function autoPickOracle(gameId: string, tour: number): Promise<void> {
  if (tour !== 1) return;
  const { data: oRow } = await supabase
    .from("players")
    .select()
    .eq("game_id", gameId)
    .eq("role_slug", "oracle")
    .maybeSingle();
  const oracle = oRow as PlayerRow | null;
  if (!oracle || !oracle.is_alive) return;
  const m = meta(oracle);
  if (m.prophecy) return;
  const factions = ["Civil", "Méchant", "Neutre"];
  const faction = factions[Math.floor(Math.random() * factions.length)];

  const uses = { ...((m.uses as Record<string, number> | undefined) ?? {}), oracle: 1 };
  const last_use = { ...((m.last_use as Record<string, number> | undefined) ?? {}), oracle: tour };
  await patchMeta(oracle.id, { prophecy: faction, uses, last_use });

  await supabase.from("role_actions").insert({
    game_id: gameId,
    actor_player_id: oracle.id,
    tour,
    phase: "free",
    payload: { effect: "prophecy", auto: true, faction } as never,
    result: {
      message: `Prophétie auto : ${faction}`,
      summary: `Prophétie auto : ${faction}`,
    } as never,
  });

  await notify({
    gameId,
    playerId: oracle.id,
    type: "prophecy_set",
    title: "🔮 Prophétie auto",
    body: `Tu n'as pas choisi à temps. La prophétie « ${faction} » a été tirée au sort.`,
    mjTitle: "🔮 Oracle auto",
    mjBody: `${oracle.pseudo} (Oracle) → prophétie auto : ${faction}.`,
  });
}

async function autoPickVengeur(gameId: string, tour: number): Promise<void> {
  if (tour !== 1) return;
  const { data: vRow } = await supabase
    .from("players")
    .select()
    .eq("game_id", gameId)
    .eq("role_slug", "vengeur")
    .maybeSingle();
  const vengeur = vRow as PlayerRow | null;
  if (!vengeur || !vengeur.is_alive) return;
  const m = meta(vengeur);
  if (m.pending_beloved_choice !== true) return;

  const { data: ps } = await supabase.from("players").select().eq("game_id", gameId);
  const all = (ps ?? []) as PlayerRow[];
  const { data: rs } = await supabase.from("roles").select().eq("set_id", "set1");
  const rolesBySlug = new Map<string, RoleRow>();
  for (const r of (rs ?? []) as RoleRow[]) rolesBySlug.set(r.slug, r);

  // Auto-pick parmi les 2 Civils proposés au setup ; repli sur n'importe quel Civil vivant.
  const choices = (m.vengeur_choices as string[] | undefined) ?? [];
  let pool = all.filter((p) => choices.includes(p.id) && p.is_alive && !p.is_mj);
  if (pool.length === 0) {
    pool = all.filter((p) => {
      if (p.id === vengeur.id || !p.is_alive || p.is_mj) return false;
      return rolesBySlug.get(p.role_slug ?? "")?.faction === "Civil";
    });
  }
  if (pool.length === 0) return;

  const target = pool[Math.floor(Math.random() * pool.length)];
  await patchMeta(vengeur.id, {
    etre_cher: target.id,
    beloved_id: target.id,
    pending_beloved_choice: false,
  });

  await notify({
    gameId,
    playerId: vengeur.id,
    type: "vengeur_setup",
    title: "🤍 Être cher (auto)",
    body: `Tu n'as pas choisi à temps. ${target.pseudo} devient ton être cher.`,
    mjTitle: "🤍 Vengeur auto",
    mjBody: `${vengeur.pseudo} (Vengeur) → être cher auto : ${target.pseudo}.`,
  });
}

async function autoPickUsurpateur(gameId: string, tour: number): Promise<void> {
  if (tour !== 1) return;
  const { data: uRow } = await supabase
    .from("players")
    .select()
    .eq("game_id", gameId)
    .eq("role_slug", "usurpateur")
    .maybeSingle();
  const u = uRow as PlayerRow | null;
  if (!u || !u.is_alive) return;
  const m = meta(u);
  if (typeof m.cover_slug === "string") return;
  const choices = (m.cover_choices as string[] | undefined) ?? [];
  if (choices.length === 0) return;
  const pick = choices[Math.floor(Math.random() * choices.length)];
  await patchMeta(u.id, { cover_slug: pick, cover_choices: null });
  const { data: rs } = await supabase.from("roles").select().eq("set_id", "set1");
  const rolesBySlug = new Map<string, RoleRow>();
  for (const r of (rs ?? []) as RoleRow[]) rolesBySlug.set(r.slug, r);
  const r = rolesBySlug.get(pick);
  const label = r ? `${r.icon} ${r.name_fr}` : pick;
  await supabase.from("role_actions").insert({
    game_id: gameId,
    actor_player_id: u.id,
    tour,
    phase: "free",
    payload: { effect: "cover_pick", auto: true, cover: pick } as never,
    result: {
      message: `Couverture auto : ${label}`,
      summary: `Couverture auto : ${label}`,
    } as never,
  });
  await notify({
    gameId,
    playerId: u.id,
    type: "cover_pending",
    title: "🎭 Couverture (auto)",
    body: `Tu n'as pas choisi à temps. Couverture tirée au sort : ${label}.`,
    mjTitle: "🎭 Usurpateur auto",
    mjBody: `${u.pseudo} (Usurpateur) → couverture auto : ${label}.`,
  });
}

// ─────────────── Gathering ───────────────
export async function ringGathering(
  gameId: string,
  reason = "MJ",
  phaseStartedAt?: string,
): Promise<string> {
  const { data: g } = await supabase.from("games").select("current_tour").eq("id", gameId).single();
  const tour = (g as { current_tour: number } | null)?.current_tour ?? 1;
  // Auto-pick (uniquement à la 1ère Enquête pour les rôles "SETUP") :
  // on tire au sort à la place du joueur qui n'a pas validé, pour ne pas
  // bloquer la suite de la partie.
  await autoPickMouchard(gameId, tour);
  await autoPickOracle(gameId, tour);
  await autoPickVengeur(gameId, tour);
  await autoPickUsurpateur(gameId, tour);
  const { data: gc, error } = await supabase
    .from("gathering_calls")
    .insert({ game_id: gameId, tour, reason })
    .select()
    .single();
  if (error) throw error;
  // Boucle : fin d'Enquête → phase ANNONCE (dénouement du resolver).
  // Le Débat s'ouvre ensuite via openGathering().
  await setPhase(gameId, "annonce", phaseStartedAt);

  // Resolver v2 : applique d'abord les intentions catégorisées (PROTECT → ATTACK → CASCADE)
  // en couches déterministes. Ignore les lignes legacy (category=NULL).
  await resolveDeferredIntents(gameId, tour, killPlayer, applyVampireConversion);
  // (resolvePhaseIntents legacy supprimé — tout passe par resolver v2)
  await flushPendingDeaths(gameId);

  // Stratège — embuscade : 2 passes lues sur le flag `targeted_by_stratege`.
  await deliverStrategeMarks(gameId, tour);

  // Mouchard : capacité désormais active (révélation 1×/partie). Aucun scan automatique à l'Annonce.

  emit("gather", `📯 Annonce — ${reason}`, { gameId, gatheringId: (gc as { id: string }).id });
  return (gc as { id: string }).id;
}

/**
 * Stratège « embuscade » — 2 passes lues sur le flag `targeted_by_stratege`,
 * appelées dans ringGathering APRÈS le resolver (current_tour = `tour`) :
 *   1. Livraison du statut « ciblé » aux cibles marquées CE tour (from_tour===tour)
 *      → la victime sait qu'elle mourra à l'annonce du tour suivant.
 *   2. Survie / nettoyage : les marques arrivées à échéance (resolves_tour===tour)
 *      viennent d'être résolues par le resolver. Si la cible est toujours vivante,
 *      l'embuscade a échoué (protection / Stratège mort) → on la prévient. Dans
 *      tous les cas on efface le flag.
 */
async function deliverStrategeMarks(gameId: string, tour: number): Promise<void> {
  const { data: ps } = await supabase.from("players").select().eq("game_id", gameId);
  for (const p of (ps ?? []) as PlayerRow[]) {
    const m = (p.role_meta ?? {}) as Record<string, unknown>;
    const mark = m.targeted_by_stratege as
      | { from_tour?: number; resolves_tour?: number }
      | undefined;
    if (!mark) continue;

    // Passe 1 — marque fraîche : prévient la cible.
    if (mark.from_tour === tour && p.is_alive) {
      await notify({
        gameId,
        playerId: p.id,
        type: "stratege_marked",
        title: "🎯 Tu es ciblé",
        body: `Le Tueur Stratège t'a marqué. Tu mourras à l'annonce du tour ${mark.resolves_tour ?? tour + 1} si rien ne te protège.`,
        mjTitle: "🎯 Stratège — cible prévenue",
        mjBody: `${p.pseudo} a été prévenu qu'il est ciblé par le Stratège (mort prévue tour ${mark.resolves_tour ?? tour + 1}).`,
      });
    }

    // Passe 2 — échéance : l'intention vient d'être résolue ce tour.
    if ((mark.resolves_tour ?? -1) <= tour && mark.from_tour !== tour) {
      if (p.is_alive) {
        await notify({
          gameId,
          playerId: p.id,
          type: "stratege_survived",
          title: "🛡️ Embuscade déjouée",
          body: "Tu étais ciblé par le Stratège, mais tu as survécu.",
          mjTitle: "🛡️ Stratège — échec",
          mjBody: `${p.pseudo} survit à l'embuscade du Stratège (protégé ou Stratège neutralisé).`,
        });
      }
      await patchMeta(p.id, { targeted_by_stratege: null });
    }
  }
}

/**
 * Annonce → Débat (clé moteur `gathering`). Le dénouement (resolver) a déjà été
 * appliqué à l'entrée de la phase Annonce ; ici on ne fait qu'ouvrir le débat.
 */
export async function openGathering(gameId: string, phaseStartedAt?: string): Promise<void> {
  await setPhase(gameId, "gathering", phaseStartedAt);
  emit("gather_open", "🔔 Débat ouvert", { gameId });
}

// ─────────────── Vote ───────────────
export async function openVote(gameId: string, phaseStartedAt?: string) {
  await setPhase(gameId, "vote", phaseStartedAt);
  emit("vote_open", "🗳️ Vote ouvert");
}

export async function castVote(gameId: string, voterId: string, targetId: string) {
  // Garde d'éligibilité autoritaire : un votant mort ou emprisonné ne peut pas
  // voter. On revérifie côté serveur car les listes côté appelant (snapshot bots,
  // UI humaine) peuvent être périmées si l'emprisonnement/la mort vient de tomber.
  const { data: vp } = await supabase
    .from("players")
    .select("is_alive, is_imprisoned")
    .eq("id", voterId)
    .single();
  const voter = vp as { is_alive: boolean; is_imprisoned: boolean } | null;
  if (!voter || !voter.is_alive || voter.is_imprisoned) return;
  const { data: g } = await supabase.from("games").select("current_tour").eq("id", gameId).single();
  const tour = (g as { current_tour: number } | null)?.current_tour ?? 1;
  await supabase
    .from("votes")
    .delete()
    .eq("game_id", gameId)
    .eq("tour", tour)
    .eq("voter_player_id", voterId);
  await supabase.from("votes").insert({
    game_id: gameId,
    tour,
    voter_player_id: voterId,
    target_player_id: targetId,
  });
  emit("vote_cast", "Vote enregistré", { voterId, targetId });
}

export async function tallyVote(gameId: string): Promise<{
  targetId: string | null;
  counts: Record<string, number>;
  tied: boolean;
  tiedIds: string[];
}> {
  const { data: g } = await supabase.from("games").select("current_tour").eq("id", gameId).single();
  const tour = (g as { current_tour: number } | null)?.current_tour ?? 1;
  const { data: vs } = await supabase
    .from("votes")
    .select("voter_player_id, target_player_id")
    .eq("game_id", gameId)
    .eq("tour", tour);
  const counts: Record<string, number> = {};
  for (const v of (vs ?? []) as Array<{ voter_player_id: string; target_player_id: string }>) {
    counts[v.target_player_id] = (counts[v.target_player_id] ?? 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return { targetId: null, counts, tied: false, tiedIds: [] };
  const top = sorted[0][1];
  const tiedIds = sorted.filter(([, n]) => n === top).map(([id]) => id);
  const tied = tiedIds.length > 1;
  // Tie-breaker: random pick among top.
  const targetId = tied ? tiedIds[Math.floor(Math.random() * tiedIds.length)] : sorted[0][0];
  return { targetId, counts, tied, tiedIds };
}

/**
 * Variante Suspicion : agrège les marques "Suspect" (niveau 3) du tableau de suspicions
 * de chaque joueur vivant OU emprisonné (non-MJ). Le joueur qui cumule le plus de
 * marques est emprisonné. Égalité → personne n'est emprisonné.
 */
export async function tallySuspicionVote(gameId: string): Promise<{
  targetId: string | null;
  counts: Record<string, number>;
  tied: boolean;
  tiedIds: string[];
}> {
  const { data: ps } = await supabase
    .from("players")
    .select("id, is_alive, is_imprisoned, is_mj, role_meta")
    .eq("game_id", gameId);
  const players = (ps ?? []) as Array<{
    id: string;
    is_alive: boolean;
    is_imprisoned: boolean;
    is_mj: boolean;
    role_meta: Meta;
  }>;
  const aliveIds = new Set(players.filter((p) => p.is_alive && !p.is_mj).map((p) => p.id));
  const counts: Record<string, number> = {};
  for (const voter of players) {
    if (voter.is_mj) continue;
    if (!voter.is_alive && !voter.is_imprisoned) continue; // ni vivant ni en prison → ignoré
    const board = (voter.role_meta?.suspicion_board as Record<string, number> | undefined) ?? {};
    for (const [targetId, level] of Object.entries(board)) {
      if (level !== 3) continue; // 3 = SUSPECT
      if (targetId === voter.id) continue; // pas soi-même
      if (!aliveIds.has(targetId)) continue; // cible doit être vivante (élimination)
      counts[targetId] = (counts[targetId] ?? 0) + 1;
    }
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return { targetId: null, counts, tied: false, tiedIds: [] };
  const top = sorted[0][1];
  const tiedIds = sorted.filter(([, n]) => n === top).map(([id]) => id);
  const tied = tiedIds.length > 1;
  // Égalité = personne d'éliminé.
  const targetId = tied ? null : sorted[0][0];
  return { targetId, counts, tied, tiedIds };
}

export async function closeVote(gameId: string) {
  // Variante Suspicion : on délègue à un tally basé sur les tableaux de suspicions.
  const { data: gVar } = await supabase
    .from("games")
    .select("variant" as never)
    .eq("id", gameId)
    .maybeSingle();
  const variant = (gVar as { variant: string | null } | null)?.variant ?? null;
  const tallyFn = variant === "suspicion" ? tallySuspicionVote : tallyVote;
  const { targetId, counts, tied } = await tallyFn(gameId);
  const { data: g } = await supabase.from("games").select("current_tour").eq("id", gameId).single();
  const tour = (g as { current_tour: number } | null)?.current_tour ?? 1;

  // Idempotence : si un verdict a déjà été émis pour ce tour, on ne reprocesse pas
  // (évite double-emprisonnement quand closeVote est rappelé — UI / auto-tick).
  const { data: already } = await supabase
    .from("notifications")
    .select("id")
    .eq("game_id", gameId)
    .eq("type", "vote_result")
    .contains("payload", { tour } as never)
    .limit(1);
  if ((already ?? []).length > 0) return;

  // ─── Veuve noire : déclencheur "un époux a voté contre moi" → kill des deux à la prochaine Annonce.
  const { data: veuves } = await supabase
    .from("players")
    .select()
    .eq("game_id", gameId)
    .eq("role_slug", "veuve_noire")
    .eq("is_alive", true);
  for (const v of (veuves ?? []) as PlayerRow[]) {
    const vm = meta(v);
    const pairs = (
      (vm.veuve_pairs as Array<{ tour: number; pair: string[] }> | undefined) ?? []
    ).filter((p) => p.tour === tour);
    if (pairs.length === 0) continue;
    const allTargets = Array.from(new Set(pairs.flatMap((p) => p.pair)));
    const voters = new Set<string>();
    if (variant === "suspicion") {
      // Variante Suspicion : un époux "vote contre" la Veuve s'il l'a marquée Suspect (niveau 3).
      const { data: spouseRows } = await supabase
        .from("players")
        .select("id, role_meta")
        .in("id", allTargets);
      for (const sp of (spouseRows ?? []) as Array<{ id: string; role_meta: Meta }>) {
        const board = (sp.role_meta?.suspicion_board as Record<string, number> | undefined) ?? {};
        if (board[v.id] === 3) voters.add(sp.id);
      }
    } else {
      const { data: votesAgainst } = await supabase
        .from("votes")
        .select("voter_player_id")
        .eq("game_id", gameId)
        .eq("tour", tour)
        .eq("target_player_id", v.id);
      for (const x of (votesAgainst ?? []) as Array<{ voter_player_id: string }>)
        voters.add(x.voter_player_id);
    }
    const triggeringPairs = pairs.filter((p) => p.pair.some((id) => voters.has(id)));
    if (triggeringPairs.length === 0) continue;
    const toKill = Array.from(new Set(triggeringPairs.flatMap((p) => p.pair)));
    for (const tid of toKill) {
      await submitIntent({
        gameId,
        tour: tour + 1,
        phase: "free",
        actorId: v.id,
        targetId: tid,
        category: "ATTACK",
        timing: "DEFERRED",
        source: "role:veuve_noire",
        payload: { kill_reason: "veuve_noire_vote_trigger" },
      });
    }
    // Purge les paires consommées pour ne pas re-déclencher.
    const remaining = (
      (vm.veuve_pairs as Array<{ tour: number; pair: string[] }> | undefined) ?? []
    ).filter((p) => p.tour !== tour);
    await patchMeta(v.id, { veuve_pairs: remaining });
    await notify({
      gameId,
      playerId: v.id,
      type: "veuve_trigger",
      title: "🕷️ La toile se referme",
      body: `Un époux a voté contre toi. ${toKill.length} cible(s) mourront à la prochaine Annonce.`,
      mjTitle: "🕷️ Veuve noire",
      mjBody: `${v.pseudo} (Veuve noire) déclenche la mort de ${toKill.length} époux (vote contre elle).`,
    });
    void allTargets;
  }

  if (targetId) {
    const effectiveTarget = targetId;
    const { data: tgt } = await supabase
      .from("players")
      .select("role_slug, pseudo, role_meta")
      .eq("id", effectiveTarget)
      .single();
    const tgtRow = tgt as { role_slug: string | null; pseudo: string; role_meta: Meta } | null;
    const slug = tgtRow?.role_slug ?? null;

    // Saint loss check
    if (slug === "saint") {
      await supabase
        .from("role_actions")
        .update({
          resolved_at: new Date().toISOString(),
          resolution: { status: "cancelled", reason: "game_ended", winner: "MÃ©chants" } as never,
          result: {
            summary: "La partie s'est terminée avant le dénouement de cette action.",
            outcome: "info",
          } as never,
        })
        .eq("game_id", gameId)
        .is("resolved_at", null)
        .eq("timing", "DEFERRED")
        .not("category", "is", null);
      await supabase
        .from("games")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", gameId);
      const { data: ps } = await supabase.from("players").select("id").eq("game_id", gameId);
      const rows = (ps ?? []).map((p: { id: string }) => ({
        game_id: gameId,
        player_id: p.id,
        type: "game_end",
        title: "🕯️ Le Saint a été condamné",
        body: "Défaite des Citoyens.",
        payload: { winner: "Méchants" } as never,
      }));
      if (rows.length) await supabase.from("notifications").insert(rows);
      emit("saint_lost", "🕯️ Saint condamné — Citoyens perdent");
      return;
    }

    await imprisonPlayer(gameId, effectiveTarget, "vote");

    // Broadcast du verdict à TOUS : on annonce SEULEMENT l'emprisonnement, sans
    // révéler ni le rôle ni la faction de l'emprisonné. Un emprisonné peut être
    // libéré (Juge) ; aucune info de rôle/camp ne doit fuiter ici — le rôle et la
    // faction ne sont révélés qu'à la mort réelle, via les annonces. Le `role_slug`
    // n'est pas diffusé dans le payload non plus.
    const { data: allPs } = await supabase.from("players").select("id").eq("game_id", gameId);
    const broadcast = ((allPs ?? []) as Array<{ id: string }>).map((p) => ({
      game_id: gameId,
      player_id: p.id,
      type: "vote_result",
      title: tied ? "⚖️ Vote — Égalité tranchée au sort" : "🔒 Vote — Verdict",
      body: `${tgtRow?.pseudo ?? "?"} est emprisonné.`,
      payload: { target_id: effectiveTarget, tour, counts, tied } as never,
    }));
    if (broadcast.length) await supabase.from("notifications").insert(broadcast);
  } else {
    // Aucun vote : notifier
    const { data: allPs } = await supabase.from("players").select("id").eq("game_id", gameId);
    const broadcast = ((allPs ?? []) as Array<{ id: string }>).map((p) => ({
      game_id: gameId,
      player_id: p.id,
      type: "vote_result",
      title: "🤐 Vote — Personne",
      body: "Aucun vote n'a été émis.",
      payload: { target_id: null, tour, counts } as never,
    }));
    if (broadcast.length) await supabase.from("notifications").insert(broadcast);
  }
  emit("vote_close", targetId ? "🔒 Vote → emprisonnement" : "Vote → personne", { targetId });
}

/** Player writes/updates their testament (visible after death). */
export async function setTestament(playerId: string, text: string) {
  await patchMeta(playerId, { testament: text });
}

/** Cancel one's vote (abstain). */
export async function cancelVote(gameId: string, voterId: string) {
  const { data: g } = await supabase.from("games").select("current_tour").eq("id", gameId).single();
  const tour = (g as { current_tour: number } | null)?.current_tour ?? 1;
  await supabase
    .from("votes")
    .delete()
    .eq("game_id", gameId)
    .eq("tour", tour)
    .eq("voter_player_id", voterId);
}

// ─────────────── Player state mutations ───────────────
/**
 * Tue un joueur. Si la phase courante est "free", la mort est DIFFÉRÉE :
 * le joueur reste is_alive=true (et continue à agir) jusqu'au prochain
 * `ringGathering()` qui appelle `flushPendingDeaths()`. À ce moment-là, les
 * cascades (Entremetteur, Vengeur, Tueur→Acolyte, Rêveur, autopsie) sont
 * exécutées et `is_alive` bascule à false. Pendant l'Enquête, on stocke
 * `role_meta.pending_death = { reason, tour, ts }`.
 *
 * Les morts en phase `gathering` ou `vote` restent immédiates (visibilité OK).
 */
export async function killPlayer(
  gameId: string,
  playerId: string,
  reason = "engine",
  attackerId?: string,
  extra?: Record<string, unknown>,
): Promise<boolean> {
  const { data: p } = await supabase.from("players").select().eq("id", playerId).single();
  const player = p as PlayerRow | null;
  if (!player) return false;
  const m = meta(player);
  if (m.immortal === true) {
    emit("kill_blocked", `${player.pseudo} est immortel`, { playerId });
    return false;
  }
  if (!player.is_alive) return false;
  if (m.pending_death) return false; // déjà condamné, en attente de l'Annonce
  const { data: g } = await supabase
    .from("games")
    .select("current_tour, current_phase")
    .eq("id", gameId)
    .single();
  const gg = g as { current_tour: number; current_phase: string } | null;
  const tour = gg?.current_tour ?? 1;
  const deathPhase = gg?.current_phase ?? "free";

  // Protection
  const prot = (m.protected_until_cycle as number | undefined) ?? -1;
  if (prot >= tour && reason !== "vote") {
    emit("kill_blocked", `${player.pseudo} protégé`, { playerId, reason });
    // MJ-only : la cible ne doit pas savoir qu'elle a été protégée.
    await notifyMJ({
      gameId,
      type: "shielded",
      title: "🛡️ Attaque bloquée",
      body: `${player.pseudo} a été attaqué (${reason}) mais une protection l'a sauvé.`,
    });
    // Saint block : notifie l'agresseur que sa cible était bénite
    if (m.blessed_by_saint === true && attackerId) {
      await notify({
        gameId,
        playerId: attackerId,
        type: "saint_block",
        title: "✨ Cible bénite",
        body: "Cette cible est bénite, votre action ne fonctionne pas.",
      });
    }
    // Majordome trade : si attaque issue d'une mécanique méchante (tueur,
    // croque_mitaine, couteau d'origine méchante) et protecteur=majordome via `guarded_by`
    const isMechantReason = reason === "tueur" || reason === "croque_mitaine";
    if (isMechantReason && typeof m.guarded_by === "string") {
      const guard = m.guarded_by as string;
      // Le Majordome meurt en héros — même règle de différé pendant l'Enquête.
      await killPlayer(gameId, guard, "majordome_trade");
      // Attaquant méchant meurt aussi (différé idem si Enquête).
      const killerId = attackerId;
      if (killerId) await killPlayer(gameId, killerId, "majordome_riposte");
      else if (reason === "tueur") {
        const { data: tueurRow } = await supabase
          .from("players")
          .select("id")
          .eq("game_id", gameId)
          .eq("role_slug", "tueur")
          .maybeSingle();
        if (tueurRow)
          await killPlayer(gameId, (tueurRow as { id: string }).id, "majordome_riposte");
      }
    }
    return false;
  }

  // Cleaner intercept : le resolver a déjà décidé en amont (avant le batch d'attaques)
  // quelles morts méchantes seraient nettoyées. Il a posé `cleaned: true` sur la cible,
  // décrémenté les uses du Cleaner et envoyé les notifications. Ici on ne fait que lire
  // ce flag pour masquer l'annonce publique et la faction.
  const cleanedBroadcast = m.cleaned === true;

  // Récupère la faction du mort pour l'annonce publique.
  // Si le Cleaner a nettoyé la mort, la faction est masquée (« inconnue »).
  const { data: roleInfo } = await supabase
    .from("roles")
    .select("faction")
    .eq("slug", player.role_slug ?? "")
    .maybeSingle();
  const realFaction = (roleInfo as { faction: string } | null)?.faction ?? "inconnue";
  const publicFaction = cleanedBroadcast ? "inconnue" : realFaction;
  const whenLabel =
    deathPhase === "free"
      ? "durant l'Enquête"
      : deathPhase === "gathering"
        ? "durant le Débat"
        : deathPhase === "vote"
          ? "lors du vote"
          : "";

  // Broadcast death notification (déjà filtré par PA4Notebook pendant l'Enquête).
  // On ne précise plus la raison ni le moment de la mort — uniquement la faction.
  const { data: allForKill } = await supabase.from("players").select("id").eq("game_id", gameId);
  const killBroadcast = ((allForKill ?? []) as Array<{ id: string }>).map((row) => ({
    game_id: gameId,
    player_id: row.id,
    type: "death",
    title: `💀 Mort de ${player.pseudo}`,
    body: `Faction : ${publicFaction}.`,
    payload: {
      target_id: playerId,
      tour,
      phase: deathPhase,
      reason,
      deferred: deathPhase === "free",
      cleaned: cleanedBroadcast,
      faction: publicFaction,
      attacker_id: attackerId ?? null,
      ...(extra ?? {}),
    } as never,
  }));
  if (killBroadcast.length) await supabase.from("notifications").insert(killBroadcast);
  await notifyMJ({
    gameId,
    type: cleanedBroadcast ? "death_cleaned" : "death",
    title: `💀 Mort de ${player.pseudo}`,
    body: `${player.pseudo} n'est plus en vie${whenLabel ? " " + whenLabel : ""} (cause : ${reason}, faction réelle : ${realFaction})${cleanedBroadcast ? " — faction masquée par le Cleaner" : ""}${deathPhase === "free" ? " — RÉVÉLATION DIFFÉRÉE à l'Annonce" : ""}.`,
    payload: {
      target_id: playerId,
      tour,
      phase: deathPhase,
      reason,
      deferred: deathPhase === "free",
      cleaned: cleanedBroadcast,
      faction: realFaction,
    },
  });

  if (deathPhase === "free") {
    // Différé : on garde is_alive=true, le joueur continue à jouer jusqu'à l'Annonce.
    await patchMeta(playerId, {
      pending_death: { reason, tour, ts: new Date().toISOString(), attacker_id: attackerId },
      death_cycle: tour,
      death_phase: deathPhase,
      death_reason: reason,
      death_cleaned: cleanedBroadcast,
    });
    emit("kill_deferred", `💀 ${player.pseudo} condamné (mort différée: ${reason})`, {
      playerId,
      reason,
    });
    return true;
  }

  // Immédiat (gathering ou vote) : bascule + cascades tout de suite.
  await supabase.from("players").update({ is_alive: false }).eq("id", playerId);
  await patchMeta(playerId, {
    death_cycle: tour,
    death_phase: deathPhase,
    death_reason: reason,
    death_cleaned: cleanedBroadcast,
  });
  emit("kill", `💀 ${player.pseudo} tué (${reason})`, { playerId, reason });
  await runDeathCascades(gameId, player, reason, tour);
  await checkAndEndGame(gameId);
  return true;
}

/**
 * Exécute toutes les conséquences d'une mort qui vient d'être confirmée :
 * autopsie (Médecin légiste), lien Entremetteur, cascade infection Mort-Vivant,
 * déblocage Vengeur, succession Tueur→Acolyte, fragment Rêveur.
 */
async function runDeathCascades(
  gameId: string,
  player: PlayerRow,
  reason: string,
  _cycle: number,
): Promise<void> {
  const m = meta(player);
  const playerId = player.id;

  // Médecin légiste: autopsie privée — supprimée si la mort a été nettoyée par le Cleaner.
  const cleaned = m.cleaned === true;
  if (!cleaned) {
    const { data: legiste } = await supabase
      .from("players")
      .select()
      .eq("game_id", gameId)
      .eq("role_slug", "medecin_legiste")
      .maybeSingle();
    if (legiste && (legiste as PlayerRow).is_alive) {
      const { data: roleRow } = await supabase
        .from("roles")
        .select("name_fr, icon")
        .eq("slug", player.role_slug ?? "")
        .maybeSingle();
      const r = roleRow as { name_fr: string; icon: string } | null;
      await notify({
        gameId,
        playerId: (legiste as PlayerRow).id,
        type: "autopsy",
        title: "🩺 Autopsie",
        body: `${player.pseudo} — ${r?.icon} ${r?.name_fr}`,
        mjTitle: "🩺 Autopsie",
        mjBody: `${(legiste as PlayerRow).pseudo} (Médecin légiste) examine ${player.pseudo} → ${r?.icon ?? ""} ${r?.name_fr ?? ""}.`,
      });
    }
  }

  // Cascades: Entremetteur link — l'amoureux suit dans la mort.
  // On passe par killPlayer pour bénéficier du broadcast public + cascades + check fin de partie.
  if (typeof m.linked_with === "string") {
    const linkedId = m.linked_with as string;
    const { data: linked } = await supabase
      .from("players")
      .select("is_alive, role_meta, pseudo")
      .eq("id", linkedId)
      .single();
    const lk = linked as { is_alive: boolean; role_meta: Meta | null; pseudo: string } | null;
    const lkMeta = (lk?.role_meta ?? {}) as Meta;
    if (lk && lk.is_alive && !lkMeta.pending_death) {
      await notify({
        gameId,
        playerId: linkedId,
        type: "linked_death",
        title: "💔 Lien rompu",
        body: `Mort de ${player.pseudo} — ton lien t'emporte aussi.`,
        mjTitle: "💔 Lien rompu",
        mjBody: `${lk.pseudo} suit ${player.pseudo} dans la mort (lien Entremetteur).`,
      });
      // Évite la récursion infinie : on retire le lien côté partenaire avant de tuer.
      await patchMeta(linkedId, { linked_with: null });
      await killPlayer(gameId, linkedId, "lien_amoureux");
    }
  }

  // Vengeur être cher
  const { data: vengeurRow } = await supabase
    .from("players")
    .select()
    .eq("game_id", gameId)
    .eq("role_slug", "vengeur")
    .maybeSingle();
  const vengeur = vengeurRow as PlayerRow | null;
  if (vengeur && vengeur.is_alive && (meta(vengeur).etre_cher as string | undefined) === playerId) {
    await patchMeta(vengeur.id, { kill_unlocked: true });
    const { grantItem, buildItem } = await import("./items");
    await grantItem(
      vengeur.id,
      buildItem("couteau", {
        from: "Vengeance",
        originFaction: "Civil",
        descriptionOverride:
          "Ton être cher est tombé. Utilise ce couteau pour te venger une seule fois.",
      }),
    );
    await notify({
      gameId,
      playerId: vengeur.id,
      type: "vengeance",
      title: "⚔️ Vengeance",
      body: "Ton être cher n'est plus. Un couteau apparaît dans ton inventaire.",
      mjTitle: "⚔️ Vengeance",
      mjBody: `${vengeur.pseudo} (Vengeur) reçoit un couteau : son être cher (${player.pseudo}) est mort.`,
    });
  }

  // Tueur méchant mort (Tueur, Croque-mitaine, …) → succession Acolyte. Si le mort
  // était déjà un héritier temporaire (l'original est encore en prison), la nouvelle
  // promotion reste temporaire afin que `revertTempPromotion` rétablisse à la libération.
  if (await isGenericMechantKiller(player.role_slug)) {
    const wasTemp = meta(player).temp_promotion === true;
    await promoteAcolyteToTueur(gameId, /* temporary */ wasTemp);
  }

  // Stratège mort → succession Acolyte (permanente) avec transfert d'état (Fidèles, ordre, kills_done)
  if (player.role_slug === "stratege") {
    await promoteAcolyteToStratege(gameId, /* temporary */ false, meta(player));
  }

  // Vampire mort → un membre du clan (converti) hérite de la capacité de morsure.
  // Si le mort était déjà un héritier temporaire (le vampire original est encore en prison),
  // la nouvelle promotion reste temporaire afin que `revertTempVampirePromotion` rétablisse correctement.
  if (player.role_slug === "vampire") {
    const wasTemp = meta(player).temp_promotion === true;
    await promoteVampireHeir(gameId, player.id, wasTemp);
  }

  void reason;
}

/**
 * Flushe toutes les morts différées de l'Enquête passée : bascule
 * `is_alive=false`, exécute les cascades, émet une annonce MJ par mort.
 * Appelé au tout début de `ringGathering()`.
 */
async function flushPendingDeaths(gameId: string): Promise<void> {
  const { data: g } = await supabase.from("games").select("current_tour").eq("id", gameId).single();
  const tour = (g as { current_tour: number } | null)?.current_tour ?? 1;
  const { data: ps } = await supabase
    .from("players")
    .select()
    .eq("game_id", gameId)
    .eq("is_alive", true);
  const pending = ((ps ?? []) as PlayerRow[]).filter((p) => {
    const m = meta(p);
    return !!m.pending_death;
  });

  // Compte les morts confirmées à cette Annonce (resolver inclus, via notifications "death" du tour courant).
  const { count: deathCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("game_id", gameId)
    .eq("type", "death")
    .contains("payload", { tour } as never);

  if (pending.length === 0 && (deathCount ?? 0) === 0) {
    await notifyMJ({
      gameId,
      type: "mj_announce",
      title: "🌅 Annonce",
      body: "Aucune mort à ce tour.",
      payload: { tour, deaths: 0 },
    });
    // Même sans mort, des conditions de victoire non létales peuvent s'être
    // déclenchées pendant la phase (ex: Empoisonneur qui marque sa dernière cible).
    await checkAndEndGame(gameId);
    return;
  }

  for (const player of pending) {
    const m = meta(player);
    const pd = (m.pending_death as { reason: string; tour: number; ts: string } | null) ?? null;
    const reason = pd?.reason ?? "engine";
    const cleaned = m.cleaned === true;

    await supabase.from("players").update({ is_alive: false }).eq("id", player.id);
    await patchMeta(player.id, { pending_death: null });
    emit("kill", `💀 ${player.pseudo} confirmé mort (${reason})`, { playerId: player.id, reason });

    // Faction du mort à annoncer (masquée si Cleaner a nettoyé).
    const { data: roleInfo } = await supabase
      .from("roles")
      .select("faction")
      .eq("slug", player.role_slug ?? "")
      .maybeSingle();
    const realFaction = (roleInfo as { faction: string } | null)?.faction ?? "inconnue";
    const announcedFaction = cleaned ? "inconnue" : realFaction;

    // Annonce MJ à lire à voix haute : faction révélée, sans cause ni moment de la mort.
    await notifyMJ({
      gameId,
      type: "mj_announce",
      title: `🌅 Annonce — ${player.pseudo}`,
      body: `${player.pseudo} a été retrouvé sans vie. Faction : ${announcedFaction}.`,
      payload: { tour, target_id: player.id, reason, faction: announcedFaction, cleaned },
    });

    await runDeathCascades(gameId, player, reason, tour);
  }

  await checkAndEndGame(gameId);
}

/**
 * Un rôle méchant « Tueur » générique : Tueur, Croque-mitaine, et tout futur rôle
 * de faction Méchant + type TUEUR. EXCLUT le Stratège (qui a sa propre succession
 * avec transfert d'état). Sert à déclencher la succession d'Acolyte quel que soit
 * le slug exact du tueur méchant (l'héritier devient toujours « tueur »).
 */
async function isGenericMechantKiller(slug: string | null | undefined): Promise<boolean> {
  if (!slug || slug === "stratege") return false;
  const { data } = await supabase
    .from("roles")
    .select("faction, type")
    .eq("slug", slug)
    .maybeSingle();
  const r = data as { faction: string; type: string } | null;
  return !!r && r.faction === "Méchant" && r.type === "TUEUR";
}

/** Promote a random alive non-promoted Acolyte to Tueur. */
async function promoteAcolyteToTueur(gameId: string, temporary: boolean): Promise<void> {
  const { data: aco } = await supabase
    .from("players")
    .select()
    .eq("game_id", gameId)
    .eq("is_alive", true)
    .eq("is_imprisoned", false);
  const acolytes = ((aco ?? []) as PlayerRow[]).filter((x) => {
    const mx = meta(x);
    return x.role_slug && x.role_slug !== "tueur" && mx.original_slug == null;
  });
  if (!acolytes.length) return;
  const { data: rs } = await supabase
    .from("roles")
    .select("slug, type, faction")
    .in(
      "slug",
      acolytes.map((a) => a.role_slug ?? ""),
    );
  const acoInfo = new Map(
    (rs ?? []).map((r: { slug: string; type: string; faction: string }) => [r.slug, r]),
  );
  const realAcolytes = acolytes.filter((a) => {
    const info = acoInfo.get(a.role_slug ?? "");
    return info && info.type !== "TUEUR" && info.faction === "Méchant";
  });
  const heir = realAcolytes[Math.floor(Math.random() * realAcolytes.length)];
  if (!heir) return;
  const originalSlug = heir.role_slug;
  await supabase.from("players").update({ role_slug: "tueur" }).eq("id", heir.id);
  await patchMeta(heir.id, {
    promoted_from_acolyte: true,
    original_slug: originalSlug,
    temp_promotion: temporary,
  });
  await notify({
    gameId,
    playerId: heir.id,
    type: "succession",
    title: temporary ? "🔪 Tu deviens le Tueur (temporaire)" : "🔪 Tu es le nouveau Tueur",
    body: temporary ? "Le Tueur est en prison, tu prends le relais." : "Le précédent est tombé.",
    mjTitle: "🔪 Succession Tueur",
    mjBody: `${heir.pseudo} devient ${temporary ? "Tueur temporaire" : "le nouveau Tueur"} (succession Acolyte).`,
  });
}

/** Revert any temporary Acolyte→Tueur promotion. */
async function revertTempPromotion(gameId: string): Promise<void> {
  const { data: promoted } = await supabase
    .from("players")
    .select()
    .eq("game_id", gameId)
    .eq("role_slug", "tueur");
  for (const p of (promoted ?? []) as PlayerRow[]) {
    const mp = meta(p);
    if (mp.temp_promotion === true && typeof mp.original_slug === "string") {
      const original = mp.original_slug as string;
      await supabase.from("players").update({ role_slug: original }).eq("id", p.id);
      await patchMeta(p.id, {
        promoted_from_acolyte: null,
        original_slug: null,
        temp_promotion: null,
      });
      await notify({
        gameId,
        playerId: p.id,
        type: "succession_end",
        title: "↩️ Tu reprends ton rôle",
        body: "Le Tueur est de retour, tu retrouves ta capacité.",
        mjTitle: "↩️ Succession annulée",
        mjBody: `${p.pseudo} retrouve son rôle d'origine (Tueur libéré).`,
      });
    }
  }
}

/**
 * Vampire absent (mort ou emprisonné) → un membre du clan (joueur converti, vivant
 * et non emprisonné) hérite de la capacité de morsure (role_slug devient "vampire").
 * Choisi au hasard. Si `temporary=true`, la promotion sera annulée à la libération
 * du vampire original via `revertTempVampirePromotion`.
 */
async function promoteVampireHeir(
  gameId: string,
  absentVampireId: string,
  temporary = false,
): Promise<void> {
  const { data: ps } = await supabase
    .from("players")
    .select()
    .eq("game_id", gameId)
    .eq("is_alive", true)
    .eq("is_imprisoned", false);
  const candidates = ((ps ?? []) as PlayerRow[]).filter((p) => {
    if (p.id === absentVampireId) return false;
    if (p.role_slug === "vampire") return false;
    return meta(p).converted === true;
  });
  if (!candidates.length) return;
  const heir = candidates[Math.floor(Math.random() * candidates.length)];
  const originalSlug = heir.role_slug;
  await supabase.from("players").update({ role_slug: "vampire" }).eq("id", heir.id);
  await patchMeta(heir.id, {
    vampire_heir: true,
    original_slug_before_vampire: originalSlug,
    converted: null,
    temp_promotion: temporary ? true : null,
  });
  await notify({
    gameId,
    playerId: heir.id,
    type: "succession",
    title: temporary ? "🧛 Tu deviens le Vampire (temporaire)" : "🧛 Tu deviens le Vampire",
    body: temporary
      ? "Le Vampire est en prison, tu prends le relais et hérite de sa capacité de morsure."
      : "Le Vampire est mort. Tu hérites de sa capacité de morsure.",
    mjTitle: "🧛 Succession Vampire",
    mjBody: `${heir.pseudo} ${temporary ? "hérite temporairement de" : "hérite de"} la capacité de morsure du Vampire.`,
  });
}

/** Revert any temporary Vampire promotion when the original Vampire is released. */
async function revertTempVampirePromotion(gameId: string): Promise<void> {
  const { data: promoted } = await supabase
    .from("players")
    .select()
    .eq("game_id", gameId)
    .eq("role_slug", "vampire");
  for (const p of (promoted ?? []) as PlayerRow[]) {
    const mp = meta(p);
    if (mp.temp_promotion === true && typeof mp.original_slug_before_vampire === "string") {
      const original = mp.original_slug_before_vampire as string;
      await supabase.from("players").update({ role_slug: original }).eq("id", p.id);
      await patchMeta(p.id, {
        vampire_heir: null,
        original_slug_before_vampire: null,
        temp_promotion: null,
        converted: true, // reste membre du clan vampire
      });
      await notify({
        gameId,
        playerId: p.id,
        type: "succession_end",
        title: "↩️ Tu reprends ton rôle",
        body: "Le Vampire est de retour, tu retrouves ton rôle d'origine (tu restes membre du clan).",
        mjTitle: "↩️ Succession Vampire annulée",
        mjBody: `${p.pseudo} retrouve son rôle d'origine (Vampire libéré).`,
      });
    }
  }
}

/**
 * Effet de conversion vampire — appelé par le resolver (catégorie CONVERT,
 * layer 3) UNIQUEMENT si le Vampire est encore vivant après les attaques. Le
 * clan est recalculé en LIVE (la morsure ayant été posée en Enquête, l'état
 * a pu changer d'ici la résolution). Renvoie false si la cible est déjà vampire.
 */
async function applyVampireConversion(
  gameId: string,
  vampireId: string,
  targetId: string,
  tour: number,
): Promise<boolean> {
  const { data: tgtRow } = await supabase
    .from("players")
    .select("role_meta, pseudo")
    .eq("id", targetId)
    .single();
  const tMeta = ((tgtRow as { role_meta: Meta } | null)?.role_meta ?? {}) as Meta;
  if (tMeta.converted === true) return false; // idempotence : déjà converti
  const tPseudo = (tgtRow as { pseudo: string } | null)?.pseudo ?? "?";
  await patchMeta(targetId, { converted: true, converted_by: vampireId, converted_cycle: tour });
  await notify({
    gameId,
    playerId: targetId,
    type: "converted",
    title: "🧛 Morsure de vampire",
    body: "Tu rejoins les Vampires. Tu connais les autres vampires.",
    mjTitle: "🧛 Conversion Vampire",
    mjBody: `${tPseudo} rejoint les Vampires.`,
  });
  // Clan en LIVE (vampires originels + déjà convertis), hors la nouvelle recrue.
  const { data: ps } = await supabase
    .from("players")
    .select("id, pseudo, role_slug, role_meta")
    .eq("game_id", gameId)
    .eq("is_alive", true);
  const clan = ((ps ?? []) as PlayerRow[]).filter(
    (p) =>
      p.id !== targetId &&
      (p.role_slug === "vampire" ||
        (p.role_meta as Record<string, unknown> | null)?.converted === true),
  );
  for (const v of clan) {
    await notify({
      gameId,
      playerId: v.id,
      type: "vampire_clan",
      title: "🧛 Nouveau vampire",
      body: `${tPseudo} rejoint le clan.`,
      mjTitle: "🧛 Clan vampire",
      mjBody: `${v.pseudo} est notifié de l'arrivée de ${tPseudo}.`,
    });
  }
  if (clan.length > 0) {
    await notify({
      gameId,
      playerId: targetId,
      type: "vampire_clan_list",
      title: "🧛 Ton clan",
      body: clan.map((v) => v.pseudo).join(", "),
      mjTitle: "🧛 Liste clan",
      mjBody: `${tPseudo} reçoit la liste : ${clan.map((v) => v.pseudo).join(", ")}.`,
    });
  }

  // ── 1ère morsure de la partie : émergence ALÉATOIRE du Chasseur de Vampire ──
  // Déclenchée ICI (à la résolution), pas à la pose. Une seule fois par partie :
  // on vérifie qu'aucun Chasseur n'a JAMAIS existé — le role_slug persiste même
  // sur un Chasseur mort, donc ça couvre aussi les successions.
  const { data: allP } = await supabase
    .from("players")
    .select("id, pseudo, role_slug, role_meta, is_alive, is_mj")
    .eq("game_id", gameId);
  const allPlayers = (allP ?? []) as PlayerRow[];
  const chasseurEverExisted = allPlayers.some((p) => p.role_slug === "chasseur_de_vampire");
  if (!chasseurEverExisted) {
    // (Plus de toast public "Un vampire rôde…" : les annonces de la phase
    // d'annonce — morsure + émergence du Chasseur — couvrent déjà l'info.)
    await notifyMJ({
      gameId,
      type: "mj_announce",
      title: "🧛 1ère morsure",
      body: "Un joueur vient d'être mordu — un Chasseur de Vampire émerge.",
    });
    // Choix ALÉATOIRE parmi les civils vivants sans rôle fort (hors Vampire,
    // hors nouvelle recrue, hors clan déjà converti).
    const { data: rs } = await supabase
      .from("roles")
      .select("slug, faction, type, is_special")
      .eq("set_id", "set1");
    const roleBySlug = new Map(
      (
        (rs ?? []) as Array<{
          slug: string;
          faction: string;
          type: string;
          is_special: boolean | null;
        }>
      ).map((r) => [r.slug, r]),
    );
    const candidates = allPlayers.filter((p) => {
      if (!p.is_alive || p.is_mj || p.id === targetId || p.id === vampireId) return false;
      if ((p.role_meta as Record<string, unknown> | null)?.converted === true) return false;
      const r = roleBySlug.get(p.role_slug ?? "");
      return r?.faction === "Civil" && r?.type !== "BOULET" && !r?.is_special;
    });
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    if (pick) {
      await supabase.from("players").update({ role_slug: "chasseur_de_vampire" }).eq("id", pick.id);
      await patchMeta(pick.id, { chasseur_awakened_cycle: tour });
      await notify({
        gameId,
        playerId: pick.id,
        type: "role_swap",
        title: "🩸 Tu sens l'appel",
        body: "Tu deviens Chasseur de Vampire. Traque-les avant qu'il ne soit trop tard.",
        mjTitle: "🩸 Chasseur émerge",
        mjBody: `${pick.pseudo} devient Chasseur de Vampire (choix aléatoire, 1ère morsure).`,
      });
    }
  }

  // La conversion peut faire basculer la partie (tous les vivants devenus vampires).
  await checkAndEndGame(gameId);
  return true;
}

/** Promote a random alive non-promoted Acolyte to Stratège, transferring stratège state (Fidèles, ordre, kills_done). */
async function promoteAcolyteToStratege(
  gameId: string,
  temporary: boolean,
  sourceMeta: Meta,
): Promise<void> {
  const { data: aco } = await supabase
    .from("players")
    .select()
    .eq("game_id", gameId)
    .eq("is_alive", true)
    .eq("is_imprisoned", false);
  const acolytes = ((aco ?? []) as PlayerRow[]).filter((x) => {
    const mx = meta(x);
    return (
      x.role_slug &&
      x.role_slug !== "stratege" &&
      x.role_slug !== "tueur" &&
      mx.original_slug == null
    );
  });
  if (!acolytes.length) return;
  const { data: rs } = await supabase
    .from("roles")
    .select("slug, type, faction")
    .in(
      "slug",
      acolytes.map((a) => a.role_slug ?? ""),
    );
  const acoInfo = new Map(
    (rs ?? []).map((r: { slug: string; type: string; faction: string }) => [r.slug, r]),
  );
  const realAcolytes = acolytes.filter((a) => {
    const info = acoInfo.get(a.role_slug ?? "");
    return info && info.faction === "Méchant";
  });
  const heir = realAcolytes[Math.floor(Math.random() * realAcolytes.length)];
  if (!heir) return;
  const originalSlug = heir.role_slug;
  await supabase.from("players").update({ role_slug: "stratege" }).eq("id", heir.id);
  // Transfert intégral de l'état stratège : Fidèles, ordre, kills_done, compteurs d'usage.
  const heirMetaPatch: Meta = {
    promoted_from_acolyte: true,
    original_slug: originalSlug,
    temp_promotion: temporary,
    fideles: (sourceMeta.fideles as string[] | undefined) ?? [],
    fideles_ordered: (sourceMeta.fideles_ordered as string[] | undefined) ?? [],
    stratege_pending_order: (sourceMeta.stratege_pending_order as boolean | undefined) ?? false,
    stratege_kills_done: (sourceMeta.stratege_kills_done as number | undefined) ?? 0,
  };
  await patchMeta(heir.id, heirMetaPatch);
  await notify({
    gameId,
    playerId: heir.id,
    type: "succession_stratege",
    title: temporary ? "♟️ Tu deviens le Stratège (temporaire)" : "♟️ Tu es le nouveau Stratège",
    body: temporary
      ? "Le Stratège est en prison, tu prends le relais et tu reprends son ordre de bataille."
      : "Le Stratège est tombé. Tu reprends exactement son plan : Fidèles et ordre en cours sont à toi.",
    mjTitle: "♟️ Succession Stratège",
    mjBody: `${heir.pseudo} devient ${temporary ? "Stratège temporaire" : "le nouveau Stratège"} (succession Acolyte).`,
  });
}

/** Revert any temporary Acolyte→Stratège promotion, restoring meta to the original Stratège on release. */
async function revertTempStrategePromotion(gameId: string): Promise<void> {
  const { data: promoted } = await supabase
    .from("players")
    .select()
    .eq("game_id", gameId)
    .eq("role_slug", "stratege");
  for (const p of (promoted ?? []) as PlayerRow[]) {
    const mp = meta(p);
    if (mp.temp_promotion === true && typeof mp.original_slug === "string") {
      const original = mp.original_slug as string;
      // On laisse fideles_ordered / kills_done sur le joueur de retour : c'est le Stratège original qui reprend (son meta a été préservé).
      await supabase.from("players").update({ role_slug: original }).eq("id", p.id);
      await patchMeta(p.id, {
        promoted_from_acolyte: null,
        original_slug: null,
        temp_promotion: null,
        fideles: null,
        fideles_ordered: null,
        stratege_pending_order: null,
        stratege_kills_done: null,
      });
      await notify({
        gameId,
        playerId: p.id,
        type: "succession_end",
        title: "↩️ Tu reprends ton rôle",
        body: "Le Stratège est de retour, tu retrouves ta capacité d'origine.",
        mjTitle: "↩️ Succession Stratège annulée",
        mjBody: `${p.pseudo} retrouve son rôle d'origine (Stratège libéré).`,
      });
    }
  }
}

export async function imprisonPlayer(
  gameId: string,
  playerId: string,
  reason = "vote",
): Promise<boolean> {
  const { data: p } = await supabase
    .from("players")
    .select("pseudo, role_meta, role_slug")
    .eq("id", playerId)
    .single();
  const m = meta(p as { role_meta: unknown });
  if (m.immortal === true) {
    emit("imprison_blocked", `${(p as { pseudo: string } | null)?.pseudo} est immortel`, {
      playerId,
    });
    return false;
  }
  await supabase.from("players").update({ is_imprisoned: true }).eq("id", playerId);
  // Mémorise le tour d'incarcération pour les rôles qui exigent un délai (Exécuteur).
  const { data: gg } = await supabase
    .from("games")
    .select("current_tour")
    .eq("id", gameId)
    .single();
  const curTour = (gg as { current_tour: number } | null)?.current_tour ?? 1;
  await patchMeta(playerId, { imprisoned_since_cycle: curTour });
  emit("imprison", `🔒 ${(p as { pseudo: string } | null)?.pseudo} emprisonné (${reason})`, {
    playerId,
    reason,
  });
  const prisonerName = (p as { pseudo: string } | null)?.pseudo ?? "?";
  await notify({
    gameId,
    playerId,
    type: "imprisoned",
    title: "🔒 Tu es en prison",
    body: `Cause : ${reason}`,
    mjTitle: "🔒 Emprisonnement",
    mjBody: `${prisonerName} est emprisonné (cause : ${reason}).`,
  });
  // Tueur méchant emprisonné (Tueur, Croque-mitaine, …) → promotion temporaire d'un
  // Acolyte. On promeut aussi lorsqu'un héritier temporaire est lui-même emprisonné,
  // pour que la chaîne continue jusqu'au dernier Méchant vivant et libre.
  if (await isGenericMechantKiller((p as { role_slug?: string } | null)?.role_slug)) {
    await promoteAcolyteToTueur(gameId, true);
  }

  // Stratège emprisonné → promotion temporaire d'un Acolyte (reprise de l'ordre en cours)
  if ((p as { role_slug?: string } | null)?.role_slug === "stratege" && m.temp_promotion !== true) {
    await promoteAcolyteToStratege(gameId, true, m);
  }

  // Vampire emprisonné → un membre du clan (converti) hérite temporairement de la morsure.
  // La chaîne continue si l'héritier temporaire est lui-même emprisonné ou meurt.
  if ((p as { role_slug?: string } | null)?.role_slug === "vampire") {
    await promoteVampireHeir(gameId, playerId, true);
  }

  // Vengeur : l'être cher est emprisonné → débloquer la vengeance également.
  {
    const { data: vengeurRow } = await supabase
      .from("players")
      .select()
      .eq("game_id", gameId)
      .eq("role_slug", "vengeur")
      .maybeSingle();
    const vengeur = vengeurRow as PlayerRow | null;
    if (vengeur && vengeur.is_alive && !vengeur.is_imprisoned) {
      const vm = meta(vengeur);
      if ((vm.etre_cher as string | undefined) === playerId && vm.kill_unlocked !== true) {
        await patchMeta(vengeur.id, { kill_unlocked: true });
        const { grantItem, buildItem } = await import("./items");
        await grantItem(
          vengeur.id,
          buildItem("couteau", {
            from: "Vengeance",
            originFaction: "Civil",
            descriptionOverride:
              "Ton être cher est emprisonné. Utilise ce couteau pour te venger une seule fois.",
          }),
        );
        await notify({
          gameId,
          playerId: vengeur.id,
          type: "vengeance",
          title: "⚔️ Vengeance",
          body: `Ton être cher (${prisonerName}) a été emprisonné. Un couteau apparaît dans ton inventaire.`,
          mjTitle: "⚔️ Vengeance",
          mjBody: `${vengeur.pseudo} (Vengeur) reçoit un couteau : son être cher (${prisonerName}) est emprisonné.`,
        });
      }
    }
  }

  await checkAndEndGame(gameId);
  return true;
}

export async function releasePlayer(gameId: string, playerId: string) {
  const { data: p } = await supabase
    .from("players")
    .select("pseudo, role_slug, role_meta")
    .eq("id", playerId)
    .single();
  await supabase.from("players").update({ is_imprisoned: false }).eq("id", playerId);
  emit("release", `🔓 ${(p as { pseudo: string } | null)?.pseudo} libéré`, { playerId });
  // Tueur méchant d'origine libéré (Tueur, Croque-mitaine, …) → annule la promotion temporaire éventuelle
  const pm = meta(p as { role_meta: unknown });
  if (
    (await isGenericMechantKiller((p as { role_slug?: string } | null)?.role_slug)) &&
    pm.temp_promotion !== true
  ) {
    await revertTempPromotion(gameId);
  }
  // Stratège d'origine libéré → annule la promotion temporaire éventuelle
  if (
    (p as { role_slug?: string } | null)?.role_slug === "stratege" &&
    pm.temp_promotion !== true
  ) {
    await revertTempStrategePromotion(gameId);
  }
  // Vampire d'origine libéré → annule la promotion temporaire éventuelle (héritier rendu)
  if ((p as { role_slug?: string } | null)?.role_slug === "vampire" && pm.temp_promotion !== true) {
    await revertTempVampirePromotion(gameId);
  }
}

// ─────────────── Capability log ───────────────
export async function logCapability(opts: {
  gameId: string;
  actorId: string;
  targetId?: string;
  targetId2?: string;
  tour: number;
  phase: Phase;
  payload?: Record<string, unknown>;
}) {
  await supabase.from("role_actions").insert({
    game_id: opts.gameId,
    actor_player_id: opts.actorId,
    target_player_id: opts.targetId ?? null,
    target_player_id_2: opts.targetId2 ?? null,
    tour: opts.tour,
    phase: opts.phase,
    payload: (opts.payload ?? {}) as never,
  });
  emit("capability", "⚡ Capacité utilisée", opts);
}

// ─────────────── Per-role capability dispatch ───────────────
export type CapabilityResult = {
  ok: boolean;
  message: string;
  reveal?: Record<string, unknown>;
  /** Effet différé (résolu à l'Annonce) : l'issue réelle n'est pas encore
   *  connue. La carte Résultat affiche « En cours » jusqu'à la résolution. */
  pending?: boolean;
};

export async function executeCapability(opts: {
  gameId: string;
  actor: PlayerRow;
  role: RoleRow | null;
  targets: PlayerRow[];
  tour: number;
  phase: Phase;
  allPlayers: PlayerRow[];
  rolesBySlug: Map<string, RoleRow>;
  extra?: Record<string, unknown>;
}): Promise<CapabilityResult> {
  const role = opts.role;
  if (!role) return { ok: false, message: "Rôle inconnu" };
  const slug = role.slug;
  const t1 = opts.targets[0];
  const t2 = opts.targets[1];

  // Refresh actor + game (server-side guards)
  const { data: actorFresh } = await supabase
    .from("players")
    .select()
    .eq("id", opts.actor.id)
    .single();
  const actor = (actorFresh as PlayerRow) ?? opts.actor;
  if (!actor.is_alive) return { ok: false, message: "Tu n'es plus en vie." };
  if (actor.is_imprisoned) return { ok: false, message: "Tu es en prison." };
  const m = meta(actor);

  const { data: gameRow } = await supabase
    .from("games")
    .select("current_phase, status")
    .eq("id", opts.gameId)
    .single();
  const gp = gameRow as { current_phase: Phase; status: string } | null;
  if (!gp || gp.status === "ended") return { ok: false, message: "Partie terminée." };
  // Verrou de phase unifié : toutes les capacités actives se jouent en ENQUÊTE
  // (phase `free`). Le Débat ne porte aucune capacité active.
  if (!allowedActivePhases(role).has(gp.current_phase)) {
    return { ok: false, message: "À utiliser en Enquête." };
  }

  const playerCount = opts.allPlayers.filter((p) => !p.is_mj).length;
  const blocked = whyCannotUse(role, m, opts.tour, playerCount, gp.current_phase);
  // Bypass : si le Marionnettiste pilote la capacité de sa marionnette ce tour,
  // on ignore le motif "Capacité bloquée" (lui-même posé par le marionnettiste).
  const isPuppetCall =
    opts.extra?.__puppet_call === true &&
    (m.manipulated_by as string | undefined) ===
      (opts.extra?.__puppeteer_id as string | undefined) &&
    (m.manipulated_tour as number | undefined) === opts.tour;
  if (
    blocked &&
    role.phase_activation !== "Permanent" &&
    !(isPuppetCall && blocked === "Capacité bloquée")
  ) {
    return { ok: false, message: blocked };
  }

  const log = (payload: Record<string, unknown> = {}) =>
    logCapability({
      gameId: opts.gameId,
      actorId: actor.id,
      targetId: t1?.id,
      targetId2: t2?.id,
      tour: opts.tour,
      phase: opts.phase,
      payload: { role: slug, ...payload },
    });
  const used = async (extra: Record<string, unknown> = {}) => {
    await markUsage(actor, role, opts.tour);
    await log(extra);
  };

  const dispatchResult = await (async (): Promise<CapabilityResult> => {
    switch (slug) {
      // ── Guetteur : choisit une cible et consulte son journal de visiteurs ──
      case "guetteur": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (t1.id === actor.id)
          return { ok: false, message: "Tu dois surveiller un autre joueur." };
        if (isFalsified(meta(t1))) {
          await used({ effect: "guetteur_watch_falsified", target: t1.id });
          return { ok: true, message: FALSIFIED_MSG };
        }
        const history = {
          ...((m.guetteur_watch_history ?? {}) as Record<
            string,
            { target_id: string; target_pseudo: string }
          >),
          [String(opts.tour)]: { target_id: t1.id, target_pseudo: t1.pseudo },
        };
        await used({ effect: "guetteur_watch", target: t1.id });
        // Le journal est mémorisé après son action canonique : l'interface peut
        // prendre cet horodatage comme départ et ne jamais révéler le passé du tour.
        await patchMeta(actor.id, { guetteur_watch_history: history });
        return { ok: true, message: `Tu surveilles ${t1.pseudo} pour ce tour.` };
      }

      // ── Kill direct ──
      case "tueur": {
        if (!t1) return { ok: false, message: "Cible requise" };
        // Préviens les Acolytes (équipe Méchants) avant l'attaque : ils voient "Le Tueur a ciblé X"
        const { data: acolytes } = await supabase
          .from("players")
          .select("id, role_slug")
          .eq("game_id", opts.gameId)
          .eq("is_alive", true);
        const teammates = (
          (acolytes ?? []) as Array<{ id: string; role_slug: string | null }>
        ).filter(
          (p) =>
            p.id !== actor.id && opts.rolesBySlug.get(p.role_slug ?? "")?.faction === "Méchant",
        );
        for (const tm of teammates) {
          await notify({
            gameId: opts.gameId,
            playerId: tm.id,
            type: "killer_targeted",
            title: "🎯 Le Tueur a ciblé",
            body: `${t1.pseudo} est la cible de cette nuit.`,
          });
        }
        // V2 : on POSE une intention DEFERRED. Le resolver la traite à l'Annonce,
        // en revérifiant protection / blocage / cible vivante.
        await submitIntent({
          gameId: opts.gameId,
          tour: opts.tour,
          phase: opts.phase,
          actorId: actor.id,
          targetId: t1.id,
          category: "ATTACK",
          timing: "DEFERRED",
          source: "role:tueur",
          payload: { kill_reason: "tueur", target_pseudo: t1.pseudo, mechant_mechanic: true },
        });
        await used({ effect: "kill_intent", target: t1.id });
        return { ok: true, pending: true, message: `Dénouement à l'Annonce.` };
      }
      case "vengeur": {
        // Le kill du Vengeur n'est PAS porté par la capacité de rôle : c'est l'OBJET
        // (le couteau « Vengeance » remis quand l'être cher meurt) qui tue, via le flux
        // objet → resolver (ATTACK différée, déjà soumise aux protections). La capacité
        // de rôle se limite au choix de l'être cher (géré côté UI) puis reste passive.
        if (m.kill_unlocked === true) {
          return {
            ok: false,
            message: "Vengeance débloquée — utilise ton couteau depuis l'inventaire.",
          };
        }
        return {
          ok: false,
          message:
            "Capacité passive — si ton être cher meurt, un couteau apparaît dans ton inventaire.",
        };
      }
      case "executeur": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (!t1.is_imprisoned) return { ok: false, message: "Cible non emprisonnée" };
        // Doit avoir passé un tour complet en prison.
        const tMeta = meta(t1);
        const since = (tMeta.imprisoned_since_cycle as number | undefined) ?? opts.tour;
        if (opts.tour - since < 1)
          return { ok: false, message: "Attends qu'elle ait passé 1 tour complet en prison." };
        const ok = await killPlayer(opts.gameId, t1.id, "exécution");
        const execRole = opts.rolesBySlug.get(t1.role_slug ?? "");
        const roleLabel = execRole ? `${execRole.icon} ${execRole.name_fr}` : "rôle inconnu";
        if (ok) {
          // L'exécution est un acte public et délibéré : elle révèle le RÔLE COMPLET
          // du condamné à TOUS (pas seulement la faction comme une mort ordinaire).
          const { data: allP } = await supabase
            .from("players")
            .select("id")
            .eq("game_id", opts.gameId);
          const rows = ((allP ?? []) as Array<{ id: string }>).map((row) => ({
            game_id: opts.gameId,
            player_id: row.id,
            type: "execution_reveal",
            title: `⚖️ Exécution de ${t1.pseudo}`,
            body: `Rôle révélé : ${roleLabel}${execRole ? ` — ${execRole.faction}` : ""}.`,
            payload: {
              target_id: t1.id,
              role_slug: t1.role_slug,
              faction: execRole?.faction ?? null,
              tour: opts.tour,
            } as never,
          }));
          if (rows.length) await supabase.from("notifications").insert(rows);
        }
        await used({ effect: "execute", revealed_slug: t1.role_slug });
        return { ok, message: ok ? `${t1.pseudo} exécuté — ${roleLabel}` : "Échec" };
      }

      // ── Cuisinier : passif (couteau au setup, aucune action active) ──
      case "cuisinier": {
        return {
          ok: false,
          message: "Capacité passive — utilise ton couteau depuis l'inventaire.",
        };
      }

      // ── Armurier : 1×/Enquête. Remet anonymement un couteau à un joueur vivant.
      // Le porteur ignore l'identité du donneur. Le kill par couteau est résolu au
      // à la prochaine Annonce (mécanique standard de l'objet couteau).
      case "armurier": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (!t1.is_alive) return { ok: false, message: "Cible morte" };
        const { grantItem, buildItem } = await import("./items");
        await grantItem(
          t1.id,
          buildItem("couteau", {
            from: "Inconnu",
            originFaction: "Méchant",
            nameOverride: "Couteau de l'Armurier",
            descriptionOverride:
              "Un couteau anonyme remis par l'Armurier apparaît dans ton inventaire. Tu peux l'utiliser une fois pour tuer un joueur — résolu à la prochaine Annonce.",
            // `gifted_by_id` : permet de notifier l'Armurier quand SON couteau est
            // utilisé (cf. useItem, case "couteau"). Reste invisible au porteur.
            payload: {
              mechant_origin: true,
              gifted_by_id: actor.id,
              gifted_by_pseudo: actor.pseudo,
            },
          }),
        );
        await notify({
          gameId: opts.gameId,
          playerId: t1.id,
          type: "anon_gift",
          title: "🗡️ Un couteau apparaît",
          body: "Tu trouves un couteau dans ton inventaire. Tu ignores qui te l'a remis. Utilisable une fois pour tuer.",
          mjTitle: "🗡️ Armurier — livraison",
          mjBody: `${actor.pseudo} (Armurier) remet anonymement un couteau à ${t1.pseudo}.`,
        });
        await used({ effect: "armurier_gift", target_pseudo: t1.pseudo });
        return { ok: true, message: `Un couteau a été remis anonymement à ${t1.pseudo}.` };
      }

      // ── Empoisonneur : 1×/Enquête. Malédiction permanente, NON LÉTALE.
      // Victoire = tous les survivants hors prison sont empoisonnés.
      case "empoisonneur": {
        if (!t1) return { ok: false, message: "Cible requise" };
        const poisoned = (m.poisoned_targets as string[] | undefined) ?? [];
        if (!poisoned.includes(t1.id)) {
          await patchMeta(actor.id, { poisoned_targets: [...poisoned, t1.id] });
        }
        await submitIntent({
          gameId: opts.gameId,
          tour: opts.tour,
          phase: opts.phase,
          actorId: actor.id,
          targetId: t1.id,
          // CASCADE = layer 3 : résolu APRÈS les attaques. Annulé si l'Empoisonneur
          // meurt ce tour (symétrie Vampire) ; bloqué si la cible est protégée.
          category: "CASCADE",
          timing: "DEFERRED",
          source: "role:empoisonneur",
          payload: { sub_effect: "poison_curse", target_pseudo: t1.pseudo },
        });
        await used({ effect: "poison_curse" });
        return { ok: true, pending: true, message: `Dénouement à l'Annonce.` };
      }

      // ── Vampire (conversion) ──
      case "vampire": {
        if (!t1) return { ok: false, message: "Cible requise" };
        const tRole = opts.rolesBySlug.get(t1.role_slug ?? "");
        if (tRole?.slug === "vampire" || meta(t1).converted === true) {
          return { ok: false, message: "Déjà vampire" };
        }
        if (tRole?.slug === "chasseur_de_vampire") {
          // Immunisé — MAIS la morsure est CONSOMMÉE (le Vampire a fait son choix).
          // Il apprend qu'il a visé le Chasseur, au prix de son tour : pas de
          // morsure « gratuite » qui donnerait l'info ET la possibilité d'enchaîner.
          await used({ effect: "bite_blocked_chasseur", target: t1.id });
          return {
            ok: false,
            message: "Le Chasseur de Vampire est immunisé — ta morsure est perdue.",
          };
        }
        // Bénédiction du Saint : annule la morsure sans consommer le tour.
        if (
          await tryBlessingBlock({
            gameId: opts.gameId,
            tour: opts.tour,
            phase: opts.phase,
            actor: { id: actor.id, pseudo: actor.pseudo },
            actorRole: { faction: role.faction, type: role.type ?? null },
            target: { id: t1.id, pseudo: t1.pseudo, role_meta: t1.role_meta },
            actionLabel: "morsure vampire",
          })
        )
          return { ok: false, message: `${t1.pseudo} est sous bénédiction — morsure annulée.` };
        // Conversion ET émergence du Chasseur sont DIFFÉRÉES : la morsure est posée
        // en intention CONVERT (layer 3), résolue à la prochaine Annonce APRÈS
        // les attaques (si le Vampire est tué ce tour, le resolver l'annule). La
        // rumeur publique + le choix ALÉATOIRE du Chasseur (1ère morsure) sont
        // déclenchés à la résolution — voir applyVampireConversion.
        await used({ effect: "bite" });
        await submitIntent({
          gameId: opts.gameId,
          tour: opts.tour,
          phase: opts.phase,
          actorId: actor.id,
          targetId: t1.id,
          category: "CONVERT",
          timing: "DEFERRED",
          source: "role:vampire",
          payload: { target_pseudo: t1.pseudo },
        });
        return {
          ok: true,
          message: `Morsure programmée sur ${t1.pseudo} — résolue à la prochaine Annonce`,
        };
      }

      case "chasseur_de_vampire": {
        if (!t1) return { ok: false, message: "Cible requise" };
        const isVamp = t1.role_slug === "vampire" || meta(t1).converted === true;
        if (isVamp) {
          await submitIntent({
            gameId: opts.gameId,
            tour: opts.tour,
            phase: opts.phase,
            actorId: actor.id,
            targetId: t1.id,
            category: "ATTACK",
            timing: "DEFERRED",
            source: "role:chasseur_de_vampire",
            payload: { kill_reason: "chasseur_de_vampire", target_pseudo: t1.pseudo },
          });
        }
        await used({ effect: "track", isVampire: isVamp });
        return {
          ok: true,
          message: isVamp
            ? `🔴 ${t1.pseudo} EST un vampire — exécution programmée à l'Annonce`
            : `🟢 ${t1.pseudo} n'est pas un vampire`,
          reveal: { isVampire: isVamp },
        };
      }

      // ── Investigations ──
      // Détective & Assistant : trio par TYPE inter-faction.
      // On révèle le vrai rôle + 2 leurres de type compatible (toutes factions
      // confondues selon le mapping). Le Tueur n'est PAS masqué ici (il l'est
      // seulement pour Suspicieux/Innocents/Boussole). L'Usurpateur (cover_slug)
      // reste masqué. La Falsification garde son message dédié.
      case "assistant_du_detective": {
        if (!t1) return { ok: false, message: "Cible requise" };
        const target = opts.allPlayers.find((p) => p.id === t1.id);
        const tMeta = meta(target);
        if (isFalsified(tMeta)) {
          await used({ effect: "investigate_falsified", target: t1.id });
          return { ok: true, message: FALSIFIED_MSG };
        }
        let trueSlug = target?.role_slug ?? "";
        // Usurpateur cover : on enquête sur la couverture, pas sur le vrai rôle.
        if (typeof tMeta.cover_slug === "string") trueSlug = tMeta.cover_slug as string;
        const trueRole = opts.rolesBySlug.get(trueSlug);
        const trueName = trueRole?.name_fr ?? "Citoyen";

        // Mapping cross-faction par type. La clé = couple (faction, type) de la cible.
        // Valeur = liste de couples acceptés pour les leurres.
        type FT = { faction: string; type: string };
        const compatible = (a: FT, b: FT): boolean => {
          if (a.faction === b.faction && a.type === b.type) return true;
          // INVESTIGATION : toutes factions confondues.
          if (a.type === "INVESTIGATION" && b.type === "INVESTIGATION") return true;
          // SUPPORT : Civil/Méchant + Neutre BÉNIN/CHAOS.
          if (a.type === "SUPPORT") {
            if (b.type === "SUPPORT") return true;
            if (b.faction === "Neutre" && (b.type === "BÉNIN" || b.type === "CHAOS")) return true;
          }
          // PROTECTEUR : Civil + Neutre BÉNIN.
          if (a.type === "PROTECTEUR") {
            if (b.type === "PROTECTEUR") return true;
            if (b.faction === "Neutre" && b.type === "BÉNIN") return true;
          }
          // TUEUR : Civil/Méchant + Neutre MAL.
          if (a.type === "TUEUR") {
            if (b.type === "TUEUR") return true;
            if (b.faction === "Neutre" && b.type === "MAL") return true;
          }
          // TROMPERIE : Méchant + Neutre MAL/CHAOS.
          if (a.type === "TROMPERIE") {
            if (b.type === "TROMPERIE") return true;
            if (b.faction === "Neutre" && (b.type === "MAL" || b.type === "CHAOS")) return true;
          }
          // Neutres : mapping inverse vers types similaires des autres factions.
          if (a.faction === "Neutre") {
            if (a.type === "MAL" && (b.type === "TUEUR" || b.type === "TROMPERIE")) return true;
            if (a.type === "CHAOS" && (b.type === "TROMPERIE" || b.type === "SUPPORT")) return true;
            if (a.type === "BÉNIN" && (b.type === "PROTECTEUR" || b.type === "SUPPORT"))
              return true;
          }
          return false;
        };

        const EXCLUDED_SLUGS = new Set(["detective", "assistant_du_detective"]);
        const isPickable = (r: {
          slug: string;
          type: string;
          is_special: boolean | null;
          emergent: boolean | null;
        }) => !EXCLUDED_SLUGS.has(r.slug) && !r.is_special && !r.emergent && r.type !== "BOULET";

        const targetFT: FT = {
          faction: trueRole?.faction ?? "Civil",
          type: trueRole?.type ?? "SUPPORT",
        };
        const allRoles = Array.from(opts.rolesBySlug.values()).filter(
          (r) => r.slug !== trueSlug && isPickable(r),
        );

        // Pool primaire : types compatibles selon le mapping.
        let decoyPool = allRoles.filter((r) =>
          compatible(targetFT, { faction: r.faction, type: r.type }),
        );
        // Fallback 1 : même faction (peu importe le type, hors BOULET).
        if (decoyPool.length < 2) {
          const extra = allRoles.filter(
            (r) => r.faction === targetFT.faction && !decoyPool.includes(r),
          );
          decoyPool = [...decoyPool, ...extra];
        }
        // Fallback 2 : n'importe quel rôle pickable.
        if (decoyPool.length < 2) {
          const extra = allRoles.filter((r) => !decoyPool.includes(r));
          decoyPool = [...decoyPool, ...extra];
        }

        // Distribution des factions dans le trio :
        // - jamais 3 rôles de la même faction
        // - 60% : 2 cartes partagent la faction du vrai (1 décoy même faction + 1 décoy autre faction)
        // - 40% : la faction du vrai est minoritaire (les 2 décoys sont d'une autre faction)
        const sameFaction = decoyPool.filter((r) => r.faction === targetFT.faction);
        const otherFaction = decoyPool.filter((r) => r.faction !== targetFT.faction);
        const shuffledSame = shuffle(sameFaction);
        const shuffledOther = shuffle(otherFaction);

        let picked: typeof decoyPool = [];
        const wantMajority = Math.random() < 0.6;
        if (wantMajority && shuffledSame.length >= 1 && shuffledOther.length >= 1) {
          picked = [shuffledSame[0], shuffledOther[0]];
        } else if (!wantMajority && shuffledOther.length >= 2) {
          picked = [shuffledOther[0], shuffledOther[1]];
        } else if (shuffledSame.length >= 1 && shuffledOther.length >= 1) {
          // Fallback : assure 1+1 si possible.
          picked = [shuffledSame[0], shuffledOther[0]];
        } else if (shuffledOther.length >= 2) {
          picked = [shuffledOther[0], shuffledOther[1]];
        } else {
          // Pool trop pauvre : on prend ce qu'on a (peut donner 2 même faction, mais
          // le vrai partage cette faction → 3 même faction. On évite en mixant avec
          // n'importe quel rôle pickable d'une autre faction si dispo.)
          const anyOther = allRoles.filter((r) => r.faction !== targetFT.faction);
          if (shuffledSame.length >= 1 && anyOther.length >= 1) {
            picked = [shuffledSame[0], shuffle(anyOther)[0]];
          } else {
            picked = shuffle(decoyPool).slice(0, 2);
          }
        }

        const decoys = picked.map((r) => r.name_fr);
        const trio = shuffle([trueName, ...decoys]);
        await used({ effect: "investigate_trio", trio });
        return { ok: true, message: `Trio : ${trio.join(" · ")}`, reveal: { trio } };
      }
      case "boussole": {
        if (!t1 || !t2) return { ok: false, message: "Deux cibles requises" };
        const m1 = meta(t1),
          m2 = meta(t2);
        if (isFalsified(m1) || isFalsified(m2)) {
          await used({ effect: "compare_falsified", t1: t1.id, t2: t2.id });
          return { ok: true, message: FALSIFIED_MSG };
        }
        const r1 = opts.rolesBySlug.get(t1.role_slug ?? "");
        const r2 = opts.rolesBySlug.get(t2.role_slug ?? "");
        const same = r1?.faction === r2?.faction;
        await used({ effect: "compare", same });
        return { ok: true, message: same ? "Même camp" : "Camps opposés", reveal: { same } };
      }

      // ── Protections ──
      case "majordome": {
        if (!t1) return { ok: false, message: "Cible requise" };
        // Idempotence : la protection ne se pose qu'une fois par tour. Si la capacité
        // est déclenchée de façon concurrente (triple-clic, hôte multi-onglets,
        // ré-entrée du driver de bots) avant que markUsage n'ait persisté le quota,
        // tous les appels passeraient whyCannotUse et insèreraient une intention +
        // une notif en double. On revérifie l'absence d'intention déjà posée ce tour.
        const { data: existingProtect } = await supabase
          .from("role_actions")
          .select("id")
          .eq("game_id", opts.gameId)
          .eq("actor_player_id", actor.id)
          .eq("tour", opts.tour)
          .eq("source", "role:majordome")
          .eq("category", "PROTECT")
          .limit(1)
          .maybeSingle();
        if (existingProtect) {
          return { ok: true, message: `${t1.pseudo} : protection déjà programmée` };
        }
        await submitIntent({
          gameId: opts.gameId,
          tour: opts.tour,
          phase: opts.phase,
          actorId: actor.id,
          targetId: t1.id,
          category: "PROTECT",
          timing: "DEFERRED",
          source: "role:majordome",
          payload: { target_pseudo: t1.pseudo },
        });
        await used({ effect: "butler_intent", target: t1.id });
        await notifyMJ({
          gameId: opts.gameId,
          type: "protected",
          title: "🛡️ Protection Majordome",
          body: `${actor.pseudo} (Majordome) protège ${t1.pseudo} — résolu à l'Annonce.`,
        });
        return { ok: true, message: `${t1.pseudo} : protection programmée` };
      }
      case "babysitter": {
        if (!t1) return { ok: false, message: "Cible requise" };
        const c = opts.tour + 1;
        // Babysitter : la protection et le blocage de capacité s'appliquent au
        // PROCHAIN tour (pas ce tour). L'intention de protection
        // est donc programmée pour l'Annonce du tour suivant.
        await submitIntent({
          gameId: opts.gameId,
          tour: c,
          phase: opts.phase,
          actorId: actor.id,
          targetId: t1.id,
          category: "PROTECT",
          timing: "DEFERRED",
          source: "role:babysitter",
          payload: { target_pseudo: t1.pseudo, blocks_next_tour: true },
        });
        await patchMeta(t1.id, { blocked_until_cycle: c, blocked_from_cycle: c });
        await used({ effect: "babysit_intent" });
        await notify({
          gameId: opts.gameId,
          playerId: t1.id,
          type: "babysat",
          title: "🧸 Babysitter",
          body: "Au prochain tour, tu seras à l'abri de la mort mais ta capacité sera bloquée.",
          mjTitle: "🧸 Babysitter",
          mjBody: `${actor.pseudo} (Babysitter) gardera ${t1.pseudo} au prochain tour.`,
        });
        return { ok: true, message: `${t1.pseudo} gardé au prochain tour` };
      }
      case "ange_gardien": {
        const target = (m.ward as string | undefined) ?? t1?.id;
        if (!target) return { ok: false, message: "Cible requise" };
        await submitIntent({
          gameId: opts.gameId,
          tour: opts.tour,
          phase: opts.phase,
          actorId: actor.id,
          targetId: target,
          category: "PROTECT",
          timing: "DEFERRED",
          source: "role:ange_gardien",
        });
        await used({ effect: "shield_intent", target });
        return { ok: true, message: "Bouclier programmé — actif à l'Annonce" };
      }
      case "paranoiaque": {
        const targetId = m.paranoid_target_id as string | undefined;
        if (!targetId) return { ok: false, message: "Aucune cible assignée" };
        const target = opts.allPlayers.find((p) => p.id === targetId);
        if (!target) return { ok: false, message: "Cible introuvable" };
        if (!target.is_alive) return { ok: false, message: "Ta cible est déjà morte" };
        const choice = (opts.extra?.choice as string | undefined) ?? null;
        if (choice !== "protect" && choice !== "kill") {
          return { ok: false, message: "Choisis : protéger ou tuer" };
        }
        if (choice === "protect") {
          await submitIntent({
            gameId: opts.gameId,
            tour: opts.tour,
            phase: opts.phase,
            actorId: actor.id,
            targetId: target.id,
            category: "PROTECT",
            timing: "DEFERRED",
            source: "role:paranoiaque",
          });
          await used({ effect: "paranoid_protect", target: target.id });
          return { ok: true, message: `Tu protèges ${target.pseudo} à l'Annonce` };
        } else {
          await submitIntent({
            gameId: opts.gameId,
            tour: opts.tour,
            phase: opts.phase,
            actorId: actor.id,
            targetId: target.id,
            category: "ATTACK",
            timing: "DEFERRED",
            source: "role:paranoiaque",
            payload: { kill_reason: "paranoiaque", target_pseudo: target.pseudo },
          });
          await used({ effect: "paranoid_kill", target: target.id });
          return { ok: true, message: `Tu attaques ${target.pseudo} à l'Annonce` };
        }
      }
      case "saint": {
        const target = t1 ?? actor;
        // 1× par partie — gardé en redondance avec l'usage_label.
        if (m.saint_used === true) {
          return { ok: false, message: "Bénédiction déjà utilisée." };
        }
        // Bénédiction : 2 cycles complets à partir de la phase d'activation.
        // Activée en Enquête T3 → valide jusqu'à la fin de l'Enquête T5.
        await submitIntent({
          gameId: opts.gameId,
          tour: opts.tour,
          phase: opts.phase,
          actorId: actor.id,
          targetId: target.id,
          category: "PROTECT",
          timing: "DEFERRED",
          source: "role:saint",
          payload: { blessed: true },
        });
        await patchMeta(target.id, {
          blessed_until_cycle: opts.tour + 2,
          blessed_until_phase: opts.phase,
          blessed_by_saint: true,
          blessed_by_saint_id: actor.id,
        });
        await patchMeta(actor.id, {
          saint_used: true,
          saint_target_id: target.id,
          saint_target_pseudo: target.pseudo,
          saint_blessed_at_tour: opts.tour,
          saint_blessed_at_phase: opts.phase,
        });
        await used({ effect: "bless_intent" });
        return {
          ok: true,
          message: `${target.pseudo} béni — protection pendant 2 tours complets.`,
        };
      }

      // ── Acolytes / Manipulation ──
      case "marionnettiste": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (t1.role_slug === "tueur") return { ok: false, message: "Refusé : cible = Tueur" };
        if (
          await tryBlessingBlock({
            gameId: opts.gameId,
            tour: opts.tour,
            phase: opts.phase,
            actor: { id: actor.id, pseudo: actor.pseudo },
            actorRole: { faction: role.faction, type: role.type ?? null },
            target: { id: t1.id, pseudo: t1.pseudo, role_meta: t1.role_meta },
            actionLabel: "manipulation marionnette",
          })
        )
          return {
            ok: false,
            message: `${t1.pseudo} est sous bénédiction — manipulation annulée.`,
          };
        // Verrouille la marionnette pour le PROCHAIN tour.
        // L'effet (statut "Manipulé" + blocage de la capacité de la cible) est appliqué à la transition de tour.
        await patchMeta(actor.id, {
          puppet_id: t1.id,
          puppet_pseudo: t1.pseudo,
          puppet_active_tour: opts.tour + 1,
        });
        await used({ effect: "puppet_schedule", target: t1.id });
        return {
          ok: true,
          message: `Au prochain tour, tu prendras le contrôle de la capacité de ${t1.pseudo}.`,
        };
      }

      case "maitre_chanteur": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (
          await tryBlessingBlock({
            gameId: opts.gameId,
            tour: opts.tour,
            phase: opts.phase,
            actor: { id: actor.id, pseudo: actor.pseudo },
            actorRole: { faction: role.faction, type: role.type ?? null },
            target: { id: t1.id, pseudo: t1.pseudo, role_meta: t1.role_meta },
            actionLabel: "chantage",
          })
        )
          return { ok: false, message: `${t1.pseudo} est sous bénédiction — chantage annulé.` };
        await patchMeta(t1.id, {
          blackmail_from_cycle: opts.tour + 1,
          blackmail_until_cycle: opts.tour + 1,
        });
        await used({ effect: "blackmail" });
        await notify({
          gameId: opts.gameId,
          playerId: t1.id,
          type: "blackmail",
          title: "🤐 Sous chantage",
          body: "Demain, tu ne pourras pas agir.",
          mjTitle: "🤐 Chantage",
          mjBody: `${actor.pseudo} (Maître chanteur) fait chanter ${t1.pseudo} pour le prochain tour.`,
        });
        return { ok: true, message: `${t1.pseudo} sous chantage (J+1)` };
      }
      case "cleaner": {
        // Toggle « Effacer le prochain meurtre du Tueur ».
        // Garde par tour : sans ça, un bot (ou un clic répété) ajuste l'effaceur à
        // chaque tick → une entrée role_actions à chaque fois = spam du récit MJ.
        if (m.clean_toggle_cycle === opts.tour) {
          return { ok: false, message: "Tu as déjà ajusté l'effaceur ce tour-ci." };
        }
        const armed = m.clean_armed === true;
        const next = !armed;
        await patchMeta(actor.id, { clean_armed: next, clean_toggle_cycle: opts.tour });
        await log({ effect: next ? "clean_arm" : "clean_disarm" });
        const msg = next
          ? "🧹 Effaceur armé : le prochain meurtre du Tueur sera nettoyé (pas d'annonce publique, pas d'autopsie)."
          : "🧹 Effaceur désarmé.";
        if (next) {
          await notify({
            gameId: opts.gameId,
            playerId: actor.id,
            type: "clean_armed",
            title: "🧹 Effaceur armé",
            body: "Le prochain meurtre du Tueur passera inaperçu.",
            mjTitle: "🧹 Cleaner",
            mjBody: `${actor.pseudo} (Cleaner) arme l'effaçage du prochain meurtre du Tueur.`,
          });
        }
        return { ok: true, message: msg };
      }
      case "usurpateur": {
        // Couverture posée au setup ; ici on rappelle la cover active au joueur.
        const cover = m.cover_slug as string | undefined;
        const r = cover ? opts.rolesBySlug.get(cover) : undefined;
        await log({ effect: "cover_check", cover });
        return {
          ok: true,
          message: r ? `Tu apparais comme ${r.icon} ${r.name_fr}` : "Couverture en place",
        };
      }

      // ── Neutres divers ──
      case "entremetteur": {
        if (!t1 || !t2) return { ok: false, message: "Choisis 2 joueurs à lier." };
        if (t1.id === t2.id) return { ok: false, message: "Choisis 2 joueurs différents." };
        if (t1.id === actor.id || t2.id === actor.id)
          return { ok: false, message: "Tu ne peux pas te lier toi-même." };
        await patchMeta(t1.id, { linked_with: t2.id });
        await patchMeta(t2.id, { linked_with: t1.id });
        await patchMeta(actor.id, { linked_pair: [t1.id, t2.id], pending_link_choice: false });
        await notify({
          gameId: opts.gameId,
          playerId: t1.id,
          type: "linked_partner",
          title: "💞 Lien noué",
          body: `Ton âme sœur secrète : ${t2.pseudo}. Si l'un meurt, l'autre suit.`,
          mjTitle: "💞 Lien",
          mjBody: `Lien noué entre ${t1.pseudo} et ${t2.pseudo}.`,
        });
        await notify({
          gameId: opts.gameId,
          playerId: t2.id,
          type: "linked_partner",
          title: "💞 Lien noué",
          body: `Ton âme sœur secrète : ${t1.pseudo}. Si l'un meurt, l'autre suit.`,
          mjTitle: "💞 Lien",
          mjBody: `Lien noué entre ${t2.pseudo} et ${t1.pseudo}.`,
        });
        await notifyMJ({
          gameId: opts.gameId,
          type: "link",
          title: "💞 Liens tissés",
          body: `${actor.pseudo} (Entremetteur) lie ${t1.pseudo} ↔ ${t2.pseudo}.`,
        });
        await used({ effect: "link_setup", targetId: t1.id, target2Id: t2.id });
        return { ok: true, message: `Couple lié : ${t1.pseudo} ↔ ${t2.pseudo}` };
      }

      // ── Facteur ──
      case "facteur": {
        if (!t1) return { ok: false, message: "Cible requise" };
        await used({ effect: "deliver_letter" });
        const { grantItem, buildItem } = await import("./items");
        await grantItem(
          t1.id,
          buildItem("lettre", {
            from: "Anonyme",
            descriptionOverride: "Une lettre anonyme t'a été remise.",
          }),
        );
        await notify({
          gameId: opts.gameId,
          playerId: t1.id,
          type: "letter",
          title: "📨 Lettre anonyme",
          body: "Une lettre anonyme vient d'apparaître dans ton inventaire.",
          mjTitle: "📨 Lettre",
          mjBody: `${actor.pseudo} (Facteur) dépose une lettre dans l'inventaire de ${t1.pseudo}.`,
        });
        return { ok: true, message: `Lettre déposée à ${t1.pseudo}` };
      }

      // ── Passifs (consultation manuelle) ──
      case "medecin_legiste":
      case "medium":
      case "temoin": {
        await log({ effect: "passive_use" });
        return { ok: true, message: "Capacité passive — voir notifications" };
      }

      case "croque_mitaine": {
        if (!t1 || !t2) return { ok: false, message: "Deux cibles requises" };
        const pick = Math.random() < 0.5 ? t1 : t2;
        const other = pick.id === t1.id ? t2 : t1;
        await submitIntent({
          gameId: opts.gameId,
          tour: opts.tour,
          phase: opts.phase,
          actorId: actor.id,
          targetId: pick.id,
          category: "ATTACK",
          timing: "DEFERRED",
          source: "role:croque_mitaine",
          payload: {
            kill_reason: "croque_mitaine",
            target_pseudo: pick.pseudo,
            spared_id: other.id,
            spared_pseudo: other.pseudo,
            mechant_mechanic: true,
          },
        });
        // Notifie le survivant : il a senti le souffle du Croque-mitaine.
        await notify({
          gameId: opts.gameId,
          playerId: other.id,
          type: "boogey_breath",
          title: "👻 Un souffle glacé",
          body: "Tu as senti son souffle dans ton dos… le Croque-mitaine t'a frôlé.",
          mjTitle: "👻 Croque-mitaine",
          mjBody: `${other.pseudo} a été épargné de justesse par le Croque-mitaine.`,
        });
        await used({ effect: "kill_one_of_two_intent", picked: pick.id, spared: other.id });
        return {
          ok: true,
          message: `${pick.pseudo} : attaque programmée — ${other.pseudo} épargné`,
        };
      }
      case "veuve_noire": {
        if (!t1 || !t2) return { ok: false, message: "Choisis 2 cibles." };
        if (t1.id === t2.id) return { ok: false, message: "Choisis 2 joueurs différents." };
        // Mémorise la paire active : si un époux vote contre toi ce tour,
        // les DEUX époux meurent à la PROCHAINE Annonce (closeVote programme l'attaque).
        const pairs = (m.veuve_pairs as Array<{ tour: number; pair: string[] }> | undefined) ?? [];
        pairs.push({ tour: opts.tour, pair: [t1.id, t2.id] });
        const married = (m.married_targets as string[] | undefined) ?? [];
        await patchMeta(actor.id, {
          veuve_pairs: pairs,
          married_targets: Array.from(new Set([...married, t1.id, t2.id])),
        });
        await used({ effect: "veuve_pair", pair: [t1.id, t2.id] });
        const spouseText = `${t1.pseudo} & ${t2.pseudo}`;
        await notify({
          gameId: opts.gameId,
          playerId: actor.id,
          type: "veuve_pair",
          title: "🕷️ Toile tendue",
          body: `Si ${spouseText} vote contre toi ce tour, les deux mourront à la prochaine Annonce.`,
          mjTitle: "🕷️ Veuve noire",
          mjBody: `${actor.pseudo} (Veuve noire) cible ${spouseText} — déclencheur sur vote contre elle.`,
        });
        return { ok: true, message: `${spouseText} sous toile` };
      }
      case "heritier_dechu": {
        if (!t1) return { ok: false, message: "Cible requise" };
        const tMeta = meta(t1);
        // Falsification : comme tout investigateur, l'Héritier est aveuglé.
        if (isFalsified(tMeta)) {
          await used({ effect: "heir_falsified", target: t1.id });
          return { ok: true, message: FALSIFIED_MSG };
        }
        // Investigation : apprend si la cible est suspicieuse ou non. Contrairement
        // au Policier, l'Héritier conserve le verdict brut (police_verdict). MAIS il
        // perce la couverture de l'Usurpateur (qui ressort suspect) — ce masquage ne
        // trompe que les enquêtes qui révèlent un rôle, pas le verdict binaire.
        const override = tMeta.police_verdict_override as "suspicious" | "innocent" | undefined;
        const r = opts.rolesBySlug.get(t1.role_slug ?? "");
        const verdict =
          override ?? (t1.role_slug === "usurpateur" ? "suspicious" : (r?.police_verdict ?? "na"));
        const isSuspect = verdict === "suspicious";
        await used({ effect: "heir_inquiry", target: t1.id, verdict });
        await notify({
          gameId: opts.gameId,
          playerId: actor.id,
          type: "heir_inquiry",
          title: "👑 Héritier — Enquête",
          body: isSuspect
            ? `🟠 ${t1.pseudo} éveille les soupçons.`
            : `🟢 Rien à signaler sur ${t1.pseudo}.`,
          mjTitle: "👑 Héritier déchu",
          mjBody: `${actor.pseudo} (Héritier déchu) enquête sur ${t1.pseudo} → ${verdict}.`,
        });
        return {
          ok: true,
          message: isSuspect ? `🟠 ${t1.pseudo} : soupçons` : `🟢 ${t1.pseudo} : rien à signaler`,
        };
      }
      case "parieur_tricheur": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (t1.id === actor.id) return { ok: false, message: "Choisis un autre joueur." };
        // Le tricheur lance 3 dés à 6 faces et garde le MEILLEUR ; la cible lance 1 d6.
        // (3 dés au lieu de 2 → ses chances de gagner le pari montent de ~69 % à ~79 %.)
        // Égalité → on relance un round complet jusqu'à départage (personne ne meurt
        // sur une égalité). Garde-fou anti-boucle : 50 rounds max (largement suffisant).
        const d6 = () => 1 + Math.floor(Math.random() * 6);
        const rounds: Array<{ a: number; b: number; c: number; best: number; them: number }> = [];
        let meBest = 0;
        let themRoll = 0;
        for (let i = 0; i < 50; i++) {
          const a = d6();
          const b = d6();
          const c = d6();
          const best = Math.max(a, b, c);
          const them = d6();
          rounds.push({ a, b, c, best, them });
          meBest = best;
          themRoll = them;
          if (best !== them) break; // round décisif
        }
        const meLoses = meBest < themRoll;
        const loserId = meLoses ? actor.id : t1.id;
        const winnerId = meLoses ? t1.id : actor.id;
        const loserPseudo = meLoses ? actor.pseudo : t1.pseudo;
        if (meLoses) await patchMeta(actor.id, { parieur_lost_at_dice: true });
        // Le perdant ne meurt PAS instantanément : on pose une attaque DIFFÉRÉE
        // (résolue à l'Annonce). Elle passe ainsi par les protections — Ange
        // Gardien, objets de protection, etc. peuvent sauver le perdant.
        await submitIntent({
          gameId: opts.gameId,
          tour: opts.tour,
          phase: opts.phase,
          actorId: actor.id,
          targetId: loserId,
          category: "ATTACK",
          timing: "DEFERRED",
          source: "role:parieur_tricheur",
          payload: { kill_reason: "pari_dice", target_pseudo: loserPseudo },
        });
        // Statut « Perdant aux dés » : prévient le perdant qu'il mourra à la
        // prochaine annonce (sauf protection). Expire à la fin de ce tour.
        await supabase.from("player_statuses").insert({
          game_id: opts.gameId,
          player_id: loserId,
          status_slug: "dice_loser",
          source: "role:parieur_tricheur",
          active_from_tour: opts.tour,
          active_until_tour: opts.tour,
          payload: {} as never,
        });
        await used({ effect: "bet_dice", rounds, me_best: meBest, them: themRoll, loser: loserId });
        // Diffuse le duel aux DEUX joueurs (payload identique) + ligne MJ omnisciente.
        const duelId = crypto.randomUUID();
        const duelPayload = {
          duelId,
          actorId: actor.id,
          actorPseudo: actor.pseudo,
          targetId: t1.id,
          targetPseudo: t1.pseudo,
          rounds,
          loserId,
          winnerId,
        };
        const duelBody = `Toi : ${meBest} (3d6) · ${t1.pseudo} : ${themRoll}. ${loserPseudo} mourra à la prochaine annonce.`;
        await notify({
          gameId: opts.gameId,
          playerId: actor.id,
          type: "dice_duel",
          title: meLoses ? "🎲 Pari perdu" : "🎲 Pari gagné",
          body: duelBody,
          payload: duelPayload,
        });
        await notify({
          gameId: opts.gameId,
          playerId: t1.id,
          type: "dice_duel",
          title: meLoses ? "🎲 Duel gagné" : "🎲 Duel perdu",
          body: `${actor.pseudo} : ${meBest} (3d6) · toi : ${themRoll}. ${loserPseudo} mourra à la prochaine annonce.`,
          payload: duelPayload,
        });
        await notifyMJ({
          gameId: opts.gameId,
          type: "dice_duel",
          title: "🎲 Parieur tricheur",
          body: `${actor.pseudo} (3d6 → ${meBest}) vs ${t1.pseudo} (${themRoll}) → ${loserPseudo} perd (mort différée à l'Annonce).${rounds.length > 1 ? ` (${rounds.length - 1} égalité${rounds.length - 1 > 1 ? "s" : ""} relancée${rounds.length - 1 > 1 ? "s" : ""})` : ""}`,
          payload: { ...duelPayload, mj_view: true },
        });
        return {
          ok: !meLoses,
          pending: true,
          message: meLoses
            ? `🎲 ${meBest} < ${themRoll} — tu perds le pari`
            : `🎲 ${meBest} > ${themRoll} — ${t1.pseudo} perd le pari`,
        };
      }

      // ── Apothicaire — OFFRE une fiole à un joueur (sa capacité = le DON) ──
      // Elle possède 3 fioles. Sa capacité sert à en OFFRIR une : la fiole est
      // déposée telle quelle dans l'inventaire du receveur, SANS effet immédiat —
      // c'est lui qui choisira quand et sur qui l'utiliser (depuis son Carnet).
      // Pour utiliser une fiole elle-même, elle passe par son Carnet (1 max, cf.
      // useItem). Verrou « 1 action/tour » partagé via `last_item_use_cycle`.
      case "apothicaire": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (t1.id === actor.id)
          return {
            ok: false,
            message:
              "Offre la fiole à un autre joueur (pour l'utiliser toi-même, passe par ton Carnet).",
          };
        if (((m.last_item_use_cycle as number | undefined) ?? -1) === opts.tour) {
          return { ok: false, message: "Tu as déjà agi ce tour-ci." };
        }
        const flasksUsed = (m.flasks_used as string[] | undefined) ?? [];
        const requested = opts.extra?.fiole as "heal" | "poison" | "reveal" | undefined;
        const available: Array<"heal" | "poison" | "reveal"> = (
          ["heal", "poison", "reveal"] as const
        ).filter((f) => !flasksUsed.includes(f));
        if (available.length === 0)
          return { ok: false, message: "Toutes tes fioles ont déjà été utilisées." };
        const fiole = requested && available.includes(requested) ? requested : available[0];
        const { grantItem, buildItem } = await import("./items");
        const slugMap = {
          heal: "fiole_vie",
          poison: "fiole_mort",
          reveal: "fiole_clairvoyance",
        } as const;
        const targetSlug = slugMap[fiole];
        // Textes du cadeau : nomment le RÔLE (« l'Apothicaire ») mais jamais le joueur.
        const fioleNames = {
          fiole_vie: "Fiole de vie",
          fiole_mort: "Fiole de mort",
          fiole_clairvoyance: "Fiole de clairvoyance",
        } as const;
        const giftDesc = {
          fiole_vie:
            "💚 Tu as reçu une Fiole de vie de l'Apothicaire. Utilise-la depuis ton Carnet pour protéger un joueur jusqu'à la prochaine Annonce.",
          fiole_mort:
            "☠️ Tu as reçu une Fiole de mort de l'Apothicaire. Utilise-la depuis ton Carnet pour empoisonner une cible — elle mourra à la prochaine Annonce.",
          fiole_clairvoyance:
            "🔮 Tu as reçu une Fiole de clairvoyance de l'Apothicaire. Utilise-la depuis ton Carnet sur un joueur pour découvrir, toi seul, sa faction.",
        } as const;
        // Dépose la fiole (utilisable librement) dans l'inventaire du receveur.
        await grantItem(
          t1.id,
          buildItem(targetSlug, {
            from: "Apothicaire",
            originFaction: "Civil",
            descriptionOverride: giftDesc[targetSlug],
          }),
        );
        await notify({
          gameId: opts.gameId,
          playerId: t1.id,
          type: "fiole_offerte",
          title: "🎁 Une fiole t'est offerte",
          body: giftDesc[targetSlug],
          mjTitle: "🎁 Apothicaire",
          mjBody: `${actor.pseudo} (Apothicaire) offre une ${fioleNames[targetSlug]} à ${t1.pseudo}.`,
        });
        // Consomme la fiole correspondante dans l'inventaire de l'Apothicaire +
        // compteurs (fioles_given) + verrou de tour, en une seule écriture.
        const apoMetaRow = await supabase
          .from("players")
          .select("role_meta")
          .eq("id", actor.id)
          .maybeSingle();
        const apoMeta = (apoMetaRow.data?.role_meta ?? {}) as Record<string, unknown>;
        const apoInv = (
          (apoMeta.inventory as Array<{ slug: string; consumed?: boolean }> | undefined) ?? []
        ).slice();
        const idx = apoInv.findIndex((it) => it.slug === targetSlug && !it.consumed);
        if (idx >= 0) apoInv[idx] = { ...apoInv[idx], consumed: true };
        await supabase
          .from("players")
          .update({
            role_meta: {
              ...apoMeta,
              inventory: apoInv,
              flasks_used: [...flasksUsed, fiole],
              fioles_given: ((apoMeta.fioles_given as number | undefined) ?? 0) + 1,
              last_item_use_cycle: opts.tour,
            } as never,
          })
          .eq("id", actor.id);
        await used({ effect: "offer_fiole", fiole, to: t1.id });
        return { ok: true, message: `Fiole offerte à ${t1.pseudo}.` };
      }

      // ── Investigations supplémentaires ──
      case "policier": {
        if (!t1) return { ok: false, message: "Cible requise" };
        const tMeta = meta(t1);
        if (isFalsified(tMeta)) {
          await used({ effect: "police_falsified", target: t1.id });
          return { ok: true, message: FALSIFIED_MSG };
        }
        // Override prioritaire (ex: Cuisinier ayant tué un Citoyen ressort suspect)
        const override = tMeta.police_verdict_override as "suspicious" | "innocent" | undefined;
        // Le Policier PERCE les couvertures : il enquête sur le VRAI rôle (pas la
        // couverture de l'Usurpateur via cover_slug). Verdict selon le texte du rôle
        // (Tueur masqué, Usurpateur suspect, Boulets + Neutres suspects) → policierVerdict.
        const trueRole = opts.rolesBySlug.get(t1.role_slug ?? "");
        const verdict = policierVerdict(trueRole, override);
        await used({ effect: "police", verdict });
        return {
          ok: true,
          message:
            verdict === "suspicious"
              ? `🟠 ${t1.pseudo} : soupçons`
              : `🟢 ${t1.pseudo} : rien à signaler`,
        };
      }

      case "cartomancien":
      case "journaliste": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (isFalsified(meta(t1))) {
          await used({ effect: "tarot_falsified", target: t1.id });
          return { ok: true, message: FALSIFIED_MSG };
        }
        // Espionne le tableau de suspicion live de la cible jusqu'à la prochaine Enquête.
        await patchMeta(actor.id, { card_target_id: t1.id, card_target_cycle: opts.tour });
        await used({ effect: "tarot_spy", target: t1.id });
        return { ok: true, message: `🔮 Tu lis le tableau de ${t1.pseudo} jusqu'au prochain tour` };
      }
      case "imitateur": {
        if (!t1) return { ok: false, message: "Cible requise" };
        // Force la cible = dernier mort (tri par death_cycle desc).
        const deads = opts.allPlayers.filter((p) => !p.is_alive && !p.is_mj);
        deads.sort((a, b) => {
          const da =
            (((a.role_meta ?? {}) as Record<string, unknown>).death_cycle as number | undefined) ??
            0;
          const db =
            (((b.role_meta ?? {}) as Record<string, unknown>).death_cycle as number | undefined) ??
            0;
          return db - da;
        });
        const last = deads[0];
        if (!last) return { ok: false, message: "Aucun mort à imiter." };
        if (last.id !== t1.id)
          return { ok: false, message: `Tu ne peux imiter que le dernier mort (${last.pseudo}).` };
        const r = opts.rolesBySlug.get(t1.role_slug ?? "");
        if (!r) return { ok: false, message: "Cible sans rôle" };
        await patchMeta(actor.id, {
          imitated_slug: r.slug,
          original_slug: actor.role_slug ?? "imitateur",
        });
        await supabase.from("players").update({ role_slug: r.slug }).eq("id", actor.id);
        await used({ effect: "imitate", slug: r.slug });
        await notify({
          gameId: opts.gameId,
          playerId: actor.id,
          type: "imitate",
          title: "🎭 Imitation",
          body: `Tu deviens : ${r.icon} ${r.name_fr}. Sa capacité est désormais la tienne.`,
          mjTitle: "🎭 Imitateur",
          mjBody: `${actor.pseudo} (Imitateur) copie ${t1.pseudo} (${r.icon} ${r.name_fr}) — slug basculé.`,
        });
        return { ok: true, message: `Tu joues désormais ${r.name_fr}` };
      }

      // ── Manipulations supplémentaires ──
      case "barman": {
        if (!t1 || !t2) return { ok: false, message: "Deux cibles requises" };
        const protectTour = opts.tour + 1; // effet J+1
        // Tirage 50/50 : un seul des deux est protégé ET ivre.
        // L'autre passe un "bon moment" avec le premier (statut narratif).
        const picked = Math.random() < 0.5 ? t1 : t2;
        const other = picked.id === t1.id ? t2 : t1;
        // PROTECT/DEFERRED uniquement sur la cible "ivre+protégée".
        await submitIntent({
          gameId: opts.gameId,
          tour: protectTour,
          phase: "free",
          actorId: actor.id,
          targetId: picked.id,
          category: "PROTECT",
          timing: "DEFERRED",
          source: "role:barman",
          payload: { pair_with: other.id },
        });
        // Pose ivresse + blocage capacité sur la cible tirée.
        // Effet J+1 : drunk + blocked actifs uniquement au prochain tour.
        await patchMeta(picked.id, {
          drunk_until_cycle: protectTour,
          drunk_from_cycle: protectTour,
          blocked_until_cycle: protectTour,
          blocked_from_cycle: protectTour,
        });
        // Statut "bon moment" pour l'autre cible — visible au prochain tour également.
        await supabase.from("player_statuses").insert({
          game_id: opts.gameId,
          player_id: other.id,
          status_slug: "good_time",
          source: "role:barman",
          active_from_tour: protectTour,
          active_until_tour: protectTour,
          payload: { partner_id: picked.id, partner_pseudo: picked.pseudo } as never,
        });
        await used({
          effect: "barman_round",
          picked: picked.id,
          other: other.id,
          pair: [t1.id, t2.id],
        });
        await notify({
          gameId: opts.gameId,
          playerId: picked.id,
          type: "drunk",
          title: "🍺 Ivre",
          body: "Le barman t'a servi un verre de trop. Ta capacité sera bloquée demain.",
          mjTitle: "🍺 Barman",
          mjBody: `${actor.pseudo} (Barman) sert ${t1.pseudo} & ${t2.pseudo} — ${picked.pseudo} tombe ivre (et protégé).`,
        });
        await notify({
          gameId: opts.gameId,
          playerId: other.id,
          type: "good_time",
          title: "🍹 Bon moment",
          body: `Tu as passé du bon temps avec ${picked.pseudo}.`,
        });
        await notifyMJ({
          gameId: opts.gameId,
          type: "protected",
          title: "🛡️ Protection Barman",
          body: `${actor.pseudo} (Barman) protège ${picked.pseudo} (ivre). ${other.pseudo} passe un bon moment avec ${picked.pseudo}.`,
        });
        return {
          ok: true,
          message: `${t1.pseudo} & ${t2.pseudo} — l'un ivre & à l'abri, l'autre passe un bon moment`,
        };
      }

      // ── Juge / Non-coupable ──

      // ── Juge : programme la libération d'un prisonnier ayant purgé au moins un tour complet.
      // La libération s'applique au DÉBUT du tour suivant (via resolveCycleTransition).
      // Pourquoi : éviter qu'un joueur libéré à la dernière seconde d'une phase n'ait pas
      // le temps d'utiliser sa capacité. En cas d'exécution/kill ce tour-ci, la libération
      // est naturellement annulée (cible morte). ──
      case "juge": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (!t1.is_imprisoned) return { ok: false, message: "Cible non emprisonnée" };
        const tMeta = (t1.role_meta ?? {}) as Record<string, unknown>;
        const since = (tMeta.imprisoned_since_cycle as number | undefined) ?? opts.tour;
        if (opts.tour <= since) {
          return { ok: false, message: "Le prisonnier n'a pas encore purgé un tour complet." };
        }
        if ((tMeta.pending_release_for_cycle as number | undefined) === opts.tour + 1) {
          return { ok: false, message: "Libération déjà programmée pour ce prisonnier." };
        }
        await patchMeta(t1.id, {
          pending_release_for_cycle: opts.tour + 1,
          pending_release_by: actor.id,
        });
        await used({ effect: "judge_release_scheduled" });
        await notify({
          gameId: opts.gameId,
          playerId: t1.id,
          type: "release_scheduled",
          title: "⚖️ Libération programmée",
          body: "Le Juge a ordonné ta libération. Tu seras libre au début du prochain tour.",
          mjTitle: "⚖️ Juge",
          mjBody: `${actor.pseudo} (Juge) programme la libération de ${t1.pseudo} pour le tour ${opts.tour + 1}.`,
        });
        return {
          ok: true,
          message: `Libération de ${t1.pseudo} programmée pour le tour ${opts.tour + 1}`,
        };
      }

      // ── Oracle : verrouille une prophétie de faction (1×/partie). Gagne avec la faction prédite. ──
      case "oracle": {
        if (m.prophecy) return { ok: false, message: "Prophétie déjà lancée" };
        const faction = (opts.extra?.faction as string | undefined) ?? null;
        const allowed = ["Civil", "Méchant", "Neutre"];
        if (!faction || !allowed.includes(faction)) {
          return { ok: false, message: "Choisis une faction (Civils, Méchants ou Neutres)." };
        }
        await patchMeta(actor.id, { prophecy: faction });
        await used({ effect: "prophecy", faction });
        await notify({
          gameId: opts.gameId,
          playerId: actor.id,
          type: "prophecy_set",
          title: "🔮 Prophétie verrouillée",
          body: `Tu gagneras si la faction « ${faction} » remporte la partie.`,
          mjTitle: "🔮 Oracle",
          mjBody: `${actor.pseudo} (Oracle) prophétise la victoire des ${faction}.`,
        });
        return { ok: true, message: `Prophétie : victoire des ${faction}.` };
      }

      // ── Mouchard : 1×/partie, révèle le rôle exact d'une cible ──
      case "mouchard": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (isFalsified(meta(t1))) {
          await used({ effect: "mouchard_falsified", target: t1.id });
          await notify({
            gameId: opts.gameId,
            playerId: actor.id,
            type: "mouchard_reveal",
            title: "📢 Mouchard",
            body: FALSIFIED_MSG,
            mjTitle: "📢 Mouchard",
            mjBody: `${actor.pseudo} (Mouchard) cible ${t1.pseudo} — piste falsifiée.`,
          });
          return { ok: true, message: FALSIFIED_MSG };
        }
        // Usurpateur : toutes les enquêtes renvoient à sa couverture (faux rôle).
        const revealSlug = (meta(t1).cover_slug as string | undefined) ?? t1.role_slug ?? "";
        const r = opts.rolesBySlug.get(revealSlug);
        const label = r ? `${r.icon} ${r.name_fr}` : "?";
        await used({ effect: "mouchard_reveal", target: t1.id, slug: revealSlug });
        await notify({
          gameId: opts.gameId,
          playerId: actor.id,
          type: "mouchard_reveal",
          title: "📢 Mouchard — Rôle révélé",
          body: `${t1.pseudo} est : ${label}.`,
          mjTitle: "📢 Mouchard",
          mjBody: `${actor.pseudo} (Mouchard) apprend que ${t1.pseudo} est ${label}.`,
        });
        return { ok: true, message: `${t1.pseudo} = ${label}` };
      }

      // ── Stratège : tueur « embuscade ». Marque une cible (kill télégraphié) ──
      // L'intention d'attaque est posée pour le TOUR SUIVANT : la cible est
      // prévenue (cf. ringGathering) et meurt à l'Annonce du tour
      // suivant — sauf protection, ou si le Stratège est mort entre-temps.
      case "stratege": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (t1.id === actor.id)
          return { ok: false, message: "Tu ne peux pas te désigner toi-même." };
        await submitIntent({
          gameId: opts.gameId,
          tour: opts.tour + 1,
          phase: opts.phase,
          actorId: actor.id,
          targetId: t1.id,
          category: "ATTACK",
          timing: "DEFERRED",
          source: "role:stratege",
          payload: {
            kill_reason: "stratege_embuscade",
            target_pseudo: t1.pseudo,
            mechant_mechanic: true,
          },
        });
        await patchMeta(t1.id, {
          targeted_by_stratege: {
            from_tour: opts.tour,
            resolves_tour: opts.tour + 1,
            stratege_id: actor.id,
          },
        });
        // Prévient l'équipe Méchants (comme le Tueur).
        const { data: team } = await supabase
          .from("players")
          .select("id, role_slug")
          .eq("game_id", opts.gameId)
          .eq("is_alive", true);
        const teammates = ((team ?? []) as Array<{ id: string; role_slug: string | null }>).filter(
          (p) =>
            p.id !== actor.id && opts.rolesBySlug.get(p.role_slug ?? "")?.faction === "Méchant",
        );
        for (const tm of teammates) {
          await notify({
            gameId: opts.gameId,
            playerId: tm.id,
            type: "killer_targeted",
            title: "🎯 Le Stratège a marqué",
            body: `${t1.pseudo} mourra à la prochaine annonce.`,
          });
        }
        await used({ effect: "stratege_mark", target: t1.id });
        await notifyMJ({
          gameId: opts.gameId,
          type: "mj_announce",
          title: "♟️ Stratège — marque",
          body: `${actor.pseudo} (Stratège) marque ${t1.pseudo} — mort prévue à l'annonce du tour ${opts.tour + 1}.`,
        });
        return {
          ok: true,
          message: `🎯 ${t1.pseudo} marqué — il mourra à l'annonce du prochain tour.`,
        };
      }

      // ── Voleur : vole l'objet le plus récent d'une cible (vivante ou morte) ──
      case "voleur": {
        if (!t1) return { ok: false, message: "Cible requise" };
        const { data: tFresh } = await supabase
          .from("players")
          .select("role_meta")
          .eq("id", t1.id)
          .single();
        const tMeta = ((tFresh as { role_meta: Meta } | null)?.role_meta ?? {}) as Meta;
        const inv = (tMeta.inventory as Array<Record<string, unknown>> | undefined) ?? [];
        if (inv.length === 0) {
          await used({ effect: "steal_empty", target: t1.id });
          await notify({
            gameId: opts.gameId,
            playerId: actor.id,
            type: "steal_empty",
            title: "🥷 Inventaire vide",
            body: `${t1.pseudo} n'avait aucun objet à voler.`,
            mjTitle: "🥷 Voleur",
            mjBody: `${actor.pseudo} (Voleur) tente de voler ${t1.pseudo} — inventaire vide.`,
          });
          return { ok: true, message: `${t1.pseudo} n'a rien à voler` };
        }
        const [stolen, ...rest] = inv;
        await patchMeta(t1.id, { inventory: rest });
        const myInv = (m.inventory as Array<Record<string, unknown>> | undefined) ?? [];
        const stolenItem = {
          ...stolen,
          received_from: t1.pseudo,
          received_at: new Date().toISOString(),
        };
        await patchMeta(actor.id, { inventory: [stolenItem, ...myInv] });
        const itemName = (stolen.name as string | undefined) ?? "un objet";
        await used({ effect: "steal", target: t1.id, item: stolen.slug });
        await notify({
          gameId: opts.gameId,
          playerId: actor.id,
          type: "steal_ok",
          title: "🥷 Vol réussi",
          body: `Tu dérobes ${itemName} à ${t1.pseudo}.`,
          mjTitle: "🥷 Voleur",
          mjBody: `${actor.pseudo} (Voleur) dérobe ${itemName} à ${t1.pseudo}.`,
        });
        if (t1.is_alive) {
          await notify({
            gameId: opts.gameId,
            playerId: t1.id,
            type: "stolen_from",
            title: "🥷 Vol",
            body: `On t'a dérobé ${itemName}.`,
          });
        }
        return { ok: true, message: `${itemName} volé à ${t1.pseudo}` };
      }

      // ── Conservateur : distribue une relique aléatoire à une cible ──
      case "conservateur": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (t1.id === actor.id)
          return { ok: false, message: "Tu ne peux pas te désigner toi-même." };
        const { rollRelique, buildRelique, grantItem, RELIQUE_CATALOG } = await import("./items");
        const variant = rollRelique();
        const def = RELIQUE_CATALOG[variant];
        if (variant === "coeur_du_manoir") {
          // Fin spéciale immédiate : ne distribue pas l'objet, met fin à la partie.
          await used({ effect: "relique_distribute", target: t1.id, variant });
          await endGameWithWinner(
            opts.gameId,
            "Conservateur",
            `${actor.pseudo} (Conservateur) a confié ${def.icon} ${def.name} à ${t1.pseudo}. Le Manoir reconnaît son gardien.`,
          );
          return {
            ok: true,
            message: `🫀 Tu as offert Le Cœur du Manoir à ${t1.pseudo} — Victoire du Conservateur.`,
          };
        }
        const rel = buildRelique(variant, actor.pseudo);
        await grantItem(t1.id, rel);
        await used({ effect: "relique_distribute", target: t1.id, variant });
        const isActive = def.effect && def.effect !== "special_win";
        await notify({
          gameId: opts.gameId,
          playerId: t1.id,
          type: "relique_received",
          title: "🗝️ Une relique t'est confiée",
          body: `Tu reçois ${def.icon} ${def.name}. ${def.description}${isActive ? " Tu peux l'utiliser depuis ton Carnet." : ""}`,
        });
        await notify({
          gameId: opts.gameId,
          playerId: actor.id,
          type: "relique_given",
          title: "🗝️ Relique distribuée",
          body: `Tu as confié ${def.icon} ${def.name} à ${t1.pseudo}.`,
          mjTitle: "🗝️ Conservateur",
          mjBody: `${actor.pseudo} confie ${def.icon} ${def.name} à ${t1.pseudo}.`,
        });
        return { ok: true, message: `${def.icon} ${def.name} confiée à ${t1.pseudo}.` };
      }

      // ── Accusateur : marque la cible comme suspecte pendant 1 tour ──
      case "accusateur": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (
          await tryBlessingBlock({
            gameId: opts.gameId,
            tour: opts.tour,
            phase: opts.phase,
            actor: { id: actor.id, pseudo: actor.pseudo },
            actorRole: { faction: role.faction, type: role.type ?? null },
            target: { id: t1.id, pseudo: t1.pseudo, role_meta: t1.role_meta },
            actionLabel: "accusation",
          })
        )
          return { ok: false, message: `${t1.pseudo} est sous bénédiction — accusation annulée.` };
        const until = opts.tour + 1;
        await patchMeta(t1.id, { marked_suspect_until_cycle: until });
        // Rend le statut visible via la barre du haut (StatusBandeau lit aussi player_statuses + realtime).
        await supabase.from("player_statuses").insert({
          game_id: opts.gameId,
          player_id: t1.id,
          status_slug: "marked",
          source: "role:accusateur",
          active_from_tour: opts.tour,
          active_until_tour: until,
          payload: { by: actor.id, by_pseudo: actor.pseudo } as never,
        });
        await used({ effect: "accuse", target: t1.id, until });
        await notify({
          gameId: opts.gameId,
          playerId: t1.id,
          type: "accused",
          title: "🔖 Accusation contre toi",
          body: `Un Accusateur a jeté la suspicion sur toi (1 tour).`,
          mjTitle: "🔖 Accusateur",
          mjBody: `${actor.pseudo} (Accusateur) accuse ${t1.pseudo} — suspect pour 1 tour.`,
        });
        await notify({
          gameId: opts.gameId,
          playerId: actor.id,
          type: "accuse_ok",
          title: "🔖 Accusation lancée",
          body: `Suspicion jetée sur ${t1.pseudo} (1 tour).`,
        });
        return { ok: true, message: `${t1.pseudo} suspect (1 tour)` };
      }

      case "voisin": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (isFalsified(meta(t1))) {
          await used({ effect: "watch_falsified", target: t1.id });
          return { ok: true, message: FALSIFIED_MSG };
        }
        // Mémorise la cible surveillée — la vue passive lit role_actions ciblant cette personne.
        await patchMeta(actor.id, { watch_target: t1.id, watch_set_cycle: opts.tour });
        await used({ effect: "watch", target: t1.id });
        return { ok: true, message: `Tu surveilles ${t1.pseudo}` };
      }

      // ── Falsificateur : pose un flag PERMANENT sur la cible. Tout investigateur
      //    ciblant cette personne reçoit "Le joueur a été falsifié" au lieu de l'info.
      case "falsificateur": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (t1.id === actor.id)
          return { ok: false, message: "Tu ne peux pas te falsifier toi-même." };
        if (
          await tryBlessingBlock({
            gameId: opts.gameId,
            tour: opts.tour,
            phase: opts.phase,
            actor: { id: actor.id, pseudo: actor.pseudo },
            actorRole: { faction: role.faction, type: role.type ?? null },
            target: { id: t1.id, pseudo: t1.pseudo, role_meta: t1.role_meta },
            actionLabel: "falsification",
          })
        )
          return {
            ok: false,
            message: `${t1.pseudo} est sous bénédiction — falsification annulée.`,
          };
        const tMeta = meta(t1);
        if (isFalsified(tMeta)) {
          await used({ effect: "falsify_redundant", target: t1.id });
          return { ok: true, message: `Piste déjà falsifiée sur ${t1.pseudo}.` };
        }
        await patchMeta(t1.id, {
          falsified: true,
          falsified_by: actor.id,
          falsified_at_tour: opts.tour,
        });
        await used({ effect: "falsify", target: t1.id });
        // Statut permanent "falsified" — visible sur la fiche cible jusqu'à la fin de la partie.
        await supabase.from("player_statuses").insert({
          game_id: opts.gameId,
          player_id: t1.id,
          status_slug: "falsified",
          source: "role:falsificateur",
          active_from_tour: opts.tour,
          active_until_tour: 9999,
          payload: { by: actor.id, by_pseudo: actor.pseudo, tour: opts.tour } as never,
        });
        await notify({
          gameId: opts.gameId,
          playerId: t1.id,
          type: "falsified",
          title: "🪪 Piste falsifiée",
          body: "Pour le reste de la partie, toute enquête menée sur toi renverra une piste brouillée et ne révélera rien de clair.",
          mjTitle: "🪪 Falsificateur",
          mjBody: `${actor.pseudo} (Falsificateur) falsifie ${t1.pseudo} — toute investigation sur cette cible renverra "Le joueur a été falsifié" pour le reste de la partie.`,
        });
        return {
          ok: true,
          message: `Piste falsifiée sur ${t1.pseudo} — les investigateurs ne pourront plus rien apprendre sur cette cible.`,
        };
      }

      default: {
        await used({ effect: "generic" });
        return { ok: true, message: "Capacité utilisée" };
      }
    }
  })();

  // Persiste le message humain dans la dernière role_action insérée, pour que
  // l'historique du joueur affiche du texte clair (et pas le slug "effect").
  if (dispatchResult.ok) {
    const { data: latest } = await supabase
      .from("role_actions")
      .select("id")
      .eq("game_id", opts.gameId)
      .eq("actor_player_id", actor.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const latestId = (latest as { id: string } | null)?.id;
    if (latestId) {
      await supabase
        .from("role_actions")
        .update({ result: { message: dispatchResult.message } as never })
        .eq("id", latestId);
    }
  }
  // Marionnettiste — miroir d'actions : si l'acteur est forcé ce tour, reflète au puppeteer.
  if (dispatchResult.ok) {
    const forcedBy = m.forced_by as string | undefined;
    const forcedCycle = m.forced_action_cycle as number | undefined;
    if (forcedBy && forcedCycle === opts.tour) {
      const targetName = t1 ? t1.pseudo : "—";
      await notify({
        gameId: opts.gameId,
        playerId: forcedBy,
        type: "puppet_mirror",
        title: "🎭 Reflet de la marionnette",
        body: `${actor.pseudo} (manipulé) → ${targetName} : ${dispatchResult.message}`,
        mjTitle: "🎭 Miroir Marionnettiste",
        mjBody: `${actor.pseudo} (forcé) cible ${targetName} — résultat : ${dispatchResult.message}`,
      });
      // Consomme le flag pour ne pas refléter deux fois
      await patchMeta(actor.id, { forced_by: null });
    }
  }
  return dispatchResult;
}

// ─────────────── Bots utility ───────────────
const BOT_PSEUDOS_POOL = [
  "Bot Alice",
  "Bot Bob",
  "Bot Cleo",
  "Bot Dré",
  "Bot Émile",
  "Bot Faye",
  "Bot Gus",
  "Bot Hana",
  "Bot Ivo",
  "Bot Jin",
  "Bot Kya",
  "Bot Léo",
  "Bot Mia",
  "Bot Nio",
  "Bot Ola",
  "Bot Pim",
];

const BOT_AVATAR_COUNT = 32;

type ExistingBotInfo = { pseudo: string; role_meta?: Record<string, unknown> | null };

// Construit `count` lignes de bots prêtes à insérer, avec pseudos et avatars
// uniques par rapport aux joueurs déjà présents ET entre eux (insertion en lot).
function buildBotRows(gameId: string, existing: ExistingBotInfo[], count: number) {
  const usedNames = new Set(existing.map((p) => p.pseudo));
  const usedAvatars = new Set(
    existing.map((p) => p.role_meta?.avatar as string | undefined).filter((a): a is string => !!a),
  );
  // Avatars encore libres (avatar1..avatar32), mélangés pour de la variété en lot.
  const freeAvatars: string[] = [];
  for (let i = 1; i <= BOT_AVATAR_COUNT; i++) {
    const id = `avatar${i}`;
    if (!usedAvatars.has(id)) freeAvatars.push(id);
  }
  for (let i = freeAvatars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [freeAvatars[i], freeAvatars[j]] = [freeAvatars[j], freeAvatars[i]];
  }

  const rows: Record<string, unknown>[] = [];
  for (let n = 0; n < count; n++) {
    let pseudo = BOT_PSEUDOS_POOL.find((nm) => !usedNames.has(nm));
    if (!pseudo) {
      let k = usedNames.size + 1;
      while (usedNames.has(`Bot ${k}`)) k++;
      pseudo = `Bot ${k}`;
    }
    usedNames.add(pseudo);
    const picked = freeAvatars.shift() ?? null;
    rows.push({
      game_id: gameId,
      session_id: crypto.randomUUID(),
      pseudo,
      is_mj: false,
      ...(picked ? { role_meta: { avatar: picked } } : {}),
    });
  }
  return rows;
}

export async function addBotPlayer(gameId: string): Promise<PlayerRow | null> {
  const { data: existing } = await supabase
    .from("players")
    .select("pseudo,role_meta")
    .eq("game_id", gameId);
  const [row] = buildBotRows(gameId, (existing ?? []) as ExistingBotInfo[], 1);
  const { data, error } = await supabase
    .from("players")
    .insert(row as never)
    .select()
    .single();
  if (error) return null;
  emit("bot_added", `🤖 ${(row as { pseudo: string }).pseudo} ajouté`, { gameId });
  return data as PlayerRow;
}

// Ajoute plusieurs bots en une seule requête (pour « compléter » le salon d'un coup).
// Renvoie le nombre réellement inséré.
export async function addBotPlayers(gameId: string, count: number): Promise<number> {
  if (count <= 0) return 0;
  const { data: existing } = await supabase
    .from("players")
    .select("pseudo,role_meta")
    .eq("game_id", gameId);
  const rows = buildBotRows(gameId, (existing ?? []) as ExistingBotInfo[], count);
  if (rows.length === 0) return 0;
  const { data, error } = await supabase
    .from("players")
    .insert(rows as never)
    .select();
  if (error) return 0;
  const added = data?.length ?? 0;
  if (added > 0) {
    emit("bot_added", `🤖 ${added} bot${added > 1 ? "s" : ""} ajouté${added > 1 ? "s" : ""}`, {
      gameId,
    });
  }
  return added;
}

// ─────────────── Reset (dev only) ───────────────
export async function resetGame(gameId: string) {
  await supabase.from("votes").delete().eq("game_id", gameId);
  await supabase.from("role_actions").delete().eq("game_id", gameId);
  await supabase.from("gathering_calls").delete().eq("game_id", gameId);
  await supabase.from("notifications").delete().eq("game_id", gameId);
  await supabase
    .from("players")
    .update({ is_alive: true, is_imprisoned: false, role_slug: null, role_meta: {} as never })
    .eq("game_id", gameId);
  await supabase
    .from("games")
    .update({
      status: "lobby",
      current_phase: "lobby",
      current_tour: 0,
      started_at: null,
      ended_at: null,
    })
    .eq("id", gameId);
  emit("reset", "♻️ Partie réinitialisée");
}
