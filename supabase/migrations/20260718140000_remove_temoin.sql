-- Suppression totale du rôle « Le Témoin » (décision Jason 2026-07-18, audit
-- des rôles : archétype « passif à miettes d'info », Civil/SUPPORT en surpoids
-- à 10 rôles). Code moteur, bots, QA, UI et sim nettoyés en parallèle.
-- (Même procédé que 20260714190000_remove_voisin / 20260618120000_remove_detective.)
-- NB : FK role_slug = RESTRICT → on détache d'abord les joueurs des parties
-- résiduelles (démo/bots retenues par purge_old_games) qui portaient le rôle,
-- sinon le DELETE échoue.

UPDATE public.players SET role_slug = NULL WHERE role_slug = 'temoin';
DELETE FROM public.roles WHERE slug = 'temoin';
