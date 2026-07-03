UPDATE public.players SET role_slug = NULL WHERE role_slug = 'avocat';
DELETE FROM public.roles WHERE slug = 'avocat';
UPDATE public.games SET banned_roles = array_remove(banned_roles, 'avocat') WHERE 'avocat' = ANY(banned_roles);