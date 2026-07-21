# Exigences d'une session en direct

Ce document décrit les contraintes fonctionnelles d'une partie interactive réunissant **6 à 15 participants** (le produit va jusqu'à 20, mais la bande typique est 6-15), chacun sur son téléphone, **tous dans la même pièce**.

Les besoins sont exprimés en **résultats attendus**, jamais en solutions. L'objectif est de permettre plus tard de comparer plusieurs architectures sans que ce document en ait présélectionné une.

Chaque exigence est classée :

| Niveau | Signification |
|---|---|
| **[I]** Indispensable | Sans cela, le jeu est cassé ou injouable |
| **[E]** Expérience | Le jeu fonctionne, mais la soirée est nettement moins bonne |
| **[?]** À décider | Aucune règle n'existe ; la réponse est un choix de conception à faire |

---

## 1. Le contexte réel, et pourquoi il change tout

Avant toute exigence, une remarque qui conditionne le reste : **le canal de communication principal entre les participants n'est pas l'application, c'est la pièce**.

Cela a des conséquences contre-intuitives :

- **La latence humaine domine la latence technique.** Un participant qui met trois secondes à sortir son téléphone de sa poche rend une optimisation de 200 ms invisible. Les exigences de réactivité ci-dessous sont donc calibrées sur la perception, pas sur la performance absolue.
- **Les divergences sont immédiatement visibles.** À l'inverse, dans une pièce unique, si deux téléphones affichent des compteurs différents ou des faits contradictoires, **quelqu'un le dira à voix haute dans la seconde**. La cohérence perçue compte plus que la vitesse brute.
- **La triche physique est possible et acceptée.** Un joueur peut regarder l'écran de son voisin. Le produit s'en protège par des mesures d'interface, pas par de la sécurité.
- **Le nombre de participants est petit et connu d'avance.** Une session est un groupe fermé de moins de vingt appareils, pendant deux heures maximum. Ce n'est pas un problème de passage à l'échelle : c'est un problème de **fiabilité sur un petit groupe**.

---

## 2. Cohérence de l'état partagé

### Ce qui doit être identique pour tous **[I]**

- La phase courante, le numéro de tour, et le temps restant.
- La liste des participants avec leur état public : actif, écarté, éliminé.
- La chronique publique des événements, dans le même ordre pour tous.
- Le verdict de chaque vote.
- Le résultat de fin de partie.

**Exigence** : à tout instant, deux participants au premier plan doivent voir le même état officiel. Une divergence transitoire est tolérable si elle se résorbe en quelques secondes ; une divergence durable est un défaut grave, car elle se manifeste immédiatement par une contestation orale.

### Ce qui est propre à chaque participant **[I]**

Son rôle, son appartenance, ses compteurs d'usage, ses informations privées reçues, son inventaire, ses notes et marquages, les états posés sur lui, et son bulletin de vote.

### Aucun appareil ne détient la vérité **[I]**

Ce que chaque téléphone affiche est une **projection** d'un état officiel qui existe ailleurs. Un appareil ne doit jamais être la source de vérité, car il peut se fermer, tomber en panne de batterie ou quitter la pièce.

---

## 3. Propagation des changements

### Ce qui doit parvenir sans action de l'utilisateur **[I]**

Changements de phase, éliminations, mises à l'écart et libérations, verdicts de vote, objets et informations reçus, états posés, fin de partie, et arrivées au salon.

**Exigence de résultat** : un participant qui regarde son écran sans rien toucher doit voir la partie évoluer. Un participant ne doit jamais avoir à rafraîchir manuellement pour découvrir qu'il est mort.

### Cibles de réactivité observées dans le produit **[E]**

| Événement | Cible |
|---|---|
| Retour visuel à une action locale | quasi immédiat |
| Écart de propagation entre le premier et le dernier appareil éveillé | quelques secondes au plus |
| Écart perçu entre deux compteurs | inférieur à la seconde |
| Retard d'arbitrage du rythme | de l'ordre de quelques secondes |

Ces cibles sont **déclarées mais non mesurées** dans le produit actuel. Elles sont à traiter comme des intentions raisonnables, pas comme des faits validés.

### Le volume de données est une contrainte réelle **[I]**

C'est un enseignement fort du produit existant, et il mérite d'être exposé clairement car il a orienté plusieurs décisions.

Une session de quinze participants pendant deux heures génère **beaucoup plus de trafic qu'on ne l'anticipe**. Les causes observées :

1. **La diffusion excessive lors des modifications.** Un changement trivial (« ce participant est mort ») retransmettait l'intégralité du contenu de la fiche du participant, données privées comprises. Constaté comme le premier poste de consommation.
2. **Les mécanismes de présence croissent au carré du nombre de participants.** Chaque appareil signalant son activité à tous les autres, doubler l'effectif quadruple le trafic. C'est le flux le plus bavard du produit, et il a fallu délibérément **ralentir les cadences de signalement** pour le contenir.
3. **L'arbitrage périodique tournant en permanence**, y compris quand aucune partie n'existe. Il représentait à lui seul la majeure partie de la charge, pour un usage nul la plupart du temps.
4. **Les diffusions non filtrées** : un appareil recevait initialement les changements de **toutes** les parties en cours, pas seulement la sienne.

**Exigence** : le volume propagé doit être proportionné à ce qui a réellement changé et à qui a besoin de le savoir. Ce n'est pas seulement une question de coût : c'est aussi une question de fiabilité sur un réseau domestique partagé par quinze téléphones.

**Point d'attention pour la conception future** : ce sont des économies obtenues *après coup*, sur une architecture qui n'avait pas anticipé le problème. Une conception neuve peut faire mieux nativement — mais il faut savoir dès le départ que **la volumétrie de propagation est un axe de conception, pas un détail d'optimisation**.

---

## 4. Autorité sur l'état officiel

### Le rythme doit être arbitré indépendamment des joueurs **[I]**

C'est probablement l'exigence la plus structurante du document.

**Les phases doivent avancer même si tous les téléphones sont verrouillés.** C'est le scénario nominal, pas un cas limite : les participants sont en train de débattre, personne ne regarde son écran, et la partie doit continuer.

Une conséquence directe : le rythme ne peut pas dépendre d'un appareil joueur. Le produit a d'abord confié ce rôle à l'appareil du créateur, ce qui figeait la partie dès qu'il se déconnectait, puis à un appareil « pilote » élu parmi les présents — ce qui a révélé un piège instructif : **un téléphone en arrière-plan reste détecté comme présent alors que son activité est suspendue par le système d'exploitation**. Un pilote endormi ne pilotait rien pendant que tout le monde le croyait actif.

**Exigence** : l'avancement du temps de jeu ne doit dépendre d'aucun appareil participant. Si un mécanisme d'élection est utilisé pour autre chose, il doit distinguer « présent » de « réellement actif » — la présence seule est un signal trompeur.

### Exécution unique des transitions **[I]**

Une transition de phase doit être exécutée **exactement une fois**, quel que soit le nombre de demandeurs simultanés — plusieurs appareils, un arbitre automatique, un bouton du meneur.

Cette exigence n'est pas théorique. Les défauts réellement observés en son absence :

- deux participants différents écartés par le même vote, parce que le dépouillement a tourné deux fois et que l'égalité était départagée au sort ;
- morts et notifications dupliquées, parce qu'un traitement long avait dépassé sa fenêtre de validité et qu'un second acteur l'avait repris en parallèle.

**Exigences dérivées** :
- Le mécanisme d'exclusion doit avoir une durée de validité **supérieure au traitement le plus long**, ou pouvoir être prolongé en cours de route.
- **Tous** les chemins de transition — automatique comme manuel — doivent passer par la même garantie. Une voie privilégiée pour le meneur réintroduit exactement le problème.

### Le modèle d'autorité actuel est un choix, pas une fatalité **[?]**

Le produit fonctionne aujourd'hui en **confiance client** : la résolution des capacités s'exécute sur l'appareil de l'acteur, et tout participant dispose de droits d'écriture étendus sur les données de sa partie. C'est assumé comme adapté au présentiel — on joue entre amis, dans la même pièce.

Ce choix a des conséquences qu'il faut nommer :
- il ne résiste pas à un participant malveillant ou simplement curieux ;
- il rend certains défauts difficiles à détecter (un refus d'écriture silencieux a rendu plusieurs capacités totalement inertes pendant longtemps sans que personne s'en aperçoive) ;
- il complique le raisonnement sur « qui a fait quoi » et sur la reproductibilité.

**C'est une décision d'architecture à réexaminer explicitement, pas un acquis.**

---

## 5. Information privée et secret

### Le secret doit être garanti à la transmission, pas seulement à l'affichage **[I]**

**C'est la faiblesse connue la plus importante du produit actuel, et elle est documentée comme telle.**

Aujourd'hui, chaque appareil **reçoit** les données complètes de tous les participants — rôles compris — et se contente de ne pas les afficher. Un joueur curieux qui inspecte les échanges de son propre téléphone peut lire tous les rôles de la partie.

**Exigence** : un participant ne doit **recevoir** que ce qu'il a le droit de savoir. Masquer après réception n'est pas protéger.

C'est probablement l'exigence qui pèsera le plus lourd dans une comparaison d'architectures : elle implique que le filtrage de visibilité soit une propriété du système de distribution lui-même.

### Le cloisonnement des canaux est fin **[I]**

Les canaux de discussion ne sont pas un simple découpage par groupe. Il faut modéliser **lecture et écriture séparément** : un rôle peut lire le canal des éliminés sans jamais pouvoir y écrire ; un canal privé peut cacher l'identité de l'un des deux interlocuteurs à l'autre.

### Ce qui ne doit jamais fuir **[I]**

Le rôle et l'appartenance d'un participant vivant ; le détail des bulletins de vote, **y compris après la fin de la partie** ; l'auteur et la cible d'une action secrète ; le fait qu'une cible ait été visée mais sauvée, sauf quand une règle prévoit explicitement de l'en informer.

**Un cas concret à connaître** : une élimination décidée pendant la phase d'action est aujourd'hui notifiée immédiatement à tous les appareils, alors qu'elle est censée rester secrète jusqu'à la publication. Le masquage est uniquement visuel ; **l'information circule avant l'heure**. C'est le même défaut de fond que ci-dessus, appliqué à un événement précis.

### Protection contre le regard du voisin **[E]**

Quinze personnes dans une pièce, épaule contre épaule. Les écrans sensibles doivent être masqués par défaut, révélés par un geste volontaire et maintenu, et re-masqués automatiquement dès que l'application passe en arrière-plan.

---

## 6. Actions simultanées et ordre officiel

### La simultanéité est la règle, pas l'exception **[I]**

À la fin de chaque phase d'action, jusqu'à quinze participants valident en quelques secondes. À la clôture du vote, tout le monde vote dans les dernières secondes. **Ce sont les moments nominaux, pas des pics accidentels.**

**Exigence** : sous rafale, aucune action acceptée n'est perdue, aucun effet n'est appliqué deux fois, et un seul verdict est produit.

### Le moment d'envoi ne doit conférer aucun avantage **[I]**

Les actions ne sont pas arbitrées à leur arrivée mais toutes ensemble, à la clôture, selon des priorités fixes. Un participant sur un réseau lent ne doit pas être désavantagé.

C'est une exigence de **justice perçue** autant que de correction : dans une pièce où tout le monde valide en même temps, un joueur qui perdrait systématiquement les arbitrages le remarquerait et le vivrait comme de la triche.

### Trois états d'une action à distinguer **[I]**

**Choisie** (le joueur a désigné, sans valider) → **Acceptée** (enregistrée, quotas vérifiés, accusé de réception immédiat) → **Résolue** (effet calculé et appliqué, plus tard).

Le participant doit **toujours savoir dans quel état il se trouve**. Ne pas savoir si son action a été prise en compte est une des pires expériences possibles dans ce jeu : elle pousse à rejouer, donc à créer un vrai problème.

### Anti-double-effet **[I]**

Un double appui, un envoi répété, une reconnexion en pleine action : jamais de double effet. Le produit y parvient par trois moyens complémentaires — remplacement pour le vote, refus par quota pour les capacités, et idempotence des résolutions.

### Réversibilité : deux régimes opposés **[?]**

Le produit actuel traite très différemment deux décisions de même nature :

- **Le vote est modifiable** jusqu'à la clôture.
- **La capacité est irréversible** dès la validation, et le quota est consommé même si l'action échoue ensuite.

Cette asymétrie est probablement délibérée (une capacité est un engagement, un vote est une opinion), mais elle **n'est formalisée nulle part** et la documentation interne décrit parfois un modèle plus souple. À trancher explicitement, car cela change à la fois le modèle de données et le ressenti du joueur.

### Actions tardives **[?]**

Une action qui arrive juste après la clôture de la fenêtre n'a pas de règle. Le comportement actuel la fait résoudre **au tour suivant**, avec un tour de retard — ce qui ressemble davantage à un effet de bord qu'à une décision.

Deux réponses possibles, et elles ne s'équivalent pas : **refus explicite** (simple, prévisible, mais frustrant pour un joueur pénalisé par son réseau) ou **acceptation dans une brève fenêtre de grâce** (plus indulgent, mais complexifie la garantie d'unicité de la résolution). C'est un choix de conception à assumer.

---

## 7. Temps, compteurs et attentes

### Une base de temps commune est obligatoire **[I]**

Les compteurs ne peuvent **jamais** être calculés sur l'horloge locale d'un téléphone : elles dérivent, et deux compteurs divergents dans une même pièce sont immédiatement repérés et contestés.

**Exigence** : tous les appareils doivent partager une référence temporelle commune, réestimée régulièrement et **systématiquement au réveil** après une mise en veille.

### Les frontières de phase doivent être strictement alignées **[I]**

Le temps consacré aux écrans de transition doit être **rigoureusement identique** côté arbitre et côté affichage. Un désalignement de quelques secondes produit des défauts très visibles : un compteur qui démarre pendant un écran de transition, ou une phase qui reste bloquée après avoir atteint zéro.

Ce n'est pas anecdotique : c'est un défaut réellement rencontré, et la leçon retenue est qu'il ne doit exister **qu'une seule source pour ces durées**.

### Le téléphone en veille est le cas nominal **[I]**

Un appareil en arrière-plan a son activité suspendue. Rien ne doit être planifié sur un appareil endormi ; tout doit être **rattrapé au réveil**, en une seule opération, sans que le joueur perçoive un rattrapage.

### Attentes bloquantes **[?]**

Le produit comporte au moins une attente non bornée : le démarrage exige que **tous** les participants aient validé leur fiche, sans délai limite ni forçage. Un seul joueur distrait bloque toute la soirée.

**Exigence** : toute attente collective doit avoir une **issue** — délai limite, forçage possible, ou repli automatique. Une attente sans issue est un défaut de conception, pas un cas limite.

---

## 8. Notifications personnelles et file d'attente

Chaque participant reçoit des événements marquants qui **doivent impérativement être vus** : sa mort, sa mise à l'écart, sa libération, une conversion, une sollicitation d'un autre joueur, une survie inattendue.

Ces événements forment une **file à dépiler**, et son comportement est plus subtil qu'il n'y paraît :

- **Elle doit être alimentée par deux voies [I]** : ce qui arrive en direct, et ce qui est retrouvé à l'ouverture après une absence.
- **Elle ne doit jamais rejouer ce qui a déjà été vu [I]**, même après un rechargement complet de l'application.
- **Elle doit filtrer ce qui est périmé [I]** : un participant qui revient après cinq minutes ne doit pas être noyé sous dix notifications obsolètes. Le produit écarte silencieusement tout ce qui dépasse une trentaine de secondes.
- **Elle doit sauter automatiquement ce qui n'a plus de sens [I]** : une sollicitation pour un tour révolu, ou adressée à quelqu'un qui n'est plus dans l'état requis.
- **Elle ne doit jamais se bloquer [I]**. Un défaut réel a existé : deux notifications périmées consécutives figeaient la file **pour toute la session**, parce que le mécanisme de saut ne se réarmait pas. Le joueur ne recevait plus rien du tout, sans le savoir.
- **Elle doit s'effacer devant les transitions de phase [E]** : une notification ne doit jamais s'afficher par-dessus un écran de transition.

**Exigence de synthèse** : la file doit être auto-réparatrice. Tout état où elle cesse de progresser rend le jeu injouable pour ce participant, silencieusement — et c'est le pire type de défaut, car personne ne le signale.

---

## 9. Déconnexions, retours et départs

### Perte de connexion temporaire **[I]**

La partie continue sans le participant absent. Son état est intégralement conservé. Il ne perd que ce que son absence implique selon les règles du jeu : une capacité non jouée, un vote non exprimé.

### Retour au premier plan **[I]**

La resynchronisation doit être **immédiate, automatique et complète** : base de temps, phase, état de tous les participants, historiques, notifications non traitées.

Elle doit se déclencher à chaque signal de réveil — retour d'application, regain de focus, retour du réseau — et non uniquement au démarrage.

**Exigence de résultat** : un participant qui reprend son téléphone après cinq minutes doit comprendre où en est la partie **en un coup d'œil**, sans manipulation, et sans avoir à demander à ses voisins.

### Identité stable sans authentification **[I]**

Retrouver sa place ne doit exiger ni compte, ni mot de passe, ni code personnel. Une identité persistante rattache l'appareil au personnage.

### Signalement de l'absence aux autres **[?]**

Rien n'indique aujourd'hui qu'un participant est déconnecté. Dans une pièce unique, c'est **moins grave qu'en ligne** — on voit bien que quelqu'un est sorti fumer. Mais cela reste une information utile pour le meneur, et pour comprendre pourquoi un vote n'arrive pas.

### Départ définitif **[?]**

Un participant peut quitter explicitement. **Ce qu'il advient de son personnage n'est pas défini** : reste-t-il en jeu comme une coquille inerte ? est-il éliminé ? est-il neutralisé dans les décomptes de victoire ?

C'est une vraie question, pas une finition : dans une soirée de deux heures, quelqu'un partira. Et la réponse choisie **interagit directement avec les conditions de victoire** — un personnage abandonné qui continue de compter comme opposant peut rendre une victoire impossible.

### Même joueur sur deux appareils **[?]**

Aucun comportement défini. Politique à écrire : dernier appareil prioritaire, refus du second, ou affichage synchronisé.

### Remplacement d'un participant **[?]**

Non prévu. À arbitrer selon l'ambition du produit.

### Déconnexion du meneur **[?]**

En mode sans meneur, aucun impact — c'est précisément l'intérêt d'un rythme arbitré indépendamment.

En mode avec meneur, c'est un **manque identifié** : les transitions étant manuelles, la disparition du meneur fige la partie et **aucun mécanisme de reprise n'existe**. Au salon, le paradoxe est plus net encore : le transfert du rôle de lanceur n'est possible que si le lanceur est présent.

**Exigence** : toute fonction critique confiée à une personne doit avoir un chemin de reprise qui ne dépend pas de cette personne.

---

## 10. Durée de vie et continuité d'une session

### Reprise après fermeture complète **[I]**

L'état survit à la fermeture de toutes les applications. Une session doit rester reprenable.

### Reprise en un geste **[E]**

Un participant qui rouvre l'application doit se voir proposer de reprendre sa partie récente non terminée, sans ressaisir de code.

### Bornes temporelles **[I]**

Les sessions ne vivent pas indéfiniment. Le produit actuel supprime une partie peu après sa fin, et **toute session quelques heures après son lancement, quel que soit son état**.

Deux enseignements pour la conception future :

1. **Une partie doit rester nettement plus courte que la borne.** Si le format s'allonge, la borne doit être revue en même temps — pas après.
2. **La règle de purge doit être temporelle, jamais quantitative.** Un défaut réel a existé : une règle qui gardait « les N parties les plus récentes » supprimait **une partie en cours avec ses joueurs dedans** dès qu'une nouvelle était créée. La leçon est nette : *une règle de nettoyage qui ne regarde pas l'état de ce qu'elle supprime finira par supprimer quelque chose de vivant.*

### Parties fantômes **[I]**

Une partie qu'aucune condition de victoire ne peut clore reste en cours indéfiniment et **continue de consommer des ressources en boucle** — un cas réel a produit près de douze mille notifications pour trois parties abandonnées.

**Exigence** : le système doit garantir qu'une session finit toujours par se terminer, par victoire ou par expiration.

---

## 11. Fiabilité opérationnelle

Deux enseignements du produit existant, transposables à n'importe quelle architecture.

### Le mécanisme qui fait vivre le jeu ne doit pas être fragile **[I]**

Le déclencheur périodique qui fait avancer les parties **n'a jamais été versionné** : il a été créé manuellement et n'est donc pas reconstitué sur un nouvel environnement. Sans lui, **plus aucune partie n'avance dès que toutes les applications sont fermées** — et rien ne le signale.

**Exigence** : le mécanisme d'avancement du temps de jeu est un composant critique. Il doit être reproductible, vérifiable, et son absence doit être **détectable et alertée**, pas découverte pendant une soirée.

### L'ordre de déploiement peut geler des parties **[I]**

Plusieurs incidents documentés ont la même forme : une évolution du code écrite avant l'évolution de structure correspondante, et **les parties en cours se figent**.

**Exigence** : toute évolution doit pouvoir être déployée sans interrompre une session en cours. Une soirée de quinze personnes qui se fige au milieu d'une partie est un incident produit sévère et sans recours.

---

## 12. Contraintes d'usage physique

- **Téléphone personnel, en portrait, tenu à une main, debout, dans une lumière basse.** Cible d'appareil unique et indispensable.
- **Attention partagée** : l'information de jeu principale doit être compréhensible **au premier regard**, sans défilement. Un retour haptique doit signaler les événements qui exigent de sortir son téléphone — c'est le seul moyen d'atteindre quelqu'un qui ne regarde pas son écran.
- **Aucune sortie accidentelle** : un geste involontaire ne doit jamais faire quitter la partie.
- **Zone d'affichage sûre** : les commandes doivent rester accessibles quels que soient les encoches et barres système.
- **Accessibilité** : contrastes suffisants, cibles tactiles généreuses, information jamais portée par la seule couleur, alternative aux animations.
- **Fluidité sur milieu de gamme** : le parc réel d'une soirée est hétérogène. Aucun gel perceptible.

---

## 13. Synthèse — les huit contraintes les plus structurantes

Si un lecteur ne devait retenir que huit choses de ce document :

1. **Le rythme doit avancer sans dépendre d'aucun téléphone participant.** Tous les écrans peuvent être éteints ; la partie continue.
2. **Une transition doit s'exécuter exactement une fois**, quels que soient les demandeurs simultanés.
3. **Le secret doit être garanti à la transmission**, pas à l'affichage. C'est la faiblesse connue du produit actuel.
4. **Le moment d'envoi d'une action ne doit conférer aucun avantage** ; la résolution est différée, ordonnée et par couches.
5. **Le retour au premier plan doit resynchroniser intégralement**, y compris la base de temps et les notifications manquées.
6. **Toute attente collective doit avoir une issue** ; aucune fonction critique ne doit dépendre d'une personne sans chemin de reprise.
7. **La terminaison doit être garantie** : par victoire, ou par expiration bornée.
8. **La volumétrie de propagation est un axe de conception**, pas une optimisation ultérieure — la présence croît au carré de l'effectif.
