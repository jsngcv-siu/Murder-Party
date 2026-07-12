# Bandeau RÉSULTAT (Piste C) — tous les textes par rôle

Doc de référence à jour **après Piste C**. Pour chaque rôle : la **ligne d'action**
(toujours affichée) et, selon le cas :
- **Pastille** ⏳ *En cours* (effet différé) / ✓ *Fait* (confirmation) — le texte résultat
  est **masqué** dans le bandeau, mais reste visible dans l'**Historique**.
- **Bloc résultat** — affiché en avant quand il porte une info neuve (verdict, faction,
  trio, dés, vol, rôle révélé, piste falsifiée).

Certains rôles n'ont **pas de bandeau** du tout (panneau dédié) — section D.

---

## A. Gardes globaux (peuvent sortir pour n'importe quel rôle)

Affichés en rouge (échec) sous le bouton, pas dans le bandeau :
- « Rôle inconnu » · « Tu n'es plus en vie. » · « Tu es en prison. »
- « Partie terminée. » · « À utiliser en Enquête. »
- capacité épuisée / mauvaise phase / cooldown (texte dynamique)

---

## B. Bandeau avec BLOC RÉSULTAT (info affichée)

Format : **ligne d'action** (en petit) puis **bloc résultat** (en avant).

**Policier**
- Action : « Tu as arrêté X. »
- Résultat : « 🟠 X : soupçons » / « 🟢 X : rien à signaler »
- Cible falsifiée : « Le joueur a été falsifié »

**Héritier déchu**
- Action : « Tu as enquêté sur X. »
- Résultat : « 🟠 X : soupçons » / « 🟢 X : rien à signaler »
- Cible falsifiée : « Le joueur a été falsifié »

**Détective / Assistant du détective**
- Action : « Tu as enquêté sur X. »
- Résultat : « Trio : NomA · NomB · NomC »
- Cible falsifiée : « Le joueur a été falsifié »

**Mouchard**
- Action : « Tu as espionné X. »
- Résultat : « X = 🎭 NomDuRôle »
- Cible falsifiée : « Le joueur a été falsifié »

**Boussole** *(mode verdict : texte coloré, pas de badge)*
- Action : « Tu as orienté ta boussole vers X. »
- Résultat : « Même camp » (vert) / « Camps opposés » (rouge)
- Cible falsifiée : « Le joueur a été falsifié »

**Chasseur de vampire** *(mode verdict)*
- Action : « Tu as traqué X. »
- Résultat : « 🔴 X EST un vampire — exécution à l'Annonce » (rouge) / « 🟢 X n'est pas un vampire » (vert)

**Parieur tricheur**
- Action : « Tu as placé ton pari. »
- Résultat : « 🎲 {a} < {b} — tu perds le pari » / « 🎲 {a} > {b} — X perd le pari »

**Exécuteur**
- Action : « Tu as désigné X comme cible. »
- Résultat : « X exécuté — 🎭 Rôle. » / « Échec »

**Voleur**
- Action : « Tu as volé X. »
- Résultat : « {objet} volé à X » / « X n'a rien à voler »

**Barman**
- Action : « Tu as servi un verre à X. »
- Résultat : « X & Y — l'un ivre & à l'abri, l'autre passe un bon moment »

**Croque-mitaine**
- Action : « Tu as effrayé X. »
- Résultat : « X : attaque à l'Annonce — Y épargné »

**Apothicaire — Fiole de clairvoyance** *(objet)*
- Action : « Tu as utilisé Fiole de clairvoyance sur X. »
- Résultat : « X = faction {faction} » / « X : faction inconnue »

---

## C. Bandeau avec PASTILLE (résultat masqué, visible en Historique)

Format : **ligne d'action** en titre + pastille. La colonne « en Historique » = le message
résultat toujours stocké (rejouable dans l'onglet Historique).

| Rôle | Ligne d'action | Pastille | Message (en Historique) |
|---|---|---|---|
| **Tueur** | Tu as tenté de tuer X. | ⏳ En cours | Dénouement à l'Annonce. |
| **Majordome** | Tu as servi X. | ⏳ En cours | X : protection — à l'Annonce |
| **Stratège** | Tu as marqué X pour ton embuscade. | ⏳ En cours | 🎯 X marqué — il mourra à l'Annonce du prochain tour. |
| **Apothicaire — Fiole de mort** | Tu as utilisé Fiole de mort sur X. | ⏳ En cours | X : intention de mort — à l'Annonce. |
| **Apothicaire — Fiole de vie** | Tu as utilisé Fiole de vie sur X. | ⏳ En cours | X : soin — à l'Annonce. |
| **Apothicaire — offrir** | Tu as offert une Fiole de … à X. | ✓ Fait | Fiole offerte à X. |
| **Armurier** | Tu as armé X. | ✓ Fait | Un couteau a été remis anonymement à X. |
| **Facteur** | Tu as posté un message à X. | ✓ Fait | Lettre déposée à X |
| **Babysitter** | Tu as veillé sur X. | ✓ Fait | X gardé au prochain tour |
| **Maître chanteur** | Tu as fait chanter X. | ✓ Fait | X sous chantage (J+1) |
| **Accusateur** | Tu as accusé X. | ✓ Fait | X suspect (1 tour) |

*(Le couteau d'inventaire, s'il est utilisé : action « Tu as utilisé Couteau sur X » +
pastille ⏳ En cours ; message « X : coup de couteau — à l'Annonce. »)*

---

## D. Rôles SANS bandeau (panneau dédié — résultat visible seulement en Historique)

Ces rôles ont leur propre encadré dans l'onglet Rôle ; le bandeau ne s'affiche pas.

| Rôle | Ligne d'action | Message (en Historique) |
|---|---|---|
| **Guetteur** | Tu as surveillé X. | Tu surveilles X pour ce tour. |
| **Voisin** | Tu as rendu visite à X. | Tu surveilles X |
| **Cartomancien / Journaliste** | Tu as tiré les cartes / enquêté sur X. | 🔮 Tu lis le tableau de X jusqu'au prochain tour |
| **Médecin légiste** | Tu as autopsié X. | Capacité passive — voir notifications |
| **Médium** | Tu as contacté les morts. | Capacité passive — voir notifications |
| **Témoin** | Tu as observé X. | Capacité passive — voir notifications |
| **Avocat** | Tu as défendu X. | *(panneau prison)* |
| **Vengeur** | Tu as ciblé X pour ta vengeance. | Capacité passive — couteau depuis l'inventaire |
| **Cuisinier** | Tu as préparé ton plat. | Capacité passive — couteau depuis l'inventaire |
| **Ange gardien** | Tu as protégé X. | Bouclier — à l'Annonce |
| **Saint** | Tu as béni X. | X béni — protection pendant 2 tours complets. |
| **Paranoïaque** | Tu as scruté X. | Tu protèges / attaques X à l'Annonce |
| **Marionnettiste** | Tu as manipulé X. | Au prochain tour, tu prendras le contrôle de la capacité de X. |
| **Cleaner** | Tu as nettoyé les traces de X. | 🧹 Effaceur armé / désarmé |
| **Usurpateur** | Tu as usurpé X. | Tu apparais comme 🎭 Rôle |
| **Empoisonneur** | Tu as empoisonné X. | Dénouement à l'Annonce. |
| **Vampire** | Tu as mordu X. | Morsure sur X — à l'Annonce |
| **Veuve noire** | Tu as séduit X. | X & Y sous toile |
| **Entremetteur** | Tu as lié X et Y. | Couple lié : X ↔ Y |
| **Oracle** | Tu as consulté ton oracle. | Prophétie : victoire des {faction}. |
| **Imitateur** | Tu as imité X. | Tu joues désormais {rôle} |
| **Juge** | Tu as jugé X. | Libération de X — au tour {n} |
| **Conservateur** | Tu as confié une relique à X. | {relique} confiée à X. |
| **Falsificateur** | Tu as falsifié des informations visant X. | Piste falsifiée sur X — les investigateurs ne pourront plus rien apprendre sur cette cible. |

---

## E. Messages d'OBJET (items) — sortent quand on utilise l'objet

- **Lettre** : « 📨 Lettre envoyée à X. »
- **Fiole de mort** : « X : intention de mort — à l'Annonce. » → pastille ⏳ En cours
- **Fiole de vie** : « X : soin — à l'Annonce. » → pastille ⏳ En cours
- **Fiole de clairvoyance** : « X = faction {faction} » → **bloc résultat**
- **Couteau** : « X : coup de couteau — à l'Annonce. » → pastille ⏳ En cours
- **Relique / Cœur du Manoir** : « 🫀 Le Cœur du Manoir bat dans tes mains — toutes les factions s'inclinent. Victoire du Conservateur. »

---

## Récap logique (comment le bandeau choisit)

1. Rôle dans la liste « panneau dédié » (section D) → **pas de bandeau**.
2. Sinon, si l'effet est informatif (`INFO_RESULT_EFFECTS` : track, compare, investigate_trio,
   police, heir_inquiry, mouchard_reveal, bet_dice, execute, steal, barman_round,
   kill_one_of_two_intent), ou fiole de clairvoyance, ou piste falsifiée → **bloc résultat**.
3. Sinon → **ligne d'action + pastille** : ⏳ *En cours* si l'effet parle de « l'Annonce »
   (ou est marqué en attente), sinon ✓ *Fait*.
