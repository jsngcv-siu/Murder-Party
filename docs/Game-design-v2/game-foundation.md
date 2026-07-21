# Fondations du jeu

Ce document décrit ce qui définit **fondamentalement** Murder Party, indépendamment de son implémentation et de son catalogue de rôles actuel. Il vise les invariants : ce qui devra probablement rester vrai même si le contenu évolue.

---

## 1. Nature de l'expérience

### Un arbitre numérique pour un jeu physique

Murder Party est un jeu de **déduction sociale à rôles cachés**, de la famille des jeux où une minorité informée se dissimule au sein d'une majorité ignorante. Sa particularité tient à sa forme : **le jeu se joue en présentiel, l'application ne fait qu'arbitrer**.

Les participants sont dans la même pièce. Ils parlent, s'accusent, mentent, négocient, se regardent. L'application prend en charge exactement ce qu'un être humain ne peut pas arbitrer sans casser le jeu :

- distribuer des informations secrètes sans qu'aucun participant ne les voie toutes ;
- collecter des décisions simultanées sans que personne ne connaisse celles des autres ;
- résoudre des règles d'interaction complexes de façon fiable et impartiale ;
- imposer un rythme commun sans qu'un joueur ait à jouer le chef d'orchestre ;
- publier des faits vérifiés que tout le monde doit accepter comme vrais.

**Invariant majeur.** L'écran ne doit jamais devenir le lieu principal de l'expérience. Un participant doit pouvoir consulter son téléphone brièvement, comprendre son état et son action disponible, puis **rendre son attention à la table**. Toute conception qui exigerait une attention continue à l'écran trahit le produit.

### La fantasy visée

Une soirée d'enquête théâtrale : un manoir, des morts au petit matin, une gazette qui annonce les faits sans dire toute la vérité, et une assemblée qui doit décider ensemble en sachant qu'au moins une personne dans le cercle ment délibérément.

L'expérience recherchée repose sur quatre tensions, dans cet ordre d'importance :

1. **Le doute** — l'information est toujours partielle, jamais entièrement fiable, et parfois activement falsifiée.
2. **Le bluff** — un participant doit pouvoir mentir de façon crédible, y compris en s'appuyant sur ce que l'application lui a réellement donné.
3. **La déduction collective** — recouper des informations éparses est plus efficace que raisonner seul, ce qui force la parole et la confiance.
4. **La décision commune irréversible** — à la fin de chaque tour, le groupe doit trancher, ensemble, et vivre avec.

### Ce que le jeu n'est pas

- Ce n'est pas un jeu jouable à distance en l'état : la discussion orale en présence est une brique de gameplay, pas un accessoire.
- Ce n'est pas un jeu solo ni asynchrone : tout repose sur la simultanéité.
- Ce n'est pas un jeu à progression persistante : chaque session est complète et autonome. Il n'existe ni compte, ni profil, ni historique inter-parties.

---

## 2. Participants et cardinalité

### Volumétrie

- **6 à 20 participants jouants.** Le seuil bas est structurel : en dessous de 6, la minorité cachée n'a plus assez d'espace pour se dissimuler. Le seuil haut est un plafond produit assumé.
- **Bande d'usage typique : 6 à 15.** C'est le format réel des soirées visées ; au-delà, le produit fonctionne mais n'est pas optimisé pour.
- **L'effectif est figé au lancement.** L'application vérifie que le nombre de participants présents correspond exactement à la cible avant de démarrer. Aucun participant ne rejoint une session en cours.

### Deux modes d'organisation

Le produit supporte deux façons de mener une soirée, et le choix est fait à la création de la session.

**Mode autonome (sans meneur).** Tous les participants jouent. Le rythme est imposé par l'application : chaque phase a une durée, et le passage à la suivante est automatique. C'est le mode de référence — celui qui doit fonctionner parfaitement seul.

**Mode avec meneur.** Un participant supplémentaire ne joue pas : il conduit la soirée. Il dispose d'une vue omnisciente (il voit tout : rôles réels, mécanismes de résolution, dessous des annonces) et **il commande manuellement les transitions de phase**. Le compte à rebours devient purement indicatif.

**Invariant important.** Le meneur est un **narrateur et un maître du tempo, rien de plus**. Il n'arbitre pas, ne corrige pas, ne punit pas, ne modifie pas l'état du jeu. Cette limitation est une décision de conception explicite et assumée : le mode sans meneur est la référence, le mode avec meneur en est une variante de confort. Toute conception future qui redonnerait des pouvoirs correctifs au meneur romprait cet équilibre.

### Identité d'un participant

L'identité est **anonyme et légère** : pas de compte, pas de mot de passe, pas d'inscription. Un participant rejoint une session en saisissant un code court et un pseudonyme. Une identité persistante rattache l'appareil au personnage, ce qui permet de **retrouver sa place après une coupure ou une fermeture d'application**.

C'est une contrainte forte : l'expérience doit être jouable par un invité qui découvre le produit à la porte du salon, en moins d'une minute, sans rien installer ni créer.

---

## 3. Structure d'une partie

### Anatomie générale

Une partie se décompose en trois temps :

1. **Constitution** — création de la session, arrivée des participants, verrouillage de l'effectif, tirage des rôles, distribution des informations initiales, révélation privée de son rôle à chacun.
2. **Boucle de tours** — répétition d'un cycle de quatre phases jusqu'à ce qu'une condition de fin soit remplie. C'est le cœur du jeu. Un tour dure quelques minutes.
3. **Conclusion** — annonce du vainqueur, révélation de la vérité, possibilité d'enchaîner.

Il n'existe pas de sauvegarde longue : une session est conçue pour être jouée d'une traite, en une soirée, et **son existence est bornée dans le temps** (voir `live-session-requirements.md`).

### Le tour en quatre phases

Chaque tour enchaîne quatre phases aux natures très différentes :

| Phase | Nature | Ce qui s'y passe |
|---|---|---|
| **Enquête** | Action individuelle secrète | Chacun choisit et engage son action pour le tour, sans savoir ce que font les autres |
| **Annonce** | Publication publique | Les conséquences des actions du tour sont révélées : morts, événements, faits marquants |
| **Débat** | Social pur | Discussion orale à la table ; l'application n'accepte aucune action |
| **Vote** | Décision collective | Chacun désigne secrètement un participant ; le décompte est public, les bulletins ne le sont pas |

**Invariant structurel.** Ces quatre temps forment une progression logique : *agir en secret → apprendre → discuter → trancher ensemble*. Leur nombre, leur ordre et leur durée peuvent être discutés ; **leur nature ne peut pas être fusionnée sans changer le jeu**. En particulier, la séparation entre le moment où l'on agit et le moment où l'on apprend les conséquences est ce qui crée la tension du jeu.

---

## 4. Les rôles cachés

### Principe

Au lancement, chaque participant reçoit **un rôle secret**, connu de lui seul. Ce rôle détermine :

- son **appartenance** (le camp avec lequel il gagne) ;
- sa **condition de victoire** ;
- sa **capacité** — ce qu'il peut faire pendant la phase d'action ;
- les **informations** qu'il reçoit automatiquement au fil de la partie.

### Les trois grandes appartenances

Le jeu structure les participants en trois familles, et cette tripartition est un invariant :

**La majorité ignorante.** La plus nombreuse. Ses membres ne se connaissent pas entre eux et ignorent qui sont les menaces. Ils gagnent en éliminant ou neutralisant toutes les menaces. Leur force est le nombre et la mise en commun d'informations ; leur faiblesse est de ne pas savoir à qui se fier.

**La minorité informée.** Une équipe secrète, dont les membres **se connaissent mutuellement** et disposent d'un canal de communication privé. Elle gagne en atteignant une **majorité stricte** parmi les participants encore actifs. Elle est numériquement faible mais individuellement puissante : ses membres disposent des capacités les plus décisives.

**Les individus à objectif personnel.** Ni avec l'une, ni avec l'autre. Chacun poursuit une condition de victoire propre — survivre seul, atteindre un compte d'actions, réunir un état particulier, constituer son propre camp par contagion. Certains sont hostiles à tout le monde ; d'autres sont inoffensifs et se contentent de coexister.

### La sous-catégorie décisive : les inoffensifs

Parmi les objectifs personnels, une sous-famille joue un rôle structurel : les participants **inoffensifs**, qui ne menacent personne et peuvent gagner *en même temps* que n'importe quel camp.

Leur importance est mécanique et non narrative : **ils sont exclus de tous les décomptes de victoire**. Ils ne bloquent pas la victoire de la majorité, et ne comptent pas comme opposants dans le calcul de la majorité de la minorité informée. Sans cette catégorie, un participant purement passif encore vivant empêcherait indéfiniment toute conclusion.

**Invariant.** Le système de conditions de victoire a besoin d'une notion de « participant qui ne compte pas dans les décomptes ». Toute refonte doit préserver cette soupape, sous une forme ou une autre.

### Les rôles émergents

Certains rôles **n'existent pas au lancement** et n'apparaissent qu'en réaction à un événement de partie. Ils sont attribués secrètement au setup mais restent inertes et invisibles pour leur porteur jusqu'à leur déclenchement.

C'est un point de conception à retenir : **l'ensemble des rôles actifs n'est pas fixe pendant la partie**. Un participant peut découvrir en cours de route qu'il possède une capacité qu'il ignorait.

### Une composition dictée par le nombre

La composition d'une partie — combien de participants dans chaque famille — dépend **uniquement du nombre de joueurs**. C'est un invariant explicite du produit.

Les proportions actuelles :

| Effectif | Minorité informée | Objectifs personnels | Majorité |
|---|---|---|---|
| 6-7 | 2 | 0 | le reste |
| 8-11 | 2 | 1 | le reste |
| 12-16 | 3 | 2 | le reste |
| 17-20 | 4 | 2 à 3 | le reste |

La cible affichée est d'environ **20 % de participants hostiles**, délibérément en dessous des standards du genre, avec cette justification : dans ce jeu, les membres de la minorité informée sont **individuellement plus puissants**, donc on en met moins.

Trois emplacements seulement sont **garantis** dans toute partie : un rôle offensif dans la minorité informée, un rôle de protection dans la majorité, et un rôle d'investigation puissant dans la majorité. Tout le reste est tiré selon des motifs souples et pondérés.

**Invariant de conception.** Choisir des rôles ou en bannir change *quel* rôle occupe un emplacement, **jamais combien de participants sont dans chaque famille**. Cette séparation entre « proportions » et « contenu » est ce qui rend l'équilibrage pilotable : on règle les proportions, on ne règle pas des quotas de types.

---

## 5. États d'un participant

Un participant traverse un petit nombre d'états, dont la combinaison détermine ce qu'il peut faire. **Trois états sont structurants** et doivent être compris ensemble.

| État | Peut agir | Peut voter | Peut parler | Compte dans les fins de partie |
|---|---|---|---|---|
| **Actif** | oui | oui | oui | oui |
| **Écarté** (prison) | non | non | oui (à la table) | non |
| **Éliminé** (mort) | non | non | uniquement dans un canal séparé des vivants | non |

### L'écartement plutôt que l'élimination

**C'est la décision de conception la plus distinctive du produit.** Le vote collectif n'élimine pas : il **écarte**. Le participant désigné est mis hors circuit — il ne joue plus, ne vote plus, ne compte plus dans les décomptes — mais **il est vivant, il assiste à la partie et il continue de parler à la table**.

Les conséquences sont importantes et voulues :

- Le groupe peut se tromper sans détruire l'expérience du joueur sanctionné. Personne n'est renvoyé du jeu par le vote.
- L'écartement est **réversible** : plusieurs rôles peuvent libérer un participant écarté, d'autres peuvent l'achever.
- Il crée un espace de jeu propre : un participant écarté reste une voix dans le débat, un objet de négociation, une source d'information — et une cible.

**Invariant.** La distinction *écarté ≠ éliminé* structure de nombreux rôles et toutes les conditions de victoire. La supprimer reviendrait à concevoir un autre jeu.

### La mort différée

Une élimination survenue pendant la phase d'action **ne prend pas effet immédiatement** : la victime continue de jouer normalement jusqu'à la publication publique. C'est ce qui permet à la phase d'annonce d'avoir un contenu et un effet de surprise.

Conséquence de conception : **il existe un décalage assumé entre le moment où un événement est décidé et le moment où il devient vrai pour tout le monde.** Le produit doit savoir représenter un état « décidé mais pas encore réel ».

### États modificateurs

Se superposent aux états principaux : protégé temporairement, capacité bloquée, marqué publiquement comme suspect, information falsifiée, affecté par un effet à retardement, converti dans un autre camp, porteur d'objets. Ils ont tous une **portée temporelle limitée** (ce tour, le tour suivant, deux tours, jusqu'à la fin).

---

## 6. États d'une session

| État | Signification | Ce qui en fait sortir |
|---|---|---|
| **Salon** | Ouverte, les participants arrivent | Le créateur lance quand l'effectif est atteint |
| **Attente de validation** | Rôles tirés et distribués, mais le chronomètre n'a pas démarré | Tous les participants ont pris connaissance de leur rôle |
| **En cours** | La boucle de tours tourne | Une condition de fin est remplie |
| **Terminée** | Le vainqueur est établi | Rien — la session est close |

**Point notable.** L'état « attente de validation » existe parce que découvrir son rôle est un moment qui ne doit pas être chronométré : chacun doit pouvoir lire sa fiche à son rythme. La partie ne démarre que lorsque **tous** ont validé. C'est une bonne intention avec une conséquence sévère : un seul participant qui ne valide jamais bloque toute la session (voir `open-questions.md`).

---

## 7. Circulation de l'information

C'est le cœur du produit. **Tout le jeu consiste à gérer qui sait quoi.**

### Quatre régimes d'information

**Public et certain.** Publié à tous, identique pour tous, incontestable : qui est mort, qui est écarté, qui a été libéré, le résultat d'un vote, la fin de partie. C'est le socle factuel commun sur lequel le débat s'appuie.

**Public mais anonyme.** Un événement est annoncé à tous, mais son auteur, sa cible ou sa nature exacte restent cachés. C'est un ressort majeur du jeu : le groupe sait que *quelque chose* s'est produit et doit deviner quoi et par qui.

**Privé et vrai.** Ce qu'un rôle apprend pour lui seul : le résultat de son investigation, l'identité de ses alliés, une information reçue en début de partie. Cette information est vraie mais **partielle**, et son détenteur doit décider s'il la partage — sachant que la partager le désigne.

**Privé et faux.** Le régime le plus important pour la crédibilité du jeu : plusieurs rôles peuvent **corrompre l'information reçue par les autres**. Un enquêteur peut recevoir un résultat sincèrement erroné. Un rôle peut se présenter sous une fausse identité. Une communication peut être forgée au nom d'un tiers.

**Invariant fondamental.** Le jeu doit pouvoir mentir à un joueur **sans que celui-ci puisse distinguer le mensonge de la vérité**. Cela signifie qu'une information falsifiée doit être livrée par exactement le même canal, dans exactement la même forme, qu'une information sincère. Toute conception qui rendrait un mensonge distinguable — par sa forme, son moment, son origine technique — détruirait un pan entier du jeu.

Le produit applique déjà ce principe de façon poussée : deux rôles de camps opposés produisent délibérément des annonces publiques **strictement indiscernables**, de sorte que le groupe ne peut pas savoir lequel a agi.

### Ce qui ne doit jamais fuir

Le secret est une règle absolue, pas une préférence :

- le rôle et l'appartenance d'un participant vivant ;
- le contenu des bulletins de vote, **y compris après la partie** ;
- l'appartenance d'un participant écarté ou éliminé (sauf cas explicite prévu par une règle) ;
- l'existence, l'auteur et la cible d'une action secrète ;
- le fait qu'une cible ait été visée mais sauvée — sauf lorsqu'une règle prévoit explicitement de l'en informer.

**Une seule exception publique existe dans tout le jeu** : une forme d'élimination spécifique révèle publiquement le rôle complet de sa victime. C'est le seul moment où la vérité éclate au grand jour, et c'est précisément ce qui en fait un événement dramatique.

### Une asymétrie assumée

Le mode avec meneur crée une **vue omnisciente**. Le même événement produit deux formulations différentes : une version joueur, partielle et à la deuxième personne ; une version meneur, complète et à la troisième personne, qui révèle les dessous.

C'est une contrainte de conception non triviale : **le système doit savoir produire plusieurs récits d'un même fait, calibrés selon le destinataire.**

---

## 8. Progression et fin de partie

### Ce qui fait progresser la partie

Un tour ne « fait » rien par lui-même. La partie progresse par **réduction du nombre de participants actifs** :

- éliminations issues des actions offensives, révélées à l'annonce ;
- écartement issu du vote collectif ;
- effets en chaîne (une élimination peut en déclencher une autre) ;
- conversions d'un camp vers un autre ;
- effets à retardement qui mûrissent sur plusieurs tours.

Un tour peut ne produire aucun changement d'état. Ce n'est pas une anomalie, mais cela signifie que **rien ne garantit intrinsèquement la terminaison** — d'où la nécessité de filets de sécurité.

### Comment la partie se termine

Un ensemble de conditions de victoire est évalué **en continu**, dès qu'un état change, selon un **ordre de priorité strict et non négociable**. La première condition satisfaite l'emporte.

Trois catégories :

1. **Victoires de camp** — la majorité l'emporte quand toutes les menaces ont disparu ; la minorité informée l'emporte quand elle est strictement majoritaire parmi les participants actifs.
2. **Victoires personnelles** — un individu remplit son objectif propre. Elle **prime** sur les victoires de camp dans l'ordre d'évaluation.
3. **Co-victoires** — certains participants gagnent *avec* le vainqueur sans changer qui est le vainqueur. Elles s'ajoutent au résultat.

**Deux détails de conception qui portent tout le système :**

- Les décomptes ne considèrent que les participants **actifs** : ni les éliminés, ni les écartés. Un participant écarté ne compte donc dans aucun camp — ce qui fait de l'écartement une arme stratégique réelle et non un simple retrait.
- La minorité informée gagne à la **majorité stricte**, jamais à l'égalité. À égalité numérique, la majorité conserve sa chance. C'est une décision explicite, et elle a un impact d'équilibrage considérable.

### Le filet anti-blocage

Certaines configurations tardives ne satisfont aucune condition et laisseraient la partie tourner indéfiniment. Un filet de dernier recours conclut la partie **en faveur du dernier participant actif** quand il n'en reste qu'un.

**Invariant à retenir.** Un jeu à conditions de victoire multiples et enchevêtrées **produit mécaniquement des états non terminaux**. Toute conception future doit prévoir des garanties de terminaison explicites — c'est un besoin structurel, pas un correctif ponctuel.

---

## 9. Récapitulatif des invariants

Ce qui devra probablement rester vrai quelle que soit l'évolution du produit :

1. **L'application arbitre, la table joue.** L'écran informe vite puis rend l'attention.
2. **Rôles secrets, information asymétrique.** Le secret est une règle de conception, pas un affichage.
3. **Le jeu doit pouvoir mentir de façon indiscernable.** Une information fausse est livrée exactement comme une vraie.
4. **Séparation entre le moment d'agir et le moment d'apprendre.** C'est ce décalage qui crée la tension.
5. **Décision collective périodique et irréversible.** Le groupe tranche à chaque tour.
6. **Écarté ≠ éliminé.** Le vote met hors circuit, il n'exclut pas de la soirée.
7. **Trois familles d'appartenance**, dont une catégorie neutralisée dans les décomptes.
8. **Composition dictée par l'effectif seul.** Les proportions sont indépendantes du contenu choisi.
9. **Résolution déterministe et ordonnée.** Le moment où un joueur agit dans la fenêtre ne doit lui donner aucun avantage.
10. **Session éphémère et sans compte.** On rejoint en quelques secondes, on ne s'inscrit pas.
11. **Terminaison garantie.** Des filets explicites doivent empêcher les parties sans fin.
