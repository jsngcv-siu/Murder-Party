import { supabase } from "@/integrations/supabase/client";
import { ensureAuth, getSessionId } from "./session";

export const MIN_PLAYERS = 6;
export const MAX_PLAYERS = 15;

function generateGameCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 6; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export type GameRow = {
  id: string;
  code: string;
  status: string;
  set_id: string;
  mode_detective_player: boolean;
  current_phase: "lobby" | "free" | "annonce" | "gathering" | "vote" | "ended";
  current_tour: number;
  mj_session_id: string;
  mj_user_id: string | null;
  created_at: string;
  phase_started_at: string | null;
  phase_duration_s: number | null;
  phase_duration_free_s: number | null;
  phase_duration_gathering_s: number | null;
  phase_duration_vote_s: number | null;
  paused: boolean;
  forced_frame: string | null;
  banned_roles: string[];
  pool_config: unknown;
  variant: string | null;
};

export type PlayerRow = {
  id: string;
  game_id: string;
  session_id: string;
  user_id: string | null;
  pseudo: string;
  is_mj: boolean;
  is_alive: boolean;
  is_imprisoned: boolean;
  role_slug: string | null;
  role_meta: Record<string, unknown>;
  joined_at: string;
};

export async function createGame(opts: {
  mjPseudo: string;
  modeDetectivePlayer: boolean;
}): Promise<{ game: GameRow; player: PlayerRow }> {
  const userId = await ensureAuth();
  const sessionId = getSessionId();
  for (let i = 0; i < 5; i++) {
    const code = generateGameCode();
    const { data: g, error: gErr } = await supabase
      .from("games")
      .insert({
        code,
        mj_session_id: sessionId,
        mj_user_id: userId,
        mode_detective_player: opts.modeDetectivePlayer,
        phase_duration_free_s: 180,
        phase_duration_gathering_s: 180,
        phase_duration_vote_s: 30,
      } as never)
      .select()
      .single();
    if (gErr) {
      if (i < 4 && /duplicate/i.test(gErr.message)) continue;
      throw gErr;
    }
    const game = g as GameRow;

    const { data: p, error: pErr } = await supabase
      .from("players")
      .insert({
        game_id: game.id,
        session_id: sessionId,
        user_id: userId,
        pseudo: opts.mjPseudo.slice(0, 10),
        is_mj: !opts.modeDetectivePlayer,
      } as never)
      .select()
      .single();
    if (pErr) throw pErr;
    return { game, player: p as PlayerRow };
  }
  throw new Error("Impossible de créer une partie (code en collision).");
}

export async function joinGame(opts: {
  code: string;
  pseudo: string;
}): Promise<{ game: GameRow; player: PlayerRow }> {
  const userId = await ensureAuth();
  const sessionId = getSessionId();
  const code = opts.code.toUpperCase().trim();

  // Lookup via la vue publique (les non-participants n'ont pas accès à la table games).
  const { data: gPub, error: gErr } = await supabase
    .from("games_public" as never)
    .select("id,code,status,mode_detective_player")
    .eq("code", code)
    .maybeSingle();
  if (gErr) throw gErr;
  if (!gPub) throw new Error("Aucune partie trouvée avec ce code.");
  const gameLite = gPub as { id: string; code: string; status: string; mode_detective_player: boolean };

  if (gameLite.status !== "lobby") {
    // Reconnexion : on cherche notre player row par user_id (autorisé par RLS si on a déjà rejoint).
    const { data: existing } = await supabase
      .from("players")
      .select()
      .eq("game_id", gameLite.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      const { data: g } = await supabase.from("games").select().eq("id", gameLite.id).maybeSingle();
      if (g) return { game: g as GameRow, player: existing as PlayerRow };
    }
    throw new Error("La partie a déjà commencé.");
  }

  // Reconnexion silencieuse en lobby si déjà membre
  const { data: existing } = await supabase
    .from("players")
    .select()
    .eq("game_id", gameLite.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) {
    const { data: g } = await supabase.from("games").select().eq("id", gameLite.id).maybeSingle();
    if (g) return { game: g as GameRow, player: existing as PlayerRow };
  }

  // Cap MAX
  const { count } = await supabase
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("game_id", gameLite.id)
    .eq("is_mj", false);
  if ((count ?? 0) >= MAX_PLAYERS) {
    throw new Error(`La partie est complète (max ${MAX_PLAYERS} joueurs${gameLite.mode_detective_player ? "" : " + MJ"}).`);
  }

  const { data: p, error: pErr } = await supabase
    .from("players")
    .insert({
      game_id: gameLite.id,
      session_id: sessionId,
      user_id: userId,
      pseudo: opts.pseudo.slice(0, 10),
      is_mj: false,
    } as never)
    .select()
    .single();
  if (pErr) {
    if (/duplicate/i.test(pErr.message)) {
      throw new Error("Ce pseudo est déjà pris dans cette partie.");
    }
    throw pErr;
  }
  const { data: g } = await supabase.from("games").select().eq("id", gameLite.id).maybeSingle();
  return { game: g as GameRow, player: p as PlayerRow };
}
