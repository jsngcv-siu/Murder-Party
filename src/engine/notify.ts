// Notifications passives : on insère dans la table `notifications`.
// - player_id = <id>     → vue joueur (2e personne, "tu...")
// - player_id = null     → vue MJ omnisciente (3e personne du singulier)
// Les frames PA4 Carnet et bandeau PA1 lisent les rows ciblées sur le joueur.
// Le dashboard MJ lit uniquement les rows player_id IS NULL.
import { supabase } from "@/integrations/supabase/client";

export async function notify(opts: {
  gameId: string;
  playerId: string;
  type: string;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
  /** Variante 3e personne pour le MJ. Si fournie, une seconde ligne (player_id=null) est insérée. */
  mjTitle?: string;
  mjBody?: string;
}) {
  await supabase.from("notifications").insert({
    game_id: opts.gameId,
    player_id: opts.playerId,
    type: opts.type,
    title: opts.title,
    body: opts.body ?? null,
    payload: (opts.payload ?? {}) as never,
  });
  if (opts.mjTitle) {
    await supabase.from("notifications").insert({
      game_id: opts.gameId,
      player_id: null,
      type: opts.type,
      title: opts.mjTitle,
      body: opts.mjBody ?? null,
      payload: { ...(opts.payload ?? {}), mj_view: true } as never,
    });
  }
}

/** Émet une ligne destinée uniquement au MJ (3e personne). */
export async function notifyMJ(opts: {
  gameId: string;
  type: string;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
}) {
  await supabase.from("notifications").insert({
    game_id: opts.gameId,
    player_id: null,
    type: opts.type,
    title: opts.title,
    body: opts.body ?? null,
    payload: { ...(opts.payload ?? {}), mj_view: true } as never,
  });
}
