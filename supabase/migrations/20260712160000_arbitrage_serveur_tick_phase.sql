-- V0.207 — Arbitrage SERVEUR de l'avancement des phases.
--
-- Problème corrigé : l'avancement des phases (tickPhase) ne pouvait être piloté
-- que par UN client élu (le plus petit id présent). Ce client restait « présent »
-- via le websocket même téléphone verrouillé — mais ses timers JS sont alors
-- suspendus par le navigateur → plus personne n'avançait → la partie gelait à
-- 0:00 pour TOUT le monde, puis rattrapait brutalement au réveil (saut de chrono,
-- écrans de transition qui clignotent).
--
-- Correctif : un « jeton d'arbitrage » (tick_claimed_at) fait de tickPhase une
-- SECTION CRITIQUE inter-clients. N'importe quel client AU PREMIER PLAN peut
-- réclamer l'avancement ; le verrou garantit qu'un SEUL exécute la transition à
-- la fois (le resolver ne doit jamais tourner deux fois). Plus de point unique de
-- panne : si un téléphone dort, un autre prend le relais immédiatement.

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS tick_claimed_at timestamptz;

-- Acquiert le verrou d'avancement si LIBRE ou PÉRIMÉ (client crashé en pleine
-- transition — le TTL de 15 s le récupère). Renvoie true si CE client gagne le
-- tour et doit donc exécuter la transition. Atomique : l'UPDATE conditionnel ne
-- matche qu'une seule fois même si N clients appellent au même instant.
CREATE OR REPLACE FUNCTION public.claim_phase_tick(p_game_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  acquired boolean := false;
BEGIN
  UPDATE public.games
     SET tick_claimed_at = now()
   WHERE id = p_game_id
     AND (tick_claimed_at IS NULL
          OR tick_claimed_at < now() - interval '15 seconds');
  IF FOUND THEN
    acquired := true;
  END IF;
  RETURN acquired;
END;
$$;

-- Libère le verrou en fin de transition (mécanisme principal ; le TTL ci-dessus
-- ne sert qu'au filet de secours en cas de crash du client détenteur).
CREATE OR REPLACE FUNCTION public.release_phase_tick(p_game_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.games SET tick_claimed_at = NULL WHERE id = p_game_id;
$$;

GRANT EXECUTE ON FUNCTION public.claim_phase_tick(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_phase_tick(uuid) TO anon, authenticated;
