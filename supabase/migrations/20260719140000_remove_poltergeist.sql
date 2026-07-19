-- Suppression totale du rôle « Le Poltergeist » (décision Jason 2026-07-19, audit
-- post ajout-de-roles : inerte de son vivant, il bloquait à tort la victoire des
-- Civils — is_benign=false alors que la migration 20260718210000 voulait l'inverse).
-- Code moteur, resolver, winConditions, bots, QA, UI et aide nettoyés en parallèle.
-- (Même procédé que 20260718140000_remove_temoin / 20260714190000_remove_voisin.)
-- NB : FK role_slug = RESTRICT → on détache d'abord les joueurs des parties
-- résiduelles (démo/bots retenues par purge_old_games) qui portaient le rôle,
-- sinon le DELETE échoue.

UPDATE public.players SET role_slug = NULL WHERE role_slug = 'poltergeist';
DELETE FROM public.roles WHERE slug = 'poltergeist';
