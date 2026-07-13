// End-of-game audit. Runs once when status flips to "ended". Reads the final
// state + audit trail and flags: end not announced, deferred intents that never
// resolved, contradictory simultaneous win conditions, and text↔logic coupling
// breaks (Oracle prophecy missing, Entremetteur pair never stored…).

import { supabase } from "@/integrations/supabase/client";
import type { GameRow, PlayerRow, RoleRow, Phase } from "../actions";
import type { Database } from "@/integrations/supabase/types";
import type { FindingInput } from "./types";
import { addFindings, withGame } from "./report";
import { isBenignRole } from "../winConditions";

type RoleActionRow = Database["public"]["Tables"]["role_actions"]["Row"];
type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

// Independent re-evaluation of which factions MEET a victory condition, used to
// detect contradictions evaluateWin() hides (it returns only the first match).
function factionsThatWon(players: PlayerRow[], rolesBySlug: Map<string, RoleRow>): string[] {
  const real = players.filter(
    (p) => !p.is_mj && ((p.role_meta ?? {}) as Record<string, unknown>).immortal !== true,
  );
  const alive = real.filter((p) => p.is_alive && !p.is_imprisoned);
  if (alive.length === 0) return [];
  const meta = (p: PlayerRow) => (p.role_meta ?? {}) as Record<string, unknown>;
  const isMechant = (p: PlayerRow) => rolesBySlug.get(p.role_slug ?? "")?.faction === "Méchant";
  const isVampire = (p: PlayerRow) => p.role_slug === "vampire" || meta(p).converted === true;
  const isBenign = (p: PlayerRow) => {
    const r = rolesBySlug.get(p.role_slug ?? "");
    return r?.faction === "Neutre" && isBenignRole(r);
  };

  const won = new Set<string>();
  // Solo neutrals — sole survivor.
  for (const slug of ["veuve_noire", "parieur_tricheur"]) {
    const me = alive.find((p) => p.role_slug === slug);
    if (me && alive.filter((p) => p.id !== me.id).length === 0) won.add(slug);
  }
  // Empoisonneur — everyone else poisoned.
  const emp = alive.find((p) => p.role_slug === "empoisonneur");
  if (emp) {
    const others = alive.filter((p) => p.id !== emp.id);
    if (others.length > 0 && others.every((p) => meta(p).poisoned === true))
      won.add("empoisonneur");
  }
  // Vampires.
  const vampAlive = alive.filter(isVampire).length;
  if (vampAlive >= 1 && alive.filter((p) => !isVampire(p)).length === 0) won.add("vampires");
  // Méchants — strict parity.
  const mechAlive = alive.filter(isMechant).length;
  const opponents = alive.length - mechAlive - alive.filter(isBenign).length;
  if (mechAlive > 0 && mechAlive > opponents) won.add("mechants");
  // Civils — no threats left.
  if (mechAlive === 0 && vampAlive === 0) won.add("civils");
  return [...won];
}

export async function runEndGameAudit(gameId: string): Promise<void> {
  const [{ data: gRaw }, { data: pRaw }, { data: rRaw }, { data: aRaw }, { data: nRaw }] =
    await Promise.all([
      supabase.from("games").select().eq("id", gameId).single(),
      supabase.from("players").select().eq("game_id", gameId),
      supabase.from("roles").select().eq("set_id", "set1"),
      supabase.from("role_actions").select().eq("game_id", gameId),
      supabase
        .from("notifications")
        .select("id, type, title, body, player_id")
        .eq("game_id", gameId),
    ]);

  const game = gRaw as GameRow | null;
  if (!game) return;
  const players = (pRaw ?? []) as PlayerRow[];
  const rolesBySlug = new Map<string, RoleRow>();
  for (const r of (rRaw ?? []) as RoleRow[]) rolesBySlug.set(r.slug, r);
  const actions = (aRaw ?? []) as RoleActionRow[];
  const notifs = (nRaw ?? []) as Pick<
    NotificationRow,
    "id" | "type" | "title" | "body" | "player_id"
  >[];

  const tour = game.current_tour;
  const phase = "ended" as Phase;
  const findings: FindingInput[] = [];

  // 1) Game ended but no end announcement reached players.
  if (!notifs.some((n) => n.type === "game_end")) {
    findings.push({
      severity: "high",
      category: "bug",
      tour,
      phase,
      dedupeKey: "bug:no-game-end-notif",
      title: "Partie terminée sans notification de fin",
      detail:
        "status = ended mais aucune notification type « game_end » n'a été émise. Les joueurs ne voient pas qui a gagné.",
    });
  }

  // 2) Multiple factions meet a win condition simultaneously (contradiction).
  const winners = factionsThatWon(players, rolesBySlug);
  if (winners.length > 1) {
    findings.push({
      severity: "high",
      category: "rules",
      tour,
      phase,
      dedupeKey: `rules:multi-win:${winners.sort().join("+")}`,
      title: `Victoire ambiguë : ${winners.length} camps remplissent leur condition (${winners.join(", ")})`,
      detail:
        "Plusieurs conditions de victoire sont vraies en même temps. evaluateWin ne renvoie que la première de la chaîne if/else — l'ordre du code décide arbitrairement du gagnant.",
      evidence: { winners },
    });
  }

  // 3) Deferred intents never resolved at end of game.
  const unresolved = actions.filter(
    (a) => a.timing === "DEFERRED" && a.category != null && a.resolved_at == null,
  );
  const byId = new Map(players.map((p) => [p.id, p]));
  for (const a of unresolved) {
    const actor = byId.get(a.actor_player_id);
    findings.push({
      severity: "medium",
      category: "bug",
      tour,
      phase,
      botPseudo: actor?.pseudo,
      roleSlug: actor?.role_slug ?? null,
      dedupeKey: `bug:intent-unresolved-end:${a.id}`,
      title: `Intention « ${a.source ?? a.category} » non résolue en fin de partie`,
      detail:
        "Une action différée n'a jamais été traitée par le resolver — son effet promis n'a pas eu lieu.",
      evidence: { actionId: a.id, source: a.source, submittedTour: a.tour },
    });
  }

  // 4) Text↔logic coupling: roles whose victory hooks rely on meta that was never set.
  const oracle = players.find((p) => p.role_slug === "oracle" && !p.is_mj);
  if (oracle && (oracle.role_meta as Record<string, unknown>)?.prophecy == null) {
    findings.push({
      severity: "medium",
      category: "rules",
      tour,
      phase,
      botPseudo: oracle.pseudo,
      roleSlug: "oracle",
      roleName: rolesBySlug.get("oracle")?.name_fr ?? "Oracle",
      dedupeKey: "rules:oracle-no-prophecy",
      title: "Oracle : aucune prophétie enregistrée de toute la partie",
      detail:
        "La victoire bonus de l'Oracle dépend de role_meta.prophecy (mappé sur le camp gagnant). Si le flux ne pose jamais cette valeur, l'Oracle ne peut jamais co-gagner — capacité morte.",
      evidence: { role_meta_keys: Object.keys((oracle.role_meta ?? {}) as object) },
    });
  }
  const entremetteur = players.find((p) => p.role_slug === "entremetteur" && !p.is_mj);
  if (entremetteur) {
    const pair = ((entremetteur.role_meta ?? {}) as Record<string, unknown>).linked_pair as
      | string[]
      | undefined;
    if (!pair || pair.length < 2) {
      findings.push({
        severity: "medium",
        category: "rules",
        tour,
        phase,
        botPseudo: entremetteur.pseudo,
        roleSlug: "entremetteur",
        roleName: rolesBySlug.get("entremetteur")?.name_fr ?? "Entremetteur",
        dedupeKey: "rules:entremetteur-no-pair",
        title: "Entremetteur : aucun couple lié (linked_pair manquant)",
        detail:
          "La victoire des Amoureux dépend de role_meta.linked_pair (2 ids). Sans cette paire, ni les Amoureux ni le repli survie de l'Entremetteur ne peuvent se déclencher.",
        evidence: { linked_pair: pair ?? null },
      });
    }
  }

  if (findings.length) addFindings(withGame(findings, gameId, (game as { code: string }).code));
}
