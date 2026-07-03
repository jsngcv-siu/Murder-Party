
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS frequency_label TEXT;

DELETE FROM public.roles WHERE slug IN (
  'comptable','notaire','reveur','fidele','loup_garou','ivrogne',
  'mort_vivant','scientifique','taupe','pelerin','voisin_coupable','non_coupable'
);

UPDATE public.roles SET name_fr = 'Le Tueur Solitaire' WHERE slug = 'tueur_isole';
