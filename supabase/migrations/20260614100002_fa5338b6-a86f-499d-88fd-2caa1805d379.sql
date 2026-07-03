
-- Server time helper for timer synchronization across clients
CREATE OR REPLACE FUNCTION public.server_now_ms()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (EXTRACT(EPOCH FROM now()) * 1000)::bigint;
$$;

GRANT EXECUTE ON FUNCTION public.server_now_ms() TO anon, authenticated;

-- Block imprisoned / dead players from voting
DROP POLICY IF EXISTS votes_insert_self ON public.votes;
CREATE POLICY votes_insert_self ON public.votes
  FOR INSERT
  WITH CHECK (
    is_game_mj(game_id)
    OR (
      voter_player_id = my_player_id(game_id)
      AND EXISTS (
        SELECT 1 FROM public.players p
        WHERE p.id = voter_player_id
          AND p.is_alive = true
          AND p.is_imprisoned = false
      )
    )
  );

DROP POLICY IF EXISTS votes_update_self ON public.votes;
CREATE POLICY votes_update_self ON public.votes
  FOR UPDATE
  USING (
    is_game_mj(game_id)
    OR (
      voter_player_id = my_player_id(game_id)
      AND EXISTS (
        SELECT 1 FROM public.players p
        WHERE p.id = voter_player_id
          AND p.is_alive = true
          AND p.is_imprisoned = false
      )
    )
  )
  WITH CHECK (
    is_game_mj(game_id)
    OR (
      voter_player_id = my_player_id(game_id)
      AND EXISTS (
        SELECT 1 FROM public.players p
        WHERE p.id = voter_player_id
          AND p.is_alive = true
          AND p.is_imprisoned = false
      )
    )
  );
