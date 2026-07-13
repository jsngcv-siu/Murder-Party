-- ============================================================
-- role_actions : autoriser l'ACTEUR à mettre à jour SA propre ligne.
--
-- Contexte : le bandeau « Résultat » (Piste C) a besoin que le résultat lisible
-- d'une capacité à info immédiate (Assistant → trio, Boussole → verdict,
-- Chasseur, Policier, Mouchard…) soit persisté dans `role_actions.result`.
-- Ce résultat est écrit côté client, juste après l'exécution de la capacité
-- (cf. runCapacity dans PA2Capability.tsx), via un UPDATE sur la ligne que le
-- joueur vient d'insérer.
--
-- Or l'ancienne politique `role_actions_update_mj` (migration 20260609)
-- n'autorisait l'UPDATE qu'au MJ. Pour un joueur NON-MJ, l'écriture du résultat
-- était donc rejetée silencieusement → `result` restait NULL → le bandeau
-- restait bloqué sur « Tu as enquêté sur X. » (FAIT) au lieu d'afficher la
-- réponse.
--
-- On aligne l'UPDATE sur les politiques SELECT/INSERT déjà en place : acteur de
-- la ligne OU MJ. Le moteur tournant déjà entièrement côté client (l'acteur
-- contrôle déjà le contenu qu'il INSÈRE), ceci n'élargit pas la surface de
-- confiance de façon significative.
-- ============================================================

DROP POLICY IF EXISTS "role_actions_update_mj" ON public.role_actions;

CREATE POLICY "role_actions_update_actor_or_mj"
  ON public.role_actions FOR UPDATE
  TO authenticated
  USING (
    public.is_game_mj(game_id)
    OR actor_player_id = public.my_player_id(game_id)
  )
  WITH CHECK (
    public.is_game_mj(game_id)
    OR actor_player_id = public.my_player_id(game_id)
  );
