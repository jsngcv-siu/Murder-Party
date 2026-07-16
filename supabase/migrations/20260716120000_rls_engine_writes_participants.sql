-- C1 (audit 2026-07-16) : écritures inter-joueurs silencieusement bloquées hors hôte.
--
-- Le moteur tourne sur le client de l'ACTEUR (executeCapability appelé par
-- PA2Capability), mais les policies 20260609084448 / 20260614000701 ne laissaient
-- écrire chez un AUTRE joueur que le MJ (= créateur de la partie). Un UPDATE/INSERT
-- filtré par RLS renvoie 0 ligne SANS erreur → pour tout acteur non-hôte :
--   · Voleur : l'objet volé était DUPLIQUÉ (la victime le gardait) ;
--   · Apothicaire (don) : fiole consommée mais jamais livrée ;
--   · Falsificateur : totalement inerte ;
--   · Stratège Bain de sang : l'indice-contrepoids n'était jamais envoyé ;
--   · lettres du Facteur, couteau de l'Armurier, statuts visibles, notifs MJ… muets.
-- Jamais vu en test : /demo fait tout jouer par l'hôte (bots dans son navigateur).
--
-- Même racine que 20260713120001 (role_actions, corrigé seul à l'époque). On aligne
-- ici players / notifications / player_statuses sur le modèle de confiance réel du
-- jeu (moteur client-autoritaire, présentiel) : tout PARTICIPANT authentifié de la
-- partie peut écrire dans les lignes de SA partie. La lecture n'est pas modifiée.

-- players : UPDATE par tout participant de la même partie (avant : soi-même ou MJ).
-- Couvre patchMeta/grantItem (role_meta d'un autre joueur) et killPlayer déclenché
-- par une capacité (Exécuteur) depuis le téléphone de l'acteur.
DROP POLICY IF EXISTS "players_update_self_or_mj" ON public.players;
CREATE POLICY "players_update_participant_or_mj"
  ON public.players FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_player_in_game(game_id)
    OR public.is_game_mj(game_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_player_in_game(game_id)
    OR public.is_game_mj(game_id)
  );

-- notifications : INSERT par tout participant (avant : MJ, ou pour soi-même).
-- Nécessaire pour notify() vers une cible (indices, avertissements d'équipe) et
-- pour notifyMJ() (player_id NULL = fil d'activité MJ) depuis le client de l'acteur.
DROP POLICY IF EXISTS "notifications_insert_participant" ON public.notifications;
CREATE POLICY "notifications_insert_participant"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_player_in_game(game_id)
    OR public.is_game_mj(game_id)
  );

-- player_statuses : écriture par tout participant (avant : MJ uniquement).
-- Statuts posés par les capacités (falsifié, chantage, ivresse, marque du suspect…).
DROP POLICY IF EXISTS "player_statuses_write_mj" ON public.player_statuses;
CREATE POLICY "player_statuses_write_participant_or_mj"
  ON public.player_statuses FOR ALL
  TO authenticated
  USING (
    public.is_player_in_game(game_id)
    OR public.is_game_mj(game_id)
  )
  WITH CHECK (
    public.is_player_in_game(game_id)
    OR public.is_game_mj(game_id)
  );
