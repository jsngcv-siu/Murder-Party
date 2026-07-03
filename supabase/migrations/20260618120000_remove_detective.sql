-- Suppression définitive du rôle « Le Détective ».
-- Il était déjà désactivé (is_disabled = true) et remplacé par l'Assistant du
-- détective (le « Détective immortel » hors parité n'existe plus). Jamais tiré,
-- masqué du codex — on le retire de la base pour de bon. Même schéma que le
-- retrait de l'Avocat (migration 20260607222325).
UPDATE public.players SET role_slug = NULL WHERE role_slug = 'detective';
DELETE FROM public.roles WHERE slug = 'detective';
UPDATE public.games SET banned_roles = array_remove(banned_roles, 'detective') WHERE 'detective' = ANY(banned_roles);
