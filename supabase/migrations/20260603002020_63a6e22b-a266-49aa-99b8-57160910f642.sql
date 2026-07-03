-- =====================================================================
-- Resolver v2 — Chantier A : schéma
-- =====================================================================

-- Enums
CREATE TYPE public.action_category_t AS ENUM (
  'ATTACK', 'PROTECT', 'CURE', 'INVESTIGATE', 'BLOCK',
  'FALSIFY', 'CASCADE', 'TRANSFER', 'CONVERT', 'META'
);

CREATE TYPE public.action_timing_t AS ENUM (
  'INSTANT', 'ANTICIPATED', 'DEFERRED'
);

-- Extend role_actions (now the unified intents table)
ALTER TABLE public.role_actions
  ADD COLUMN category public.action_category_t,
  ADD COLUMN timing public.action_timing_t,
  ADD COLUMN source text,
  ADD COLUMN item_id uuid,
  ADD COLUMN preconditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN resolved_at timestamptz,
  ADD COLUMN resolution jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN layer smallint;

CREATE INDEX idx_role_actions_unresolved
  ON public.role_actions (game_id, tour, layer)
  WHERE resolved_at IS NULL AND category IS NOT NULL;

-- =====================================================================
-- Inventory
-- =====================================================================
CREATE TABLE public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  holder_player_id uuid NOT NULL,
  item_slug text NOT NULL,
  charges integer,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_holder ON public.inventory (game_id, holder_player_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO anon;
GRANT ALL ON public.inventory TO service_role;

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory all"
  ON public.inventory
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================================
-- Player statuses (mirror read by the bandeau)
-- =====================================================================
CREATE TABLE public.player_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  player_id uuid NOT NULL,
  status_slug text NOT NULL,
  source text,
  active_from_tour integer NOT NULL,
  active_until_tour integer,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_player_statuses_active
  ON public.player_statuses (game_id, player_id, status_slug);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_statuses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_statuses TO anon;
GRANT ALL ON public.player_statuses TO service_role;

ALTER TABLE public.player_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_statuses all"
  ON public.player_statuses
  FOR ALL
  USING (true)
  WITH CHECK (true);
