
DROP POLICY IF EXISTS "games_select_participants_or_mj" ON public.games;
CREATE POLICY "games_select_participants_or_mj_or_lobby"
  ON public.games FOR SELECT
  TO authenticated
  USING (
    status = 'lobby'
    OR mj_user_id = auth.uid()
    OR public.is_player_in_game(id)
  );
