# 06 — Joueurs, factions et rôles

Catalogue exhaustif reconstitué par observation du produit. Conventions communes :

- Sauf mention contraire, une **capacité active se joue pendant l'Enquête** et ses effets létaux/protecteurs se dénouent à l'**Annonce** (résolution différée, voir [09](09-regles-resolution-et-priorites.md)).
- **Doctrine des déguisements** (rappel, s'applique à toutes les enquêtes) : seul l'**Assistant du détective** voit les vrais rôles ; l'**Usurpateur** ressort sous sa couverture civile ; un tueur **killer-class** ressort « Civil / pas suspect » ; une cible **falsifiée** renvoie « le joueur a été falsifié » à tout enquêteur, Assistant compris.
- **Après élimination** : sauf règle contraire, un rôle mort perd ses capacités et rejoint le Conseil des Morts ; un rôle emprisonné conserve son rôle mais ne peut plus agir.
- Les limites notées « scalées » varient avec la taille de la table.

## Les factions

| Faction | Objectif | Connaissances initiales | Alliés connus | Condition de victoire | Rapports aux autres |
|---|---|---|---|---|---|
| **Civils** | Éliminer toutes les menaces. | Leur seul rôle (+ informations de setup éventuelles : indices, protégé désigné…). | Aucun (sauf exceptions de setup : le Vengeur connaît 2 Civils sûrs, l'Ange Gardien connaît son protégé Civil). | Plus aucun Méchant, Vampire, faction des Amoureux active ni Neutre bloquant en vie. | Majorité chassée par tous ; s'appuient sur enquêtes, protections, prison. |
| **Méchants** | Prendre le contrôle. | **Se connaissent tous** (liste des alliés avec rôles) ; voient la cible du Tueur chaque tour ; chat d'équipe. | Oui, complets. | **Majorité stricte** : plus nombreux (vivants libres) que tous leurs opposants réunis ; à l'égalité, pas de victoire. | Équipe coordonnée autour du Tueur ; camouflage des killer-class. |
| **Neutres** | Objectifs personnels (par rôle). | Leur rôle ; le clan Vampire se connaît. | Selon rôle (clan, couple). | Par rôle (voir fiches) ; les **BÉNINS** ne bloquent la victoire de personne et ne comptent pas comme opposants. | Électrons libres : gêneurs, parasites ou menaces à part entière. |
| **Clan des Vampires** *(faction émergente)* | Convertir ou éliminer tous les autres. | Les vampires se connaissent. | Oui (clan). | Au moins un vampire vivant et plus aucun non-vampire (hors bénins) vivant libre. | Convertit des joueurs de toute faction ; fait émerger le Chasseur. |
| **Faction des Amoureux** *(créée par l'Entremetteur)* | Que le couple lié survive. | Les amoureux connaissent leur partenaire (statut « Amoureux »). | Oui (le couple ; l'Entremetteur connaît le couple). | Le couple (± l'Entremetteur) seuls survivants libres (hors bénins). | Coupe à travers les factions d'origine. |

Équilibre général : la composition garantit ~20 % de Méchants (plafond 4), 0 à 3 Neutres selon la taille, le reste en Civils — voir [15-parametres-variantes-et-equilibrage.md](15-parametres-variantes-et-equilibrage.md).

---

## I. CIVILS

### Rôles socles (toujours présents)

#### L'Assistant du détective — INVESTIGATION `CONFIRMÉ`
- **Capacité** : 1×/tour, désigne un joueur → reçoit un **trio de rôles** (le vrai + 2 leurres plausibles, mélangés).
- **Position unique** : **seul rôle qui perce tous les déguisements** — Usurpateur et tueurs camouflés apparaissent sous leur vrai rôle dans le trio. Seule la **falsification** l'aveugle.
- **Restrictions** : ne sait pas lequel des trois est le vrai ; les leurres sont tirés parmi des types compatibles (jamais 3 rôles de la même faction).

#### Le Majordome — PROTECTEUR `CONFIRMÉ`
- **Capacité** : protège une cible. Si une attaque d'**origine méchante** frappe la cible protégée : la cible survit, **l'attaquant meurt, et le Majordome meurt aussi** (échange héroïque, qui révèle de fait un Méchant).
- **Restrictions** : protéger « à vide » est sans risque ; l'échange ne se déclenche que sur une attaque effectivement parée d'origine méchante. La **balle perforante** ignore sa protection (la cible meurt, le Majordome survit sans riposter).
- **Limite d'usage** : fréquence exacte `À CONFIRMER` (protection récurrente observée, cadence non tranchée).

### Investigation

#### Le Policier `CONFIRMÉ`
- 1×/tour, verdict binaire **« suspect / pas suspect »**. Grille : Civils → non ; **tout Neutre → suspect** ; Méchants → suspect **sauf killer-class** (camouflés). Un Cuisinier ayant tué un Civil ressort « suspect » (marque spéciale).
- `CONTRADICTOIRE` : le texte joueur ne cite que 3 rôles camouflés (Tueur, Croque-mitaine, Stratège) alors que le comportement réel blanchit **tous** les killer-class (aussi Armurier, Détrousseur, Franc-tireur, Vautour).

#### L'Avocat `CONFIRMÉ`
- **Passif** : voit en permanence la **faction des joueurs actuellement emprisonnés**. Sans prisonnier, aveugle.

#### La Boussole `CONFIRMÉ`
- 1×/tour (`DÉDUIT` pour la cadence), désigne **2 joueurs** → apprend s'ils sont du **même camp** ou de camps opposés. Ne perce aucun déguisement ; piège : deux Neutres ressortent « même camp » malgré des objectifs opposés.

#### Le Guetteur `CONFIRMÉ`
- 1×/tour, surveille une cible : obtient le **journal des visiteurs** (qui a agi sur elle, dans l'ordre), consultable les tours suivants. Ne se surveille pas lui-même ; n'enregistre pas ce qui précède le début de sa surveillance.

#### Le Journaliste `CONFIRMÉ`
- 1×/tour, espionne le **mur des suspicions** d'un joueur jusqu'au tour suivant (les niveaux marqués, jamais les notes).

#### Le Médecin légiste `CONFIRMÉ`
- **Passif** : à chaque mort, reçoit le **rôle exact** du défunt (autopsie). Aveuglé si le corps a été « effacé » par le Cleaner — un « inconnu » trahit d'ailleurs l'existence d'un Cleaner.

#### Le Médium `CONFIRMÉ`
- **Passif** : lit en permanence le **Conseil des Morts** (chat des défunts), sans jamais pouvoir y écrire.

#### Le Portraitiste `CONFIRMÉ`
- 1×/Enquête, croque un joueur → apprend son **type de rôle** (jamais le rôle exact). Lecture : TROMPERIE/CONTRÔLE ⇒ Méchant certain ; PROTECTEUR/SUPPORT ⇒ Civil certain ; TUEUR/INVESTIGATION ambigus. Déguisements non percés (il voit le type de la couverture).

### Protecteurs

#### L'Ange Gardien `CONFIRMÉ`
- Au setup, une **cible civile imposée au hasard** lui est révélée. 1×/partie, il lève un **bouclier** sur elle (couvre le tour de pose et le suivant). La cible ignore tout, même sauvée.
- `CONTRADICTOIRE` : le texte joueur décrit « annule la prochaine attaque puis disparaît » ; le comportement réel est une **fenêtre de deux tours**, pas une charge à la première attaque.

#### La Babysitter `CONFIRMÉ`
- Chaque Enquête (`DÉDUIT`), cible un joueur : **au tour suivant**, il est protégé mais sa **capacité est bloquée**. La cible est prévenue.

#### Le Barman `CONFIRMÉ`
- Désigne 2 cibles ; au hasard, l'une est **protégée + ivre** (capacité bloquée le tour suivant, prévenue), l'autre passe juste un « bon moment ». Le Barman ne choisit pas laquelle.

#### Le Saint — PROTECTEUR/SUPPORT `CONFIRMÉ`
- 1×/partie, **bénit** un joueur (lui-même inclus) : intouchable face à toute action **hostile** pendant 2 tours (attaques, morsure, poison, chantage, manipulation, accusation, falsification…). L'agresseur est prévenu « cible bénite » ; le Saint apprend qui a tenté quoi. La balle perforante traverse.
- **Règle spéciale majeure** : si le Saint est **condamné par le vote**, les Civils **perdent immédiatement** (victoire des Méchants).

### Tueurs civils

#### Le Cuisinier `CONFIRMÉ`
- Reçoit un **couteau** au setup (objet volable). Un kill différé, une fois. S'il tue un Civil, il ressort « suspect » au Policier. Son couteau, d'origine civile, n'est **pas** effaçable par le Cleaner.

#### L'Exécuteur `CONFIRMÉ`
- Exécute un **prisonnier ayant purgé au moins un tour complet**. Usages scalés : 1 (≤10 j.) / 2 (11–13) / 3 (14+). L'exécution tue **immédiatement** et **révèle publiquement le rôle complet** du condamné — unique fuite publique de rôle du jeu. Risque assumé : exécuter un innocent.

#### Le Vengeur `CONFIRMÉ`
- Au setup, choisit son **être cher parmi 2 Civils proposés** (donc 2 joueurs sûrs connus). Passif tant que l'être cher vit ; si celui-ci **meurt ou est emprisonné**, il reçoit un **couteau de vengeance** (un kill différé, soumis aux protections). Choix automatique au tour 1 s'il ne valide pas.

#### Le Garde-chasse `CONFIRMÉ`
- 1×/Enquête, **patrouille** devant la porte d'un autre joueur. Si quelqu'un attaque le patrouillé ce tour, **l'attaquant meurt** — mais la cible n'est **pas** sauvée. La riposte se déclenche même si l'attaque a été bloquée ou parée par ailleurs ; pas de riposte si le Garde-chasse est mort/condamné ce tour.

#### Le Bretteur `CONFIRMÉ`
- **Lève sa garde** pour un tour : s'il est attaqué, il **pare** (l'attaque échoue) **et embroche l'attaquant** (mort). Parades scalées : 1×/partie, 2 dès 11 joueurs. Garde levée sans attaque = perdue. La balle perforante passe outre (il meurt sans embrocher).

#### Le Conjuré `CONFIRMÉ`
- 1×/partie, monte un **pacte d'assassinat** : choisit un **complice** puis une **victime**. Le complice reçoit une demande **anonyme** ; s'il accepte, la victime meurt à l'Annonce ; s'il refuse, rien — mais il sait qu'un Conjuré rôde. **Le pacte est dépensé dans les deux cas.** Annulé si le Conjuré meurt/est emprisonné avant la résolution.

#### Le Paranoïaque — SUPPORT/TUEUR conditionnel `CONFIRMÉ`
- Une **cible imposée au hasard au setup** (toutes factions possibles). 1×/partie, il tranche : **protéger OU tuer** cette cible. Décision définitive ; à lui de deviner le camp de sa cible.

### Supports

#### L'Apothicaire `CONFIRMÉ`
- Dispose de 3 fioles virtuelles (Vie, Mort, Clairvoyance), aucune en main au départ. Chaque Enquête, **une action** : utiliser une fiole lui-même **ou** l'offrir (elle devient un objet chez le destinataire, étiqueté « de l'Apothicaire » — le rôle, pas le joueur). **Budgets sur la partie : au plus 1 usage personnel ET au plus 1 don** ; chaque type de fiole ne sert qu'une fois → 2 fioles jouées maximum, la 3ᵉ jamais.
- Fioles : **Vie** = protection/soin (nettoie un poison) ; **Mort** = attaque différée ; **Clairvoyance** = révèle la **faction apparente** (déguisements respectés, falsification aveuglante). `CONTRADICTOIRE` : le texte joueur dit « révèle sa faction » sans la nuance « apparente ».

#### Le Facteur `CONFIRMÉ`
- Chaque Enquête, dépose une **lettre vierge** chez une cible (qui ignore la provenance). La cible peut écrire (~80 caractères) et l'envoyer à qui elle veut. **Toute lettre envoyée arrive signée du nom de l'expéditeur** ; seul le Facteur reste anonyme. Aucun effet mécanique — outil social.

#### Le Juge `CONFIRMÉ`
- Programme la **libération** d'un prisonnier ayant purgé ≥1 tour complet ; effet au début du tour suivant, annoncé publiquement, le prisonnier prévenu (« Le Juge a ordonné ta libération »). Usages scalés : 1 / 2 / 3 (mêmes paliers que l'Exécuteur). L'évasion du **Corrupteur** est indiscernable d'une de ses libérations.

#### Le Contrebandier `CONFIRMÉ`
- **Passif** : tous les 2 tours, reçoit 1 objet aléatoire de sa **malle exclusive** (Passe-partout — évasion de prison, utilisable seulement en cellule ; Gilet matelassé — protection ; Rhum — rend une cible ivre au tour suivant ; Monocle du douanier — voit l'inventaire complet d'un joueur ; Double-fond — passif anti-vol, absorbe le premier vol subi). Rien n'est livré s'il est en prison.

#### Le Jardinier `CONFIRMÉ`
- 1×/Enquête, cible un joueur et **duplique son dernier objet reçu** (la cible garde l'original ; copie identique pour le Jardinier ; silencieux). Cible sans objet = tour perdu.
- `CONTRADICTOIRE` : un ancien texte d'aide décrit un « ramassage d'objet sur les morts » — le comportement réel est la duplication sur un vivant.

#### Le Geôlier `CONFIRMÉ`
- 1×/Enquête, ouvre un **parloir** (chat privé d'un tour) avec un prisonnier vivant. Le prisonnier ignore qui est le Geôlier et peut mentir.

---

## II. MÉCHANTS

Tous partagent : connaissance mutuelle de l'équipe, chat d'équipe, vision de la cible du Tueur, condition de victoire de majorité stricte.

### Killer-class (camouflés aux enquêtes ordinaires)

#### Le Tueur *(socle, toujours présent)* `CONFIRMÉ`
- 1 frappe par Enquête (kill différé). Prévient son équipe de la cible. Camouflage total hors Assistant.
- **Succession** : s'il meurt, un acolyte devient Tueur **définitivement** ; s'il est emprisonné, un acolyte devient Tueur **temporairement** (rétabli à sa libération).
- Le slot socle « Tueur » peut être occupé par des variantes (Croque-mitaine, Armurier…) selon le tirage.

#### Le Croque-mitaine `CONFIRMÉ`
- Désigne **2 cibles** ; le hasard en tue une, épargne l'autre — le survivant est prévenu (« tu as survécu à un danger », sans rôle révélé).

#### Le Stratège `CONFIRMÉ`
- Chaque Enquête, choisit **1 mode parmi 3, jamais le même deux tours de suite** :
  - **Discrétion** : tue 1 cible.
  - **Bain de sang** : tue 2 cibles, mais **un Civil au hasard reçoit un indice nommant le Stratège** (fuite d'identité).
  - **Sabotage** : ne tue pas ; **bloque totalement** (capacité + objets) 1 cible au tour suivant.
- Succession propre (un acolyte hérite, y compris du dernier mode joué).

#### L'Armurier `CONFIRMÉ`
- 1×/Enquête, remet **anonymement un couteau** à un joueur vivant (qui en ignore l'origine). Le porteur peut tuer avec (1×). L'Armurier est notifié quand son couteau sert. Couteau d'**origine méchante** → effaçable par le Cleaner même si un Civil l'a utilisé.

#### Le Détrousseur `CONFIRMÉ`
- 1×/Enquête, tue 1 cible (kill « propre », sans vol). Séparément, **1×/partie**, arme son **braquage** : le prochain kill **rafle tout l'inventaire** de la victime.

#### Le Franc-tireur `CONFIRMÉ`
- 1×/Enquête, tue 1 cible. Séparément, **1×/partie**, arme la **balle perforante** : ce tir ignore **toutes** les protections (bouclier, bénédiction, sacrifice du Majordome, parade du Bretteur, vie du Chat). Seule la riposte du Garde-chasse s'applique quand même.

#### Le Vautour `À CONFIRMER`
- Rôle attesté : killer-class méchant, **armé au setup**, et son interface de ciblage vise « les joueurs ayant reçu au moins une voix » (lien au vote). Fiche complète non reconstituée — voir [18-questions-et-incertitudes.md](18-questions-et-incertitudes.md).

### Tromperie

#### L'Usurpateur `CONFIRMÉ`
- Au setup, choisit **1 couverture parmi 3 rôles civils absents de la partie** ; verrouillée ensuite. Toutes les enquêtes ordinaires renvoient cette couverture ; **seul l'Assistant** voit le vrai rôle. Choix automatique au tour 1 sinon.

#### L'Accusateur `CONFIRMÉ`
- Marque un joueur **« Suspect » publiquement pendant 1 tour** (visible de toute la table). Bloqué par la bénédiction.

#### Le Falsificateur `CONFIRMÉ`
- Pose sur une cible (pas lui-même) une **falsification permanente** : toute enquête sur elle renvoie « le joueur a été falsifié » — y compris l'Assistant. Sert à salir un innocent **ou** à rendre un allié illisible. Irréversible ; bloqué par la bénédiction.

#### Le Ventriloque `CONFIRMÉ`
- 1×/partie, forge une **lettre signée du nom d'un autre joueur vivant**, livrée au destinataire de son choix — indiscernable d'une vraie lettre.

### Contrôle

#### Le Cleaner `CONFIRMÉ`
- **Arme l'effaceur** (activable/désactivable). À la résolution suivante, une mort d'**origine méchante** est « nettoyée » : faction publique « inconnue », autopsie aveuglée. Charges scalées : 1 (<10 j.) / 2 (≥10 j.). Ne nettoie jamais une mort d'origine civile ou neutre.

#### Le Maître chanteur `CONFIRMÉ`
- Cible un joueur → **capacité désactivée au tour suivant** ; la cible voit le statut « sous chantage » sans en connaître l'auteur. Bloqué par la bénédiction.

#### Le Marionnettiste `CONFIRMÉ`
- Cible un joueur (**pas le Tueur**). Au tour suivant, la cible est « Manipulée » (ne peut plus agir) et le Marionnettiste **déclenche lui-même sa capacité** (une fois), résultat reflété au Marionnettiste. Bloqué par la bénédiction.

#### Le Voleur `CONFIRMÉ`
- Dérobe le **dernier objet reçu** d'une cible, **vivante ou morte**. La cible vivante est notifiée. Le Double-fond (Contrebandier) absorbe son premier vol.

#### Le Corrupteur `CONFIRMÉ`
- 1×/partie, **fait évader** un prisonnier ayant purgé ≥1 tour ; libération au tour suivant, **déguisée en libération du Juge** (annonce et notification identiques). L'évadé lui-même ne sait pas.

### Investigation méchante

#### Le Mouchard `CONFIRMÉ`
- 1×/partie, désigne un joueur → **rôle exact révélé** (dans la limite des déguisements : Usurpateur → couverture, tueur camouflé → « Citoyen », falsifié → rien). Ciblage automatique au tour 1 s'il ne joue pas.

#### Le Cartomancien `CONFIRMÉ`
- 1×/tour, lit le **mur des suspicions** d'une cible (mêmes règles que le Journaliste).

#### L'Archiviste `CONFIRMÉ`
- **Passif** : à chaque emprisonnement, apprend le **rôle exact** de l'écroué (déguisements et falsification respectés : couverture, « Citoyen », « dossier illisible »). Fonctionne même s'il est lui-même en prison.

#### Le Physionomiste `CONFIRMÉ`
- 1×/Enquête, apprend le **type de rôle** d'une cible (miroir méchant du Portraitiste ; sert à repérer protecteurs et enquêteurs).

---

## III. NEUTRES

### Menaces solo (type MAL / CHAOS)

#### L'Empoisonneur — MAL `CONFIRMÉ`
- **Victoire solo** : tous les autres survivants **libres** (hors bénins) sont empoisonnés.
- 1×/Enquête, pose un **poison non létal permanent** (résolu après les attaques : annulé si l'Empoisonneur meurt ce tour ; une cible protégée/bénie est immunisée). Dispose d'un suivi de progression. Nuance : les emprisonnés sortent du décompte (il peut gagner alors que des joueurs non empoisonnés sont en prison).

#### Le Pyromane — MAL `CONFIRMÉ` (mécanique) / `CONTRADICTOIRE` (textes)
- **Victoire solo** : atteindre un quota de morts **par le feu** (3 si ≤15 j., 4 si 16+) en étant vivant et libre.
- Chaque Enquête, **asperge d'essence** un joueur (silencieux ; plafond d'aspergés vivants = quota + 1). Séparément, **craque l'allumette** : tous les aspergés vivants libres meurent à l'Annonce (protections applicables ; la prison ne brûle pas). L'allumette est **répétable avec un délai de 2 tours pleins**.
- `CONTRADICTOIRE` : le texte joueur annonce « allumette une fois par partie » et un barème « 2/3/4 » — le comportement réel est « répétable avec délai » et « 3/4 ».

#### La Veuve noire — MAL `CONFIRMÉ`
- **Victoire solo** : être la seule survivante libre.
- Chaque Enquête, désigne **2 « époux »**. Si l'un d'eux vote contre elle (ou la marque « Suspect » en variante Suspicion) au vote suivant, **les deux époux meurent** à la prochaine Annonce. Dissuasion autant que piège.

#### Le Parieur tricheur — MAL/CHAOS `CONFIRMÉ`
- **Victoire solo** : être le dernier survivant libre.
- **Duel de dés** (répétable) : il lance 3 dés et garde le meilleur ; la cible lance 1 dé. Le plus petit score **meurt à la prochaine Annonce** (attaque différée, protégeable). Égalité → on relance. **S'il perd, c'est lui qui meurt.** La cible ne connaît jamais son identité (duel anonyme).

#### Le Conservateur — CHAOS `CONFIRMÉ`
- **Victoire** : faire circuler **Le Cœur du Manoir** — dès que cette relique est distribuée, il **gagne immédiatement**, tous les autres perdent. Gagne aussi en dernier survivant.
- **2×/Enquête**, confie une **relique tirée au sort** à une cible (jamais lui-même) : le Cœur (rare), des reliques actives (révélation d'un rôle au hasard, protection d'un tour, blocage d'une capacité un tour) et des reliques inertes (leurres, plus fréquentes).

### Faction du sang et du cœur

#### Le Vampire `CONFIRMÉ`
- **Victoire du clan** : au moins un vampire vivant, plus aucun non-vampire (hors bénins) vivant libre.
- Chaque Enquête, **mord** un non-vampire → conversion (résolue après les attaques : annulée si le Vampire meurt ce tour ; protégé/béni immunisé ; le Chasseur est immunisé mais la morsure est consommée). Le converti garde son rôle et sa capacité, mais **change de camp**. La **première morsure** déclenche une annonce publique anonyme et **éveille un Chasseur de Vampire** (désigné secrètement au setup parmi les Civils sans rôle fort). Succession de la morsure à un converti si le Vampire tombe.

#### Le Chasseur de Vampire *(émergent)* `CONFIRMÉ`
- Jamais tiré à la composition : éveillé par la première morsure. **Allié des Civils** (gagne avec eux ; ne bloque pas leur victoire).
- Chaque tour, **teste** une cible : vampire ou non. Si oui, une attaque différée **l'exécute** à l'Annonce. Immunisé à la morsure. Falsification → ni conclusion ni exécution.

#### L'Entremetteur `CONFIRMÉ`
- À la première Enquête, **lie 2 autres joueurs** (les Amoureux) : si l'un meurt (ou si le couple est brisé par emprisonnement — `À CONFIRMER` sur le déclencheur exact), l'autre meurt automatiquement.
- **Victoire de faction** : couple intact + seuls survivants → victoire des Amoureux (l'Entremetteur co-gagne). **Repli** : couple brisé ou jamais lié → il devient parasite et **co-gagne avec n'importe quel camp** s'il est vivant et libre à la fin.

### Alignés et opportunistes

#### L'Héritier déchu — aligné Méchants `CONFIRMÉ`
- **Victoire** : que les Méchants gagnent **avec au moins un tueur méchant vivant** à la fin.
- Capacité d'enquête « suspect / pas suspect » (même grille que le Policier), sous des airs de Civil honnête.
- Compté comme allié méchant tant qu'un vrai Méchant vit ; sinon, il a perdu et **ne bloque plus** la victoire civile.

#### L'Imitateur `CONFIRMÉ`
- 1×/partie, **copie intégralement le rôle du dernier joueur mort** (capacité, camp, condition de victoire). Tant qu'il n'a pas copié : « suspect » aux enquêtes. Timing crucial.

#### L'Oracle — BÉNIN `CONFIRMÉ`
- À la première Enquête, **prédit la famille gagnante** (Civils / Méchants / Neutres). **Co-gagne** si sa prophétie se réalise et qu'il est vivant à la fin. Tirage automatique au tour 1 sinon. « Neutres » couvre toute victoire non-civile/non-méchante (Vampires, Amoureux, solos…).

### Bénins (ne bloquent personne)

#### Le Chat du Manoir `CONFIRMÉ`
- **Co-victoire** : être en vie à la fin, quel que soit le vainqueur.
- **Passif** : la première attaque contre lui est **absorbée** (vie de réserve) ; un « miaulement » public anonyme le signale. Absorbe aussi un poison létal différé. La balle perforante traverse la vie de réserve.

#### Le Photographe mondain `CONFIRMÉ`
- **Co-victoire** : vivant à la fin ET un quota de personnes **photographiées de leur vivant** désormais mortes (2 si ≤10 j. / 3 si 11–15 / 4 si 16+).
- 1×/Enquête, photographie un joueur vivant (silencieux, sans effet ; doublons refusés).

#### L'Aubergiste `CONFIRMÉ`
- **Co-victoire** : être en vie à la fin.
- **Une Enquête sur deux**, offre une **chambre** à un autre joueur → protégé ce tour. Si son hôte a été attaqué, l'Aubergiste l'apprend (« on a frappé à la porte »), sans jamais savoir qui. Inactif en prison.

---

## IV. Rôles supprimés (OBSOLÈTES — ne plus documenter comme actifs)

| Rôle | Statut |
|---|---|
| **Boulet** (famille de rôles) | Purgé. Type retiré de la classification. |
| **Le Voisin** | Supprimé définitivement. |
| **Le Détective** (immortel) | Supprimé ; l'Assistant du détective est son héritier fonctionnel. |
| **Le Témoin** | Supprimé — mais encore présent dans d'anciens textes d'aide (`CONTRADICTOIRE`, voir [18](18-questions-et-incertitudes.md)). |
| **Le Poltergeist** | Supprimé (bloquait à tort la victoire civile) — trace résiduelle dans un texte d'aide. |

## Points transverses d'après-élimination

- **Mort** : les passifs cessent (autopsie, avocat…), sauf effets attachés à la mort d'autrui déjà déclenchés. Le mur des suspicions d'un mort ne compte plus dans la variante Suspicion (seuls vivants et prisonniers comptent).
- **Prison** : le rôle reste actif « en identité » (lisible par l'Archiviste, exécutable) mais inerte « en action ». Exceptions : l'Archiviste passif fonctionne depuis la prison ; le prisonnier peut utiliser un Passe-partout (évasion) — seule utilisation d'objet observée en cellule.
- **Conversion (morsure)** : changement de camp sans changement de rôle ; les textes de condition de victoire du joueur sont mis à jour en conséquence.
