
-- ============================================================
-- 1) Schema additions
-- ============================================================
ALTER TABLE public.players  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.games    ADD COLUMN IF NOT EXISTS mj_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS players_user_id_idx ON public.players(user_id);
CREATE INDEX IF NOT EXISTS players_game_user_idx ON public.players(game_id, user_id);
CREATE INDEX IF NOT EXISTS games_mj_user_idx ON public.games(mj_user_id);

-- ============================================================
-- 2) Security definer helpers
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_game_mj(_game uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.games g
    WHERE g.id = _game AND g.mj_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_player_in_game(_game uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.game_id = _game AND p.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.my_player_id(_game uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id FROM public.players p
  WHERE p.game_id = _game AND p.user_id = auth.uid()
  LIMIT 1;
$$;

-- Returns true if the caller can read/write messages on a given channel of a game.
-- - 'council' or 'all': any player in the game
-- - 'mechants': any player whose role faction is 'Méchant' + MJ
-- - other: MJ only (safe default)
CREATE OR REPLACE FUNCTION public.can_access_chat_channel(_game uuid, _channel text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.is_game_mj(_game) THEN true
    WHEN _channel IN ('council', 'all') THEN public.is_player_in_game(_game)
    WHEN _channel = 'mechants' THEN EXISTS (
      SELECT 1 FROM public.players p
      JOIN public.roles r ON r.slug = p.role_slug
      WHERE p.game_id = _game AND p.user_id = auth.uid() AND r.faction = 'Méchant'
    )
    ELSE false
  END;
$$;

-- ============================================================
-- 3) Public view of games (omits sensitive MJ identifiers) — used to look up by code in lobby
-- ============================================================
DROP VIEW IF EXISTS public.games_public;
CREATE VIEW public.games_public
WITH (security_invoker = true) AS
SELECT
  id, code, status, set_id, mode_detective_player, current_phase, current_tour,
  created_at, started_at, ended_at, paused, forced_frame, banned_roles,
  phase_duration_free_s, phase_duration_gathering_s, phase_duration_vote_s,
  phase_duration_s, phase_started_at, pool_config, variant
FROM public.games;

GRANT SELECT ON public.games_public TO anon, authenticated;

-- ============================================================
-- 4) Drop existing permissive policies
-- ============================================================
DROP POLICY IF EXISTS "games all"           ON public.games;
DROP POLICY IF EXISTS "players all"         ON public.players;
DROP POLICY IF EXISTS "inventory all"       ON public.inventory;
DROP POLICY IF EXISTS "notifications all"   ON public.notifications;
DROP POLICY IF EXISTS "player_statuses all" ON public.player_statuses;
DROP POLICY IF EXISTS "actions all"         ON public.role_actions;
DROP POLICY IF EXISTS "chat all"            ON public.chat_messages;
DROP POLICY IF EXISTS "votes all"           ON public.votes;
DROP POLICY IF EXISTS "gathering all"       ON public.gathering_calls;

-- ============================================================
-- 5) Grants (Data API access)
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_statuses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_actions    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.votes           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gathering_calls TO authenticated;

GRANT ALL ON public.games, public.players, public.inventory, public.notifications,
            public.player_statuses, public.role_actions, public.chat_messages,
            public.votes, public.gathering_calls
       TO service_role;

-- ============================================================
-- 6) games: SELECT for participants ; mutations for MJ ; INSERT by caller
-- ============================================================
CREATE POLICY "games_select_participants_or_mj"
  ON public.games FOR SELECT
  TO authenticated
  USING (mj_user_id = auth.uid() OR public.is_player_in_game(id));

CREATE POLICY "games_insert_self_mj"
  ON public.games FOR INSERT
  TO authenticated
  WITH CHECK (mj_user_id = auth.uid());

CREATE POLICY "games_update_mj"
  ON public.games FOR UPDATE
  TO authenticated
  USING (mj_user_id = auth.uid())
  WITH CHECK (mj_user_id = auth.uid());

CREATE POLICY "games_delete_mj"
  ON public.games FOR DELETE
  TO authenticated
  USING (mj_user_id = auth.uid());

-- ============================================================
-- 7) players
-- ============================================================
-- SELECT: visible to other players of the same game, to the MJ, and to anyone querying
-- a lobby game by id (needed to display the lobby list before joining is committed).
CREATE POLICY "players_select_same_game"
  ON public.players FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_player_in_game(game_id)
    OR public.is_game_mj(game_id)
    OR EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_id AND g.status = 'lobby')
  );

-- INSERT: the row must belong to the caller (joining as themself), or the caller is MJ
-- (adding bots). Bots inserted by MJ have user_id IS NULL.
CREATE POLICY "players_insert_self_or_mj_bot"
  ON public.players FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR (user_id IS NULL AND public.is_game_mj(game_id))
  );

-- UPDATE: own row, or MJ updating any row in their game.
CREATE POLICY "players_update_self_or_mj"
  ON public.players FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_game_mj(game_id))
  WITH CHECK (user_id = auth.uid() OR public.is_game_mj(game_id));

CREATE POLICY "players_delete_self_or_mj"
  ON public.players FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_game_mj(game_id));

-- ============================================================
-- 8) inventory: secret to holder + MJ
-- ============================================================
CREATE POLICY "inventory_select_holder_or_mj"
  ON public.inventory FOR SELECT
  TO authenticated
  USING (
    public.is_game_mj(game_id)
    OR holder_player_id = public.my_player_id(game_id)
  );

CREATE POLICY "inventory_write_mj"
  ON public.inventory FOR ALL
  TO authenticated
  USING (public.is_game_mj(game_id))
  WITH CHECK (public.is_game_mj(game_id));

-- ============================================================
-- 9) notifications: secret to recipient + MJ
-- ============================================================
CREATE POLICY "notifications_select_recipient_or_mj"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    public.is_game_mj(game_id)
    OR (player_id IS NOT NULL AND player_id = public.my_player_id(game_id))
    OR (player_id IS NULL AND public.is_player_in_game(game_id))
  );

CREATE POLICY "notifications_update_recipient_or_mj"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (
    public.is_game_mj(game_id)
    OR (player_id IS NOT NULL AND player_id = public.my_player_id(game_id))
  )
  WITH CHECK (
    public.is_game_mj(game_id)
    OR (player_id IS NOT NULL AND player_id = public.my_player_id(game_id))
  );

-- Inserts/deletes are produced by the engine running on behalf of the MJ (host client).
CREATE POLICY "notifications_insert_participant"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_player_in_game(game_id) OR public.is_game_mj(game_id));

CREATE POLICY "notifications_delete_mj"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (public.is_game_mj(game_id));

-- ============================================================
-- 10) player_statuses: MJ-only (secret game state)
-- ============================================================
CREATE POLICY "player_statuses_select_mj_or_owner"
  ON public.player_statuses FOR SELECT
  TO authenticated
  USING (
    public.is_game_mj(game_id)
    OR player_id = public.my_player_id(game_id)
  );

CREATE POLICY "player_statuses_write_mj"
  ON public.player_statuses FOR ALL
  TO authenticated
  USING (public.is_game_mj(game_id))
  WITH CHECK (public.is_game_mj(game_id));

-- ============================================================
-- 11) role_actions: secret to actor + MJ ; inserts must match acting player
-- ============================================================
CREATE POLICY "role_actions_select_actor_or_mj"
  ON public.role_actions FOR SELECT
  TO authenticated
  USING (
    public.is_game_mj(game_id)
    OR actor_player_id = public.my_player_id(game_id)
  );

CREATE POLICY "role_actions_insert_actor_or_mj"
  ON public.role_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_game_mj(game_id)
    OR actor_player_id = public.my_player_id(game_id)
  );

CREATE POLICY "role_actions_update_mj"
  ON public.role_actions FOR UPDATE
  TO authenticated
  USING (public.is_game_mj(game_id))
  WITH CHECK (public.is_game_mj(game_id));

CREATE POLICY "role_actions_delete_mj"
  ON public.role_actions FOR DELETE
  TO authenticated
  USING (public.is_game_mj(game_id));

-- ============================================================
-- 12) chat_messages: per-channel ACL
-- ============================================================
CREATE POLICY "chat_select_channel_access"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (public.can_access_chat_channel(game_id, channel));

CREATE POLICY "chat_insert_self_in_channel"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_chat_channel(game_id, channel)
    AND (
      public.is_game_mj(game_id)
      OR author_player_id = public.my_player_id(game_id)
    )
  );

CREATE POLICY "chat_delete_author_or_mj"
  ON public.chat_messages FOR DELETE
  TO authenticated
  USING (
    public.is_game_mj(game_id)
    OR author_player_id = public.my_player_id(game_id)
  );

-- ============================================================
-- 13) votes: visible to game participants, writable by voter
-- ============================================================
CREATE POLICY "votes_select_game_participants"
  ON public.votes FOR SELECT
  TO authenticated
  USING (public.is_player_in_game(game_id) OR public.is_game_mj(game_id));

CREATE POLICY "votes_insert_self"
  ON public.votes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_game_mj(game_id)
    OR voter_player_id = public.my_player_id(game_id)
  );

CREATE POLICY "votes_update_self"
  ON public.votes FOR UPDATE
  TO authenticated
  USING (
    public.is_game_mj(game_id)
    OR voter_player_id = public.my_player_id(game_id)
  )
  WITH CHECK (
    public.is_game_mj(game_id)
    OR voter_player_id = public.my_player_id(game_id)
  );

CREATE POLICY "votes_delete_self_or_mj"
  ON public.votes FOR DELETE
  TO authenticated
  USING (
    public.is_game_mj(game_id)
    OR voter_player_id = public.my_player_id(game_id)
  );

-- ============================================================
-- 14) gathering_calls: participants read, MJ writes
-- ============================================================
CREATE POLICY "gathering_select_participants"
  ON public.gathering_calls FOR SELECT
  TO authenticated
  USING (public.is_player_in_game(game_id) OR public.is_game_mj(game_id));

CREATE POLICY "gathering_write_mj"
  ON public.gathering_calls FOR ALL
  TO authenticated
  USING (public.is_game_mj(game_id))
  WITH CHECK (public.is_game_mj(game_id));
