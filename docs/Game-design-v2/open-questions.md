# Questions ouvertes

Ce document ne recense **que les incertitudes qui pourraient changer une décision de conception**. Les imprécisions éditoriales, les divergences de vocabulaire et les cas particuliers de rôles en sont volontairement exclus.

Pour chaque question : ce qui semble prévu, ce qui reste ambigu, et **pourquoi la réponse compte**.

---

## Q1 — Le modèle d'autorité doit-il rester en confiance client ?

**Ce qui semble prévu.** Le rythme des phases est arbitré indépendamment des appareils, mais **la résolution des capacités s'exécute sur l'appareil de l'acteur**, et tout participant dispose de droits d'écriture étendus sur les données de sa partie. C'est assumé comme adapté à un jeu entre amis dans une même pièce.

**Ce qui reste ambigu.** Ce choix n'a jamais été confronté à ses conséquences réelles. Trois d'entre elles sont déjà observées : le secret des rôles n'est pas tenu à la transmission ; un défaut de droits d'écriture a rendu **plusieurs capacités totalement inertes pendant longtemps sans que personne ne s'en aperçoive** ; et rien ne permet de reconstituer qui a fait quoi.

**Pourquoi la réponse compte.** C'est **la question la plus structurante de tout le dossier**. Elle détermine où vit le moteur de règles, ce qui transite sur le réseau, et si la protection du secret est une propriété du système ou un simple masquage d'interface. Presque toutes les autres décisions techniques en découlent.

---

## Q2 — Le secret doit-il être garanti à la transmission ?

**Ce qui semble prévu.** L'intention est claire et documentée : chaque participant ne devrait recevoir que ce qu'il a le droit de savoir. L'exigence est classée comme indispensable **et connue non atteinte**.

**Ce qui reste ambigu.** Non pas s'il faut le faire, mais **à quel prix et à quel niveau d'exigence**. Faut-il un filtrage strict de toutes les données, ou un compromis acceptant que certaines informations transitent tant que l'exploitation reste difficile ? Le contexte — une soirée entre amis dans une pièce, où le voisin peut de toute façon regarder l'écran — pourrait justifier un curseur moins absolu qu'en ligne.

**Pourquoi la réponse compte.** Un filtrage strict impose que la distribution des données connaisse les règles de visibilité du jeu, ce qui **contraint fortement l'architecture**. Un compromis relâche cette contrainte mais laisse une faille permanente dans un jeu dont le secret est la mécanique centrale.

---

## Q3 — Une action validée doit-elle être réversible ?

**Ce qui semble prévu.** Deux régimes opposés coexistent sans que la différence soit justifiée : le **vote est modifiable** jusqu'à la clôture, la **capacité est irréversible** dès validation — et son quota est consommé même si l'action échoue ensuite.

**Ce qui reste ambigu.** L'irréversibilité est-elle une décision de conception ou un état de fait jamais remis en cause ? La documentation interne décrit par endroits un modèle plus souple, ce qui suggère qu'elle n'a pas été arbitrée.

**Pourquoi la réponse compte.** Elle change le modèle d'une action (un enregistrement définitif, ou une intention modifiable jusqu'à clôture), le moment de vérification des quotas, et le ressenti du joueur — engager un choix ou pouvoir se raviser. Sur un téléphone, en lumière basse, la probabilité d'un appui accidentel n'est pas nulle.

---

## Q4 — Que devient une action arrivée trop tard ?

**Ce qui semble prévu.** Rien. Aucune règle n'existe.

**Ce qui reste ambigu.** Le comportement observé — l'action se résout **au tour suivant**, avec un tour de retard — ressemble à un effet de bord plus qu'à une décision. Deux réponses possibles ne s'équivalent pas : **refus explicite** (simple et prévisible, mais pénalise un joueur sur mauvais réseau) ou **fenêtre de grâce** (plus juste, mais complique la garantie d'unicité de la résolution).

**Pourquoi la réponse compte.** Sur quinze téléphones dont plusieurs valident dans la dernière seconde, ce cas se produit **à chaque partie**. Le choix détermine la tolérance de latence acceptable, donc les contraintes de propagation.

---

## Q5 — Que devient le personnage d'un participant qui part ?

**Ce qui semble prévu.** Un départ explicite est possible. **Le sort du personnage n'est pas défini.**

**Ce qui reste ambigu.** Reste-t-il en jeu comme une coquille inerte ? Est-il éliminé ? Neutralisé dans les décomptes ? Chaque réponse a des effets très différents : une coquille inerte qui continue de compter comme opposant peut **rendre une victoire arithmétiquement impossible** ; une élimination automatique peut offrir une victoire imméritée.

**Pourquoi la réponse compte.** Ce n'est pas un cas limite : **dans une soirée de deux heures, quelqu'un partira**. Et la réponse interagit directement avec les conditions de victoire et avec les garanties de terminaison.

---

## Q6 — Comment débloquer une attente collective ?

**Ce qui semble prévu.** Le démarrage exige que **tous** les participants aient validé leur fiche. Aucun délai limite, aucun forçage, et l'avancement automatique ne s'applique pas tant que la partie n'a pas officiellement commencé.

**Ce qui reste ambigu.** Faut-il un délai limite, un pouvoir de forçage confié à quelqu'un, ou un repli automatique ? Et le principe doit-il s'étendre à **toute** attente collective, ou seulement à celle-ci ?

**Pourquoi la réponse compte.** C'est le blocage le plus concret et le plus probable du produit : un joueur pose son téléphone, et quinze personnes attendent sans recours. Une conception saine devrait poser comme règle générale que **toute attente collective a une issue**.

---

## Q7 — Comment reprendre une fonction critique confiée à une personne ?

**Ce qui semble prévu.** Deux fonctions dépendent d'une personne unique sans chemin de reprise : le **lancement de la partie** (réservé au créateur) et, en mode avec meneur, la **conduite du rythme**.

**Ce qui reste ambigu.** Le produit connaît le problème pour l'avoir déjà rencontré : le pilotage du rythme, initialement confié à l'appareil du créateur, figeait la partie dès qu'il disparaissait — d'où sa refonte. **La même leçon n'a pas été appliquée aux deux fonctions restantes.** Le paradoxe est net au salon : le transfert manuel du rôle de lanceur n'existe que si le lanceur est présent pour l'effectuer.

**Pourquoi la réponse compte.** Cela conditionne s'il faut modéliser explicitement des **rôles d'organisation transférables**, ou concevoir le produit pour qu'aucune fonction critique ne soit rattachée à une personne.

---

## Q8 — Faut-il rendre les parties reproductibles ?

**Ce qui semble prévu.** Non. Le hasard est utilisé à de nombreux endroits (composition, départage d'égalité, cibles imposées, tirage d'objets) sans aucune maîtrise. **Aucune partie ne peut être rejouée à l'identique.**

**Ce qui reste ambigu.** Est-ce acceptable ? Les conséquences sont réelles : un défaut de résolution ne peut pas être reproduit pour être diagnostiqué, et l'équilibrage ne peut être évalué que par simulation massive, jamais par comparaison de scénarios contrôlés.

**Pourquoi la réponse compte.** La reproductibilité est **beaucoup moins coûteuse si elle est prévue dès le départ** que si elle est ajoutée après. Elle influence la façon dont le hasard est produit et consommé partout dans le moteur. C'est typiquement une décision qu'on regrette de ne pas avoir prise.

---

## Q9 — Comment garantir qu'une partie se termine toujours ?

**Ce qui semble prévu.** Un filet de dernier recours conclut la partie quand il ne reste qu'un participant actif, plus une expiration temporelle qui supprime toute session après quelques heures.

**Ce qui reste ambigu.** Ces filets sont **empiriques, ajoutés après avoir constaté des blocages réels** — dont des parties abandonnées qui continuaient à consommer des ressources en boucle. Un résidu de configurations non résolubles subsiste. Il n'existe **aucune preuve** que l'ensemble des conditions de victoire couvre tous les états atteignables.

**Pourquoi la réponse compte.** Un jeu à conditions de victoire multiples et enchevêtrées produit **mécaniquement** des états non terminaux. Faut-il une garantie par construction, ou continuer à empiler des filets ? La réponse influence la façon dont les conditions de victoire sont modélisées et vérifiées.

---

## Q10 — Quelle est la durée réelle d'une partie ?

**Ce qui semble prévu.** Les durées de phase par défaut suggèrent un tour de l'ordre de deux minutes. L'expiration automatique des sessions suppose qu'une partie tient largement en quelques heures.

**Ce qui reste ambigu.** **Aucune donnée d'usage réel n'existe** : ni durée moyenne d'une partie, ni nombre de tours typique, ni durée effectivement retenue par les groupes pour la phase de débat. La valeur par défaut de cette phase paraît manifestement trop courte pour un vrai débat entre quinze personnes, ce qui laisse penser que les usages réels s'en écartent nettement.

**Pourquoi la réponse compte.** Cette inconnue conditionne plusieurs autres décisions : la borne d'expiration, le volume de données par session, la charge de propagation, et surtout **l'expérience d'un participant éliminé tôt** — dont on ne sait pas s'il attend dix minutes ou une heure. Voir Q11.

---

## Q11 — Que fait un participant éliminé tôt pendant le reste de la partie ?

**Ce qui semble prévu.** Un canal de discussion réservé aux éliminés, et le testament devient visible.

**Ce qui reste ambigu.** Est-ce suffisant ? La mise à l'écart par le vote a été spécifiquement conçue pour **ne pas exclure les gens de la soirée** — c'est une décision de conception forte et réussie. Mais l'élimination, elle, reste totale, et rien n'indique combien de temps un joueur éliminé au deuxième tour devra attendre.

**Pourquoi la réponse compte.** C'est une question de **produit** avant d'être une question technique, mais elle a des implications techniques réelles : un mode spectateur enrichi, un rôle post-mortem, ou une influence résiduelle sur la partie changeraient le modèle de visibilité et le volume de propagation. Dans un jeu conçu pour une soirée en présentiel, un participant qui décroche pendant une heure est un problème d'expérience de premier ordre.

---

## Q12 — Les données du jeu doivent-elles rester une déclaration unique ?

**Ce qui semble prévu.** Un rôle est aujourd'hui décrit à **trois endroits distincts** : ses données, son texte affiché au joueur, et des exceptions codées au cas par cas dans le moteur.

**Ce qui reste ambigu.** Cette dispersion produit des défauts réels et déjà observés : des textes joueur plus restrictifs que la règle appliquée, des limites d'usage qui ne survivent que grâce à une exception explicite — **et qui deviendraient silencieusement illimitées pour tout rôle futur formulé de la même façon**.

**Pourquoi la réponse compte.** Avec une soixantaine de rôles volatils, la **capacité à ajouter ou modifier un rôle sans toucher au moteur** est probablement le facteur qui déterminera la vitesse d'évolution du produit. C'est autant une question d'organisation du développement que d'architecture.

---

## Synthèse : les cinq à trancher en premier

Si une seule série de décisions devait précéder toute recommandation technique :

1. **Q1 — Le modèle d'autorité.** Tout en découle.
2. **Q2 — Le niveau d'exigence sur le secret.** Contraint fortement la distribution des données.
3. **Q5 + Q6 + Q7 — Les règles de continuité manquantes.** Elles touchent aux conditions de victoire et à la terminaison, pas seulement au confort.
4. **Q8 — La reproductibilité.** Beaucoup moins chère si décidée maintenant.
5. **Q10 + Q11 — La durée réelle et l'expérience post-élimination.** Ce sont des inconnues d'**usage**, pas de conception — et aucune mesure ne pourra les remplacer. Elles se lèvent en observant une vraie soirée.
