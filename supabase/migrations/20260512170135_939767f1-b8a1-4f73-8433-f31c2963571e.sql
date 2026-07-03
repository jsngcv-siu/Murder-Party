
-- Murder Party — Schéma initial Set 1
-- Pas d'auth Supabase: chaque téléphone a un session_id (UUID) stocké en localStorage.
-- RLS permissive (jeu en présentiel, données éphémères, code 6 chars protège l'accès).

CREATE TYPE phase_t AS ENUM ('lobby','free','gathering','vote','ended');
CREATE TYPE presence_t AS ENUM ('MUST','MUST_CONDITIONAL','OPTIONAL','EMERGENT');
CREATE TYPE faction_t AS ENUM ('Citoyens','Mechants','Neutres','Vampires','Detective');
CREATE TYPE police_verdict_t AS ENUM ('innocent','suspicious','na');

CREATE TABLE public.roles (
  slug TEXT PRIMARY KEY,
  name_fr TEXT NOT NULL,
  icon TEXT NOT NULL,
  faction faction_t NOT NULL,
  type TEXT NOT NULL,
  presence presence_t NOT NULL,
  phase_activation TEXT NOT NULL,
  archetypes INT[] NOT NULL DEFAULT '{}',
  fonctions TEXT[] NOT NULL DEFAULT '{}',
  tier TEXT,
  difficulte TEXT NOT NULL,
  pct_apparition INT,
  min_players INT NOT NULL DEFAULT 6,
  cap_pool INT,
  emergent BOOLEAN NOT NULL DEFAULT false,
  trigger_emergence TEXT,
  compensateur_de TEXT,
  police_verdict police_verdict_t NOT NULL DEFAULT 'na',
  capacite_full_text TEXT NOT NULL,
  carte_app TEXT NOT NULL,
  description TEXT,
  notes_equilibrage TEXT,
  must_min_players INT,
  target_mode TEXT NOT NULL DEFAULT 'single', -- none|single|double|multi|self_or_other
  instruction_verb TEXT NOT NULL DEFAULT 'Désigne',
  usage_label TEXT NOT NULL DEFAULT '1×/cycle',
  set_id TEXT NOT NULL DEFAULT 'set1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'lobby', -- lobby|in_progress|ended
  set_id TEXT NOT NULL DEFAULT 'set1',
  mode_detective_player BOOLEAN NOT NULL DEFAULT false,
  current_phase phase_t NOT NULL DEFAULT 'lobby',
  current_cycle INT NOT NULL DEFAULT 0,
  mj_session_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

CREATE INDEX games_code_idx ON public.games(code);

CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  pseudo TEXT NOT NULL,
  is_mj BOOLEAN NOT NULL DEFAULT false,
  is_alive BOOLEAN NOT NULL DEFAULT true,
  is_imprisoned BOOLEAN NOT NULL DEFAULT false,
  role_slug TEXT REFERENCES public.roles(slug),
  role_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, session_id),
  UNIQUE (game_id, pseudo)
);

CREATE INDEX players_game_idx ON public.players(game_id);

CREATE TABLE public.role_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  actor_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  cycle INT NOT NULL,
  phase phase_t NOT NULL,
  target_player_id UUID REFERENCES public.players(id),
  target_player_id_2 UUID REFERENCES public.players(id),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_player_idx ON public.notifications(player_id, read);

CREATE TABLE public.gathering_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  cycle INT NOT NULL,
  reason TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  cycle INT NOT NULL,
  voter_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  target_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, cycle, voter_player_id)
);

-- RLS permissive (prototype - jeu présentiel)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gathering_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles read all" ON public.roles FOR SELECT USING (true);
CREATE POLICY "games all" ON public.games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "players all" ON public.players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "actions all" ON public.role_actions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "notifications all" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "gathering all" ON public.gathering_calls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "votes all" ON public.votes FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gathering_calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.role_actions;

ALTER TABLE public.games REPLICA IDENTITY FULL;
ALTER TABLE public.players REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.gathering_calls REPLICA IDENTITY FULL;
ALTER TABLE public.votes REPLICA IDENTITY FULL;
ALTER TABLE public.role_actions REPLICA IDENTITY FULL;
