# 00 — Socle du jeu

**Document autonome.** Il décrit le cadre physique, le squelette, la logique et la boucle de gameplay de Murder Party — tout ce qu'un modèle IA ou un spécialiste doit tenir pour acquis avant de conseiller une méthode, une architecture ou du code. Il ne nomme **aucun rôle** : les rôles sont un catalogue de contenu (~60 entrées, en évolution constante) documenté à part ([06-joueurs-factions-et-roles.md](06-joueurs-factions-et-roles.md)) ; seul leur *cadre* est contraignant.

La dernière section distingue explicitement **ce qui est figé** de **ce qui est ouvert** : tout ce qui n'est pas déclaré figé est un espace de liberté pour la personne ou le modèle qui conçoit la solution.

---

## 1. Nature du produit et cadre physique

- Murder Party est le **compagnon numérique temps réel** d'un jeu de société de **déduction sociale à rôles cachés**, joué **en présentiel** : 6 à 20 joueurs dans la même pièce, chacun sur **son propre téléphone**, debout, en lumière basse, l'attention partagée entre l'écran et la table.
- L'application est un **arbitre**, pas un terrain de jeu : elle distribue les rôles en secret, chronomètre les phases, résout les actions, publie les faits publics et protège les secrets. **Les débats, mensonges et alliances se passent à la table, à voix haute** — l'application n'a ni chat général, ni débat intégré, et rend l'attention aux joueurs dès qu'elle a informé.
- Deux modes : **sans animateur** (référence — tout avance automatiquement au chronomètre) et **avec Maître du Jeu** (un participant non-joueur, omniscient, qui pilote uniquement le **rythme** et la narration ; il n'a aucun pouvoir d'altérer les règles).
- Langue : français. Pas de comptes utilisateur : on rejoint une partie par un **code court**, l'identité est celle de l'appareil.

## 2. Le squelette temporel (structure figée)

Une partie traverse : **Salon** (les joueurs rejoignent, l'hôte configure) → **Distribution secrète des rôles** → **Salle d'attente** (chacun lit sa fiche ; rien ne démarre tant que tous les humains n'ont pas validé) → **Tours de jeu répétés** → **Fin et révélation**.

Chaque **tour** enchaîne quatre phases, dans cet ordre, sans retour en arrière :

| Phase | Fonction | Qui agit | Durée |
|---|---|---|---|
| **Enquête** | Fenêtre d'action secrète : chacun joue sa capacité et/ou un objet. Rien n'est visible publiquement. | Vivants libres | Configurable (défaut ~30 s) |
| **Annonce** | Le jeu résout tout et publie les dénouements (la « Gazette »). Personne n'agit. | Personne (lecture) | Fixe (~10 s) |
| **Débat** | Discussion à la table. Aucune action dans l'application. | Tous, hors application | Configurable |
| **Vote** | Chacun désigne secrètement un joueur ; le plus voté part **en prison** (pas à la mort). | Vivants libres | Configurable |

Règles de rythme :
- Enquête, Débat et Vote s'ouvrent par un court écran de transition (~3 s) pendant lequel le chronomètre ne tourne pas ; l'Annonce s'affiche sans transition. Le Vote se clôt par un écran de verdict (~8 s).
- **Cette structure est gelée par principe** : on n'ajoute jamais de phase et on ne modifie pas le squelette temporel. Toute nouveauté de gameplay devient du contenu d'Annonce, un statut, un objet ou un rôle.

## 3. La logique du gameplay

### 3.1 Rôles cachés, trois familles

Chaque joueur reçoit secrètement un rôle appartenant à l'une de trois familles :
- **La majorité** (les Civils) : gagne en éliminant toutes les menaces. Ses membres ne se connaissent pas.
- **L'équipe adverse** (les Méchants) : minorité secrète et coordonnée — ses membres **se connaissent**, partagent un canal privé et la cible de leur tueur. Elle gagne par **majorité stricte** sur tous ses opposants réunis.
- **Les électrons libres** (les Neutres) : objectifs personnels (survivre, accomplir un dessein, faire émerger une faction). Certains sont **bénins** : ils ne bloquent la victoire de personne et ne comptent pas comme opposants.

Des **factions émergentes** peuvent apparaître en cours de partie (conversion contagieuse, couple lié) : un joueur peut changer de camp **sans changer de rôle**.

### 3.2 Archétypes de capacités

Le catalogue de rôles est vaste et volatile, mais toute capacité se range dans un petit nombre d'archétypes d'effet — c'est ce cadre qui est structurant, pas les rôles individuels :

| Archétype | Effet | Résolution |
|---|---|---|
| **Information** | Apprendre quelque chose sur un joueur (verdict binaire, camp, type, rôle sous contraintes, historiques) | Immédiate, en privé |
| **Protection** | Annuler des attaques sur une cible pendant une fenêtre | Différée (couche 1) |
| **Attaque** | Tuer une cible | Différée (couche 2) |
| **Contagion / conversion** | Marquer durablement ou faire changer de camp | Différée (couche 3, après les attaques) |
| **Contrôle / blocage** | Neutraliser ou piloter la capacité d'autrui pour un tour | Différée ou effet au tour suivant |
| **Tromperie / brouillage** | Fausser les réponses des capacités d'information, forger des messages, anonymiser des morts | Immédiate ou passive |
| **Transfert d'objets** | Donner, voler, dupliquer, piller des objets | Immédiate |
| **Objectif solo** | Progresser vers une condition de victoire personnelle (compteurs, quotas, paris) | Selon règle |

À cela s'ajoutent des **objets** transférables (armes, protections, informations, messages) portant une « couleur d'origine » qui survit aux transferts, et des **statuts** temporaires ou permanents posés sur les joueurs.

### 3.3 Invariants de résolution (le cœur logique, figé)

1. **Tout se joue en Enquête, tout se dénoue à l'Annonce.** Les effets létaux, protecteurs et contagieux sont enregistrés comme **intentions** et résolus en bloc, jamais en direct. Les capacités d'information répondent immédiatement, en privé.
2. **Ordre de résolution déterministe** : protections d'abord, attaques ensuite, contagions/conversions en dernier (« le kill prime » : un auteur mort ce tour n'infecte pas). À égalité de couche, l'ancienneté départage.
3. **Préconditions revérifiées au moment de résoudre** : auteur vivant et libre, cible vivante, objet encore possédé. Une intention invalide est annulée proprement.
4. **Morts différées** : un joueur frappé pendant l'Enquête reste vivant et agissant jusqu'à l'Annonce, sans le savoir. Les morts hors Enquête sont immédiates.
5. **Chaque résolution est exécutée exactement une fois** — jamais rejouée, quel que soit le nombre de déclencheurs simultanés.
6. **La prison remplace le lynchage** : le condamné du vote est écarté (ne vote plus, n'agit plus) mais vivant — il reste un enjeu (libération, évasion, exécution, négociation) et une source d'information. Égalité au vote classique : tranchée au sort ; une variante de dépouillement automatique existe (égalité → personne).
7. **Vérification continue de la victoire** : après chaque mort, conversion ou fin de résolution, le jeu teste les conditions de victoire dans un **ordre de priorité strict** (objectifs solo → factions émergentes → équipe adverse → majorité → filet « dernier survivant ») et clôt la partie **immédiatement** dès qu'une est vraie. Un filet anti-blocage garantit qu'aucune partie ne reste sans conclusion.
8. **L'aléatoire officiel est central** : tirages de composition, égalités, choix automatiques des retardataires — uniques, non rejouables, identiques pour tous.

### 3.4 Invariants d'information (figés)

1. **Le secret est une règle, pas un habillage** : aucune hiérarchie d'affichage, aucun flux ne doit révéler un rôle, une faction ou une cible non autorisés. Cible d'exigence : un appareil ne devrait *recevoir* que ce que son joueur a le droit de voir.
2. **Avarice publique** : une mort ne révèle que le pseudo et la **faction** (jamais la cause, l'arme, l'auteur) ; les événements marquants sont annoncés **sans nommer personne** ; les bulletins de vote ne sont jamais exposés. Une seule exception existe (une exécution publique révèle un rôle complet).
3. **Le brouillage est hiérarchisé** : les capacités d'information peuvent être trompées par les couvertures et camouflages ; **une seule capacité de référence perce tous les déguisements** ; un brouillage suprême (falsification) aveugle tout le monde, référence comprise.
4. **Asymétrie native** : information publique / privée à un joueur / privée à un groupe (équipe, morts, canaux éphémères) / réservée au MJ. Les morts ont leur propre espace social (chat des défunts) et restent spectateurs.
5. **Des anonymats de conception sont garantis à vie** (donateurs, protecteurs, certains agresseurs) — même la fin de partie ne les lève pas.

### 3.5 Composition (cadre figé, contenu libre)

- **Les proportions de familles ne dépendent que du nombre de joueurs** (jamais des rôles choisis) : ~20 % d'équipe adverse (plancher 2, plafond 4), 0 à 3 neutres selon la taille, le reste en majorité.
- Toute partie garantit un **trio d'archétypes socle** : un tueur adverse, un protecteur, un enquêteur. Le reste est tiré au sort dans des groupes de types, avec pondérations de rareté, épinglages et bans possibles — sous garde-fous qui garantissent toujours une composition jouable exacte.

## 4. La boucle vécue par un joueur

Observer (Gazette avare, résultats privés, table) → décider (cible, objet, confiance, vote) → agir (une capacité, au plus un objet, un vote par tour) → subir le dénouement à l'Annonce → débattre à la table → juger au Vote. L'information privée s'accumule, la population décroît, la tension monte à chaque Annonce — jusqu'à une condition de victoire.

Le rythme d'un tour va de ~2 minutes (réglages minimaux) à beaucoup plus (débats humains) ; une session dure une soirée.

## 5. Contraintes d'une session en direct (figées comme résultats attendus)

1. **Source d'autorité unique** de l'état (phases, résolutions, verdicts, victoire) ; les téléphones n'en sont que des projections, cohérentes à quelques secondes près.
2. **Horloge commune** : tous les comptes à rebours se calculent sur une référence partagée, pas sur l'horloge locale.
3. **La partie avance sans les clients** : les phases progressent même si tous les téléphones sont verrouillés ; au réveil, chaque appareil se resynchronise seul et rattrape.
4. **Exécution exactement-une-fois** de toute transition et résolution (verrou d'exclusion), quelle que soit la concurrence.
5. **Cycle d'action en trois temps** : envoyée → acceptée (préconditions et quotas revérifiés par l'autorité) → résolue. Accusé local instantané pour le joueur.
6. **Reconnexion sans perte** : l'état complet survit côté autorité ; un joueur qui revient retrouve exactement ce à quoi il a droit — ni plus, ni moins. Aucun participant (hôte compris) n'est indispensable au déroulement en mode sans MJ.
7. **Rafales** : jusqu'à 20 joueurs agissant dans la même poignée de secondes (fins de fenêtres) sans perte ni double effet.

## 6. Ce qui est figé / ce qui est ouvert

**Figé (à respecter tel quel)** :
- Le cadre physique (présentiel, téléphones individuels, 6–20 joueurs, MJ optionnel purement rythmique).
- Le squelette : cycle de vie de la partie, les 4 phases dans l'ordre, transitions et verdict, démarrage conditionné à la validation de tous.
- Les invariants de résolution (§3.3), d'information (§3.4) et de composition (§3.5).
- Les contraintes de session en direct (§5).
- L'existence d'un catalogue de rôles **vaste, interdépendant et en évolution constante**, rangé dans les archétypes du §3.2 : la solution doit rendre l'ajout/retrait d'un rôle sûr et peu coûteux, sans jamais toucher au squelette.

**Ouvert (espace de liberté et d'intelligence pour la solution)** :
- Toute l'architecture, la modélisation, les technologies, la méthode de développement.
- La manière de garantir les invariants (comment obtenir l'exécution unique, l'horloge commune, l'asymétrie d'information au niveau des données — le produit actuel n'atteint pas cette dernière cible, c'est une amélioration attendue).
- La représentation du catalogue de rôles et son outillage (validation, simulation, tests des règles).
- Tout ce que ce socle ne fixe pas : politiques de session encore non tranchées (arrivées en retard, départs définitifs, multi-appareils), échelle (nombre de parties simultanées), plateformes précises, rétention des données — voir [18-questions-et-incertitudes.md](18-questions-et-incertitudes.md).

**Pour aller plus loin sans se sur-contraindre** : les exigences chiffrées sont dans [13](13-exigences-fonctionnelles-et-performance.md), le comportement live détaillé dans [12](12-session-live-et-synchronisation.md), le cahier pour étude technique dans [19](19-dossier-pour-etude-technique.md). Le détail des rôles, règles fines et cas limites (documents 04 à 11, 14 à 17) est une **référence à consulter ponctuellement**, pas un prompt.
