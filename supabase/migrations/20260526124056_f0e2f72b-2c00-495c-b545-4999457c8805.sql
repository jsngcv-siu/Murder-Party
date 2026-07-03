-- Réassigne les joueurs encore liés à ces rôles (parties test/dev)
UPDATE public.players SET role_slug = 'policier' WHERE role_slug = 'policier_modifie';
UPDATE public.players SET role_slug = 'voisin_coupable' WHERE role_slug = 'voisin';
UPDATE public.players SET role_slug = 'ivrogne' WHERE role_slug = 'mythomane';

DELETE FROM public.roles WHERE slug IN ('mythomane','voisin','policier_modifie');
ALTER TABLE public.roles DROP COLUMN IF EXISTS verdict_mythomane;
UPDATE public.games SET banned_roles = ARRAY(SELECT unnest(banned_roles) EXCEPT SELECT unnest(ARRAY['mythomane','voisin','policier_modifie']));