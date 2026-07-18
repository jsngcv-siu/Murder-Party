# Nouveaux rôles — shortlist retenue

> **Statut : DESIGN — rien d'implémenté.** Liste validée en discussion le 2026-07-18,
> tri final à faire avant implémentation. Pipeline d'implémentation : `docs/ROLES_FRAMEWORK.md`
> (DB → handler → resolver → setup → UI → tirage) puis écran animé (skill murder-party-analyst,
> Playbook E). Les ancrages techniques cités ci-dessous ont été vérifiés contre le code au 2026-07-18.

Rappel structurel (audit 2026-07-18) : l'équilibrage étant piloté par **proportions**
(`buildDefaultPool` + unions souples), ajouter des rôles n'altère pas l'équilibre des
factions — seule compte la puissance relative *à l'intérieur* d'un type. Les trous à
combler : **Neutre/BÉNIN (1 seul rôle, type le plus tiré — poids 1.0 vs MAL 0.45 / CHAOS 0.2)**
et **Méchant/INVESTIGATION (2 rôles)**.

---

## 1. Le Chat du Manoir — Neutre/BÉNIN

**Fantasme** : être le chat de la maison. Personne ne se méfie du chat.

- **Passif** : survit à la **première** attaque qui le vise (une « vie » consommée).
  Annonce publique anonyme : *« Quelqu'un a entendu un miaulement cette nuit… »*
- **Victoire** : être vivant à la fin, peu importe le camp vainqueur (BÉNIN : ne
  bloque la victoire de personne).
- **Contre-jeu** : la deuxième attaque est fatale ; le miaulement public signale à la
  table qu'une attaque a été absorbée (info exploitable par tous).
- **Équilibrage** : survivant pur, aucun dégât — risque quasi nul. Attention seulement
  à la passivité (le miaulement public lui donne un rôle social malgré lui, c'est voulu).
- **Implém** : bouclier one-shot en `role_meta` (comme l'Ange Gardien), consommé en
  couche PROTECT du resolver + entrée Gazette anonyme.

## 2. Le Photographe mondain — Neutre/BÉNIN

**Fantasme** : le paparazzi macabre qui flaire le drame avant tout le monde.

- **Capacité** : à chaque Enquête, « photographie » 1 joueur (aucun effet sur la cible,
  aucune notification).
- **Victoire** : à la fin de partie, au moins **N** morts figurent sur ses photos
  **prises avant leur mort**. Barème à caler selon la taille (même patron que
  Exécuteur/Juge dans `parseTotalLimit`) — proposition : **2** (≤ 10 j.), **3** (11–15),
  **4** (16–20). À chiffrer en sim avant de figer.
- **Contre-jeu** : aucun directement (il ne fait rien subir) ; son enjeu est de lire les
  menaces mieux que les enquêteurs — de la déduction pure recyclée en wincon neutre.
- **Implém** : liste de photos en `role_meta` + check dans `evaluateWin`. Léger.

## 3. L'Archiviste — Méchant/INVESTIGATION

**Fantasme** : le greffier corrompu qui épluche les dossiers des détenus.

- **Passif** : apprend le **rôle exact** de tout joueur emprisonné (miroir noir de
  l'Avocat, qui ne voit que la faction).
- **Effet de table** : chaque emprisonnement devient une fuite d'info vers les Méchants —
  le vote se retourne contre la ville, très cohérent avec l'identité « prison » du jeu.
- **Contre-jeu** : le Juge (libération), et voter « utile » (les civils apprennent à ne
  pas emprisonner leurs rôles-clés à la légère).
- **Équilibrage** : info pure, pas de kill — comparable au Mouchard en puissance.
  Comble le trou Méchant/INVESTIGATION (2 rôles seulement).
- **Implém** : passif sur transition `is_imprisoned=true` (même patron que le Médecin
  légiste sur les morts). Quasi gratuit.

## 4. Le Geôlier — Civil/SUPPORT (version chat retenue)

**Fantasme** : celui qui a les clés — et qui fait parler les détenus au parloir.

- **Capacité (1×/Enquête)** : choisit un prisonnier et ouvre un **chat privé dédié**
  avec lui (le parloir). Le prisonnier voit un **onglet chat** s'ouvrir chez lui quand
  il est choisi.
- **Design** : aucun pouvoir mécanique dur — tout est social. Le Geôlier pêche des
  infos à la voix, le prisonnier peut mentir, négocier sa libération auprès du Juge,
  ou intoxiquer. Le prisonnier ne sait pas forcément qui est le Geôlier (à trancher :
  chat anonyme « Le Geôlier » vs identité révélée — l'anonymat est plus riche).
- **Cas limite** : aucun prisonnier → capacité inerte ce tour (fréquent en début de
  partie). Assumé : le rôle monte en puissance avec les votes.
- **Implém** : réutilise l'infra existante `chat_messages(channel)` + `ChatPanel`
  (même mécanique que le Conseil des morts) avec un channel dédié par partie
  (ex. `parloir-<gameId>`), accès contrôlé par le choix du tour. **Nouveau** : onglet
  chat conditionnel côté joueur emprisonné. Coût moyen, zéro impact moteur/resolver.

## 5. Le Pyromane — Neutre/MAL

**Fantasme** : l'incendiaire patient. La table sent que quelque chose se prépare.

- **Capacité** : à chaque Enquête, **asperge** discrètement 1 joueur d'essence (aucun
  effet visible, aucune notification). **1×/partie : craque l'allumette** — tous les
  aspergés encore vivants meurent à l'Annonce (couche ATTACK : les protections
  PROTECT/bénédiction sauvent normalement).
- **Victoire — barème par taille de table** (le « ≥ 3 morts » fixe ne marche pas :
  quasi impossible à 8 joueurs, trop simple à 20). Même patron que Exécuteur/Juge :
  - ≤ 10 joueurs : **2** morts par le feu
  - 11–15 : **3**
  - 16–20 : **4**
- **Garde-fous à trancher au design détaillé** : plafond d'aspergés simultanés
  (ex. N+1) pour éviter le « j'asperge tout le monde puis j'attends » ; l'aspersion
  tient-elle toute la partie ou s'évapore au bout de X tours ?
- **Contre-jeu** : protecteurs, prison (un aspergé en prison brûle-t-il ? proposition :
  non — la cellule est en pierre, ça crée du jeu autour du vote), et le fait qu'un
  Pyromane trop actif se fait remarquer (il ne tue jamais avant son allumette).
- **⚠️ Équilibrage** : le plus risqué de la liste (kill multiple différé). À passer
  en `sim/balance.mjs` **avant** implémentation.
- **Implém** : marqueur `role_meta` sur les cibles + allumette one-shot résolue en
  couche ATTACK. Moyen.

## 6. Le Contrebandier — Civil/SUPPORT

**Fantasme** : l'homme qui a « des connexions ». On ne sait jamais ce qu'il va sortir
de sa malle.

- **Capacité (focus unique retenu)** : reçoit automatiquement **1 objet aléatoire de
  SA malle tous les 2 tours**.
- **La Malle du Contrebandier (décision 2026-07-18)** : pool de **5 objets exclusifs**
  que lui seul peut recevoir — pas de piochage dans `ITEM_CATALOG` (évite le
  débordement : reliques du Conservateur, indice du Stratège, spam de couteaux).
  Chaque objet réutilise une mécanique moteur existante :
  1. 🗝️ **Le Passe-partout** *(rare)* — utilisable uniquement en prison : tu t'évades
     immédiatement. (Patron : libération du Juge.)
  2. 🧥 **Le Gilet matelassé** — bouclier personnel : annule la prochaine attaque sur
     toi, puis est consommé. (Patron : bouclier de l'Ange Gardien.)
  3. 🥃 **Le Rhum de contrebande** — cible 1 joueur : ivre au prochain tour, capacité
     désactivée. Don anonyme. (Patron : ivresse du Barman / blocage Maître chanteur.)
  4. 🧐 **Le Monocle du douanier** — cible 1 joueur : tu vois son inventaire complet.
     (Nouvelle micro-mécanique de lecture d'inventaire — très peu coûteuse.)
  5. 🎒 **Le Double-fond** — passif tant qu'il est dans ton inventaire : le premier
     vol du Voleur qui te cible échoue et consomme le Double-fond à la place.
  Pondération suggérée : Rhum/Monocle communs, Gilet moyen, Passe-partout/Double-fond
  rares. Le Voleur peut voler ces objets (c'est voulu : duel Voleur↔Contrebandier).
- **Équilibrage** : valeur lissée dans le temps, aucun objet létal — tout s'ajuste
  par les poids de la malle, pas par le rôle.
- **Implém** : distribution automatique au changement de tour (patron passif) +
  5 entrées d'items dédiées. Léger.
- **✅ Garde-fou Cœur du Manoir (FAIT, 2026-07-18)** : même si la malle est exclusive,
  la mine a été désamorcée dans `items.ts` — utiliser une relique `coeur_du_manoir`
  ne déclenche plus « Victoire du Conservateur » si aucun Conservateur n'est dans la
  partie (l'objet devient inerte). Toute source future de reliques est safe.

---

## 7. Nouveau système : la table des ÉVÉNEMENTS

> Remplace l'idée « Vigilante masqué rôle émergent » : faire émerger un *rôle* écraserait
> le rôle d'un joueur (frustrant de finir avec juste un couteau). À la place, les
> événements attribuent des **statuts** et des effets ponctuels, sans jamais toucher
> au squelette des phases (contrainte ferme : on ne modifie pas la structure temporelle).

**Principe** : à certaines Annonces, le manoir « vit » — un événement tiré d'une table
s'applique et est annoncé dans la Gazette. Déclenchement : probabilité faible par tour
et/ou déclencheurs conditionnels (les colonnes `trigger_emergence` / `compensateur_de`
du schéma `roles` sont inutilisées — le concept peut migrer vers la table d'événements).

**Idées d'événements (à trier)** :

1. **Le Vigilante masqué** *(version retenue de l'idée d'origine)* — un Civil vivant
   aléatoire reçoit le **statut « Vigilante »** + un couteau. Il garde son rôle et sa
   capacité. Déclencheur compensateur possible : 3 civils morts sans qu'aucun Méchant
   n'ait été emprisonné.
2. **L'Évasion** — un prisonnier aléatoire s'évade (sort de prison sans Juge). La
   Gazette l'annonce ; la table débat de qui a scié les barreaux.
3. **La Livraison mystère** — un joueur vivant aléatoire reçoit un objet du catalogue.
   Personne ne sait qui.
4. **La Rumeur** — un joueur aléatoire apparaît « suspect » à toute la table pendant
   un tour (réutilise la mécanique Accusateur). Du bruit dans les enquêtes.
5. **La Panne de courant** — à la prochaine Annonce, les morts sont annoncées **sans
   identité de rôle** (réutilise la mécanique de masquage du Cleaner, version globale).
6. **Le Testament** — le dernier mort laisse un mot : la Gazette publie son **trio de
   rôles** (vrai rôle + 2 leurres, comme l'Assistant) au lieu de rien.
7. **La Pleine lune** — un joueur aléatoire dont la capacité 1×/partie est déjà
   consommée la récupère. (Épicé — à tester.)

**Implém** : nouveau système (table `game_events` ou tirage dans le moteur au moment de
l'Annonce + entrée Gazette). Ne touche ni au phase-ticker ni aux phases — un événement
est du **contenu d'Annonce**, pas une phase. Coût moyen, mais mutualisé pour tous les
événements futurs. Statuts type « Vigilante » : `role_meta` + badge UI, patron existant.

---

## 8. Axe « jouer après la mort » (ex-SPECTRE, version simplifiée)

> Décision : **pas de nouveau type, pas de double type** (complexité inutile). Ce sont
> des rôles ordinaires des types existants, dont le pouvoir s'active **à ou après la mort**.
> Le vrai gain : un joueur mort tôt garde un moment de jeu — le point faible de tout
> le genre en présentiel. Côté UI c'est déjà prêt : **l'espace capacité reste affiché
> pour les morts**, il n'y a qu'à le remplir.

**Règle d'équilibrage post-mortem (validée 2026-07-18)** :
- **Civil** → des *miettes* seulement, et qui passent par le goulot du **Conseil des
  morts / Médium** (info faillible, jamais un canal direct vers les vivants).
- **Neutre CHAOS** → permis de tout casser : c'est son métier, et son pouvoir ne
  sert aucune faction.
- **Méchant** → **pas de post-mortem** tant que la faction est au-dessus de la cible
  (48,5 % mesuré vs 45 % visé) : un outil d'outre-tombe serait un buff déguisé.

1. **La Dame blanche — Civil/SUPPORT** : de son vivant, rien. À sa mort, elle hante :
   **1×**, depuis le Conseil des morts, elle désigne un vivant — le **Médium** (et lui
   seul) reçoit *« la Dame blanche désigne X »*. Canal d'outre-tombe faillible : encore
   faut-il que le Médium soit vivant, comprenne, et soit cru.
2. **Le Poltergeist — Neutre/CHAOS** (musclé, autorisé par la règle CHAOS) : après sa
   mort, **1 déplacement d'objet par Enquête** — il prend un objet de l'inventaire d'un
   vivant et le glisse dans celui d'un autre. Ni la source ni le receveur ne savent d'où
   ça vient. **Victoire** : quelqu'un meurt d'un objet qu'il a déplacé (le couteau qui
   change de poche depuis l'au-delà finit par frapper).
3. **Le Rancunier — Civil/SUPPORT** : à sa mort, la Gazette publie automatiquement son
   **principal suspect** (le joueur le plus marqué de son tableau de suspicions).
   Passif, zéro action requise — le mort « parle » une dernière fois.
4. **La Banshee — Neutre/CHAOS** : de son vivant, rien. À sa mort, elle **maudit** un
   vivant de son choix : il ressort **« suspect »** à toutes les enquêtes tant qu'il vit
   (réutilise la mécanique Accusateur, en permanent). **Victoire** : le maudit meurt ou
   est emprisonné avant la fin. Le hurlement qui poursuit un innocent — ou un coupable.
5. **Le Veilleur — Civil/INVESTIGATION** : à sa mort, continue de veiller : **1×/Enquête**
   depuis l'au-delà, observe un vivant et voit qui le cible ce tour (Guetteur des morts) —
   mais ne peut le raconter **que dans le Conseil des morts** → seul le Médium peut
   récupérer l'info. Respecte la règle « miettes via goulot Médium ».

**⚠️ Point moteur bloquant à cadrer d'abord** : le resolver applique la symétrie
« acteur mort ce tour → effet annulé » (et les préconditions re-checkent `is_alive`).
Les capacités post-mortem devront être une **exception explicite et propre** dans
`resolver.ts` / `actions.ts` — c'est LE chantier technique de cet axe, à faire une fois
pour tous les rôles post-mortem.

---

## 9. Deuxième fournée (proposés 2026-07-18 — pas encore triés)

> Proposés dans le cadre acté : combler BÉNIN et Méchant/INVESTIGATION, pas d'archétype
> pompé, pas de structure temporelle, wincons scalables si létal.

1. **Le Confident — Neutre/BÉNIN** : au setup, le manoir lui assigne secrètement un
   **protégé** aléatoire. Aucun pouvoir mécanique. **Victoire** : le protégé est vivant
   à la fin — même si le Confident, lui, est mort. Un garde du corps purement social :
   orienter les soupçons, dépenser sa crédibilité pour un autre, sans jamais révéler le
   lien (le protégé ne sait rien). Comble BÉNIN, zéro risque d'équilibrage.
2. **Le Physionomiste — Méchant/INVESTIGATION** : 1×/Enquête, dévisage un joueur et
   apprend son **TYPE** (PROTECTEUR, INVESTIGATION, SUPPORT, TUEUR…) sans le rôle exact.
   Granularité entre la Boussole et le Mouchard : il chasse le Majordome et les
   enquêteurs pour guider les kills. Info pure, pas de kill — puissance comparable au
   Cartomancien. Comble Méchant/INVESTIGATION (3ᵉ rôle avec l'Archiviste).
3. **Le Ventriloque — Méchant/TROMPERIE** : 1×/partie, fait parvenir une **lettre
   signée du nom d'un autre joueur vivant** (réutilise l'objet lettre du Facteur —
   implém quasi gratuite). Fausse accusation, faux aveu, faux indice… la table découvre
   que les lettres peuvent mentir. ⚠️ À cadrer au design : le joueur imité doit pouvoir
   nier — c'est précisément le jeu social recherché.

---

## Rejetés (trace des décisions, 2026-07-18)

- **Le Bouffon du Manoir** (gagne s'il est emprisonné) — rejeté : archétype pompé des
  autres jeux à rôles cachés, pas l'identité voulue.
- **Le Sonneur de tocsin** (saute/prolonge le Débat) — rejeté : on ne touche **jamais**
  à la structure temporelle des phases (code sensible : phase-ticker/arbitre serveur).
  Contrainte durable pour tout futur rôle.
- **Le Limier** (détecteur d'activité méchant) — non retenu au tri.
- **Le Vigilante masqué en rôle émergent** — transformé en **événement + statut** (§7) :
  un rôle émergent qui remplace le rôle du joueur serait frustrant.
