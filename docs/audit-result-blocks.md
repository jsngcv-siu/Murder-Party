# Audit — textes des « result block » par rôle

Source : `src/engine/actions.ts` (`executeCapability`) et `src/engine/items.ts`.
Ce sont les phrases exactes affichées dans le bandeau **RÉSULTAT** et dans l'**Historique**.

Légende : ✅ message de succès (affiché en résultat) · ⚠️ garde/erreur · 🕵️ enquête (info) ·
⏳ différé à l'Annonce.

---

## Gardes globaux (avant tout rôle)
Ces messages peuvent sortir pour **n'importe quelle** capacité :
- ⚠️ « Rôle inconnu »
- ⚠️ « Tu n'es plus en vie. »
- ⚠️ « Tu es en prison. »
- ⚠️ « Partie terminée. »
- ⚠️ « À utiliser en Enquête. »
- ⚠️ (capacité épuisée / mauvaise phase / cooldown — via `whyCannotUse`)
- 🕵️ Cible falsifiée (tous les enquêteurs) : **« Le joueur a été falsifié »**

---

## A. Enquêteurs (le résultat EST une information)

**Policier** 🕵️
- ✅ « 🟠 {cible} : soupçons » / « 🟢 {cible} : rien à signaler »

**Héritier déchu** 🕵️
- ✅ « 🟠 {cible} : soupçons » / « 🟢 {cible} : rien à signaler »

**Détective / Assistant du détective** 🕵️
- ✅ « Trio : {NomA} · {NomB} · {NomC} »

**Boussole** 🕵️
- ✅ « Même camp » / « Camps opposés »
- ⚠️ « Deux cibles requises »

**Mouchard** 🕵️
- ✅ « {cible} = {icône} {NomDuRôle} »

**Chasseur de vampire** 🗡️⏳ *(reclassé TUEUR — tue si vampire, blanchit sinon)*
- ✅ « 🔴 {cible} EST un vampire — exécution à l'Annonce »
- ✅ « 🟢 {cible} n'est pas un vampire »

**Cartomancien / Journaliste** 🕵️
- ✅ « 🔮 Tu lis le tableau de {cible} jusqu'au prochain tour »

**Voisin** 🕵️
- ✅ « Tu surveilles {cible} »

**Guetteur** 🕵️
- ✅ « Tu surveilles {cible} pour ce tour. »
- ⚠️ « Tu dois surveiller un autre joueur. »

**Médecin légiste / Médium / Témoin** 🕵️
- ✅ « Capacité passive — voir notifications » *(info livrée ailleurs, pas au clic)*

---

## B. Effets différés à l'Annonce (⏳ — le joueur attend)

**Tueur**
- ✅ « Dénouement à l'Annonce. »

**Empoisonneur**
- ✅ « Dénouement à l'Annonce. »

**Vampire**
- ✅ « Morsure sur {cible} — à l'Annonce »
- ⚠️ « Déjà vampire »
- ⚠️ « Le Chasseur de Vampire est immunisé — ta morsure est perdue. »
- ⚠️ « {cible} est sous bénédiction — morsure annulée. »

**Croque-mitaine**
- ✅ « {cible} : attaque à l'Annonce — {autre} épargné »

**Stratège**
- ✅ « 🎯 {cible} marqué — il mourra à l'Annonce du prochain tour. »

**Parieur tricheur**
- ✅ « 🎲 {a} < {b} — tu perds le pari »
- ✅ « 🎲 {a} > {b} — {cible} perd le pari »

**Majordome**
- ✅ « {cible} : protection — à l'Annonce »
- ✅ « {cible} : protection déjà en place — à l'Annonce »

**Ange gardien**
- ✅ « Bouclier — à l'Annonce »

**Babysitter**
- ✅ « {cible} gardé au prochain tour »

**Barman**
- ✅ « {c1} & {c2} — l'un ivre & à l'abri, l'autre passe un bon moment »

**Paranoïaque**
- ✅ « Tu protèges {cible} à l'Annonce »
- ✅ « Tu attaques {cible} à l'Annonce »
- ⚠️ « Choisis : protéger ou tuer »
- ⚠️ « Ta cible est déjà morte »

**Saint**
- ✅ « {cible} béni — protection pendant 2 tours complets. »

---

## C. Programmations & statuts (effet posé, pas d'info)

**Marionnettiste** — ✅ « Au prochain tour, tu prendras le contrôle de la capacité de {cible}. »
- ⚠️ « Refusé : cible = Tueur »
**Maître chanteur** — ✅ « {cible} sous chantage (J+1) »
**Accusateur** — ✅ « {cible} suspect (1 tour) »
**Veuve noire** — ✅ « {c1} & {c2} sous toile »
**Falsificateur** — ✅ « Piste falsifiée sur {cible} — les investigateurs ne pourront plus rien apprendre sur cette cible. »
- ⚠️ « Piste déjà falsifiée sur {cible}. » · « Tu ne peux pas te falsifier toi-même. »
**Entremetteur** — ✅ « Couple lié : {c1} ↔ {c2} »
**Juge** — ✅ « Libération de {cible} — au tour {n} »
- ⚠️ « Le prisonnier n'a pas encore purgé un tour complet. »
**Exécuteur** — ✅ « {cible} exécuté — {icône} {rôle} » / « Échec »
- ⚠️ « Attends qu'elle ait passé 1 tour complet en prison. »
**Cleaner** — ✅ « 🧹 Effaceur armé : le prochain meurtre du Tueur sera nettoyé (pas d'annonce publique, pas d'autopsie). » / « 🧹 Effaceur désarmé. »
**Oracle** — ✅ « Prophétie : victoire des {faction}. »
**Imitateur** — ✅ « Tu joues désormais {rôle} »
- ⚠️ « Tu ne peux imiter que le dernier mort ({cible}). »
**Usurpateur** — ✅ « Tu apparais comme {icône} {rôle} » / « Couverture en place »

---

## D. Don d'objet / relique / vol (le résultat vit dans l'inventaire)

**Armurier** — ✅ « Un couteau a été remis anonymement à {cible}. »
**Facteur** — ✅ « Lettre déposée à {cible} »
**Apothicaire** — ✅ « Fiole offerte à {cible}. »
- ⚠️ « Offre la fiole à un autre joueur (pour l'utiliser toi-même, passe par ton Carnet). » · « Toutes tes fioles ont déjà été utilisées. »
**Conservateur** — ✅ « {icône} {relique} confiée à {cible}. »
- ✅ (fin spéciale) « 🫀 Tu as offert Le Cœur du Manoir à {cible} — Victoire du Conservateur. »
**Voleur** — ✅ « {objet} volé à {cible} » / « {cible} n'a rien à voler »

---

## E. Passifs (pas d'action active)

**Cuisinier** — ✅ « Capacité passive — utilise ton couteau depuis l'inventaire. »
**Vengeur** — ✅ « Capacité passive — si ton être cher meurt, un couteau apparaît dans ton inventaire. » / « Vengeance débloquée — utilise ton couteau depuis l'inventaire. »
**(défaut)** — ✅ « Capacité utilisée »

---

## F. Messages d'OBJET (items.ts) — sortent quand on utilise l'objet, pas le rôle

- **Lettre** : « 📨 Lettre envoyée à {cible}. »
- **Fiole de mort** : « {cible} : intention de mort — à l'Annonce. »
- **Fiole de vie** : « {cible} : soin — à l'Annonce. »
- **Fiole de clairvoyance** : « {cible} = faction {faction} » / « {cible} : faction inconnue »
- **Couteau** : « {cible} : coup de couteau — à l'Annonce. »
- **Relique / Cœur du Manoir** : « 🫀 Le Cœur du Manoir bat dans tes mains — toutes les factions s'inclinent. Victoire du Conservateur. »

---

## Historique des corrections

1. ✅ **Décalage bandeau RÉSULTAT — corrigé.** Le libellé vient maintenant du payload de
   l'action réelle (capacité vs objet), plus du slug du rôle → l'Apothicaire affiche
   « offert une fiole » / « utilisé une fiole » selon le cas, et un indice n'apparaît plus
   sous « enquêté sur un joueur ».

2. ✅ **Chasseur de vampire — reclassé TUEUR.** Il n'est plus un « enquêteur qui attend » :
   c'est un tueur conditionnel (tue si vampire, blanchit sinon). Wording aligné.

3. ⏳ **Trois enquêteurs sans résultat immédiat** (Médecin légiste, Médium, Témoin) : par
   design, leur info arrive par les notifications — non modifié.

4. ✅ **Ton uniformisé.** Plus de « programmé / enregistrée / actif / résolu » : tous les
   effets différés suivent le gabarit **« {effet} — à l'Annonce »**.
