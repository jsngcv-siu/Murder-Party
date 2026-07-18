// Global invariant sweep. Pure over snapshots the demo already fetches.
// Conservative on purpose: only high-confidence findings, deduped hard, so the
// report stays signal — not a flood of false positives.

import type { Database } from "@/integrations/supabase/types";
import type { GameRow, PlayerRow, RoleRow } from "../actions";
import type { FindingInput } from "./types";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
type VoteRow = Database["public"]["Tables"]["votes"]["Row"];
type RoleActionRow = Database["public"]["Tables"]["role_actions"]["Row"];

export type InvariantCtx = {
  game: GameRow;
  players: PlayerRow[];
  rolesBySlug: Map<string, RoleRow>;
  notifications: NotificationRow[];
  votes: VoteRow[];
  /** Intentions NON résolues (resolved_at IS NULL) — pour l'invariant #3 « jamais résolu ». */
  roleActions: RoleActionRow[];
  /** TOUTES les role_actions du tour courant (résolues ou non) — concurrence + effets. */
  tourActions: RoleActionRow[];
  /** Seconds the current phase is overdue past its duration (intro-adjusted), 0 if on time. */
  secondsOverdue: number;
};

const PHASE_STUCK_THRESHOLD_S = 90;

export function runInvariants(ctx: InvariantCtx): FindingInput[] {
  const out: FindingInput[] = [];
  const { game, players, rolesBySlug, notifications, votes, roleActions, tourActions } = ctx;
  const tour = game.current_tour;
  const phase = game.current_phase;
  const byId = new Map(players.map((p) => [p.id, p]));

  // 1) Phase stuck — timer expired but tickPhase didn't advance.
  if (
    game.status === "in_progress" &&
    !game.paused &&
    ctx.secondsOverdue > PHASE_STUCK_THRESHOLD_S
  ) {
    out.push({
      severity: "high",
      category: "bug",
      tour,
      phase,
      dedupeKey: `bug:phase-stuck:${tour}:${phase}`,
      title: `Phase « ${phase} » bloquée (${Math.round(ctx.secondsOverdue)}s de retard)`,
      detail:
        "Le minuteur de la phase est épuisé depuis longtemps mais la partie n'a pas avancé. tickPhase ne progresse pas (deadlock, condition de transition jamais remplie, ou erreur silencieuse).",
      evidence: {
        phase_started_at: game.phase_started_at,
        phase_duration_s: game.phase_duration_s,
        secondsOverdue: ctx.secondsOverdue,
      },
    });
  }

  // 2) Vote integrity (current tour).
  const tourVotes = votes.filter((v) => v.tour === tour);
  const seenVoter = new Map<string, number>();
  for (const v of tourVotes)
    seenVoter.set(v.voter_player_id, (seenVoter.get(v.voter_player_id) ?? 0) + 1);
  for (const [voterId, n] of seenVoter) {
    if (n > 1) {
      out.push({
        severity: "high",
        category: "bug",
        tour,
        phase,
        botPseudo: byId.get(voterId)?.pseudo,
        dedupeKey: `bug:vote-double:${tour}:${voterId}`,
        title: `Vote compté ${n}× pour un même votant`,
        detail:
          "castVote supprime le vote précédent avant d'insérer le nouveau. Plusieurs lignes pour le même votant au même tour = doublon non nettoyé (résultat de vote faussé).",
        evidence: { voterId, tour, count: n },
      });
    }
    // NB : l'éligibilité (mort/emprisonné) n'est PLUS contrôlée ici. `castVote`
    // l'impose désormais à la source (re-lecture serveur de is_alive/is_imprisoned
    // au moment du vote). Comme un joueur peut être emprisonné APRÈS un vote
    // pourtant légitime (Juge, suspicion, closeVote), re-flaguer a posteriori ne
    // produisait que des faux positifs de timing. Seul le doublon reste pertinent.
  }

  // 3) Deferred intent never resolved (effect silently dropped).
  for (const a of roleActions) {
    if (a.timing !== "DEFERRED" || a.category == null || a.resolved_at != null) continue;
    if (a.tour > tour - 2) continue; // give it a cycle to resolve
    const actor = byId.get(a.actor_player_id);
    out.push({
      severity: "medium",
      category: "bug",
      tour,
      phase,
      botPseudo: actor?.pseudo,
      roleSlug: actor?.role_slug ?? null,
      dedupeKey: `bug:intent-unresolved:${a.id}`,
      title: `Intention « ${a.source ?? a.category} » jamais résolue (tour ${a.tour})`,
      detail:
        "Une action différée a été soumise mais le resolver ne l'a jamais marquée resolved_at, plusieurs tours plus tard. L'effet promis n'a pas été appliqué.",
      evidence: { actionId: a.id, source: a.source, category: a.category, submittedTour: a.tour },
    });
  }

  // 4) Notification emitted in a tight BURST (≥3 within 2s for the same recipient).
  //    This targets accidental double-emission (loop / double resolver), NOT the
  //    periodic passive reminders a role legitimately re-surfaces over many tours.
  const BURST_MS = 2000;
  const notifGroups = new Map<string, NotificationRow[]>();
  for (const n of notifications) {
    const key = `${n.player_id ?? "all"}|${n.title}|${n.body ?? ""}`;
    const arr = notifGroups.get(key);
    if (arr) arr.push(n);
    else notifGroups.set(key, [n]);
  }
  for (const [key, arr] of notifGroups) {
    if (arr.length < 3) continue;
    const ts = arr.map((n) => new Date(n.created_at).getTime()).sort((a, b) => a - b);
    // Max number of timestamps falling inside any BURST_MS window.
    let maxBurst = 1;
    let lo = 0;
    for (let hi = 0; hi < ts.length; hi++) {
      while (ts[hi] - ts[lo] > BURST_MS) lo++;
      maxBurst = Math.max(maxBurst, hi - lo + 1);
    }
    if (maxBurst >= 3) {
      const sample = arr[0];
      out.push({
        severity: "medium",
        category: "bug",
        tour,
        phase,
        dedupeKey: `bug:notif-burst:${key}`,
        title: `Notification émise ${maxBurst}× en rafale (<2s) : « ${sample.title} »`,
        detail:
          "La même notification a été insérée plusieurs fois en moins de 2 secondes — signature d'une émission en double (boucle, double resolver), pas d'un rappel périodique.",
        evidence: { title: sample.title, body: sample.body, type: sample.type, burst: maxBurst },
      });
    }
  }

  // 5) Fuite joueur→joueur — une notification CIBLÉE sur un joueur (player_id != null)
  //    nomme le rôle d'un AUTRE joueur vivant. C'est le vrai canal de fuite.
  //    On IGNORE :
  //     - le flux MJ (player_id = null) : omniscient par design, jamais une fuite ;
  //     - les révélations d'enquête/capacité légitimes (Mouchard, autopsie…) ;
  //     - le sujet lui-même (apprendre SON rôle est normal) ;
  //     - deux coéquipiers Méchants (ils se connaissent : « Le Tueur a ciblé X »…).
  const LEGIT_REVEAL_TYPES = new Set<string>([
    "mouchard_reveal",
    "mouchard_setup",
    "imitate",
    "autopsy",
    "execution_reveal",
    "oracle_setup",
    "prophecy_set",
    "cover_pending",
    "killer_targeted",
    "saint_block_log",
    "ward",
  ]);
  const factionOf = (p: PlayerRow) => rolesBySlug.get(p.role_slug ?? "")?.faction;
  const aliveSubjects = players.filter((p) => !p.is_mj && p.is_alive && p.role_slug);
  for (const n of notifications) {
    if (n.player_id === null || LEGIT_REVEAL_TYPES.has(n.type)) continue;
    const recipient = byId.get(n.player_id);
    if (!recipient) continue;
    const text = `${n.title} ${n.body ?? ""}`.toLowerCase();
    for (const subj of aliveSubjects) {
      if (subj.id === n.player_id) continue; // sa propre info = normal
      const role = rolesBySlug.get(subj.role_slug!);
      if (!role) continue;
      if (!text.includes(role.name_fr.toLowerCase()) || !text.includes(subj.pseudo.toLowerCase()))
        continue;
      // Coéquipiers Méchants : connaissance légitime entre acolytes.
      if (factionOf(recipient) === "Méchant" && factionOf(subj) === "Méchant") continue;
      out.push({
        severity: "high",
        category: "leak",
        tour,
        phase,
        botPseudo: subj.pseudo,
        roleSlug: subj.role_slug,
        roleName: role.name_fr,
        dedupeKey: `leak:p2p:${n.player_id}:${subj.id}`,
        title: `Fuite : ${recipient.pseudo} apprend que ${subj.pseudo} est ${role.name_fr}`,
        detail:
          "Une notification ciblée sur un joueur nomme le rôle d'un AUTRE joueur vivant, sans que ce soit une enquête légitime ni un coéquipier Méchant. Information divulguée à quelqu'un qui ne devrait pas l'avoir.",
        evidence: {
          recipient: recipient.pseudo,
          subject: subj.pseudo,
          role: role.name_fr,
          type: n.type,
          notifTitle: n.title,
          notifBody: n.body,
        },
      });
      break; // une fuite par notification suffit
    }
  }

  // 6) Double-soumission / concurrence — intentions DIFFÉRÉES strictement
  //    identiques (même acteur, même tour, même source, même catégorie, même
  //    cible). Une capacité ne se pose qu'UNE fois ; deux lignes identiques =
  //    signature d'un appel concurrent (multi-onglets, double-clic, ré-entrée).
  //    Détecte la CAUSE directement, là où la rafale de notifs (#4) n'en voyait
  //    que le symptôme. Faux positif quasi nul : un vrai re-jeu change la cible.
  const intentGroups = new Map<string, RoleActionRow[]>();
  for (const a of tourActions) {
    if (a.timing !== "DEFERRED" || a.category == null) continue;
    const key = `${a.actor_player_id}|${a.source ?? a.category}|${a.category}|${a.target_player_id ?? "∅"}`;
    const arr = intentGroups.get(key);
    if (arr) arr.push(a);
    else intentGroups.set(key, [a]);
  }
  for (const [key, arr] of intentGroups) {
    if (arr.length < 2) continue;
    const actor = byId.get(arr[0].actor_player_id);
    out.push({
      severity: "high",
      category: "bug",
      tour,
      phase,
      botPseudo: actor?.pseudo,
      roleSlug: actor?.role_slug ?? null,
      dedupeKey: `bug:intent-dup:${tour}:${key}`,
      title: `Intention « ${arr[0].source ?? arr[0].category} » soumise ${arr.length}× à l'identique`,
      detail:
        "Plusieurs lignes role_actions identiques (acteur/source/catégorie/cible) au même tour. Une capacité ne devrait poser qu'une intention — doublon = appel concurrent non idempotent (la cause des notifs en rafale).",
      evidence: {
        count: arr.length,
        source: arr[0].source,
        category: arr[0].category,
        actionIds: arr.map((a) => a.id),
      },
    });
  }

  // 7) Vérification d'EFFET — l'intention dit s'être appliquée, mais l'état réel
  //    contredit. Le resolver persiste `resolution.status` ; on le confronte à
  //    l'état VIVANT du joueur (tour courant uniquement, pour éviter toute dérive
  //    inter-tours : pas de résurrection dans le moteur, un mort reste mort).
  for (const a of tourActions) {
    if (a.category !== "ATTACK" || a.resolved_at == null) continue;
    const res = (a.resolution ?? {}) as Record<string, unknown>;
    const status = res.status as string | undefined;
    if (!a.target_player_id || (status !== "applied" && status !== "protected")) continue;
    const target = byId.get(a.target_player_id);
    if (!target) continue;
    // « appliquée » → la cible DOIT être morte ; « bloquée » → elle DOIT survivre.
    const contradiction =
      (status === "applied" && target.is_alive) || (status === "protected" && !target.is_alive);
    if (!contradiction) continue;
    const actor = byId.get(a.actor_player_id);
    out.push({
      severity: "high",
      category: "bug",
      tour,
      phase,
      botPseudo: actor?.pseudo,
      roleSlug: actor?.role_slug ?? null,
      dedupeKey: `bug:effect-mismatch:${a.id}`,
      title:
        status === "applied"
          ? `Attaque « ${a.source ?? "?"} » résolue « appliquée » mais ${target.pseudo} est vivant`
          : `Attaque « ${a.source ?? "?"} » résolue « bloquée » mais ${target.pseudo} est mort`,
      detail:
        "Le resolver a écrit resolution.status, mais l'état réel du joueur le contredit : l'effet annoncé ne correspond pas à ce qui s'est passé. Soit le kill/la protection n'a pas pris, soit le statut écrit est faux.",
      evidence: {
        actionId: a.id,
        source: a.source,
        status,
        target: target.pseudo,
        target_is_alive: target.is_alive,
      },
    });
  }

  return out;
}
