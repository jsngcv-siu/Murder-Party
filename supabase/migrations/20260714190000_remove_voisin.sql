-- Suppression totale du rôle « Le Voisin ».
-- Le rôle est retiré du jeu (code moteur, bots, UI, docs supprimés en parallèle).
-- On efface la ligne de la table roles ; il ne sera plus distribué ni affiché.
-- (Même procédé que 20260618120000_remove_detective.)

DELETE FROM public.roles WHERE slug = 'voisin';
