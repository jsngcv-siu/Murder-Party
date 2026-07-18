// Détection de fin de partie. Lit l'état brut, pas de mock.
import { supabase } from "@/integrations/supabase/client";
import type { PlayerRow, RoleRow } from "./actions";
import { getMeta } from "./roleMeta";

export type Winner = string | null;
export type WinResult = { winner: Winner; reason: string };

/**
 * Neutre « bénin » : ne bloque pas la victoire des Civils et peut gagner avec
 * n'importe quel camp. Source de vérité : drapeau `is_benign` en base ; repli
 * sur l'ancienne logique type BÉNIN tant que la migration n'est pas appliquée.
 */
export function isBenignRole(r: { type?: string | null; is_benign?: boolean | null }): boolean {
  if (r.is_benign != null) return r.is_benign;
  return (r.type ?? "").toUpperCase() === "BÉNIN";
}

async function cancelUnresolvedDeferredIntents(gameId: string, result: WinResult): Promise<void> {
  const endedAt = new Date().toISOString();
  const resolution = {
    status: "cancelled",
    reason: "game_ended",
    winner: result.winner,
  };
  const playerResult = {
    summary: "La partie s'est terminée avant le dénouement de cette action.",
    outcome: "info",
  };
  await supabase
    .from("role_actions")
    .update({
      resolved_at: endedAt,
      resolution: resolution as never,
      result: playerResult as never,
    })
    .eq("game_id", gameId)
    .is("resolved_at", null)
    .eq("timing", "DEFERRED")
    .not("category", "is", null);
}

// L'Oracle prédit une FAMILLE de camp (Civil / Méchant / Neutre), pas un libellé exact.
// Tout camp neutre (Vampires, Amoureux, Empoisonneur, Veuve noire, Parieur…) compte comme
// "Neutre" — sinon prédire "Neutre" ne pouvait JAMAIS payer (les libellés de victoire sont
// spécifiques : "Vampires", "Empoisonneur"… jamais "Neutres").
function winnerFamily(winner: string): "Civil" | "Méchant" | "Neutre" {
  if (winner === "Civil") return "Civil";
  if (winner === "Méchants") return "Méchant";
  return "Neutre";
}

function withOracleWinners(result: WinResult, players: PlayerRow[]): WinResult {
  if (!result.winner) return result;
  const fam = winnerFamily(result.winner);
  const winners = players.filter((p) => {
    if (p.role_slug !== "oracle") return false;
    if (!p.is_alive) return false;
    return getMeta(p).prophecy === fam;
  });
  if (winners.length === 0) return result;
  return {
    winner: result.winner,
    reason: `${result.reason} (🔮 Oracle ${winners.map((w) => w.pseudo).join(", ")} a vu juste.)`,
  };
}

// Entremetteur — REPLI SURVIE : si son couple est BRISÉ (au moins un amoureux
// mort ou emprisonné), il ne peut plus gagner via les Amoureux. Il devient un
// parasite qui co-gagne s'il est encore en vie et libre à la fin de la partie,
// quel que soit le camp vainqueur. (Le couple intact reste la victoire "dure"
// des Amoureux, gérée dans evaluateWin.)
function withEntremetteurWinner(result: WinResult, players: PlayerRow[]): WinResult {
  if (!result.winner) return result;
  const survivors = players.filter((p) => {
    if (p.role_slug !== "entremetteur") return false;
    if (!p.is_alive || p.is_imprisoned) return false;
    const pair = getMeta(p).linked_pair ?? [];
    if (pair.length < 2) return true; // jamais lié (ou lien perdu) → survie suffit
    const lovers = players.filter((q) => pair.includes(q.id));
    const coupleIntact = lovers.length === 2 && lovers.every((q) => q.is_alive && !q.is_imprisoned);
    return !coupleIntact; // couple brisé → la survie de l'Entremetteur paie
  });
  if (survivors.length === 0) return result;
  return {
    winner: result.winner,
    reason: `${result.reason} (💞 L'Entremetteur ${survivors.map((w) => w.pseudo).join(", ")} survit : son pari est tenu.)`,
  };
}

// Survivants bénins du lot 1 (Chat du Manoir, Aubergiste) : co-victoire simple
// « en vie à la fin, quel que soit le camp vainqueur » — même mécanique d'append
// au reason que l'Oracle (le winner de faction reste inchangé).
function withBenignSurvivorWinners(result: WinResult, players: PlayerRow[]): WinResult {
  if (!result.winner) return result;
  const LABELS: Record<string, string> = {
    chat_du_manoir: "🐈 Le Chat du Manoir",
    aubergiste: "🏨 L'Aubergiste",
  };
  let reason = result.reason;
  for (const [slug, label] of Object.entries(LABELS)) {
    const survivors = players.filter((p) => p.role_slug === slug && p.is_alive && !p.is_mj);
    if (survivors.length > 0) {
      reason = `${reason} (${label} ${survivors.map((w) => w.pseudo).join(", ")} a survécu — victoire aussi.)`;
    }
  }
  return { winner: result.winner, reason };
}

// Photographe mondain (lot 1) : co-victoire si vivant ET assez de joueurs
// photographiés DE LEUR VIVANT sont morts (le handler n'autorise que des cibles
// vivantes → toute photo d'un mort actuel a forcément précédé sa mort).
// Barème par taille de table : 2 (≤10), 3 (11-15), 4 (16+).
function photographeThreshold(playerCount: number): number {
  if (playerCount <= 10) return 2;
  if (playerCount <= 15) return 3;
  return 4;
}
function withPhotographeWinners(result: WinResult, players: PlayerRow[]): WinResult {
  if (!result.winner) return result;
  const real = players.filter((p) => !p.is_mj && getMeta(p).immortal !== true);
  const need = photographeThreshold(real.length);
  const winners = real.filter((p) => {
    if (p.role_slug !== "photographe" || !p.is_alive) return false;
    const film = getMeta(p).photos ?? [];
    const deadOnFilm = film.filter((ph) => {
      const subject = players.find((q) => q.id === ph.id);
      return subject != null && !subject.is_alive;
    }).length;
    return deadOnFilm >= need;
  });
  if (winners.length === 0) return result;
  return {
    winner: result.winner,
    reason: `${result.reason} (📸 Le Photographe ${winners.map((w) => w.pseudo).join(", ")} tient son scoop — victoire aussi.)`,
  };
}

// Poltergeist (lot 4) : co-victoire au mérite — un mortel est mort d'un objet
// qu'il a déplacé depuis l'au-delà (drapeau polt_win posé par le resolver).
// Mort ou vif, la hantise accomplie paie.
function withPoltergeistWinners(result: WinResult, players: PlayerRow[]): WinResult {
  if (!result.winner) return result;
  const winners = players.filter(
    (p) => p.role_slug === "poltergeist" && !p.is_mj && getMeta(p).polt_win === true,
  );
  if (winners.length === 0) return result;
  return {
    winner: result.winner,
    reason: `${result.reason} (👻 Le Poltergeist ${winners.map((w) => w.pseudo).join(", ")} a fait frapper un objet — victoire aussi.)`,
  };
}

export async function evaluateWin(gameId: string): Promise<WinResult | null> {
  const { data: ps } = await supabase.from("players").select().eq("game_id", gameId);
  const players = (ps ?? []) as PlayerRow[];
  const { data: rs } = await supabase.from("roles").select().eq("set_id", "set1");
  const rolesBySlug = new Map<string, RoleRow>();
  for (const r of (rs ?? []) as RoleRow[]) rolesBySlug.set(r.slug, r);

  const real = players.filter((p) => {
    return getMeta(p).immortal !== true && !p.is_mj;
  });
  const alive = real.filter((p) => p.is_alive && !p.is_imprisoned);
  if (alive.length === 0) return { winner: null, reason: "Aucun survivant" };
  const playerCount = real.length;

  const isRealMechant = (p: PlayerRow) => {
    // Un joueur converti a rejoint le clan vampire : il QUITTE le camp Méchant.
    // Sans ça il était compté DEUX fois — dans la majorité Méchante ET dans le
    // règne des Vampires — et un Tueur mordu donnait la victoire « Méchants »
    // alors qu'il appartient désormais au clan (audit 2026-07-16).
    if (getMeta(p).converted === true) return false;
    const r = p.role_slug ? rolesBySlug.get(p.role_slug) : null;
    return r?.faction === "Méchant";
  };
  const realMechantsAlive = alive.filter(isRealMechant).length;
  const isMechant = (p: PlayerRow) => {
    // Héritier déchu : gagne avec les Méchants. Compte comme allié tant qu'au moins un vrai Méchant est vivant.
    if (p.role_slug === "heritier_dechu" && realMechantsAlive > 0) return true;
    return isRealMechant(p);
  };
  const isVampire = (p: PlayerRow) => {
    return p.role_slug === "vampire" || getMeta(p).converted === true;
  };
  // Faction Entremetteur : les 2 amoureux liés + l'entremetteur (s'il vit)
  const isLover = (p: PlayerRow) => {
    return typeof getMeta(p).linked_with === "string";
  };
  const isEntremetteurFaction = (p: PlayerRow) => p.role_slug === "entremetteur" || isLover(p);
  // Neutres "bloquants" qui empêchent la victoire des Civils.
  // Exclus : BÉNIN (oracle), vampire (compté ailleurs), entremetteur/amoureux (compté ailleurs),
  // héritier_déchu allié aux Méchants (compté comme Méchant).
  const isBlockingNeutre = (p: PlayerRow) => {
    const r = p.role_slug ? rolesBySlug.get(p.role_slug) : null;
    if (!r || r.faction !== "Neutre") return false;
    if (isBenignRole(r)) return false;
    if (p.role_slug === "vampire") return false;
    // Chasseur de Vampire : allié des Civils, il ne bloque pas leur victoire (il gagne avec eux).
    if (p.role_slug === "chasseur_de_vampire") return false;
    if (isEntremetteurFaction(p)) return false;
    if (p.role_slug === "heritier_dechu") {
      // L'Héritier ne gagne qu'AVEC les Méchants : si plus aucun vrai Méchant
      // n'est vivant, il a perdu avec son camp → il ne bloque plus les Civils.
      if (realMechantsAlive === 0) return false;
    }
    return true;
  };
  // Neutre bénin (ex : Oracle) — peut gagner avec n'importe quelle faction, ne bloque personne.
  const isBenignNeutre = (p: PlayerRow) => {
    const r = p.role_slug ? rolesBySlug.get(p.role_slug) : null;
    return r?.faction === "Neutre" && isBenignRole(r);
  };

  const mechantsAlive = alive.filter(isMechant).length;
  const vampiresAlive = alive.filter(isVampire).length;
  // Les neutres bénins (Oracle) NE BLOQUENT PERSONNE (cf. isBenignNeutre) : on les
  // exclut du décompte des « non-vampires à éliminer », sinon un Oracle vivant
  // empêchait à tort le règne des Vampires (audit 2026-07-16).
  const nonVampAlive = alive.filter((p) => !isVampire(p) && !isBenignNeutre(p)).length;
  const loversAlive = alive.filter(isLover);
  // Faction Entremetteur réputée perdue si les 2 amoureux ne sont pas tous les deux vivants.
  const entremetteurFactionActive = loversAlive.length === 2;
  const entremetteurFactionAlive = entremetteurFactionActive
    ? alive.filter(isEntremetteurFaction).length
    : 0;
  // Un entremetteur dont les amoureux sont morts a perdu : il ne bloque plus personne.
  const blockingNeutresAlive = alive.filter((p) => {
    if (!isBlockingNeutre(p)) return false;
    if (p.role_slug === "entremetteur" && !entremetteurFactionActive) return false;
    return true;
  }).length;

  // ── Victoires SOLO neutres ─────────────────────────────────────────────────
  // Veuve noire / Parieur tricheur : seul·e survivant·e libre.
  const soloNeutreSlugs = new Set(["veuve_noire", "parieur_tricheur"]);
  for (const slug of soloNeutreSlugs) {
    const me = alive.find((p) => p.role_slug === slug);
    if (!me) continue;
    // Bénins exclus : ils ne bloquent pas la victoire solo (audit 2026-07-16).
    const others = alive.filter((p) => p.id !== me.id && !isBenignNeutre(p));
    if (others.length === 0) {
      const label = slug === "veuve_noire" ? "Veuve noire" : "Parieur tricheur";
      return { winner: label, reason: `${me.pseudo} est le·la seul·e survivant·e.` };
    }
  }
  // Empoisonneur : tous les autres survivants libres ont le statut empoisonné.
  const empoisonneur = alive.find((p) => p.role_slug === "empoisonneur");
  if (empoisonneur) {
    const others = alive.filter((p) => p.id !== empoisonneur.id);
    // Les bénins (Oracle) ne bloquent personne : ils n'ont pas besoin d'être
    // empoisonnés pour que l'Empoisonneur l'emporte (audit 2026-07-16).
    const mustPoison = others.filter((p) => !isBenignNeutre(p));
    if (others.length > 0 && mustPoison.every((p) => getMeta(p).poisoned === true)) {
      return {
        winner: "Empoisonneur",
        reason: `${empoisonneur.pseudo} a empoisonné tous les survivants libres.`,
      };
    }
  }

  // ── Vampires : seuls non-vampires éliminés ───────────────────────────────
  if (vampiresAlive >= 1 && nonVampAlive === 0) {
    return { winner: "Vampires", reason: "Les Vampires règnent sur le manoir." };
  }

  // ── Méchants : victoire à la PARITÉ — ils sont au moins aussi nombreux que
  //    tous les autres camps réunis. Les neutres BÉNINS (ex. Oracle) ne comptent
  //    pas comme opposants (ils peuvent gagner avec n'importe quel camp). Les
  //    Vampires, eux, comptent comme opposants (ils ne sont pas alliés des Méchants).
  const benignNeutresAlive = alive.filter(isBenignNeutre).length;
  const mechantOpponentsAlive = alive.length - mechantsAlive - benignNeutresAlive;
  // MAJORITÉ STRICTE : les Méchants doivent SURPASSER (et non égaler) les autres
  // camps réunis. À l'égalité (ex. 2v2), la ville garde sa chance — c'est le
  // dernier tour pour lyncher un Méchant ou utiliser un pouvoir de tueur civil.
  if (mechantsAlive > 0 && mechantsAlive > mechantOpponentsAlive) {
    return {
      winner: "Méchants",
      reason: "Les Méchants surpassent en nombre tous les autres camps réunis.",
    };
  }

  // ── Faction Entremetteur : les 2 amoureux + éventuellement l'entremetteur, seuls vivants.
  if (entremetteurFactionActive) {
    // Bénins exclus : un Oracle vivant ne doit pas priver le couple de sa
    // victoire (il co-gagne avec eux si sa prophétie colle) — audit 2026-07-16.
    const others = alive.filter((p) => !isEntremetteurFaction(p) && !isBenignNeutre(p));
    if (others.length === 0) {
      const [a, b] = loversAlive;
      const entAlive = alive.some((p) => p.role_slug === "entremetteur");
      return {
        winner: "Amoureux",
        reason: `${a.pseudo} et ${b.pseudo} survivent ensemble${entAlive ? " avec l'Entremetteur" : ""}.`,
      };
    }
  }

  // ── Citoyens : aucun Méchant, Vampire, Entremetteur-actif ou neutre bloquant vivant.
  if (
    mechantsAlive === 0 &&
    vampiresAlive === 0 &&
    entremetteurFactionAlive === 0 &&
    blockingNeutresAlive === 0
  ) {
    return { winner: "Civil", reason: "Tous les ennemis des Citoyens ont été éliminés." };
  }

  // ── FILET anti-blocage : un·e SEUL·E survivant·e libre = fin de partie.
  // Certains neutres bloquants (empoisonneur sans cible à empoisonner,
  // imitateur…) ne satisfont aucune condition ci-dessus : restés seuls, ils
  // laissaient evaluateWin renvoyer null indéfiniment → la partie tournait sans
  // jamais se clore (tours à rallonge). S'il ne reste qu'une personne en vie et
  // libre, tous les autres camps ont disparu : elle a gagné, quel que soit son rôle.
  if (alive.length === 1) {
    const p = alive[0];
    const role = p.role_slug ? rolesBySlug.get(p.role_slug) : null;
    const label =
      LONE_WINNER_LABEL[p.role_slug ?? ""] ??
      (role?.faction === "Civil"
        ? "Civil"
        : role?.faction === "Méchant"
          ? "Méchants"
          : (role?.name_fr ?? "Survivant"));
    return {
      winner: label,
      reason: `${p.pseudo} est l'unique survivant·e : tous les autres camps ont disparu.`,
    };
  }

  return null;
}

// Libellés de victoire compris par l'écran de fin (E1EndGame) pour les neutres
// solo qui, restés seuls, gagnent par forfait. Les rôles absents de cette table
// retombent sur leur faction (Civil/Méchants) ou leur nom (rendu générique).
const LONE_WINNER_LABEL: Record<string, string> = {
  empoisonneur: "Empoisonneur",
  veuve_noire: "Veuve noire",
  parieur_tricheur: "Parieur tricheur",
  conservateur: "Conservateur",
};

export async function checkAndEndGame(gameId: string): Promise<WinResult | null> {
  const { data: g } = await supabase.from("games").select("status").eq("id", gameId).single();
  if ((g as { status: string } | null)?.status === "ended") return null;
  let r = await evaluateWin(gameId);
  if (!r) return null;
  const { data: ps2 } = await supabase.from("players").select().eq("game_id", gameId);
  r = withOracleWinners(r, (ps2 ?? []) as PlayerRow[]);
  r = withEntremetteurWinner(r, (ps2 ?? []) as PlayerRow[]);
  r = withBenignSurvivorWinners(r, (ps2 ?? []) as PlayerRow[]);
  r = withPhotographeWinners(r, (ps2 ?? []) as PlayerRow[]);
  r = withPoltergeistWinners(r, (ps2 ?? []) as PlayerRow[]);
  await cancelUnresolvedDeferredIntents(gameId, r);
  // Émettre l'annonce de fin AVANT de basculer le statut. Ces deux écritures sont
  // distinctes : tout observateur qui réagit au passage à `ended` (écran de fin
  // E1EndGame, audit QA) doit trouver la notification `game_end` déjà présente.
  // L'ordre inverse laisse une fenêtre où `status = ended` sans `game_end` visible.
  const { data: ps } = await supabase.from("players").select("id").eq("game_id", gameId);
  const rows = (ps ?? []).map((p: { id: string }) => ({
    game_id: gameId,
    player_id: p.id,
    type: "game_end",
    title: r!.winner ? `🏆 ${r!.winner} a gagné` : "Partie terminée",
    body: r!.reason,
    payload: { winner: r!.winner } as never,
  }));
  if (rows.length) await supabase.from("notifications").insert(rows);
  // Lever A : le vainqueur voyage avec le passage à `ended` (même update, donc même
  // payload realtime) → l'écran de fin se peuple sans re-requête (fin du « Calcul… »).
  await supabase
    .from("games")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
      winner: r!.winner ?? null,
      win_reason: r!.reason,
    })
    .eq("id", gameId);
  return r;
}
