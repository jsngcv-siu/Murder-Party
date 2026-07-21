# 11 — Parcours et expérience joueur

Pour chaque parcours : informations nécessaires, décisions attendues, retours immédiats, confirmations, moments d'attente, risques de confusion et éléments de réassurance. Le principe transverse : **le joueur doit toujours comprendre son état, son action disponible et les faits publics au premier regard**.

## 1. L'hôte (lead / créateur)

- **Décisions** : pseudo → mode (MJ ou Joueur Only) → réglages du salon (cible de joueurs, durées, pool de rôles, bans, variante) → lancement.
- **Retours immédiats** : confirmation de création avec le code ; copie du code en un geste (« Code copié ») ; jauge d'effectif en temps réel ; état du bouton de lancement explicite (« Encore N joueur(s) », « Trop de joueurs », « Lancer la partie »).
- **Confirmations demandées** : transfert du lead/MJ, exclusion d'un joueur, réinitialisation du pool — toutes avec question explicite.
- **Risques de confusion** : la différence entre « cible de joueurs » et effectif présent ; les garde-fous de bans (message explicatif au refus).
- **Réassurance** : la composition (Méchants/Civils/Neutres) est récapitulée en pastilles ; les slots invalides sont signalés en rouge avant lancement.

## 2. Un joueur rejoignant normalement

- **Informations nécessaires** : le code (transmis à la table), un pseudo.
- **Retours** : entrée immédiate au salon, sa carte dans la liste avec marqueur « toi » ; choix d'avatar à effet instantané.
- **Attente** : jusqu'au lancement — occupée par l'aide (« Comment jouer », catalogue des rôles).
- **Réassurance** : compteur d'effectif et jauge ; mention du mode de la partie.

## 3. Un joueur recevant son rôle

- **Séquence** : décompte « RÉVÉLATION », consigne « Cache ton écran des autres joueurs », dossier confidentiel (rôle, faction, type, usages, capacité, subtilités, condition de victoire), bouton « Entrer dans la partie ».
- **Décision attendue** : lire puis valider. Certains rôles ont une **décision initiale** à prendre dès la première Enquête (couverture, être cher, prophétie…) — annoncée sur leur fiche.
- **Attente** : « En attente des autres… » avec compteur N/total ; le jeu ne démarre que quand tous ont validé.
- **Risques de confusion** : rôles à règles riches — traités par les pages de subtilités et l'aide permanente.
- **Réassurance** : la partie n'a pas commencé sans lui ; aucun temps de jeu ne s'écoule pendant la lecture.

## 4. Un joueur actif (vivant libre, en cours de partie)

- **Repères permanents** : numéro de tour, phase courante (stepper Enquête·Annonce·Débat·Vote), chrono, bandeau de ses statuts (avec explication au toucher), pastille d'état de sa capacité (utilisable / en attente / faite).
- **Décisions par tour** : action de capacité, objet éventuel, marquage du mur des suspicions, vote.
- **Retours immédiats** : chaque action donne un accusé (« Réussi / Échec / En cours »), persisté dans son historique ; vibrations discrètes aux moments-clés (objet reçu, capacité disponible, modale).
- **Confirmations** : le vote est enregistré au toucher et reste modifiable ; les actions irréversibles à fort enjeu (pacte, duel) passent par des écrans dédiés.
- **Attente** : pendant l'Annonce (lecture) et le Débat (jeu à la table).
- **Risques de confusion** : croire qu'une attaque a un effet immédiat (tout se dénoue à l'Annonce) ; le produit l'explique dans les fiches et les libellés (« En cours »).
- **Réassurance** : retour automatique sur le fil des Annonces à chaque début de phase ; badge de non-lus.

## 5. Un joueur éliminé (mort)

- **Ce qu'il vit** : modale personnelle de mort (avec le rôle responsable), bascule d'ambiance complète (monde spectral), accès au **Conseil des Morts** (chat), observation de toute la partie publique.
- **Ce qu'il peut faire** : chatter avec les morts, consulter (Annonces, son historique, son inventaire), suivre les votes en spectateur.
- **Ce qu'il ne peut plus faire** : voter, agir, utiliser des objets — l'interface le dit explicitement.
- **Réassurance** : son testament a été publié ; il reste dans la partie comme spectateur de fait ; l'écran d'exclusion du vote lui montre la participation en cours.

## 6. Un joueur spectateur

`NON DOCUMENTÉ` — aucun mode spectateur dédié n'existe : le mort en tient lieu. Un tiers non-joueur ne peut pas observer une partie.

## 7. Un joueur emprisonné

- **Ce qu'il vit** : modale « direction la prison », ambiance cellule, onglet Capacité remplacé par l'écran Prison.
- **Droits** : observer les débats et les faits publics ; répondre au **parloir** si le Geôlier l'ouvre ; utiliser un Passe-partout s'il en détient un ; son mur des suspicions **continue de compter** en variante Suspicion.
- **Interdits** : voter, agir, utiliser les autres objets.
- **Réassurance** : l'écran énumère précisément Bloqué/Autorisé ; la libération éventuelle est annoncée par modale (« Te voilà libre / Tu rejoues ce tour »).
- **Risque de confusion** : une libération peut venir du Juge ou du Corrupteur sans distinction — c'est voulu (règle du jeu).

## 8. Un joueur déconnecté / en perte de connexion

- **Pendant l'absence** : la partie continue sans lui (phases arbitrées côté serveur) ; ses choix non faits suivent les règles d'absence (capacité perdue, choix obligatoires auto-tirés, pas de vote).
- **Aucune pénalité d'état** : il reste vivant, son rôle et ses acquis sont intacts.
- **Signalement aux autres** : `NON DOCUMENTÉ` — aucun indicateur « X est déconnecté » visible des autres joueurs n'a été observé (le MJ voit l'activité de jeu, pas la connectivité).

## 9. Un joueur reconnecté

- **Récupération attendue** (voir [08](08-information-secrete-et-visibilite.md) §reconnexion) : état complet et fidèle — phase et chrono corrects (horloge commune), Gazette cumulée, informations privées, canaux, modales non vues seulement.
- **Chemins de retour** : bandeau « Reprendre » à l'accueil (dernière partie < 24 h), ou l'URL/code de la partie.
- **Réassurance** : resynchronisation automatique au retour au premier plan — le joueur n'a rien à faire.
- **Risque de confusion** : il peut avoir raté des modales d'événements le concernant s'il était absent longtemps ; les événements périmés sont sautés — `À CONFIRMER` que l'information essentielle (ex. « tu as été emprisonné ») reste toujours présentée à la reprise via l'état.

## 10. Un joueur arrivant en retard (late-join)

- **Observé** : l'application propose « choisis ton pseudo » et fait entrer l'arrivant même si la partie a commencé.
- **Règle de jeu appliquée** : `À CONFIRMER` — rôle attribué à l'arrivée ? placé en observation ? La mécanique exacte n'a pas pu être établie. Question ouverte majeure ([18](18-questions-et-incertitudes.md)).

## 11. Un joueur quittant définitivement

- **Chemin** : Paramètres → « Quitter la partie », avec confirmation explicite : « Quitter définitivement la partie ? Tu ne pourras pas la reprendre automatiquement. »
- **Effet pour la table** : `À CONFIRMER` — le devenir de son personnage (mort ? absent perpétuel ?) n'est pas établi. La partie, elle, continue.

## 12. Un participant face à une erreur ou une attente

- **Partie introuvable** : message clair + retour à l'accueil.
- **Échecs d'action** : message d'erreur explicite (cible requise, action indisponible, hors phase).
- **Attentes structurelles** : « En attente du lead pour lancer… », « En attente des autres… », « Le Débat va s'ouvrir… » — chaque attente est nommée et attribuée à une cause.
- **Pause** : état « Pause » affiché au chrono.
- **Réassurance générale** : le retour système ne fait jamais quitter la partie par accident (il ramène au fil des Annonces) ; l'état réel est toujours reconstruit depuis la source commune au retour au premier plan.

## Moments d'attente et rythme — synthèse

| Attente | Cause | Ce que voit le joueur |
|---|---|---|
| Salon | Effectif incomplet | Jauge N/cible, aide disponible |
| Salle d'attente | Retardataires de validation | Compteur N/total « prêts » |
| Annonce | Lecture collective | Gazette + modales personnelles |
| Débat | Jeu à la table | Consultation libre |
| Verdict | Mise en scène du résultat | Roulette + tampon (≈8 s) |
| Pause | Décision MJ | Mention « Pause » |
