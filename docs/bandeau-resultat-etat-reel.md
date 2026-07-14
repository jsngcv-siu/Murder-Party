# Bandeau RÉSULTAT — état RÉEL et actuel du jeu

Référence exhaustive du **cadre « Résultat »** affiché après chaque capacité :
pour chaque rôle, la **ligne d'action**, **tous** les messages de résultat produits
par le moteur (`engine/actions.ts`), le mode d'affichage (`PA2Capability.tsx`), et
l'état réel **avant / après** le correctif RLS.

> Généré à partir du code au 2026-07-13. Complète et remplace la lecture rapide de
> `docs/audit-cases-bandeau.md`.

---

## 0. ⚠️ État réel actuel (avant migration RLS)

Le message lisible d'une capacité (« Trio : … », « Même camp », « Dénouement à
l'Annonce », etc.) n'est **jamais** écrit dans le `payload` inséré : il est écrit
ensuite dans la colonne `result` par un **UPDATE**. Or la politique RLS
`role_actions_update_mj` n'autorise cet UPDATE **qu'au MJ**.

**Conséquence pour un joueur non-MJ (donc la quasi-totalité des joueurs) :**

| Ce qui devrait s'afficher            | Ce qui s'affiche réellement aujourd'hui        |
| ------------------------------------ | ---------------------------------------------- |
| Bloc résultat (trio, verdict, dés…)  | **rien** — juste la ligne d'action + `FAIT`    |
| Pastille `⏳ En cours` (différé)      | `✓ Fait` (le message « à l'Annonce » est perdu) |
| Message dans l'**Historique**        | « Capacité utilisée. » (générique)             |

La **ligne d'action** (« Tu as enquêté sur X. ») reste correcte car elle est
déduite du `payload` (rôle + cible), pas du message.

> **Pour le MJ**, tout fonctionne déjà (il peut écrire `result`).

**Correctif** : migration `20260713120000_role_actions_update_actor.sql` — autorise
l'acteur à écrire `result` sur sa propre ligne. Une fois déployée, les colonnes
« Affichage visé » ci-dessous deviennent la réalité pour tout le monde.

```sql
DROP POLICY IF EXISTS "role_actions_update_mj" ON public.role_actions;
CREATE POLICY "role_actions_update_actor_or_mj"
  ON public.role_actions FOR UPDATE TO authenticated
  USING (public.is_game_mj(game_id) OR actor_player_id = public.my_player_id(game_id))
  WITH CHECK (public.is_game_mj(game_id) OR actor_player_id = public.my_player_id(game_id));
```

---

## 1. Comment le cadre décide (logique réelle)

Ordre d'évaluation dans `PA2Capability.tsx` :

1. **Rôle ∈ `NO_LAST_RESULT_ROLES`** → **aucun bandeau** (panneau dédié / passif). → §5
2. Sinon, effet **informatif** (`INFO_RESULT_EFFECTS`, fiole de clairvoyance, ou
   piste `_falsified`) **ET** résultat persisté → **bloc résultat**. → §3
3. Sinon → **ligne d'action + pastille** : `⏳ En cours` si le message parle de
   « l'Annonce » (ou `outcome === "pending"`), sinon `✓ Fait`. → §4

`INFO_RESULT_EFFECTS` = `track, compare, investigate_trio, police, heir_inquiry,
mouchard_reveal, bet_dice, execute, steal, steal_empty, barman_round,
kill_one_of_two_intent`.

Tons (`result.outcome`, sinon déduit) : `success` (vert), `fail` (rouge),
`info` (bleu neutre), `pending` (orange). Mode **verdict** (texte coloré, sans
badge) pour la **Boussole** et le **Chasseur de vampire**.

---

## 2. Gardes globaux (messages d'erreur, hors bandeau)

Affichés en **rouge sous le bouton**, jamais dans le bandeau (aucune ligne
`role_actions` créée) :

- « Rôle inconnu »
- « Tu n'es plus en vie. »
- « Tu es en prison. »
- « Partie terminée. »
- « À utiliser en Enquête. » (mauvaise phase)
- Capacité bloquée / déjà utilisée / épuisée / cooldown (texte dynamique de
  `whyCannotUse`)

---

## 3. Bandeau avec BLOC RÉSULTAT

Format visé : **ligne d'action** (petit) + **bloc résultat** (en avant).
**État actuel non-MJ : bloc masqué → ligne d'action + `FAIT`.**

### Assistant du détective — `investigate_trio` · ton `info`

- **Action** : « Tu as enquêté sur X. »
- **Résultat** : « Trio : NomA · NomB · NomC » (le vrai rôle + 2 leurres)
- **Cible falsifiée** : « Le joueur a été falsifié »
- **Erreur** : « Cible requise »

### Policier — `police` · ton `info`

- **Action** : « Tu as arrêté X. »
- **Résultat** : « 🟠 X : suspect » / « 🟢 X : pas suspect »
- **Cible falsifiée** : « Le joueur a été falsifié »
- **Erreur** : « Cible requise »

### Héritier déchu — `heir_inquiry` · ton `info`

- **Action** : « Tu as enquêté sur X. »
- **Résultat** : « 🟠 X : suspect » / « 🟢 X : pas suspect »
- **Cible falsifiée** : « Le joueur a été falsifié »
- **Erreur** : « Cible requise »

### Mouchard — `mouchard_reveal` · ton `info`

- **Action** : « Tu as espionné X. »
- **Résultat** : « X = 🎭 NomDuRôle » (rôle exact ; l'Usurpateur renvoie sa couverture)
- **Cible falsifiée** : « Le joueur a été falsifié »
- **Erreur** : « Cible requise »

### Boussole — `compare` · **mode verdict** (texte coloré)

- **Action** : « Tu as orienté ta boussole vers X. »
- **Résultat** : « Même camp » (vert) / « Camps opposés » (rouge)
- **Cible falsifiée** : « Le joueur a été falsifié »
- **Erreur** : « Deux cibles requises »

### Chasseur de vampire — `track` · **mode verdict**

- **Action** : « Tu as traqué X. »
- **Résultat** : « 🔴 X EST un vampire — exécution à l'Annonce » (rouge) /
  « 🟢 X n'est pas un vampire » (vert)
- **Erreur** : « Cible requise »
- _Note : si la cible est un vampire, une attaque différée est aussi posée._

### Parieur tricheur — `bet_dice` · ton `pending`

- **Action** : « Tu as placé ton pari. »
- **Résultat gagné** : « 🎲 {a} > {b} — X perd le pari »
- **Résultat perdu** : « 🎲 {a} < {b} — tu perds le pari »
- **Erreurs** : « Cible requise » / « Choisis un autre joueur. »
- ⚠️ **Asymétrie réelle** : en cas de **défaite**, la capacité renvoie `ok: false`,
  donc `result` n'est **jamais** persisté (même pour le MJ) → le bloc de dés ne
  s'affiche **qu'en cas de victoire**. Le duel complet reste envoyé aux deux
  joueurs en **notification**. (À décider : voulu ou à corriger.)

### Exécuteur — `execute` · ton `success`

- **Action** : « Tu as désigné X comme cible. »
- **Résultat** : « X exécuté — 🎭 Rôle » (rôle complet révélé à **tous**) / « Échec »
- **Erreurs** : « Cible requise » / « Cible non emprisonnée » /
  « Attends qu'elle ait passé 1 tour complet en prison. »

### Voleur — `steal` / `steal_empty` · ton `success`

- **Action** : « Tu as volé X. »
- **Résultat** : « {objet} volé à X » / « X n'a rien à voler » (inventaire vide)
- **Erreur** : « Cible requise »

### Barman — `barman_round` · ton `success`

- **Action** : « Tu as servi un verre à X. »
- **Résultat** : « X & Y — l'un ivre & à l'abri, l'autre passe un bon moment »
  (tirage 50/50 ; effet J+1)
- **Erreur** : « Deux cibles requises »

### Croque-mitaine — `kill_one_of_two_intent` · ton `success` (msg « à l'Annonce »)

- **Action** : « Tu as effrayé X. »
- **Résultat** : « X : attaque à l'Annonce — Y épargné » (1 des 2 tiré au sort)
- **Erreur** : « Deux cibles requises »

### Fiole de clairvoyance (objet) — ton `info`

- **Action** : « Tu as utilisé Fiole de clairvoyance sur X. »
- **Résultat** : « X = faction {faction} »

---

## 4. Bandeau avec PASTILLE (action + état)

Format visé ci-dessous. **État actuel non-MJ** : la pastille tombe à `✓ Fait`
pour tous (le message « à l'Annonce » vit dans `result`, non persisté), et le
message d'Historique devient « Capacité utilisée. ».

| Rôle                        | Ligne d'action                     | Pastille visée | Message (Historique) réel                             |
| --------------------------- | ---------------------------------- | -------------- | ----------------------------------------------------- |
| **Tueur**                   | Tu as tenté de tuer X.             | ⏳ En cours    | Dénouement à l'Annonce.                               |
| **Majordome**               | Tu as servi X.                     | ⏳ En cours    | X : protection — à l'Annonce                          |
| **Stratège**                | Tu as marqué X pour ton embuscade. | ⏳ En cours    | 🎯 X marqué — il mourra à l'Annonce du prochain tour. |
| **Apothicaire · offrir**    | Tu as offert une Fiole de … à X.   | ✓ Fait         | Fiole offerte à X.                                    |
| **Apothicaire · utiliser**  | Tu as utilisé une Fiole de … sur X.| ⏳/✓           | X : intention de mort / soin — à l'Annonce · X = faction … |
| **Armurier**                | Tu as armé X.                      | ✓ Fait         | Un couteau a été remis anonymement à X.               |
| **Facteur**                 | Tu as posté un message à X.        | ✓ Fait         | Lettre déposée à X                                    |
| **Babysitter**              | Tu as veillé sur X.                | ✓ Fait         | X gardé au prochain tour                              |
| **Maître chanteur**         | Tu as fait chanter X.              | ✓ Fait         | X sous chantage (J+1)                                 |
| **Accusateur**              | Tu as accusé X.                    | ✓ Fait         | X suspect (1 tour)                                    |

Erreurs / cas spécifiques :

- **Majordome** protection déjà posée ce tour : « X : protection déjà en place — à l'Annonce »
- **Stratège** : « Tu ne peux pas te désigner toi-même. »
- **Apothicaire** : « Tu as déjà agi ce tour-ci. » / « Tu as déjà joué tes fioles. » /
  « Tu as déjà offert une fiole (1 don par partie). » / « Tu as déjà utilisé une fiole
  toi-même (1 par partie). » / « Choisis un autre joueur à qui offrir la fiole. »
- **Armurier** : « Cible morte »
- **Maître chanteur / Accusateur** cible bénie : « X est sous bénédiction — {action} annulé(e). »

---

## 5. Rôles SANS bandeau (`NO_LAST_RESULT_ROLES`)

Panneau dédié, capacité passive, ou setup unique. Le bandeau ne s'affiche pas ;
le message reste (en principe) dans l'Historique — **actuellement générique pour
les non-MJ** (même cause RLS).

| Rôle                           | Ligne d'action                            | Message réel du moteur                                                     |
| ------------------------------ | ----------------------------------------- | -------------------------------------------------------------------------- |
| **Guetteur**                   | Tu as surveillé X.                        | Tu surveilles X pour ce tour. _(err : « Tu dois surveiller un autre joueur. »)_ |
| **Cartomancien / Journaliste** | Tu as tiré les cartes / enquêté sur X.    | 🔮 Tu lis le tableau de X jusqu'au prochain tour                          |
| **Médecin légiste**            | Tu as autopsié X.                         | Capacité passive — voir notifications                                      |
| **Médium**                     | Tu as contacté les morts.                 | Capacité passive — voir notifications                                      |
| **Témoin**                     | Tu as observé X.                          | Capacité passive — voir notifications                                      |
| **Avocat**                     | Tu as défendu X.                          | _(panneau prison dédié)_                                                   |
| **Vengeur**                    | Tu as ciblé X pour ta vengeance.          | Capacité passive — si ton être cher meurt, un couteau apparaît…            |
| **Cuisinier**                  | Tu as préparé ton plat.                   | Capacité passive — utilise ton couteau depuis l'inventaire.               |
| **Ange gardien**               | Tu as protégé X.                          | Bouclier — à l'Annonce                                                     |
| **Saint**                      | Tu as béni X.                             | X béni — protection pendant 2 tours complets. _(err : « Bénédiction déjà utilisée. »)_ |
| **Paranoïaque**                | Tu as scruté X.                           | Tu protèges X à l'Annonce / Tu attaques X à l'Annonce                     |
| **Marionnettiste**             | Tu as manipulé X.                         | Au prochain tour, tu prendras le contrôle de la capacité de X. _(err : « Refusé : cible = Tueur »)_ |
| **Cleaner**                    | Tu as nettoyé les traces de X.            | 🧹 Effaceur armé : … / 🧹 Effaceur désarmé.                               |
| **Usurpateur**                 | Tu as usurpé X.                           | Tu apparais comme 🎭 Rôle / Couverture en place                          |
| **Empoisonneur**               | Tu as empoisonné X.                       | Dénouement à l'Annonce.                                                    |
| **Vampire**                    | Tu as mordu X.                            | Morsure sur X — à l'Annonce _(cas : « Déjà vampire », immunité Chasseur, bénédiction)_ |
| **Veuve noire**                | Tu as séduit X.                           | X & Y sous toile                                                           |
| **Entremetteur**               | Tu as lié X et Y.                         | Couple lié : X ↔ Y                                                         |
| **Oracle**                     | Tu as consulté ton oracle.                | Prophétie : victoire des {faction}.                                       |
| **Imitateur**                  | Tu as imité X.                            | Tu joues désormais {rôle} _(err : « Tu ne peux imiter que le dernier mort (X). »)_ |
| **Juge**                       | Tu as jugé X.                             | Libération de X — au tour {n}                                             |
| **Conservateur**               | Tu as confié une relique à X.             | {icône} {relique} confiée à X. _(cas spécial : « 🫀 … Le Cœur du Manoir … Victoire du Conservateur. »)_ |
| **Falsificateur**              | Tu as falsifié des informations visant X. | Piste falsifiée sur X — les investigateurs ne pourront plus rien apprendre… |

---

## 6. Objets d'inventaire (déclenchés à l'usage de l'objet)

- **Lettre** : « 📨 Lettre envoyée à X. » → `✓ Fait`
- **Fiole de mort** : « X : intention de mort — à l'Annonce. » → `⏳ En cours`
- **Fiole de vie** : « X : soin — à l'Annonce. » → `⏳ En cours`
- **Fiole de clairvoyance** : « X = faction {faction} » → **bloc résultat**
- **Couteau** : « X : coup de couteau — à l'Annonce. » → `⏳ En cours`
- **Le Cœur du Manoir** : « 🫀 … Victoire du Conservateur. » → fin de partie

> Rappel : les objets « à l'Annonce » subissent la même dépendance à `result` —
> pastille dégradée à `✓ Fait` tant que la migration RLS n'est pas déployée.

---

## 7. Le canal NOTIFICATIONS (l'autre moitié du jeu)

Le bandeau (§3–§5) ne montre qu'**une chose** : le résultat de **ta propre
capacité**. Tout le reste de l'information passe par les **notifications** — un
canal séparé qui touche l'**acteur**, la/les **cible(s)**, les **coéquipiers** et
le **MJ** (chaque notif porte un `mjBody` → c'est ce qui alimente le récit MJ).

**4 surfaces d'affichage :**

1. **Modales bloquantes** (cartes centrées, `PlayerEventModal`) — **uniquement**
   5 événements : `death`, `imprisoned`, `released`, `bitten`, `executed`.
2. **Fil d'annonces / notifications** du joueur — tout le reste.
3. **Toasts** discrets.
4. **Récit MJ** — via le `mjBody` de chaque notif.

> Beaucoup de rôles ne parlent **jamais** via le bandeau : ils reçoivent leur info
> au **setup** (début de partie) ou à la **résolution** (Annonce).

### 7.a — Notifications de SETUP (début de partie, écran T1)

| Rôle | Type | Contenu (au joueur) |
| --- | --- | --- |
| **Témoin** | `temoin_reveal` | « Tu reconnais X : {rôle} » (1 Civil au hasard, jamais un Méchant) |
| **Ange Gardien** | `ward` | « Tu veilles sur X. » (cible civile imposée) |
| **Paranoïaque** | `paranoid_target` | « Ta cible : X. Protège-le ou tue-le 1× dans la partie. » |
| **Vengeur** | `vengeur_setup` | « Choisis ton être cher parmi 2 Civils : X · Y » |
| **Entremetteur** | `entremetteur_setup` | « À la 1ère Enquête, lie 2 joueurs. » |
| **Usurpateur** | `cover_pending` | « Choisis ta couverture parmi : {3 rôles} » |
| **Mouchard** | `mouchard_setup` | « Désigne 1 joueur : tu apprendras son rôle exact. » |
| **Oracle** | `oracle_setup` | « Prédis la faction gagnante. » |
| **Veuve noire** | `veuve_setup` | « Choisis 2 cibles à chaque Enquête. » |
| **Stratège** | `stratege_setup` | « Marque une cible ou frappe au couteau. » (+ reçoit un couteau) |
| **Conservateur** | `conservateur_setup` | « Distribue des reliques ; gagne si Le Cœur du Manoir sort. » |
| **Indices** | `indice_setup` | « Tu as reçu un indice. » (dans l'inventaire) |
| **Cuisinier** | _(objet, pas de notif texte)_ | reçoit un couteau en inventaire au setup |

### 7.b — Notifications à l'USAGE d'une capacité

| Rôle | Destinataire | Type · contenu |
| --- | --- | --- |
| **Tueur · Stratège** | Coéquipiers Méchants | `killer_targeted` — « X est la cible de cette nuit. » |
| **Exécuteur** | **TOUS** | `execution_reveal` — rôle COMPLET du condamné révélé |
| **Armurier** | Cible | `anon_gift` — « Un couteau apparaît (donneur inconnu). » |
| **Facteur** | Cible | `letter` — « Une lettre anonyme est apparue. » |
| **Apothicaire** | Cible | `fiole_offerte` — « Une fiole t'est offerte. » |
| **Conservateur** | Cible | `relique_received` — « Tu reçois {relique}. » |
| **Maître chanteur** | Cible | `blackmail` — « Demain, tu ne pourras pas agir. » |
| **Accusateur** | Cible (+ soi) | `accused` / `accuse_ok` — « Tu as été marqué Suspect. » |
| **Falsificateur** | Cible | `falsified` — « Toute enquête sur toi renverra une piste brouillée. » |
| **Babysitter** | Cible | `babysat` — « À l'abri demain, mais capacité bloquée. » |
| **Barman** | Les 2 cibles | `drunk` (l'ivre) / `good_time` (l'autre) |
| **Croque-mitaine** | L'épargné | `boogey_breath` — « Tu as senti son souffle… » |
| **Entremetteur** | Les 2 liés | `linked_partner` — « Ton âme sœur : X. Si l'un meurt, l'autre suit. » |
| **Parieur tricheur** | Les 2 joueurs | `dice_duel` — détail des dés + le perdant |
| **Juge** | Prisonnier | `release_scheduled` — « Tu seras libre au prochain tour. » |
| **Voleur** | Soi + cible | `steal_ok` / `stolen_from` — objet dérobé |
| **Imitateur** | Soi | `imitate` — « Tu deviens {rôle}. » |
| **Mouchard** | Soi | `mouchard_reveal` — rôle exact (aussi dans le bandeau) |
| **Oracle** | Soi | `prophecy_set` — faction verrouillée |
| **Veuve noire** | Soi | `veuve_pair` — cibles sous toile |
| **Cleaner** | Soi | `clean_armed` — effaceur armé |
| **Majordome · Ange · Paranoïaque · Barman** | MJ | `protected` / `shielded` — protection posée |

### 7.c — Notifications de RÉSOLUTION (à l'Annonce)

| Événement | Destinataire | Type |
| --- | --- | --- |
| **Mort** | TOUS (modale pour la victime) | `death` — faction seulement (masquée si Cleaner) |
| **Autopsie** | Médecin légiste | `autopsy` — rôle exact du mort |
| **Lien rompu** | Partenaire Entremetteur | `linked_death` → entraîne sa mort |
| **Vengeance débloquée** | Vengeur | `vengeance` — couteau reçu (être cher mort) |
| **Conversion vampire** | Nouveau vampire / le clan | `converted` / `vampire_clan` |
| **Succession** | Acolyte promu | `succession` — devient le nouveau Tueur |
| **Protections** | Concernés | `saved` / `shielded` / `saint_block` |
| **Manipulation** | Marionnette | `manipulated` |
| **Résultat du vote** | TOUS | `vote_result` |

---

## 8. Résumé décisionnel

- **Migration RLS** : **déployée en prod le 2026-07-13** → §3/§4/§5 sont la réalité
  pour tous les joueurs. _(Avant : bandeau bloqué sur `FAIT` pour les non-MJ, info
  perdue dans le bandeau ET l'Historique.)_
- **Point ouvert** : Parieur perdant (`ok:false`) ne persiste pas son résultat même
  côté MJ → bloc de dés visible seulement en cas de victoire.

_Sources : `src/engine/actions.ts` (messages, effets, `notify`/`notifyMJ`) · `src/components/frames/screens/PA2Capability.tsx` (bandeau, `INFO_RESULT_EFFECTS`, `NO_LAST_RESULT_ROLES`) · `src/components/PlayerEventModal.tsx` (modales d'événement) · `supabase/migrations/20260713120000_role_actions_update_actor.sql` (correctif RLS)._
