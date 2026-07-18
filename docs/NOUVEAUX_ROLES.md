# Nouveaux rôles — shortlist retenue

> **Statut : DESIGN — rien d'implémenté.** Liste validée en discussion le 2026-07-18,
> tri final à faire avant implémentation. Pipeline d'implémentation : `docs/ROLES_FRAMEWORK.md`
> (DB → handler → resolver → setup → UI → tirage) puis écran animé (skill murder-party-analyst,
> Playbook E). Les ancrages techniques cités ci-dessous ont été vérifiés contre le code au 2026-07-18.
>
> **Process (acté 2026-07-18)** : les nouvelles fournées de rôles se proposent **dans le
> chat**, jamais directement ici. Seuls les rôles **validés** par Jason entrent dans ce
> fichier ; les **rejetés** sont tracés en bas (pour ne jamais re-proposer la même idée).

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

## 7. Table des ÉVÉNEMENTS → déplacée

> **Idées uniquement, à ne PAS implémenter** (décision Jason 2026-07-18). Tout le
> contenu vit désormais dans **`docs/IDEES_EVENEMENTS.md`**. Seule trace utile ici :
> le Vigilante masqué y est un **statut d'événement**, pas un rôle (cf. Rejetés).

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

**Le Poltergeist — Neutre/CHAOS** *(VALIDÉ au tri 2026-07-18 — seul rôle post-mortem
retenu)* : après sa mort, **1 déplacement d'objet par Enquête** — il prend un objet de
l'inventaire d'un vivant et le glisse dans celui d'un autre. Ni la source ni le receveur
ne savent d'où ça vient. **Victoire** : quelqu'un meurt d'un objet qu'il a déplacé (le
couteau qui change de poche depuis l'au-delà finit par frapper).

- **Exigence UI (demande Jason)** : son écran de capacité doit montrer **en live les
  inventaires de chaque joueur vivant**, avec un flux en 2 temps : choisir la cible à
  qui prendre l'objet, puis choisir la cible qui le reçoit. C'est le principal coût du
  rôle (les inventaires sont en base, le Realtime existe — c'est un écran à construire,
  pas une mécanique moteur).

**⚠️ Point moteur bloquant à cadrer d'abord** : le resolver applique la symétrie
« acteur mort ce tour → effet annulé » (et les préconditions re-checkent `is_alive`).
Les capacités post-mortem devront être une **exception explicite et propre** dans
`resolver.ts` / `actions.ts` — c'est LE chantier technique de cet axe, à faire une fois
pour tous les rôles post-mortem.

---

## 9. Deuxième fournée — validés au tri du 2026-07-18

1. **Le Physionomiste — Méchant/INVESTIGATION** *(nom provisoire, à rebaptiser)* :
   1×/Enquête, dévisage un joueur et apprend son **TYPE** (PROTECTEUR, INVESTIGATION,
   SUPPORT, TUEUR…) sans le rôle exact. Il chasse le Majordome et les enquêteurs pour
   guider les kills. **Grille de déduction (vérifiée contre la compo actuelle)** :
   PROTECTEUR et SUPPORT ⇒ Civil sûr · TROMPERIE et CONTRÔLE ⇒ Méchant sûr ·
   MAL/CHAOS/BÉNIN ⇒ Neutre sûr · seuls **TUEUR** (3 factions) et **INVESTIGATION**
   (Civil/Méchant) restent ambigus — le verdict type ≈ un verdict de faction 7 fois
   sur 9, c'est sa vraie puissance. Comble Méchant/INVESTIGATION (3ᵉ rôle avec
   l'Archiviste). Info pure, pas de kill.
2. **Le Ventriloque — Méchant/TROMPERIE** : sa capacité **génère un objet « lettre
   déjà envoyée »** signé du nom d'un autre joueur vivant, livré à la cible de son
   choix. Fausse accusation, faux aveu, faux indice… la table découvre que les lettres
   peuvent mentir — le joueur imité doit nier, c'est le jeu social recherché.
   **⚠️ Changement systémique requis (décision Jason)** : la lettre du Facteur n'est
   **plus anonyme** — toute lettre normale arrive **signée du nom de son expéditeur**.
   C'est ce qui donne son mordant à la contrefaçon du Ventriloque (une lettre signée
   est crue par défaut). À implémenter en même temps que le rôle.

---

## 10. Troisième fournée — validés au tri du 2026-07-18

1. **Le Jardinier — Civil/SUPPORT** : à chaque Enquête, **ratisse les parterres** :
   récupère au hasard **1 objet de l'inventaire d'un mort** (s'il en reste). Les objets
   des morts — aujourd'hui pillables uniquement par le Voleur — reviennent en
   circulation côté ville. Implém : patron du Voleur (ciblage morts, pick aléatoire).
   Léger.
2. **L'Aubergiste — Neutre/BÉNIN** : **1 Enquête sur 2**, offre une chambre à 1 joueur :
   s'il est attaqué ce tour, l'attaque échoue — et l'Aubergiste apprend seulement
   **qu'on a frappé à la porte** (jamais qui). **Victoire** : vivant à la fin, peu
   importe le camp. *(Nerf « 1 tour sur 2 » acté par Jason : à cadence pleine, la
   densité de protection devient trop forte aux grandes tables — Majordome MUST +
   protecteurs tirables + lui.)* **Vigilance équilibrage** : surveiller la protection
   totale en jeu à 16-20 j. ; levier supplémentaire si besoin = poids de tirage bas
   (comme Apothicaire 0.4). Implém : couche PROTECT existante + cadence alternée. Léger.

---

## 11. Quatrième fournée — Méchant/TUEUR, validés au tri du 2026-07-18

> Gabarit de la classe (compris au tri) : le Méchant/TUEUR occupe le **slot tueur
> garanti** et porte la létalité de la faction → **1 kill fiable par Enquête + UN seul
> twist lisible**. Flags `HOSTILE, KILLER`, éligibles à la succession d'Acolyte,
> tirage pondéré du slot TUEUR (aux côtés de Tueur poids 10, Croque-mitaine, Stratège,
> Armurier).

1. **Le Franc-tireur** *(nom acté)* : 1×/Enquête, tue 1 cible. **1×/partie**, bouton
   « balle perforante » : ce kill-là **ignore TOUTES les protections — bénédiction du
   Saint comprise** (acté par Jason : tout perce). La protection n'est plus jamais une
   certitude absolue.
2. **Le Détrousseur** : 1×/Enquête, tue 1 cible **et empoche son dernier objet**.
   **1×/partie**, bouton « braquage » (même patron que le Franc-tireur) : sur ce
   kill-là, il rafle **TOUT l'inventaire** de la victime en prime de la tuer.
   Tension directe avec Jardinier / Voleur / Monocle du douanier (son inventaire
   volé le trahit s'il est fouillé).
3. **Le Vautour** : 1×/Enquête, tue 1 cible — mais **uniquement parmi les joueurs
   ayant reçu au moins une voix au dernier Vote**. **Tour 1 (aucun vote encore) : il
   reçoit un couteau** dans son inventaire à la place — kill libre via l'objet.
   **Exigence UI (demande Jason)** : son onglet capacité doit filtrer dynamiquement
   les cibles proposées = les votés du dernier Vote uniquement. Quand une victime
   avait des voix, la table croit avoir lynché un coupable — le vote devient une
   arme sans toucher à sa structure.

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
- **La Dame blanche** (Civil post-mortem, désigne via Médium) — rejetée au tri.
- **Le Rancunier** (Civil, suspect publié à sa mort) — rejeté au tri.
- **La Banshee** (CHAOS post-mortem, malédiction « suspect ») — rejetée au tri.
- **Le Veilleur** (Civil post-mortem, Guetteur des morts) — rejeté au tri.
- **Le Confident** (BÉNIN, protégé secret sans pouvoir) — rejeté au tri.
  → Enseignement du tri : les rôles **passifs à miettes d'info** et les wincons
  purement sociaux ne prennent pas ; ce qui plaît = rôles **actifs et systémiques**
  (objets, chats, prison, moments spectaculaires). Seul post-mortem retenu : le
  Poltergeist (interactif).
- **Non retenus au tri de la 3ᵉ fournée (2026-07-18)** : la Voyante de pacotille
  (prédictions publiques Gazette), le Serrurier (verrous d'inventaire), la
  Standardiste (chats privés éphémères), le Notaire (authentification
  anti-Falsificateur), le Faussaire (contrefaçons d'objets), l'Embaumeur (maquille
  le rôle des morts), l'Illusionniste (échange de capacités 1 tour).
- **Non retenus au tri de la 4ᵉ fournée (2026-07-18)** : le Rôdeur (insaisissable les
  tours où il tue), le Caméléon (couverture = rôle de sa dernière victime), la
  Toxicologue (poison à retardement d'un tour). Rappel du gabarit : les 3 proposés
  d'avant (Dynamiteur/Procureur/Vipère) étaient hors-gabarit — un Méchant/TUEUR doit
  tuer de façon fiable chaque Enquête (moteur de létalité du slot garanti).
- **Annonces d'attribution (idée transverse, abandonnée 2026-07-18)** : révéler au
  sauvé qui l'a protégé / révéler la cause de la mort en Gazette — zappé par Jason
  (complexité d'infos sur l'app). Ne pas re-proposer.
