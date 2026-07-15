-- Verrou de tick : aligner le TTL SQL sur le garde JS + permettre le renouvellement.
--
-- Problème corrigé : le verrou expirait à 15 s côté SQL alors que le garde local
-- (`TICK_LOCK_TTL_MS`, src/engine/actions.ts) est à 30 s. Un tick lent — jusqu'à
-- MAX_TICK_TRANSITIONS = 6 transitions, chacune déclenchant le resolver complet —
-- dépasse largement 15 s. Le verrou expirait donc EN COURS DE ROUTE, un autre
-- client/serveur le prenait, et le resolver était rejoué en parallèle :
-- morts et notifications en double. Exactement ce que le verrou doit interdire.
--
-- Correctif en deux temps :
--   1. TTL porté à 30 s → même valeur des deux côtés (une seule vérité).
--   2. `renew_phase_tick` : le détenteur prolonge son bail avant chaque transition
--      SUPPLÉMENTAIRE. Le TTL n'a alors plus besoin de couvrir la durée TOTALE du
--      tick, seulement l'écart entre deux renouvellements. Le cas normal (une
--      transition puis sortie) n'appelle jamais cette fonction → zéro écriture en
--      plus sur le chemin chaud.

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
     -- 30 s : DOIT rester égal à TICK_LOCK_TTL_MS (src/engine/actions.ts).
     -- Ne sert que de filet si le détenteur meurt sans libérer ; le chemin normal
     -- passe par release_phase_tick, et les ticks longs par renew_phase_tick.
     AND (tick_claimed_at IS NULL
          OR tick_claimed_at < now() - interval '30 seconds');
  IF FOUND THEN
    acquired := true;
  END IF;
  RETURN acquired;
END;
$$;

-- Prolonge le bail du détenteur courant (appelé entre deux transitions d'un même
-- tick). Inconditionnel : seul le détenteur du verrou l'appelle, depuis l'intérieur
-- de sa section critique.
CREATE OR REPLACE FUNCTION public.renew_phase_tick(p_game_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.games SET tick_claimed_at = now() WHERE id = p_game_id;
$$;

GRANT EXECUTE ON FUNCTION public.renew_phase_tick(uuid) TO anon, authenticated;
