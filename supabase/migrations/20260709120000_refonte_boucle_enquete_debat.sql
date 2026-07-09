-- Refonte de la boucle : ENQUÊTE › ANNONCE › DÉBAT › VOTE.
--
-- Contexte : la boucle affichait "Phase libre" / "Rassemblement". On renomme le
-- vocabulaire JOUEUR partout dans les cartes de rôles :
--   • "phase libre"   → "Enquête"  (unique phase d'action : toutes les capacités
--                                    actives s'y jouent désormais)
--   • "rassemblement" → selon le sens :
--        - phase où l'on AGIT      → "Enquête"  (ces rôles agissent maintenant en Enquête)
--        - moment de RÉSOLUTION    → "Annonce"  (les effets différés se dénouent à l'Annonce)
--   • Le DÉBAT (clé moteur `gathering`) ne porte plus AUCUNE capacité active.
--
-- NB : les CLÉS moteur restent `free` / `gathering` (colonne games.current_phase,
-- role_actions.phase, historique) — seule la prose des cartes change ici. Le code
-- tolère l'ancien ET le nouveau vocabulaire, donc l'ordre déploiement/migration
-- n'a aucune importance.

begin;

-- 1) Libellés de fréquence : "phase libre" / "rassemblement" → "Enquête".
update public.roles set
  usage_label     = replace(replace(usage_label, 'phase libre', 'Enquête'), 'rassemblement', 'Enquête'),
  frequency_label = replace(replace(frequency_label, 'phase libre', 'Enquête'), 'rassemblement', 'Enquête')
where set_id = 'set1';

-- 2) phase_activation : normalisée à "Enquête" pour tout rôle actif (jour ou débat).
--    On laisse 'tour' et 'CONTINU' tels quels (non-liés à une phase nommée).
update public.roles set phase_activation = 'Enquête'
where set_id = 'set1'
  and phase_activation in (
    'Phase Libre', 'PHASE_LIBRE', 'Rassemblement', 'PHASE_RASSEMBLEMENT', 'Phase Libre + Rassemblement'
  );

-- 3) Prose des cartes : "phase libre" → "Enquête", avec correction d'élision
--    ("durant la Enquête" → "durant l'Enquête").
update public.roles set capacite_full_text = replace(capacite_full_text, 'phase libre', 'Enquête')
where set_id = 'set1';
update public.roles set capacite_full_text = replace(capacite_full_text, 'la Enquête', 'l''Enquête')
where set_id = 'set1';

-- 4) Conservateur : ses 2 charges (autrefois 1× phase libre + 1× rassemblement)
--    fusionnent en 2×/Enquête.
update public.roles set
  usage_label = '2×/Enquête',
  frequency_label = '2×/Enquête',
  capacite_full_text = 'Deux fois par Enquête, désigne une cible qui reçoit une relique maudite au hasard. Tu gagnes si une personne reçoit la relique « Le Cœur du Manoir ».'
where set_id = 'set1' and slug = 'conservateur';

-- 5) Rôles dont la PROSE contient encore "rassemblement" — réécriture ciblée
--    (l'étape 3 n'a traité que "phase libre"). Chaque "rassemblement" est traduit
--    selon son sens : phase d'action → Enquête, résolution différée → Annonce.

-- Babysitter — agit en Enquête ; l'effet (protection + blocage) tombe au tour suivant.
update public.roles set
  capacite_full_text = 'À chaque Enquête, cible 1 joueur autre que toi : au tour suivant, il est protégé de la mort mais sa capacité est désactivée.'
where set_id = 'set1' and slug = 'babysitter';

-- Accusateur.
update public.roles set
  capacite_full_text = 'À chaque Enquête, désigne 1 joueur qu''il accuse, ce qui le rend suspicieux pour 1 tour.'
where set_id = 'set1' and slug = 'accusateur';

-- Barman.
update public.roles set
  capacite_full_text = 'À chaque Enquête, cible 2 joueurs. L''un des deux sera protégé mais aussi ivre durant le prochain tour (tirage 50/50). L''autre passe un bon moment avec lui.'
where set_id = 'set1' and slug = 'barman';

-- Maître chanteur.
update public.roles set
  capacite_full_text = 'À chaque Enquête, désigne 1 joueur. Sa capacité est désactivée durant le prochain tour. La cible reçoit le statut « sous chantage ».'
where set_id = 'set1' and slug = 'maitre_chanteur';

-- Veuve noire — désigne en Enquête ; les époux meurent à l''Annonce si l''un vote contre elle.
update public.roles set
  capacite_full_text = 'À chaque Enquête, choisis 2 cibles. Si l''une d''entre elles vote contre toi, les deux cibles meurent à la prochaine Annonce.'
where set_id = 'set1' and slug = 'veuve_noire';

-- Marionnettiste — 1×/partie, en Enquête.
update public.roles set
  capacite_full_text = 'Une fois par partie, en Enquête, désigne 1 joueur pour le manipuler. Tu prends le contrôle de sa capacité. La cible voit le statut « Manipulé » et sa capacité est bloquée pour ce tour.'
where set_id = 'set1' and slug = 'marionnettiste';

-- Falsificateur.
update public.roles set
  capacite_full_text = 'À chaque Enquête, il choisit une cible qui est falsifiée pour le restant de la partie. Les investigateurs ne peuvent plus récupérer d''information sur elle.'
where set_id = 'set1' and slug = 'falsificateur';

-- Stratège — marque en Enquête ; la cible meurt à l''Annonce du tour suivant.
update public.roles set
  capacite_full_text = 'Tu reçois un couteau au début de la partie. Chaque Enquête, marque une cible : elle est prévenue qu''elle est visée et meurt à l''Annonce du tour suivant (sauf protection, ou si tu es neutralisé avant). Tu peux aussi utiliser ton couteau pour frapper immédiatement.'
where set_id = 'set1' and slug = 'stratege';

-- Tueur — mort annoncée à la prochaine Annonce.
update public.roles set
  capacite_full_text = 'Une fois par Enquête, désigne 1 joueur vivant. Mort annoncée à la prochaine Annonce. Si tu es emprisonné ou tué, un Acolyte vivant et libre au hasard devient Tueur à ta place.'
where set_id = 'set1' and slug = 'tueur';

-- Armurier — le couteau remis se résout à la prochaine Annonce.
update public.roles set
  capacite_full_text = 'Ne tue pas lui-même. Une fois par Enquête, remets un couteau à un joueur vivant de ton choix (de préférence à un Acolyte). Le couteau apparaît anonymement dans son inventaire : il ne sait pas qui le lui a donné, et peut l''utiliser pour tuer 1 fois. Le kill est résolu à la prochaine Annonce.'
where set_id = 'set1' and slug = 'armurier';

commit;
