
-- 1) Lobby games : ne plus exposer toutes les games en lobby à tous les authentifiés.
--    L'écran "rejoindre" utilise déjà la vue games_public (code -> id).
--    On restreint la lecture aux participants et au MJ uniquement.
DROP POLICY IF EXISTS games_select_participants_or_mj_or_lobby ON public.games;
CREATE POLICY games_select_participants_or_mj
  ON public.games
  FOR SELECT
  TO authenticated
  USING (mj_user_id = auth.uid() OR is_player_in_game(id));

-- 2) Notifications : restreindre les policies au rôle authenticated (au lieu de public).
DROP POLICY IF EXISTS notifications_insert_participant ON public.notifications;
CREATE POLICY notifications_insert_participant
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_game_mj(game_id)
    OR (player_id IS NOT NULL AND player_id = my_player_id(game_id))
  );

DROP POLICY IF EXISTS notifications_select_recipient_or_mj ON public.notifications;
CREATE POLICY notifications_select_recipient_or_mj
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    is_game_mj(game_id)
    OR (player_id IS NOT NULL AND player_id = my_player_id(game_id))
  );
