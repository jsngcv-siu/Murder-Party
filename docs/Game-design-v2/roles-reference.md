# Référence des rôles

**Ce document est la seule référence détaillée du catalogue de rôles.** Les autres documents décrivent le système sans en dépendre : ils raisonnent en catégories fonctionnelles, précisément pour rester valables si ce catalogue change.

---

## Avertissement sur la fiabilité de ce catalogue

Le catalogue est **la partie la plus instable du produit**. Des rôles ont été ajoutés par lots, supprimés, parfois restaurés puis re-supprimés. Plusieurs documents internes décrivent encore des rôles qui n'existent plus.

Le décompte ci-dessous est une **reconstruction à date** : environ **61 rôles** répartis en 27 / 20 / 14. Il doit être revalidé contre l'état réel avant tout usage critique.

**Conséquence de conception à retenir** : un catalogue de cette taille et de cette volatilité est un **paramètre de contenu**, pas une structure. Toute conception future doit permettre d'ajouter, retirer ou modifier un rôle sans toucher au moteur.

---

## 1. Les appartenances

| Appartenance | Effectif | Condition de victoire |
|---|---|---|
| **Civil** | ~27 rôles | Plus aucune menace active : ni membre de la minorité informée, ni camp par contagion, ni couple lié, ni objectif personnel hostile |
| **Méchant** | ~20 rôles | **Majorité stricte** parmi les participants actifs. À égalité, la majorité conserve sa chance |
| **Neutre** | ~14 rôles | Objectif propre à chaque rôle |

**Règle transverse essentielle** : tous les décomptes de victoire ne considèrent que les participants **vivants et non écartés**. Les participants marqués *inoffensifs* sont exclus des deux côtés de tout calcul.

### Camps émergents

Deux camps n'existent pas au lancement mais peuvent apparaître :

- **Le camp par contagion** — un rôle neutre convertit des participants, qui **quittent leur camp d'origine**. Ce camp gagne s'il ne reste plus aucun non-converti actif.
- **Le couple lié** — un rôle neutre lie deux participants au setup. Le couple peut gagner ensemble, avec co-victoire du rôle qui les a liés.

---

## 2. Classifications transverses du moteur

Ces marqueurs sont plus importants que les rôles eux-mêmes : ce sont eux que le moteur consulte.

| Marqueur | Effet mécanique |
|---|---|
| **Inoffensif** | Exclu de tous les décomptes de victoire ; peut co-gagner avec n'importe quel camp |
| **Hostile** | Action bloquée par la protection totale d'un rôle de bénédiction |
| **Classe tueur** | Éligible à l'emplacement offensif garanti ; éligible à la succession ; **apparaît innocent** à l'investigation binaire |
| **Émergent** | Jamais tiré à la composition ; attribué secrètement, activé par un événement |

**Deux imprécisions connues dans cette classification :**

1. Le marqueur *hostile* a été attribué mécaniquement par appartenance et par type, ce qui classe hostiles des rôles dont l'action n'a rien d'offensif (lier deux personnes, hériter d'un mort). Conséquence concrète et non documentée : une cible bénie ne peut pas être liée ni copiée.
2. Un rôle occupe un **état hybride sans nom** : neutre, ni inoffensif ni hostile, exclu à la main du blocage de victoire civile mais comptant comme opposant dans le calcul de majorité. Sa nature tient entièrement à une exception codée en dur — aucune des catégories existantes ne le décrit.

**Enseignement de conception** : une taxonomie de rôles dérivée mécaniquement d'autres attributs finit par produire des classements faux. Les propriétés mécaniques devraient être **déclarées explicitement par rôle**, pas déduites.

---

## 3. Composition d'une partie

Les proportions dépendent **uniquement de l'effectif** (voir [game-foundation.md](game-foundation.md) §4).

**Trois emplacements garantis**, jamais bannissables :
1. un rôle offensif de la minorité informée (tiré parmi la classe tueur) ;
2. un rôle de protection civil ;
3. le rôle d'investigation civil le plus puissant.

Le reste est tiré selon des motifs souples et pondérés, avec des garanties de diversité : chaque neutre d'un type différent du précédent, un rôle offensif civil garanti à toutes les tables, un rôle de tromperie ou de contrôle garanti dans la minorité informée dès douze participants.

---

## 4. Rôles civils

### Investigation

| Rôle | Fonctionnement | Usage | Information reçue |
|---|---|---|---|
| **L'Assistant du détective** *(garanti)* | Renvoie le vrai rôle d'une cible **noyé parmi deux leurres**. **Seul rôle qui perce le déguisement de la fausse identité et le camouflage du rôle offensif principal.** | 1×/tour | Un trio de rôles, dont un vrai |
| **Le Policier** | Verdict binaire suspect / non suspect | 1×/tour | Binaire |
| **La Boussole** | Compare deux cibles : même camp ou camps opposés | 1×/tour | Comparaison binaire |
| **Le Guetteur** | Surveille un autre participant : journal ordonné de ses visiteurs | 1×/tour | Liste ordonnée |
| **Le Journaliste** | Lit le tableau de suspicions d'une cible — **jamais ses notes texte** | 1×/tour | Marquages |
| **Le Portraitiste** | Révèle le **type** de rôle, jamais le rôle exact | 1×/tour | Type |
| **Le Médecin légiste** | Apprend automatiquement le rôle de chaque mort | passif | Rôle des éliminés |
| **L'Avocat** | Voit l'appartenance des participants **actuellement écartés**, et d'eux seuls | permanent | Appartenances |
| **Le Médium** | Lecture seule permanente du canal des éliminés, **sans jamais pouvoir y écrire** | permanent | Conversations |

**Points structurants.** Le rôle d'investigation garanti est le **seul** à percer les déguisements — c'est le contrepoids de tout le système de tromperie. Le verdict binaire est délibérément trompeur : la classe tueur y apparaît **innocente**, et tous les neutres y apparaissent **suspects**, y compris les inoffensifs.

### Protection

| Rôle | Fonctionnement | Usage |
|---|---|---|
| **Le Majordome** *(garanti)* | Protège un autre. Si la protection pare une attaque : la cible survit, **l'attaquant meurt, et le Majordome meurt aussi** | 1×/tour |
| **Le Saint** | Bénit un participant (soi-même autorisé) : **immunité totale à toute action hostile pendant deux tours**. **Piège : s'il est écarté par le vote, les Civils perdent immédiatement** | 1×/partie |
| **L'Ange Gardien** | Cible **imposée au setup**, qui ignore être veillée. Annule la prochaine attaque | 1×/partie |
| **La Babysitter** | Protège au tour **suivant**, mais **désactive la capacité** de la cible | 1×/tour, effet différé |
| **Le Barman** | Désigne deux participants ; un tirage décide lequel est protégé — et celui-là est aussi neutralisé. **Le Barman ignore lequel** | 1×/tour, effet différé |

**Point structurant.** Aucune protection n'est gratuite : chacune a un coût, une ambiguïté ou un piège. C'est une signature de conception forte du produit.

### Offensif et riposte

| Rôle | Fonctionnement | Usage |
|---|---|---|
| **L'Exécuteur** | Élimine un participant écarté ayant purgé un tour. **Révèle publiquement son rôle complet** — seule fuite publique de rôle en cours de partie | 1 à 3 selon effectif |
| **Le Cuisinier** | Armé dès le setup. Une élimination. Son arme est volable | 1× |
| **Le Vengeur** | Au setup, choisit son proche parmi **deux Civils proposés** — il sait donc que ces deux-là sont Civils. Armé si son proche meurt | conditionnel |
| **Le Garde-chasse** | Patrouille devant une porte : tout attaquant de cette cible meurt — **mais la cible n'est pas sauvée** | 1×/tour |
| **Le Bretteur** | Garde levée pour un tour : une attaque échoue **et l'attaquant meurt**. Sans attaque, la garde est perdue | 1 à 2 selon effectif |
| **Le Conjuré** | Choisit une victime puis un complice. Le complice reçoit une demande **anonyme** ; s'il refuse, rien — mais il sait qu'un Conjuré existe | 1×/partie |

### Contrôle, utilité et social

| Rôle | Fonctionnement | Usage |
|---|---|---|
| **Le Juge** | Libère un participant écarté ayant purgé un tour | 1 à 3 selon effectif |
| **Le Geôlier** | Ouvre une conversation privée avec un participant écarté — **qui ignore à qui il parle** et peut donc mentir | 1×/tour |
| **L'Apothicaire** | Trois fioles (vie, mort, clairvoyance), aucune au départ. Sur la partie : **au plus une utilisée sur soi et une offerte** — la troisième ne sert jamais | 2 actions max |
| **Le Facteur** | Donne une lettre à une cible, qu'elle pourra transmettre à qui elle veut, **signée de son nom**. Aucun effet mécanique | 1×/tour |
| **Le Contrebandier** | Reçoit périodiquement un objet de sa réserve exclusive. **Rien n'est livré à un participant écarté** | passif |
| **Le Jardinier** | Récupère au hasard un objet laissé par un mort | 1×/tour |
| **Le Paranoïaque** | Cible **imposée au hasard**. Une seule fois : la protéger, ou la tuer. Décision définitive | 1×/partie |

---

## 5. Rôles de la minorité informée

Objectif commun : **majorité stricte**. Ses membres se connaissent et disposent d'un canal privé.

### Offensifs (classe tueur)

| Rôle | Particularité |
|---|---|
| **Le Tueur** | Élimination simple par tour. **Camouflé** : apparaît comme un civil banal à l'investigation. S'il disparaît, **succession automatique** vers un allié |
| **Le Croque-mitaine** | Désigne deux cibles ; le hasard décide laquelle meurt. **Le survivant est informé qu'il a été visé** |
| **Le Stratège** | Trois modes, **jamais le même deux tours de suite** : discret (une élimination), massif (deux éliminations, mais une fuite d'information vers un civil), sabotage (aucune mort, une capacité bloquée) |
| **L'Armurier** | Remet **anonymement** une arme à un participant, qui ignore d'où elle vient et choisit lui-même sa cible |
| **Le Franc-tireur** | Élimination simple, plus une fois par partie un **tir perforant qui ignore toutes les protections, y compris l'immunité totale** |
| **Le Détrousseur** | Élimine et dérobe. Une fois : rafle **tout** l'inventaire de sa victime |
| **Le Vautour** | Ne peut éliminer **que parmi les participants ayant reçu au moins une voix au dernier vote**. Armé au premier tour, faute de vote antérieur |

**Point de conception.** L'emplacement offensif garanti tire parmi cette classe : **la nature exacte de la menace change à chaque partie**. Le groupe ne peut jamais présumer du mode opératoire.

### Contrôle

| Rôle | Fonctionnement |
|---|---|
| **Le Cleaner** | Efface l'appartenance d'une victime : elle devient « inconnue » et **le rôle d'autopsie est aveuglé** |
| **Le Maître chanteur** | Désactive une capacité au tour suivant. **La cible sait qu'elle est bloquée, sans savoir par qui** |
| **Le Marionnettiste** | Prend le contrôle d'une capacité et la déclenche lui-même. La cible voit qu'elle est manipulée. Voler l'élimination principale est interdit |
| **Le Voleur** | Dérobe le dernier objet reçu par une cible, **vivante ou éliminée** |
| **Le Corrupteur** | Fait évader un participant écarté. **L'annonce publique est strictement indiscernable d'une libération légale**, et l'évadé lui-même croit avoir été libéré par le rôle civil |

### Tromperie

| Rôle | Fonctionnement |
|---|---|
| **L'Usurpateur** | Choisit au setup une **fausse identité parmi trois rôles absents**, verrouillée pour la partie. Toutes les enquêtes le voient sous ce faux rôle — **sauf l'investigation garantie** |
| **Le Falsificateur** | Falsifie un participant : **toute enquête le concernant ne révèle plus rien, jusqu'à la fin**. Peut salir un innocent ou couvrir un allié |
| **Le Ventriloque** | Forge une communication **signée du nom d'un autre participant vivant**, indiscernable d'une vraie. La personne imitée devra nier |
| **L'Accusateur** | Marque publiquement un participant comme suspect jusqu'au tour suivant |

### Investigation

| Rôle | Fonctionnement |
|---|---|
| **Le Mouchard** | Apprend le rôle exact d'une cible — **sans percer les déguisements** |
| **L'Archiviste** | Apprend automatiquement le rôle exact de **tout participant écarté**. Chaque vote du groupe l'alimente |
| **Le Physionomiste** | Révèle le type de rôle sans le rôle exact |
| **Le Cartomancien** | Lit le tableau de suspicions d'une cible |

---

## 6. Rôles à objectif personnel

### Hostiles

| Rôle | Objectif | Fonctionnement |
|---|---|---|
| **Le Vampire** | Plus aucun non-converti actif | Convertit une cible. La **première morsure est annoncée publiquement et anonymement**, et **fait émerger son chasseur**. Un converti quitte son camp d'origine |
| **L'Empoisonneur** | Tous les autres survivants empoisonnés | Effet létal différé. Un participant écarté ne compte pas |
| **Le Pyromane** | Trois à quatre éliminations par le feu | Marque silencieusement des cibles, puis déclenche tout d'un coup. **Victoire immédiate au seuil.** Les participants écartés sont épargnés |
| **La Veuve noire** | Seule survivante | Désigne deux cibles ; **si l'une d'elles vote contre elle, les deux meurent**. Arme de dissuasion autant que piège |
| **Le Parieur tricheur** | Dernier en vie | Duel de dés truqué en sa faveur. Le perdant meurt — **et ce peut être lui**. Son taux de victoire très bas est **intentionnel** |
| **L'Imitateur** | Celui du rôle copié | Prend **intégralement** le rôle du dernier mort. Avant d'avoir copié, il apparaît suspect |
| **L'Entremetteur** | Le couple lié et lui seuls survivants | Lie deux participants : si l'un meurt, l'autre meurt. **Repli** : si le couple est brisé, il co-gagne simplement en survivant |
| **Le Conservateur** | Confier une relique précise | Distribue des reliques tirées au sort. **Victoire immédiate** s'il place la bonne. Deux distributions par tour |
| **L'Héritier Déchu** | Celui de la minorité informée | Enquête sous des dehors civils mais **gagne avec les Méchants**. Compte comme leur allié tant qu'un membre survit |

### Neutre allié de fait

| Rôle | Fonctionnement |
|---|---|
| **Le Chasseur de Vampire** | **Rôle émergent** : jamais tiré à la composition, attribué secrètement et couplé au Vampire, révélé à son porteur seulement après la première morsure. Détecte les convertis, immunisé à la conversion. **Ne bloque pas la victoire civile** |

### Inoffensifs

Exclus de tous les décomptes ; co-gagnent avec le vainqueur.

| Rôle | Condition de co-victoire |
|---|---|
| **L'Oracle** | Prédit au premier tour l'appartenance du camp vainqueur ; co-gagne si juste et vivant |
| **Le Chat du Manoir** | **Passif** : absorbe la première attaque le visant, annoncée publiquement de façon anonyme. Co-gagne s'il survit |
| **L'Aubergiste** | Protège un participant un tour sur deux. **S'il a été attaqué, l'Aubergiste l'apprend — sans jamais savoir par qui**. Co-gagne s'il survit |
| **Le Photographe mondain** | Photographie discrètement des participants, qui l'ignorent. Co-gagne s'il survit et qu'assez de photographiés sont morts |

---

## 7. Objets et informations d'amorçage

### Objets

Un participant possède un inventaire. Un objet est utilisable **indépendamment de la capacité**, ce qui donne une action supplémentaire par tour.

Catégories : consommables à effet (soin, poison, révélation), armes à usage unique, communications transférables, indices, et une réserve exclusive à un rôle civil (évasion, protection, neutralisation, révélation d'inventaire, protection contre le vol).

**Trois propriétés structurantes :**

1. **Un objet porte l'empreinte de son origine**, et cette empreinte **survit au vol**. Un objet d'origine hostile utilisé par un civil reste imputable à son camp d'origine — ce qui permet à certains effets d'agir dessus.
2. **Les objets circulent** : ils sont donnés, volés, récupérés sur les morts. L'inventaire d'un participant éliminé reste actif.
3. **Certaines communications sont signées, d'autres anonymes.** Le fait que les communications soient signées est **précisément ce qui rend crédible leur contrefaçon** par un rôle de tromperie. C'est un exemple net de conception où une propriété apparemment cosmétique est en réalité la condition d'existence d'une mécanique.

**Note d'équilibrage** : les reliques distribuées par un rôle neutre sont majoritairement **sans effet** — sur dix variantes, quatre seulement font quelque chose, et la pondération favorise nettement les inertes.

### Informations d'amorçage

Distribuées au setup pour amorcer le premier tour, faute de quoi la première Enquête serait vide.

**Trois principes verrouillés :**

1. **L'information est toujours vraie** et porte sur la composition de *cette* partie.
2. **La distribution est aveugle à l'appartenance** — les membres de la minorité informée en reçoivent aussi, ce qui leur donne une couverture crédible.
3. **Environ un participant sur trois** en reçoit une, jamais plus d'une chacun.

Familles d'informations : présence ou absence d'un rôle précis, nombre de rôles d'un type, comparaison d'appartenance entre deux participants, participant armé dès le départ, exclusions fortes.

**Variante fragmentée** : une information est coupée en **deux moitiés illisibles séparément**, remises à deux participants différents. **Aucune fusion n'est assistée par l'application** — la recomposition se fait oralement, à la table. C'est un excellent condensé de la philosophie du produit : *l'application crée la situation, la table la résout.*

---

## 8. Incohérences connues du catalogue

Signalées pour éviter qu'un lecteur les prenne pour des règles.

| # | Point | Nature |
|---|---|---|
| 1 | La documentation interne des rôles décrit un état très antérieur : un décompte inférieur d'un tiers, et **des rôles supprimés encore documentés comme actifs** | Documentation périmée |
| 2 | Un document de référence affirme que cinq rôles peuvent agir dans toutes les phases, et **interdit explicitement de le signaler comme un bug**. Le moteur fait l'inverse : toutes les capacités sont restreintes à la phase d'action | **Contradiction active, avec garde-fou trompeur** |
| 3 | Un rôle neutre a un texte joueur **plus restrictif que la règle réelle** (il exige un type de rôle allié précis là où le moteur accepte n'importe quel allié) | Texte ≠ moteur |
| 4 | Un rôle civil est documenté comme ayant une capacité alors qu'il est **purement passif** | Texte ≠ moteur |
| 5 | Un rôle neutre a **deux chemins de victoire de natures différentes**, dont un seul est évalué par le mécanisme normal ; sa fiche n'en mentionne qu'un | Modèle incohérent |
| 6 | Les limites d'usage sont **partiellement codées en dur par rôle** et partiellement déduites d'un texte. Un rôle dont le texte a été reformulé n'est sauvé que par une exception explicite ; **tout rôle futur formulé de la même façon deviendrait silencieusement illimité** | Fragilité structurelle |
| 7 | La distribution d'informations d'amorçage suppose la présence garantie d'un rôle qui, en réalité, n'est tiré que dans une minorité de parties | Hypothèse fausse, sans conséquence de correction |

**Enseignement transverse.** Les points 6 et 7 sont plus instructifs que les autres : ils montrent que **les propriétés mécaniques d'un rôle sont aujourd'hui dispersées** entre données, texte affiché et exceptions codées. Toute conception future gagnerait à faire du rôle une **déclaration unique et complète**, dont l'affichage et le moteur dérivent tous deux — plutôt que trois sources à maintenir en parallèle.
