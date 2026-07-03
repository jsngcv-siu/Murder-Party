ALTER TABLE public.roles
  DROP COLUMN IF EXISTS notes_equilibrage,
  DROP COLUMN IF EXISTS cap_pool,
  DROP COLUMN IF EXISTS must_min_players,
  DROP COLUMN IF EXISTS pct_apparition,
  DROP COLUMN IF EXISTS archetypes,
  DROP COLUMN IF EXISTS fonctions,
  DROP COLUMN IF EXISTS tier,
  DROP COLUMN IF EXISTS civil_group;