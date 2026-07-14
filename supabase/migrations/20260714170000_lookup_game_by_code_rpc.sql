-- ============================================================
-- Remplace la vue SECURITY DEFINER public.games_public par une
-- fonction SECURITY DEFINER (pattern recommandé Supabase, advisor-clean).
--
-- Contexte : la RLS de public.games limite la lecture aux participants + MJ.
-- Un joueur pas encore participant (voire anonyme) doit pouvoir résoudre
-- code -> id pour rejoindre une partie. La vue games_public contournait la
-- RLS via SECURITY DEFINER (security_invoker = false), ce que l'advisor
-- Supabase signale en CRITICAL ("Security Definer View").
--
-- La fonction ci-dessous n'expose que les colonnes non-sensibles d'UNE
-- partie ciblée par son code : plus étroit et plus sûr que la vue, qui
-- exposait les colonnes publiques de TOUTES les parties.
--
-- Phase 1 : on crée la RPC SANS supprimer la vue, pour que l'ancien front
-- (qui interroge encore games_public) continue de fonctionner pendant le
-- déploiement Vercel. La suppression de la vue se fait dans une migration
-- ultérieure, une fois le nouveau front en ligne.
-- ============================================================

CREATE OR REPLACE FUNCTION public.lookup_game_by_code(_code text)
RETURNS TABLE (
  id uuid,
  code text,
  status text,
  mode_detective_player boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT g.id, g.code, g.status, g.mode_detective_player
  FROM public.games g
  WHERE g.code = upper(_code)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_game_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_game_by_code(text) TO anon, authenticated;
