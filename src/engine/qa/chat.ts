// Bot chat orchestration. Picks at most one eligible bot per call (throttled)
// and posts a brain-decided line to the right channel. In /demo the operator is
// the MJ, so RLS lets these inserts through (is_game_mj branch of
// chat_insert_self_in_channel) — same path that already authorizes bot votes.

import { supabase } from "@/integrations/supabase/client";
import type { GameRow, PlayerRow, RoleRow } from "../actions";
import { getBrain, type ChatChannel, type ChatContext } from "./brain";
import { meterAddRead, approxBytes } from "./egressMeter";

const GLOBAL_GAP_MS = 3500; // min spacing between any two bot messages
const PER_BOT_COOLDOWN_MS = 12000;

let lastAnyPost = 0;
const lastSpoke = new Map<string, number>();

type Candidate = { bot: PlayerRow; channel: ChatChannel };

export async function maybeBotChat(opts: {
  gameId: string;
  game: GameRow;
  bots: PlayerRow[]; // non-MJ players (bots only — caller excludes the embodied human)
  alive: PlayerRow[];
  rolesBySlug: Map<string, RoleRow>;
}): Promise<void> {
  const now = Date.now();
  if (now - lastAnyPost < GLOBAL_GAP_MS) return;
  if (opts.game.status !== "in_progress") return;

  // Eligible speakers: living villains → mechants ; dead bots → council.
  const candidates: Candidate[] = [];
  for (const b of opts.bots) {
    if (b.is_mj) continue;
    if (now - (lastSpoke.get(b.id) ?? 0) < PER_BOT_COOLDOWN_MS) continue;
    if (b.is_alive && !b.is_imprisoned) {
      if (opts.rolesBySlug.get(b.role_slug ?? "")?.faction === "Méchant") {
        candidates.push({ bot: b, channel: "mechants" });
      }
    } else if (!b.is_alive) {
      candidates.push({ bot: b, channel: "council" });
    }
  }
  if (candidates.length === 0) return;

  const choice = candidates[Math.floor(Math.random() * candidates.length)];
  const { bot, channel } = choice;

  const { data: recentRaw } = await supabase
    .from("chat_messages")
    .select("author_player_id, author_pseudo, body")
    .eq("game_id", opts.gameId)
    .eq("channel", channel)
    .order("created_at", { ascending: false })
    .limit(6);
  meterAddRead(approxBytes(recentRaw));
  const recent = ((recentRaw ?? []) as ChatContext["recent"]).slice().reverse();

  const ctx: ChatContext = {
    bot,
    role: bot.role_slug ? (opts.rolesBySlug.get(bot.role_slug) ?? null) : null,
    channel,
    game: opts.game,
    phase: opts.game.current_phase,
    tour: opts.game.current_tour,
    alive: opts.alive,
    rolesBySlug: opts.rolesBySlug,
    recent,
  };

  let line: string | null;
  try {
    line = await getBrain().decideChat(ctx);
  } catch {
    line = null;
  }
  if (!line) return;

  const { error } = await supabase.from("chat_messages").insert({
    game_id: opts.gameId,
    channel,
    author_player_id: bot.id,
    author_pseudo: bot.pseudo,
    body: line,
  });
  if (error) {
    // Likely RLS (operator not MJ) — log once and back off so we don't spam.
    console.warn("[bot chat] insert refused:", error.message);
    lastAnyPost = now + 30_000;
    return;
  }
  lastSpoke.set(bot.id, now);
  lastAnyPost = now;
}
