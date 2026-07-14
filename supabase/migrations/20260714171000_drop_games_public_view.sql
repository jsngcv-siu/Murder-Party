-- ============================================================
-- Phase 2 : suppression de la vue SECURITY DEFINER public.games_public.
--
-- Le front est désormais déployé et interroge la RPC lookup_game_by_code()
-- (migration 20260714170000). La vue n'est plus référencée par aucun code
-- ni objet SQL : on la retire pour clore définitivement l'alerte advisor
-- "Security Definer View".
-- ============================================================

DROP VIEW IF EXISTS public.games_public;
