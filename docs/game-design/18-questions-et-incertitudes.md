# 18 — Questions et incertitudes

Toutes les informations manquantes, classées par impact. Pour chaque question : contexte, observé, manquant, interprétations possibles et leurs conséquences, document à mettre à jour après réponse. **Aucune hypothèse n'est transformée en vérité.**

## A. Bloquant pour comprendre le jeu

### Q-A1 — Le rôle « Vautour »
- **Observé** : un rôle « Vautour » existe (tueur méchant camouflé ; armé dès le début ; son ciblage vise « les joueurs ayant reçu au moins une voix » au vote ; il est exclu des comportements de jeu automatique de test).
- **Manquant** : sa capacité complète, ses limites, son texte joueur.
- **Interprétations** : (a) charognard qui achève les joueurs affaiblis par le vote ; (b) rôle donnant une arme liée au résultat du vote. Chacune change sa fiche et la matrice d'actions.
- **À mettre à jour** : [06](06-joueurs-factions-et-roles.md), [07](07-actions-pouvoirs-et-interactions.md), [17](17-matrice-des-regles.md).

### Q-A2 — Arrivée en retard (late-join)
- **Observé** : un arrivant peut rejoindre une partie déjà lancée (choix de pseudo, entrée).
- **Manquant** : la règle de jeu appliquée — reçoit-il un rôle ? lequel ? est-il spectateur ? compte-t-il dans les conditions de victoire ?
- **Interprétations** : (a) rôle tiré à l'arrivée → modifie la composition en cours et l'équilibrage ; (b) observation passive → nécessite un état « spectateur » aujourd'hui inexistant. Conséquences opposées sur [10](10-victoire-defaite-et-fin-de-partie.md) et [15](15-parametres-variantes-et-equilibrage.md).
- **À mettre à jour** : [04](04-deroulement-complet-partie.md), [11](11-parcours-et-experience-joueur.md), [14](14-etats-erreurs-et-cas-limites.md).

## B. Bloquant pour garantir une partie cohérente

### Q-B1 — Joueur qui ne valide jamais sa fiche / déconnecté avant le tour 1
- **Observé** : le démarrage attend tous les humains vivants ; aucun délai limite ni forçage constaté.
- **Manquant** : l'échappatoire (délai ? exclusion ? forçage par le lead ?).
- **Conséquence** : une table peut rester bloquée en salle d'attente jusqu'à la purge (4 h).
- **À mettre à jour** : [04](04-deroulement-complet-partie.md), [14](14-etats-erreurs-et-cas-limites.md).

### Q-B2 — Lead absent au salon / MJ disparu en partie
- **Observé** : seul le lead lance ; seul le MJ avance les phases en Mode MJ ; les transferts observés supposent l'intéressé présent.
- **Manquant** : reprise de la main en son absence.
- **À mettre à jour** : [14](14-etats-erreurs-et-cas-limites.md), [12](12-session-live-et-synchronisation.md).

### Q-B3 — Départ définitif d'un joueur
- **Observé** : geste « Quitter la partie » confirmé ; la partie continue.
- **Manquant** : le sort du personnage (mort automatique ? présent-absent ?) et son poids dans les conditions de victoire.
- **Interprétations** : un personnage « absent perpétuel » vivant libre peut retarder indéfiniment des victoires ; une mort automatique change l'équilibrage.
- **À mettre à jour** : [10](10-victoire-defaite-et-fin-de-partie.md), [14](14-etats-erreurs-et-cas-limites.md).

### Q-B4 — Doublon de session (même joueur, deux appareils)
- **Observé** : rien.
- **Manquant** : politique (refus, dernier appareil gagnant, miroir).
- **À mettre à jour** : [12](12-session-live-et-synchronisation.md), [14](14-etats-erreurs-et-cas-limites.md).

### Q-B5 — Action reçue après la clôture d'une fenêtre (RES-21)
- **Observé** : la conception (résolution au basculement, préconditions revérifiées) borne les dégâts.
- **Manquant** : la règle explicite (refus ou report).
- **À mettre à jour** : [09](09-regles-resolution-et-priorites.md), [14](14-etats-erreurs-et-cas-limites.md).

### Q-B6 — Priorité libération vs exécution le même tour
- **Observé** : l'exécution est immédiate (pendant l'Enquête), la libération s'applique au basculement de tour — l'ordre implicite favorise l'exécution.
- **Manquant** : la règle affichée.
- **À mettre à jour** : [09](09-regles-resolution-et-priorites.md).

## C. Important pour l'équilibrage

### Q-C1 — Contradictions texte joueur ↔ comportement réel (`CONTRADICTOIRE`)
À trancher une par une (quel côté fait foi ?), puis aligner texte et règle :

| Sujet | Texte joueur | Comportement réel |
|---|---|---|
| **Pyromane — allumette** | « une fois dans la partie » | répétable avec délai de 2 tours pleins |
| **Pyromane — quota** | 2/3/4 selon la taille | 3 (≤15 j.) / 4 (16+) |
| **Policier — camouflages** | 3 rôles cités (Tueur, Croque-mitaine, Stratège) | tous les killer-class blanchis (aussi Armurier, Détrousseur, Franc-tireur, Vautour) |
| **Ange Gardien** | « annule la prochaine attaque puis disparaît » | fenêtre fixe de 2 tours (pas une charge à l'attaque) |
| **Jardinier** | ancien texte : « ramasse un objet laissé par un mort » | duplication du dernier objet d'un vivant |
| **Apothicaire — clairvoyance** | « révèle sa faction » | révèle la faction **apparente** (couvertures respectées) |
| **Cleaner** | « victime d'une attaque méchante » | exclut les couteaux d'origine civile (nuance non dite) |
- **À mettre à jour** : [06](06-joueurs-factions-et-roles.md), textes d'aide du produit.

### Q-C2 — Priorité des victoires solo sur les victoires de faction (AMB-R3)
- **Observé** : l'ordre de vérification fait primer un quota solo atteint le même tour qu'une majorité de faction.
- **Manquant** : confirmation que c'est voulu, et affichage de la règle.
- **À mettre à jour** : [10](10-victoire-defaite-et-fin-de-partie.md).

### Q-C3 — Fenêtres de protection hétérogènes (AMB-R1)
- **Observé** : deux protections aux libellés proches couvrent des fenêtres différentes (« le restant du tour » vs « jusqu'au tour suivant »).
- **À mettre à jour** : [07](07-actions-pouvoirs-et-interactions.md).

### Q-C4 — Empoisonneur et prisonniers
- **Observé** : les emprisonnés sortent du décompte « survivants libres » ; l'Empoisonneur peut gagner sans avoir empoisonné des joueurs simplement incarcérés.
- **Manquant** : caractère voulu.
- **À mettre à jour** : [10](10-victoire-defaite-et-fin-de-partie.md).

### Q-C5 — Cadences d'usage non tranchées
- Majordome (fréquence de protection), Accusateur, Falsificateur, Maître chanteur, Marionnettiste, Voleur : la cadence exacte (chaque Enquête ? limitée ?) est `DÉDUIT`/`À CONFIRMER` dans la matrice d'actions.
- **À mettre à jour** : [07](07-actions-pouvoirs-et-interactions.md).

### Q-C6 — Grandes tables (16–20 joueurs)
- **Observé** : barème étendu récemment ; déclaré moins éprouvé que la bande 6–15.
- **Manquant** : validation par le jeu réel ; aucune donnée de taux de victoire n'existe.
- **À mettre à jour** : [15](15-parametres-variantes-et-equilibrage.md).

## D. Important pour l'expérience utilisateur

### Q-D1 — Blocage : capacité seule ou capacité + objets (ACT-05)
- L'interface annonce « capacité **et objets** inutilisables », la résolution n'annule que les intentions de rôle. Trancher, puis harmoniser message et règle.
- **À mettre à jour** : [07](07-actions-pouvoirs-et-interactions.md), [09](09-regles-resolution-et-priorites.md).

### Q-D2 — Révélation générale en fin de partie
- Seuls les vainqueurs sont révélés ; faut-il révéler tous les rôles (usage courant du genre) ?
- **À mettre à jour** : [10](10-victoire-defaite-et-fin-de-partie.md).

### Q-D3 — Anciens textes d'aide non purgés
- Des rôles supprimés (Témoin, Poltergeist) figurent encore dans des textes d'aide — risque de confusion joueur.
- **À mettre à jour** : textes d'aide du produit ; [06](06-joueurs-factions-et-roles.md) (section obsolète déjà posée).

### Q-D4 — Signalement des déconnexions aux autres joueurs
- Aucun indicateur « X est déconnecté » ; la table peut attendre un joueur parti. Besoin à confirmer.
- **À mettre à jour** : [11](11-parcours-et-experience-joueur.md), [12](12-session-live-et-synchronisation.md).

### Q-D5 — Reprise tardive et modales sautées
- Les événements périmés ne sont pas rejoués ; vérifier qu'un reconnecté tardif comprend toujours son état (ex. emprisonné pendant son absence).
- **À mettre à jour** : [11](11-parcours-et-experience-joueur.md).

## E. Nécessaire à la future étude technique

### Q-E1 — Confidentialité des rôles au niveau des données
- **Observé** : chaque appareil reçoit les données de rôle de tous ; le masquage est purement à l'affichage (faiblesse connue).
- **Manquant** : le niveau d'exigence cible (tolérée pour un jeu de salon ? à corriger absolument ?).
- **À mettre à jour** : [13](13-exigences-fonctionnelles-et-performance.md), [19](19-dossier-pour-etude-technique.md).

### Q-E2 — Échelle visée
- Parties simultanées, croissance attendue, usage public ou cercle privé : aucune cible observée.
- **À mettre à jour** : [13](13-exigences-fonctionnelles-et-performance.md), [19](19-dossier-pour-etude-technique.md).

### Q-E3 — Plateformes cibles
- Mobile web observé ; applications installables, tablette, autres langues : non documenté.
- **À mettre à jour** : [19](19-dossier-pour-etude-technique.md).

### Q-E4 — Rétention et historique
- La purge rapide (30 min après la fin) interdit tout historique de parties ; un besoin de statistiques/replays changerait les exigences de persistance.
- **À mettre à jour** : [19](19-dossier-pour-etude-technique.md).

## F. Amélioration documentaire

- Q-F1 — Unifier le nom de la 3ᵉ phase (« Débat » vs « Rassemblement »/« Convocation ») dans le produit.
- Q-F2 — Publier les règles d'égalité (vote classique vs variante) dans l'aide joueur.
- Q-F3 — Documenter la fenêtre exacte de chaque protection dans les fiches concernées.
- Q-F4 — Étendre l'aide sur les scellés d'anonymat (qui ne sera jamais révélé, même à la fin).
