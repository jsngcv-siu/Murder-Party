# 19 — Dossier pour l'étude technique

Cahier des **besoins** destiné à une future analyse technique comparative. Ce document ne recommande **ni moteur, ni framework, ni langage, ni service** : il consolide ce que la solution retenue devra permettre.

## 1. Nature du produit

- Compagnon numérique **temps réel** d'un jeu de société en présentiel (déduction sociale à rôles cachés), en **français**.
- Chaque participant utilise **son propre téléphone** ; l'essentiel du jeu (débats) se déroule hors application.
- Le produit est un **arbitre** : il détient la vérité de la partie (rôles, phases, résolutions, verdicts, victoire) et la distribue de façon **asymétrique** (chacun ne voit que ce à quoi il a droit).

## 2. Plateformes et contexte d'usage

- **Connu** : téléphone mobile, orientation portrait, usage debout, lumière basse, sessions d'une soirée. Accessibilité visée : contrastes élevés, cibles tactiles larges, alternative animations réduites.
- **À confirmer** (Q-E3) : application installable vs navigateur, tablette/ordinateur, multilinguisme.

## 3. Dimension d'une partie

| Grandeur | Valeur |
|---|---|
| Joueurs par partie | 6 à 20 (+1 MJ éventuel) ; bande typique 6–15 |
| Durée de session | Non bornée ; purge d'office à 4 h — durée réelle dépendant des réglages et de la table |
| Tour de jeu | 4 phases ; de ~2 min (réglages minimaux) à bien plus (débats longs, Mode MJ) |
| Parties simultanées | **Inconnue** (Q-E2) — dimensionnement à définir |

## 4. Interactivité et fréquence des actions

- Par joueur et par tour : ≈1 action de capacité + ≤1 objet + 1 vote (modifiable) + mises à jour de notes/suspicions.
- **Rafales** : les actions se concentrent en fin d'Enquête et en fenêtre de Vote — jusqu'à 20 joueurs agissant dans la même poignée de secondes.
- Flux continus : présence, chats (équipe, morts, parloir), progression des chronos.
- L'ensemble reste un volume **faible en débit** mais **exigeant en cohérence et en latence perçue**.

## 5. Besoins de synchronisation (détail : [12](12-session-live-et-synchronisation.md))

1. Source d'autorité unique de l'état ; les appareils ne sont que des projections.
2. Horloge de référence commune pour tous les comptes à rebours (écart perçu < 1 s).
3. Avancement des phases **indépendant des clients** (la partie progresse tous téléphones verrouillés) avec **exécution exactement-une-fois** de chaque transition/résolution (exclusion mutuelle), et rattrapage borné.
4. Propagation continue des changements d'état à tous les ayants droit (cible ≤ 2 s au premier plan).
5. Démarrage synchronisé atomique (tous les joueurs prêts), sans dépendre d'un hôte.
6. Cycle d'action en trois temps distincts : envoyée / acceptée (préconditions, quotas revérifiés par l'autorité) / résolue (au dénouement différé).
7. Idempotence générale : aucun double effet possible (votes remplacés, résolutions marquées, verrous).

## 6. Informations secrètes à protéger (détail : [08](08-information-secrete-et-visibilite.md))

- **Rôles et factions** de tous les joueurs ; **bulletins de vote** ; **auteurs anonymes** (protecteurs, Geôlier, Parieur, Conjuré, Facteur, Armurier, Corrupteur/Juge indiscernables) ; canaux privés (équipe, morts, parloir, régie MJ) ; intentions en attente ; morts différées (cachées même à la victime).
- **Exigence cible** : la visibilité doit être appliquée **au niveau de la distribution des données** — un participant ne doit *recevoir* que ce qu'il a le droit de voir. **État actuel connu : non atteint** (masquage à l'affichage seulement ; un joueur outillé peut lire les rôles). L'étude technique devra chiffrer le coût de la mise au niveau et le niveau d'exigence retenu (Q-E1).
- Menace secondaire spécifique au présentiel : le regard par-dessus l'épaule — déjà traité par l'interface (écrans masqués par défaut) ; à préserver.

## 7. Persistance et reprise

- L'état **complet** d'une partie doit survivre à la disparition de tous les appareils (liste en [16](16-glossaire-des-donnees-fonctionnelles.md), colonne « Reprise »).
- Reconnexion : reconstruction fidèle et filtrée par les droits (état courant + historiques utiles + notifications non traitées, sans rejeu des périmées).
- Identité **sans compte** : reconnaissance stable d'un joueur sur son appareil ; politique multi-appareils à définir (Q-B4).
- Rétention actuelle : purge ~30 min après la fin, 4 h après le lancement. Tout besoin futur d'historique/statistiques la remettrait en cause (Q-E4).

## 8. Rôles de l'hôte, du MJ et des joueurs

- **Hôte (lead)** : configuration du salon, lancement, transferts, exclusions — aucun rôle d'exécution en partie (mode Joueur Only).
- **MJ** (optionnel) : vue omnisciente, commandes de rythme (phases, pause), narration ; **aucun pouvoir d'altération des règles**.
- **Joueurs** : symétriques entre eux ; aucun n'est techniquement indispensable au déroulement.

## 9. Règles nécessitant une résolution officielle (arbitrage central)

- La **résolution différée par couches** avec ordre déterministe et préconditions revérifiées ([09](09-regles-resolution-et-priorites.md)).
- Le **dépouillement des votes** (égalités, variante Suspicion).
- La **vérification continue des victoires** avec ordre de priorité et arrêt immédiat.
- Les **tirages aléatoires officiels** (composition, égalités, 50/50, duels de dés, reliques, auto-choix) : uniques, non rejouables, identiques pour tous.
- Les **quotas et budgets** de capacités.

## 10. Exigences de qualité (détail : [13](13-exigences-fonctionnelles-et-performance.md))

- **Disponibilité** : la partie doit pouvoir se dérouler sans interruption pendant toute une soirée ; l'arbitrage d'avancement est un point vital (s'il s'arrête, les phases gèlent dès que les téléphones dorment).
- **Latence perçue** : accusé local instantané (<100 ms), propagation des événements critiques en ~2 s, chronos synchrones à la seconde.
- **Montée en charge** : à préciser (Q-E2) ; la diffusion de présence croît en N² par partie — dimensionner pour 20 participants par table.
- **Tolérance** : pertes de connexion individuelles sans perte d'état ; appareils lents sans effet sur les autres.

## 11. Modération, administration, observation

- **Observé** : aucune modération de contenu (chats libres), pas de comptes, pas d'outil d'administration hors régie MJ ; pas de mode spectateur tiers.
- **À décider** : besoin de modération si le produit s'ouvre au-delà du cercle privé.

## 12. Journalisation fonctionnelle

- Nécessaire au jeu : historiques par joueur (actions + dénouements), journal omniscient de régie, Gazette chronologique canonique.
- Utile à l'exploitation : indicateurs de santé de session ([13](13-exigences-fonctionnelles-et-performance.md) §indicateurs), taux de parties conclues vs purgées.

## 13. Testabilité des règles

- Le produit s'appuie déjà sur : des joueurs simulés (réservés au développement) jouant par les vraies règles à vitesse accélérée, des simulations de composition pour calibrer l'équilibrage, des bancs visuels d'écrans.
- **Besoin pérenne** : pouvoir simuler des parties complètes (règles + résolutions + victoires) sans interface, de façon déterministe et rapide — condition du travail d'équilibrage et de non-régression sur ~60 rôles interdépendants.

## 14. Contraintes d'évolution

- **Catalogue de rôles** : en évolution constante (ajouts, refontes, suppressions fréquentes). La solution doit permettre d'ajouter un rôle en décrivant : identité (nom, faction, type, textes), limites d'usage, cible, effet (dans les couches existantes), condition de victoire éventuelle, interface éventuelle — sans toucher au squelette des phases.
- **Phases** : structure **gelée par principe** (4 phases). Les évolutions passent par : contenu d'Annonce (événements), statuts, objets, variantes de vote.
- **Variantes** : une variante de dépouillement existe déjà ; d'autres options de session sont plausibles (paramètres, tables d'événements en réserve).
- **Textes** : tout est en français, avec une exigence de cohérence texte ↔ règle (les divergences actuelles sont la première dette — Q-C1).

## 15. Inconnues empêchant encore une recommandation fiable

Reprises de [18](18-questions-et-incertitudes.md) : niveau d'exigence de confidentialité des rôles (Q-E1) ; échelle et croissance (Q-E2) ; plateformes (Q-E3) ; rétention/historique (Q-E4) ; politiques de session (late-join Q-A2, doublons Q-B4, départs Q-B3) ; règles d'échappatoire (Q-B1, Q-B2).

## 16. Questions à résoudre lors de l'étude technique

**Confidentialité et intégrité**
1. Quel niveau de protection des secrets est exigé (tolérance au « joueur outillé » en cercle privé vs garantie forte) et quel en est le coût ?
2. Comment garantir l'exécution exactement-une-fois des transitions/résolutions dans l'architecture retenue ?
3. Où vivent les tirages aléatoires officiels pour être uniques et inauditables par les joueurs ?

**Temps réel**
4. Comment obtenir une horloge partagée à ±1 s perçue sur des téléphones hétérogènes ?
5. Comment assurer la progression des phases quand aucun appareil n'est actif, avec quelle robustesse de l'arbitre (supervision, redémarrage, alerte) ?
6. Quel mécanisme de propagation supporte 20 participants × présence + événements, avec quelles cadences ?

**Sessions et identité**
7. Identité sans compte : quelle stabilité inter-appareils, quelle politique de doublon, quelle récupération après changement de téléphone ?
8. Late-join, départs définitifs, remplacement : quelles règles produit, puis quel support ?

**Données**
9. Quelle rétention (purge actuelle vs besoins d'historique/statistiques) ?
10. Quel modèle de distribution asymétrique de l'état (par joueur, par faction, par MJ) minimise les fuites par construction ?

**Ingénierie du contenu**
11. Comment représenter ~60 rôles et leurs interactions pour que l'ajout d'un rôle soit sûr (validation, tests de non-régression, simulation) ?
12. Comment garantir la cohérence texte joueur ↔ règle exécutée (source unique des textes et des limites) ?

**Exploitation**
13. Quels indicateurs de santé de session collecter, et comment détecter une partie gelée avant les joueurs ?
14. Quelle stratégie de montée en charge (tables simultanées) une fois l'échelle cible connue ?
