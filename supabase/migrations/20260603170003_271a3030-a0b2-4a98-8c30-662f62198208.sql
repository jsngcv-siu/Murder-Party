
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS draw_weight numeric NOT NULL DEFAULT 1.0;

-- Rôles "épice" — tirés rarement
UPDATE public.roles SET draw_weight = 0.35 WHERE slug = 'vampire';
UPDATE public.roles SET draw_weight = 0.5  WHERE slug = 'imitateur';
UPDATE public.roles SET draw_weight = 0.5  WHERE slug = 'parieur_tricheur';
UPDATE public.roles SET draw_weight = 0.6  WHERE slug = 'heritier_dechu';
UPDATE public.roles SET draw_weight = 0.6  WHERE slug = 'veuve_noire';
UPDATE public.roles SET draw_weight = 0.7  WHERE slug = 'conservateur';
UPDATE public.roles SET draw_weight = 0.7  WHERE slug = 'oracle';
-- Tromperie méchant à fort impact
UPDATE public.roles SET draw_weight = 0.6  WHERE slug = 'marionnettiste';
UPDATE public.roles SET draw_weight = 0.7  WHERE slug = 'falsificateur';
UPDATE public.roles SET draw_weight = 0.7  WHERE slug = 'usurpateur';
