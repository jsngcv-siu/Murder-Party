# 02 — Vocabulaire et concepts

Lexique canonique du dossier. Chaque terme est utilisé à l'identique dans tous les documents. Les variantes rencontrées dans le produit sont signalées (colonne « Variantes / ambiguïtés »), jamais résolues silencieusement.

## Structure de la partie

| Terme | Définition | Fonction | Quand | Variantes / ambiguïtés |
|---|---|---|---|---|
| **Partie** | Une session de jeu complète, du salon d'attente à l'écran de fin. Identifiée par un **code** à 6 caractères. | Unité de jeu et de synchronisation. | — | Aussi appelée « enquête » dans les textes d'ambiance (« Nouvelle enquête »). |
| **Salon** | État initial de la partie : les joueurs rejoignent via le code, l'hôte configure. | Rassembler et configurer avant lancement. | Avant le lancement. | Aussi « salon d'attente », « lobby ». |
| **Salle d'attente** | État intermédiaire après distribution des rôles : chacun lit sa fiche et valide « Entrer dans la partie » ; les chronos ne tournent pas encore. | Garantir que personne ne perd de temps de jeu pendant la lecture des rôles. | Entre lancement et début du tour 1. | L'écran de salle d'attente séparé a disparu : l'attente se fait **sur la fiche de rôle**. |
| **Tour** | Un cycle complet des 4 phases. Numéroté à partir de 1. | Unité de temps de jeu ; la plupart des limites d'usage s'y réfèrent. | Toute la partie. | Aussi appelé « cycle » dans certaines règles internes. |
| **Phase** | L'une des 4 étapes d'un tour : **Enquête**, **Annonce**, **Débat**, **Vote**. | Structure chaque tour ; conditionne les actions autorisées. | Chaque tour. | Le Débat est parfois appelé « Rassemblement » ou « Convocation » — `À CONFIRMER` comme simple variante d'habillage ; « Enquête » est parfois désignée « phase libre » dans des vocables internes. |
| **Transition (frame d'intro)** | Écran plein cadre de ~3 s marquant l'entrée d'une phase (sauf l'Annonce, qui s'affiche directement). Le chrono de la phase ne démarre qu'après. | Théâtraliser + synchroniser le départ du chrono. | Entrée d'Enquête, Débat, Vote. | — |
| **Verdict (écran de résultat du vote)** | Écran de ~8 s joué à la fin de la phase Vote, révélant qui part en prison. | Clore le tour de façon lisible pour tous. | Fin de Vote, avant le tour suivant. | — |

## Acteurs

| Terme | Définition | Fonction | Variantes / ambiguïtés |
|---|---|---|---|
| **Joueur** | Participant qui reçoit un rôle et joue. | Acteur central. | — |
| **Hôte (lead)** | Le joueur qui a créé la partie (ou reçu le transfert). Configure le salon, lance la partie ; en mode Joueur Only il joue comme les autres et peut « rythmer » la table. | Configuration + lancement. | Appelé « lead » ou « host » ; couronne « Lead ». Transférable. |
| **Maître du Jeu (MJ)** | En Mode MJ uniquement : animateur **non-joueur** et omniscient qui pilote le rythme (avance les phases à la main) et porte la narration. Il n'a **aucun pouvoir d'altération du jeu** : narration et temps seulement. | Régie et mise en scène. | Couronne « MJ ». Transférable depuis le salon. |
| **Bot** | Joueur simulé, réservé aux contextes de développement/démonstration. Joue par les mêmes règles que les humains. | Test et démo uniquement — jamais en partie réelle. | — |
| **Spectateur** | N'existe pas comme statut dédié : un joueur **mort** fait office de spectateur. | — | `NON DOCUMENTÉ` comme mode distinct. |

## Camps et classification des rôles

| Terme | Définition | Variantes / ambiguïtés |
|---|---|---|
| **Faction** | Le camp d'appartenance : **Civil**, **Méchant** ou **Neutre**. Détermine la condition de victoire par défaut et la couleur d'identité. | « Camp » et « faction » sont synonymes dans les textes. |
| **Civils** | La majorité. Gagnent en éliminant toutes les menaces. | Aussi « Citoyens », « la ville » dans certains textes. |
| **Méchants** | L'équipe secrète du Tueur. Se connaissent entre eux. Gagnent par majorité stricte. | — |
| **Neutres** | Rôles à objectif personnel. Trois sous-types : **BÉNIN** (n'entrave personne), **MAL** (hostile), **CHAOS** (imprévisible). | — |
| **Type de rôle** | Classification transverse : INVESTIGATION, PROTECTEUR, SUPPORT, TUEUR, TROMPERIE, CONTRÔLE (côté Méchants), BÉNIN/MAL/CHAOS (côté Neutres). Sert à la composition et à certaines enquêtes (Portraitiste, Physionomiste). | Un ancien type « BOULET » a été supprimé — obsolète. |
| **Killer-class** | Sous-ensemble de rôles tueurs **méchants** bénéficiant du camouflage : les enquêtes ordinaires les voient « non suspects » / « Civils ». | À distinguer des **tueurs civils** (Cuisinier, Garde-chasse, Bretteur…), qui ressortent innocents parce que Civils, sans camouflage. |
| **Rôles socles** | Les trois rôles garantis dans toute partie : un **Tueur** méchant, le **Majordome** (protecteur), l'**Assistant du détective** (enquêteur). Non bannissables. | — |
| **Rôle émergent** | Rôle qui n'est jamais tiré à la composition mais apparaît en cours de partie : le **Chasseur de Vampire** (éveillé par la première morsure). | — |

## États du joueur

| Terme | Définition | Variantes / ambiguïtés |
|---|---|---|
| **Vivant (libre)** | État normal : vote, agit, débat. | — |
| **Emprisonné** | Écarté par le vote (ou autre) : ne vote plus, n'agit plus, n'utilise plus d'objets, observe. Vivant. Peut être libéré, évadé ou exécuté. | « en prison », « en cellule », « au trou ». |
| **Mort** | Éliminé. Rejoint le **Conseil des Morts** (chat des défunts), observe la partie. Sa faction est révélée publiquement (sauf effacement), son testament devient lisible. | — |
| **Mort différée (condamné)** | A été frappé pendant l'Enquête : reste vivant et agissant jusqu'à l'Annonce, où la mort est confirmée. | Terme interne « pending death ». |
| **Statuts temporaires** | Marqueurs affichés au joueur concerné : Protégé (invisible au joueur), Empoisonné, Bloqué, Sous chantage, Ivre, Béni, Suspect, Manipulé, Perdant aux dés, Amoureux, Bon moment. | — |

## Actions et résolution

| Terme | Définition | Variantes / ambiguïtés |
|---|---|---|
| **Capacité** | Le pouvoir propre au rôle. Active (jouée pendant l'Enquête) ou passive (permanente). | — |
| **Objet** | Élément d'inventaire utilisable (couteau, fiole, lettre, relique, objets de contrebande) ou consultable (indice). Utilisable **uniquement pendant l'Enquête**, 1 par tour. | Inventaire aussi appelé « Carnet ». |
| **Intention (action différée)** | Action posée pendant l'Enquête dont l'effet est calculé à l'Annonce. | — |
| **Résolution** | Le calcul des dénouements à l'Annonce, par couches ordonnées : protections/soins → attaques → contagions (poison, morsure). | — |
| **Couche (layer)** | Rang d'ordre d'une catégorie d'effet dans la résolution. | — |
| **Précondition** | Conditions revérifiées au moment de résoudre (acteur vivant et libre, cible vivante, objet encore possédé…). | — |
| **Blocage** | Neutralisation de la capacité d'un joueur pour un tour (chantage, sabotage, ivresse, manipulation, garde de la Babysitter). Bloque la capacité **de rôle** ; certains blocages coupent aussi les objets. | Nuances par source — voir [07](07-actions-pouvoirs-et-interactions.md). |
| **Protection (bouclier)** | Effet qui annule une attaque sur la cible pendant sa fenêtre de validité. Le protégé n'apprend jamais qu'il a été sauvé. | « bouclier », « bénédiction » (variante du Saint, plus large), « chambre » (Aubergiste), « gilet ». |
| **Balle perforante** | Attaque unique du Franc-tireur qui ignore toutes les protections et parades. | — |
| **Mécanique méchante** | Marqueur d'origine d'une attaque (Tueur, Croque-mitaine, couteau d'origine méchante…) conditionnant l'échange du Majordome et l'effacement par le Cleaner. | — |
| **Effacement (nettoyage)** | Action du Cleaner : masque la faction d'un mort d'origine méchante (« faction inconnue ») et aveugle l'autopsie. | — |

## Information

| Terme | Définition | Variantes / ambiguïtés |
|---|---|---|
| **Gazette (Annonces)** | Le fil public des dépêches : morts (faction seule), emprisonnements, libérations, événements anonymes. Consultable en permanence dans l'onglet Annonces ; affichée plein écran pendant la phase d'Annonce. | « Chroniques du Manoir ». |
| **Événement anonyme** | Dépêche publique qui ne nomme personne : morsure de vampire, éveil du Chasseur, miaulement du Chat, circulation d'indices. | — |
| **Indice** | Information vraie sur la composition de la partie, distribuée au début à une partie des joueurs. Peut être **fragmenté** (deux moitiés chez deux joueurs). | — |
| **Enquête (action)** | Toute capacité d'information ciblée (verdict du Policier, trio de l'Assistant, boussole, type de rôle…). À ne pas confondre avec la **phase** Enquête. | Homonymie phase/action assumée par le produit. |
| **Doctrine des déguisements** | Règle transverse : seul l'Assistant du détective voit les vrais rôles ; l'Usurpateur ressort sous sa couverture, les killer-class en « Civils » ; une cible falsifiée renvoie « le joueur a été falsifié » à tous. | — |
| **Testament** | Message rédigé de son vivant, révélé publiquement à la mort. | — |
| **Conseil des Morts** | Chat réservé aux morts (le Médium vivant le lit sans écrire). | « le cimetière », « les ombres ». |
| **Parloir** | Chat privé éphémère (1 tour) ouvert par le Geôlier avec un prisonnier ; le Geôlier reste anonyme. | — |
| **Mur des suspicions** | Tableau personnel où chaque joueur classe les autres (Neutre / Innocent / Doute / Suspect). Privé, mais espionnable (Journaliste, Cartomancien) et utilisé par la variante Suspicion. | « tableau de suspicions ». |

## Session et configuration

| Terme | Définition | Variantes / ambiguïtés |
|---|---|---|
| **Code de partie** | Identifiant à 6 caractères permettant de rejoindre. | — |
| **Mode Joueur Only** | Mode sans MJ : phases avancées automatiquement par chronomètre (arbitrage côté serveur). Mode de référence. | — |
| **Mode MJ** | Mode avec Maître du Jeu : avancement manuel des phases, chrono informatif montant. | — |
| **Variante Suspicion** | Option de partie : pas de vote manuel ; le joueur le plus marqué « Suspect » sur les murs de suspicions (des vivants et des prisonniers) part en prison ; égalité → personne. | — |
| **Pool (composition)** | La liste des slots de rôles de la partie : rôles socles verrouillés + slots par faction/type, en tirage automatique pondéré ou épinglés sur un rôle précis. | « configurateur de rôles ». |
| **Ban** | Exclusion d'un rôle du tirage (impossible pour les rôles socles ; garde-fous contre l'assèchement d'un type requis). | — |
| **Cible de joueurs** | Le nombre de joueurs attendu (6–20), déterminant la composition. Le lancement exige que l'effectif atteigne exactement la cible. | — |
