// QA driver helpers — called from /demo on intervals. Keeps DB fetching in the
// engine layer; the demo only schedules these and renders the report store.

import { supabase } from "@/integrations/supabase/client";
import type { GameRow, PlayerRow, RoleRow } from "../actions";
import { auditRoleStatic } from "./expectations";
import { runInvariants, type InvariantCtx } from "./invariants";
import { addFindings, withGame } from "./report";

const INTRO_S = 3;

/** Seconds the current phase is overdue past its (intro-adjusted) duration. 0 if on time/paused. */
export function computeSecondsOverdue(game: GameRow): number {
  if (game.status !== "in_progress" || game.paused) return 0;
  const dur = game.phase_duration_s ?? 0;
  if (!dur || !game.phase_started_at) return 0;
  const started = new Date(game.phase_started_at).getTime();
  const elapsed = (Date.now() - started) / 1000 - INTRO_S;
  return Math.max(0, elapsed - dur);
}

/** Static text-vs-engine audit of every assigned role. Idempotent (deduped). */
export function runStaticRoleAudit(
  players: PlayerRow[],
  rolesBySlug: Map<string, RoleRow>,
  playerCount: number,
  gameId: string,
  gameCode: string,
) {
  const seen = new Set<string>();
  const findings = [];
  for (const p of players) {
    if (!p.role_slug || seen.has(p.role_slug)) continue;
    seen.add(p.role_slug);
    const role = rolesBySlug.get(p.role_slug);
    if (!role) continue;
    findings.push(...auditRoleStatic(role, playerCount));
  }
  if (findings.length) addFindings(withGame(findings, gameId, gameCode));
}

/** One invariant sweep: fetch the audit tables and assert global consistency. */
export async function runInvariantSweep(
  game: GameRow,
  players: PlayerRow[],
  rolesBySlug: Map<string, RoleRow>,
) {
  const gameId = game.id;
  const [notifRes, voteRes, actionRes, tourActionRes] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, player_id, title, body, type, created_at, game_id, payload, read")
      .eq("game_id", gameId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("votes").select().eq("game_id", gameId),
    supabase.from("role_actions").select().eq("game_id", gameId).is("resolved_at", null).limit(200),
    // Toutes les actions du tour courant (résolues ou non) : concurrence + effets.
    supabase
      .from("role_actions")
      .select()
      .eq("game_id", gameId)
      .eq("tour", game.current_tour)
      .limit(200),
  ]);

  const ctx: InvariantCtx = {
    game,
    players,
    rolesBySlug,
    notifications: (notifRes.data ?? []) as InvariantCtx["notifications"],
    votes: (voteRes.data ?? []) as InvariantCtx["votes"],
    roleActions: (actionRes.data ?? []) as InvariantCtx["roleActions"],
    tourActions: (tourActionRes.data ?? []) as InvariantCtx["tourActions"],
    secondsOverdue: computeSecondsOverdue(game),
  };
  const findings = runInvariants(ctx);
  if (findings.length) addFindings(withGame(findings, game.id, game.code));
}
