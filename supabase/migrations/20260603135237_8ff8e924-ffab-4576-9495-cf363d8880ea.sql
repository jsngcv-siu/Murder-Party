ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS phase_duration_free_s integer,
  ADD COLUMN IF NOT EXISTS phase_duration_gathering_s integer,
  ADD COLUMN IF NOT EXISTS phase_duration_vote_s integer;