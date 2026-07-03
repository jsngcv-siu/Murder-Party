ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS is_disabled boolean NOT NULL DEFAULT false;
UPDATE public.roles SET is_disabled = true WHERE slug IN ('detective','stratege');