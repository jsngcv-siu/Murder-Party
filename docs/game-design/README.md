# Murder Party — Dossier de game design fonctionnel

## Rôle de cette documentation

Ce dossier décrit **le jeu** Murder Party : ses règles, ses rôles, ses systèmes, son déroulement, ses interactions multijoueurs et ses exigences d'expérience en temps réel. Il a été reconstitué par observation du produit existant, puis reformulé exclusivement en **règles fonctionnelles**.

Il est destiné à des lecteurs (humains ou IA) qui ne connaissent pas le projet et qui devront, dans un second temps, recommander une architecture, une méthode de développement ou des technologies. **Aucune technologie, aucun détail d'implémentation, aucune structure de code n'est décrit ici** : le dossier dit ce que le jeu doit accomplir, jamais comment le produit actuel l'accomplit.

## Comment lire ce dossier — deux niveaux

Le dossier est organisé en **deux niveaux d'usage** distincts :

### Niveau 1 — Le socle (à donner à un modèle IA ou à un spécialiste)

Le point d'entrée est **[00-socle-du-jeu.md](00-socle-du-jeu.md)** : un document autonome, **sans aucun nom de rôle**, qui fixe le cadre physique, le squelette temporel, la logique de gameplay (en archétypes), les invariants et les contraintes de session en direct. Il se termine par la distinction explicite entre **ce qui est figé** et **ce qui est ouvert** — afin de donner assez d'informations pour ne rien laisser à l'interprétation, sans sur-contraindre les choix de conception.

Pour une étude technique ou une demande de conseils de développement, le lot recommandé est : **00** (+ [12](12-session-live-et-synchronisation.md), [13](13-exigences-fonctionnelles-et-performance.md) et [19](19-dossier-pour-etude-technique.md) si l'on veut le comportement live détaillé, les exigences chiffrées et le cahier des besoins).

### Niveau 2 — La référence détaillée (à consulter ponctuellement)

Les documents 01 à 18 sont des **annexes de référence** : catalogue exhaustif des rôles, règles fines, cas limites, matrices. Ils servent à vérifier un point précis ou à trancher une ambiguïté — **pas à être injectés en bloc dans un prompt**. En dehors du catalogue ([06](06-joueurs-factions-et-roles.md)) et de ses annexes directes ([07](07-actions-pouvoirs-et-interactions.md), [17](17-matrice-des-regles.md)), on parle des rôles par **archétypes** (tueur, protecteur, enquêteur, trompeur, contrôleur, objectif solo…), jamais par leur nom.

## Conventions

- **Terminologie unifiée** : les termes canoniques sont définis dans [02-vocabulaire-et-concepts.md](02-vocabulaire-et-concepts.md) et utilisés à l'identique dans tous les fichiers. Les variantes de nommage rencontrées dans le produit sont signalées, jamais masquées.
- **Identifiants de règles** : les règles importantes portent un identifiant stable (ex. `RES-04`, `CV-05`) référencé dans la [matrice des règles](17-matrice-des-regles.md).
- **Distinction obligatoire** : chaque document sépare (1) les règles du jeu, (2) le comportement fonctionnel de l'application, (3) les exigences de qualité d'une session en direct, (4) les hypothèses, (5) les questions ouvertes.

## Niveaux de certitude

| Statut | Signification |
|---|---|
| `CONFIRMÉ` | Fait vérifié par plusieurs éléments cohérents du produit (comportement observable + texte joueur + logique de jeu concordants). |
| `DÉDUIT` | Règle inférée avec un niveau de confiance raisonnable, mais non confirmée par une source explicite. |
| `À CONFIRMER` | Comportement observable mais insuffisamment expliqué, ou information partielle. |
| `CONTRADICTOIRE` | Deux sources du produit se contredisent (ex. texte joueur ≠ comportement réel). Les deux versions sont citées, aucune n'est tranchée. |
| `NON DOCUMENTÉ` | Le produit ne permet pas de répondre. |

Sauf mention contraire, une affirmation sans statut est `CONFIRMÉ`.

## Résumé exécutif du jeu

**Murder Party** est le compagnon numérique temps réel d'une partie physique de déduction sociale à rôles cachés, jouée sur téléphone par **6 à 20 joueurs** réunis dans la même pièce (avec ou sans Maître du Jeu). L'application distribue secrètement les rôles, synchronise les phases, résout les capacités, publie les annonces publiques et protège les informations secrètes — pendant que l'essentiel du jeu (débats, mensonges, accusations) se déroule **à la table, en personne**.

- **Trois grandes familles** : les **Civils** (majorité, doivent démasquer les menaces), les **Méchants** (équipe secrète du Tueur, doit atteindre la majorité stricte), les **Neutres** (objectifs personnels : survie, poison, feu, clan vampire, amoureux…). Le catalogue compte **une soixantaine de rôles** aux capacités uniques.
- **Boucle en 4 phases** répétées chaque tour : **Enquête** (chacun joue sa capacité et ses objets en secret) → **Annonce** (la « Gazette » révèle les dénouements : morts, événements anonymes) → **Débat** (discussion à la table, sans action dans l'application) → **Vote** (désignation secrète d'un joueur qui part **en prison**, pas à la mort).
- **Résolution déterministe différée** : les actions posées pendant l'Enquête ne produisent leurs effets qu'à l'Annonce, dans un ordre fixe (protections → attaques → contagions), avec préconditions revérifiées au moment de la résolution.
- **La prison remplace le lynchage** : le condamné du vote est écarté (ne vote plus, n'agit plus) mais vivant ; il peut être libéré (Juge), évadé (Corrupteur), exécuté (Exécuteur — seul événement qui révèle publiquement un rôle complet).
- **Fin de partie** : conditions de victoire vérifiées en continu selon un ordre de priorité strict, avec victoires de faction, victoires solo, co-victoires et un filet anti-blocage (dernier survivant).
- **Deux modes** : « Joueur Only » (les phases avancent automatiquement au chrono, arbitrées côté serveur) et « Mode MJ » (un Maître du Jeu non-joueur pilote le rythme depuis une régie omnisciente).

## Index des documents

| Document | Contenu |
|---|---|
| [00-socle-du-jeu.md](00-socle-du-jeu.md) | **Le socle autonome** : cadre physique, squelette, logique, boucle, invariants, figé/ouvert — sans nom de rôle |
| [01-vision-et-identite.md](01-vision-et-identite.md) | Concept, fantasy, piliers de design, invariants à préserver |
| [02-vocabulaire-et-concepts.md](02-vocabulaire-et-concepts.md) | Lexique canonique et variantes de nommage |
| [03-boucle-de-jeu.md](03-boucle-de-jeu.md) | Boucle principale, sous-boucles, moteurs de progression |
| [04-deroulement-complet-partie.md](04-deroulement-complet-partie.md) | Chronologie complète d'une partie, étape par étape |
| [05-phases-et-transitions.md](05-phases-et-transitions.md) | Fiches de phases + diagramme des transitions |
| [06-joueurs-factions-et-roles.md](06-joueurs-factions-et-roles.md) | Catalogue exhaustif des factions et des rôles |
| [07-actions-pouvoirs-et-interactions.md](07-actions-pouvoirs-et-interactions.md) | Toutes les actions, leurs règles, matrice croisée |
| [08-information-secrete-et-visibilite.md](08-information-secrete-et-visibilite.md) | Cartographie de la circulation de l'information |
| [09-regles-resolution-et-priorites.md](09-regles-resolution-et-priorites.md) | Ordre de résolution, conflits, priorités |
| [10-victoire-defaite-et-fin-de-partie.md](10-victoire-defaite-et-fin-de-partie.md) | Conditions de victoire, ordre de vérification, écran de fin |
| [11-parcours-et-experience-joueur.md](11-parcours-et-experience-joueur.md) | Parcours de l'hôte, du joueur, du mort, du reconnecté… |
| [12-session-live-et-synchronisation.md](12-session-live-et-synchronisation.md) | Comportement attendu d'une session en direct |
| [13-exigences-fonctionnelles-et-performance.md](13-exigences-fonctionnelles-et-performance.md) | Exigences mesurables classées par priorité |
| [14-etats-erreurs-et-cas-limites.md](14-etats-erreurs-et-cas-limites.md) | Cas limites, erreurs, situations de blocage |
| [15-parametres-variantes-et-equilibrage.md](15-parametres-variantes-et-equilibrage.md) | Paramètres de session, composition, équilibrage |
| [16-glossaire-des-donnees-fonctionnelles.md](16-glossaire-des-donnees-fonctionnelles.md) | Les informations que le jeu doit connaître |
| [17-matrice-des-regles.md](17-matrice-des-regles.md) | Table consolidée des règles avec identifiants |
| [18-questions-et-incertitudes.md](18-questions-et-incertitudes.md) | Questions ouvertes classées par impact |
| [19-dossier-pour-etude-technique.md](19-dossier-pour-etude-technique.md) | Cahier des besoins pour la future étude technique |

## Principales incertitudes pouvant modifier la compréhension globale

Détaillées dans [18-questions-et-incertitudes.md](18-questions-et-incertitudes.md) ; les plus structurantes :

1. **Arrivée en retard (late-join)** : l'application accepte qu'un joueur rejoigne une partie déjà commencée, mais la règle de jeu appliquée (reçoit-il un rôle ? devient-il spectateur ?) n'a pas pu être établie avec certitude — `À CONFIRMER`.
2. **Confidentialité des rôles** : l'interface protège rigoureusement les secrets, mais les données de rôle de tous les joueurs sont transmises à chaque appareil ; un joueur techniquement outillé peut les lire. Faiblesse connue et assumée à ce stade — impacte fortement la future étude technique.
3. **Plusieurs textes joueur contredisent le comportement réel** (Pyromane, Policier, Ange Gardien, Jardinier, notamment) — `CONTRADICTOIRE`, voir [18-questions-et-incertitudes.md](18-questions-et-incertitudes.md).
4. **Un rôle (le Vautour)** apparaît dans plusieurs règles transverses (armes au setup, cibles liées au vote) sans qu'une fiche complète ait pu être reconstituée — `À CONFIRMER`.
5. **Aucun mode spectateur dédié** n'existe : le joueur mort en tient lieu. Le besoin d'un vrai mode spectateur est une question ouverte.
