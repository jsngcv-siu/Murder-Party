# Audit complet — Murder Party (branche `feature/da-the-board`)

> Audit réalisé le **2026-06-17** sur l'état du dépôt à l'instant de la session.
> **Aucune modification de code n'a été apportée** — ce document est en lecture seule.
> Périmètre : moteur de jeu (`src/engine`), écrans (`src/components/frames/screens`),
> shell joueur (`PlayerShell.tsx`), librairies (`src/lib`), seed des rôles (`supabase/migrations`).

## Légende de sévérité

| Tag | Sens |
|-----|------|
| 🔴 | **Important** — incohérence visible par le joueur, règle cassée, ou texte qui ment sur la capacité |
| 🟠 | **Moyen** — code mort actif dans un chemin réel, dette structurelle, fuite d'info discutable |
| 🟡 | **Mineur** — cosmétique, terminologie, nommage, dette isolée |
| 🔵 | **Info / nettoyage** — rien de cassé, mais à documenter ou ranger |
| ✅ | **Conforme** — vérifié, rien à faire |

---

## 0. Résumé exécutif (à lire en premier)

Les 10 points qui méritent une décision rapide :

1. 🔴 **Veuve noire : la fiche de rôle ment.** Le texte officiel (`capacite_full_text`) décrit l'ancienne mécanique « choisis un époux, il meurt 2 cycles après le mariage », alors que le code implémente « désigne 1–2 cibles à chaque rassemblement, elles meurent si elles votent contre toi ». → §2.1
2. 🔴 **Le codex affiche des rôles injouables.** `RolesList` (P11) liste **tous** les rôles `set1` sans filtrer `is_disabled`/`emergent` ni la liste de bannissement codée en dur. Des rôles retirés du jeu (Loup-garou, Comptable, Taupe, etc.) apparaissent encore dans l'aide, avec un % d'apparition mensonger. → §2.2 / §6.1
3. 🟠 **Source de vérité éclatée sur « quels rôles existent ».** Trois mécanismes concurrents : `is_disabled` (DB), `emergent` (DB) et une **liste de bannissement en dur** dans `drawRoles` (actions.ts:396). → §6.1
4. 🟠 **Deux gros blocs de code mort dans la boucle de vote** : la substitution **Fidèle** et l'**immunité Avocat** (`immune_vote_cycle`) — aucun rôle actuel ne les alimente. → §6.2
5. 🟠 **Trois écrans retravaillés/maintenus ne sont jamais montés en jeu réel** : `P5Cemetery`, `V2Results`, `CH1LoupsChat` (seulement la galerie `/dev`). Le travail DA récent sur le Cimetière n'est pas visible par le joueur. → §5
6. 🟠 **Le vote révèle publiquement le rôle de l'emprisonné** à toute la table (`closeVote`), alors qu'un emprisonné peut être libéré (Juge). Fuite d'information forte, à confirmer comme intentionnelle. → §3.3
7. 🟠 **Dette DA concentrée dans `PA2Capability`** : palette de panneaux violet/fuchsia/indigo (froide) contraire à la DA « Board » (liège/bois/papier/ficelle rouge/or). C'est l'écran de gameplay le plus vu. → §4.2
8. 🟠 **`V2Results` est resté sur l'ancien thème** (`bg-mystic`, `shadow-glow`) et révèle le rôle du condamné. → §4.3
9. 🟠 **Couplage dangereux texte ↔ logique** : la phase autorisée d'une capacité est **déduite du libellé texte** (`allowedActivePhases`). Réécrire une fiche peut casser silencieusement la phase d'activation. → §7.2
10. 🟡 **Terminologie incohérente** : les fiches disent « 1×/TOUR » tandis que l'UI parle de « phase libre / annonce / rassemblement / vote ». → §2.4

---

## 1. Architecture & flux (vue d'ensemble)

- **Moteur** (`src/engine`) : source unique de mutation. `actions.ts` (~3 480 lignes) centralise le cycle de vie (`startGame`, `drawRoles`, `setPhase`, `tickPhase`, `closeVote`, `killPlayer`, `executeCapability`). `resolver.ts` applique les intentions différées par couches (PROTECT/CURE → ATTACK → CASCADE/CONVERT). `winConditions.ts` évalue la victoire. `items.ts` gère inventaire/reliques. `bots.ts` pilote les bots via les **mêmes** actions que les humains (bon principe).
- **Données de rôle** : vivent **en base** (`public.roles`, `set_id='set1'`), semées et patchées par ~60 migrations SQL. Le code lit `capacite_full_text`, `usage_label`, `frequency_label`, `phase_activation`, `faction`, `type`, `police_verdict`, etc.
- **UI joueur** : `PlayerShell.tsx` monte directement les écrans (5 onglets : Inventaire, Suspicions, Annonces, Testament/Conseil, Capacité) + overlays (révélation O5, transitions T1, modales d'événements). `registry.tsx` n'est utilisé **que** par la galerie `/dev`.
- **Boucle de phases** : `Libre → Annonce → Rassemblement → Vote → (tour+1)`. En **Mode MJ** (`mode_detective_player=false`) le MJ avance à la main ; en **Mode Joueur** un `tickPhase` auto (5 s) fait avancer. Intro de 3 s (`INTRO_MS`) avant que les chronos démarrent.

---

## 2. Capacités vs texte (le cœur de la demande)

### 2.1 🔴 Veuve noire — la fiche décrit une mécanique obsolète

- **Texte DB** (`supabase/migrations/20260524152409_…sql:50-52`) :
  > « Au début de la partie, choisis un époux. Il meurt 2 cycles après le mariage. Quota… »
- **Comportement réel** :
  - Handler `case "veuve_noire"` (`src/engine/actions.ts:2849`) : choisit **1 ou 2 cibles** et mémorise une paire **par rassemblement**.
  - Déclencheur dans `closeVote` (`src/engine/actions.ts:1430-1477`) : si une cible **vote contre** la Veuve, elle(s) meur(en)t **au prochain rassemblement**.
  - Notif de setup (`src/engine/actions.ts:802-810`) : décrit, elle, le **bon** comportement (« À chaque rassemblement, choisis 2 cibles… si l'une vote contre toi… »).
  - Lore (`…20260617120000_role_lore_descriptions.sql:45`) : cohérent aussi (« qu'on vote contre elle, et la toile se referme »).
- **Conclusion** : seul le `capacite_full_text` (= ce que le joueur lit dans O5/PA2/P11) est resté sur l'ancienne règle « époux/2 cycles ». **Le joueur reçoit une règle fausse.**
- **Bonus** : `usage_label` de la Veuve = `1×/JOUR` (seed `20260515191258:57`) alors que le moteur la force au **rassemblement** (`SCHEDULES_AT_GATHERING`, `actions.ts:144-152`). L'étiquette de fréquence et la phase réelle divergent. 🟡

### 2.2 🔴 Détective — rôle fantôme dans le codex

- `detective` est **`is_disabled = true`** (`…20260611131725_…sql:2`) et **jamais tiré** (`drawRoles` ne pousse que `assistant_du_detective`, et bannit `detective` dans la branche `pool_config`, `actions.ts:518`). Commentaire interne : « le Détective immortel n'existe plus » (`actions.ts:415`).
- **Mais** : le handler `case "detective":` existe toujours (`actions.ts:2481`), une **lore** lui est encore poussée (`…20260617120000_…sql:13`), et il **reste affiché dans le codex P11** (voir §6.1). `computeRoleFrequency` le badgera « Désactivé » (`src/lib/roleFrequency.ts:100`), donc c'est moins grave, mais le rôle pollue toujours la liste et le code.

### 2.3 🟠 Avocat — capacité OK, mais vestige mort dans la boucle de vote

- Historique : `avocat` **supprimé** (`…20260607222325_…sql:2`) puis **recréé en passif** (`…20260608010645_…sql`) → « tu vois la faction des joueurs en prison ».
- **Implémentation actuelle** : pas de handler moteur (tombe dans `default` de `executeCapability`), mais un panneau UI passif l'affiche correctement : `<AvocatPrisonPanel>` (`PA2Capability.tsx:684-686`). ✅ fonctionnel.
- **Problème** : la branche **« Immunité Avocat »** de `closeVote` (`actions.ts:1499-1513`) lit `immune_vote_cycle` — un flag que **plus aucun rôle ne pose** depuis le retrait de l'ancien Avocat « libérateur ». → code mort (cf. §6.2).

### 2.4 🟡 Terminologie « TOUR » vs phases nommées

- La migration `…20260603001314_…sql` a remplacé en masse « JOUR » → « TOUR » dans `capacite_full_text`. Résultat : les fiches disent « 1×/TOUR ».
- L'UI, elle, parle de **« phase libre / annonce / rassemblement / vote »** (`PlayerShell` stepper, `phaseLabel`). Et `frequencyChips` (`src/lib/roleFreq.ts`) dérive « 1×/phase libre » depuis `phase_activation`.
- Conséquence : sur une même fiche, le corps de texte (« 1×/TOUR ») et le chip de fréquence (« 1×/phase libre ») peuvent ne pas employer le même vocabulaire. Cosmétique mais déroutant.

### 2.5 Capacités vérifiées conformes (texte ⇄ code) ✅

Vérifiées sans écart bloquant entre fiche et handler :

| Rôle | Handler | Note |
|------|---------|------|
| Tueur | `actions.ts:2320` | attaque différée + succession acolyte (`promoteAcolyteToTueur`) ✅ |
| Empoisonneur | `:2403` + `resolver.ts:338` | malédiction permanente non létale + victoire « tous empoisonnés » (`winConditions.ts:121`) ✅ |
| Apothicaire | `:2964` | 3 fioles, 1/tour, données en objet ✅ (texte réécrit `…20260603110615:10`) |
| Stratège | `:3204` | embuscade télégraphiée J+1 ✅ (réactivé `…20260616120000_stratege_embuscade.sql`) |
| Parieur tricheur | `:2890` | duel 2d6 vs 1d6, mort différée ✅ (texte `…20260616120000_parieur_d6.sql`) |
| Oracle | `:3142` | prophétie de **faction** ✅ (texte mis à jour `…20260607191445:3`, ancien texte « X mourra » remplacé) |
| Conservateur | `:3276` + `items.ts` | reliques + fin spéciale « Cœur du Manoir » ✅ |
| Saint | `:2678` | bénédiction 2 tours, condamnation = défaite Civils (`closeVote:1516`) ✅ |
| Majordome / Babysitter / Ange Gardien | `:2604 / :2617 / :2635` | protections différées ✅ |
| Falsificateur / Policier / Boussole / Détective(assistant) | `:3350 / :3013 / :2589 / :2482` | gestion `falsified` cohérente ✅ |

### 2.6 🟡 Rôles passifs : double messagerie

`medecin_legiste`, `medium`, `temoin`, `guetteur` renvoient « Capacité passive — voir notifications » (`actions.ts:2821-2826, 3162`). C'est cohérent (`target_mode = none`), mais l'UX repose entièrement sur des notifications/panneaux dédiés. À surveiller : si un de ces rôles avait `target_mode ≠ none` en base, PA2 afficherait un sélecteur de cible inutile.

---

## 3. Cohérence des règles & boucle de jeu

### 3.1 ✅ Résolution différée robuste
`resolver.ts` re-vérifie les préconditions **en live** (cible vivante, possession d'objet, blocage/chantage) et applique par couches (PROTECT=1, ATTACK=2, CASCADE/CONVERT=3). La protection posée au tour N couvre bien les attaques résolues au rassemblement N+1. Le Cleaner pré-traite les morts « méchantes » avant les attaques (`resolver.ts:417`). Bonne architecture.

### 3.2 ✅ Conditions de victoire
`winConditions.ts` couvre solos neutres (Veuve, Parieur), Empoisonneur, Vampires, parité Méchants (neutres bénins exclus du décompte d'opposants), Amoureux, Civils par défaut, et bonus Oracle. Logique dense mais cohérente avec les rôles présents.

### 3.3 🟠 Le vote révèle le rôle de l'emprisonné
`closeVote` (`actions.ts:1531-1541`) diffuse à **tous** les joueurs : « X est emprisonné — 🔪 Le Tueur ». Or l'emprisonnement n'est pas la mort (le Juge peut libérer, `actions.ts:3117`). Révéler publiquement le rôle d'un joueur potentiellement libérable est une **fuite d'information majeure** et contredit l'esprit « anonymisé » de la DA Board. → Décision design à acter : révéler la **faction** seulement ? ou rien ?

### 3.4 🟡 Phase d'activation déduite du libellé
`allowedActivePhases` (`actions.ts:167-178`) et `whyCannotUse` (`:196`) déterminent la phase autorisée en **parsant** `usage_label`/`frequency_label`/`phase_activation`. Robuste tant que les textes contiennent « phase libre » / « rassemblement », mais fragile (cf. §7.2).

### 3.5 ✅ Modes MJ vs Joueur
`PlayerShell.tsx:176-185` : pas d'auto-advance en Mode MJ (chrono qui monte, informatif) ; tick auto 5 s en Mode Joueur. Gel global tant que tous les humains vivants n'ont pas cliqué « Entrer » (`waitingStart`). Cohérent.

---

## 4. Direction artistique (DA « Board »)

Rappel DA (mémoire projet) : nuit chaude, liège/bois/papier, **ficelle rouge**, accent **or** détective ; avatars carrés, icônes de rôle rondes ; Méchants rouge `#d12b3d` ; Conseil des Morts anonyme/vert spectral.

### 4.1 ✅ Écrans bien alignés
- **O5Reveal** (`O5Reveal.tsx`) : dossier papier scotché, tampon « Confidentiel », polices `--font-display`/`--font-hand`, gradients chauds. Exemplaire.
- **T1Transition / AnnonceScreen** (`T1Transition.tsx`) : Sigil, ambiance chaude, fonts display. ✅
- **PlayerShell** (header phase, stepper Libre·Annonce·Rassembl.·Vote, Sigil onglets). ✅
- **P11HelpMenu**, **GM1Dashboard** : structurés, Sigil + factionText, accents re-hués vers le rouge (cf. mémoire). ✅
- **C1Council** : vert spectral hardcodé (`emerald-950`), chat **anonyme** → conforme à la règle DA « Conseil des Morts anonyme ». 🟡 (n'utilise pas les tokens, mais le vert est intentionnel).

### 4.2 🟠 `PA2Capability` — dette de couleurs froides
`PANEL_ACCENT` (`PA2Capability.tsx:27-40`) et `PANEL_TONE` (`:252-265`) définissent une palette **violet / fuchsia / purple / indigo / sky** pour les panneaux de rôle (~31 occurrences de classes froides dans ce seul fichier). C'est l'écran de gameplay le plus consulté, et il jure avec la DA chaude. Connu de la mémoire projet (« catégoriels laissés tels quels ») mais reste la **plus grosse dette DA visible en jeu**.

### 4.3 🟠 `V2Results` — ancien thème + anti-DA
`V2Results.tsx:46` utilise `bg-mystic`, `shadow-glow`, `border-gold/40` (thème mystique d'origine) et révèle « Rôle révélé : … » (`:110`). Double problème : hors DA **et** fuite de rôle. Atténuation : écran **injoignable en jeu réel** (cf. §5).

### 4.4 🟡 `GenericFrame` — stubs sans DA
`GenericFrame.tsx` est un placeholder brut (« Frame stub — état live ») utilisé pour `O2`, `L2`, `L3`, `GM2` dans `registry.tsx`. Visible uniquement dans `/dev`, mais sans aucune DA.

---

## 5. 🟠 Reachability des écrans — registry vs jeu réel

`registry.tsx` (la liste `FRAMES`) **n'est consommé que par la galerie `/dev`**. En jeu réel, `PlayerShell.tsx` importe les écrans en direct. Conséquence : plusieurs écrans listés/maintenus ne sont **jamais montés** pour un vrai joueur :

| Écran | Monté en jeu réel ? | Détail |
|-------|--------------------|--------|
| `PA6Announces` | ✅ (onglet « Annonces ») | `PlayerShell.tsx:440,447,455` |
| `PA5Players` | ✅ indirect | via `PA6Announces.tsx:336` |
| **`P5Cemetery`** | ❌ **dev-only** | référencé seulement dans `registry.tsx:78` + `dev.tsx:195`. L'onglet « Annonces » rend `PA6Announces`, pas le Cimetière. **Le reskin DA récent du Cimetière n'est pas vu par le joueur.** |
| **`V2Results`** | ❌ **dev-only** | `registry.tsx:93` + `dev.tsx:210`. Les résultats de vote passent en réalité par les notifications `vote_result` (`closeVote`). |
| **`CH1LoupsChat`** | ❌ **dev-only** | retiré du shell (`PlayerShell.tsx:38`) ; le chat Méchants vit dans l'onglet Capacité (PA2). |
| `P10Roles` (écran) | ❌ dev-only | mais son sous-composant `UsageCard` est réutilisé par P11 (`P11HelpMenu.tsx:12`). |
| `V1VoteSuspicion` | ✅ conditionnel | si `game.variant === "suspicion"` (toggle réel dans `g.$code.tsx:486`). |
| `C1Council` | ✅ | onglet « Conseil » des morts. |

> **À décider** : soit recâbler `P5Cemetery`/`V2Results` dans le jeu, soit les marquer explicitement « galerie /dev uniquement » pour éviter d'y investir du temps DA par erreur.

---

## 6. Code mort / legacy

### 6.1 🔴/🟠 Rôles retirés mais toujours présents → source de vérité éclatée
`drawRoles` bannit en **dur** une liste de rôles (`actions.ts:396-401`) :
`comptable, notaire, reveur, fidele, loup_garou, ivrogne, mort_vivant, scientifique, taupe, pelerin, voisin_coupable, non_coupable, tueur_isole`.

Or :
- Ces rôles ont été **insérés** par le seed (`…20260515191258_…sql`) et, sauf `detective`/`stratege`, **ne sont pas `is_disabled`** (seul `…20260611131725` désactive `detective` et `stratege`, ce dernier réactivé ensuite).
- `RolesList` (codex P11) **ne filtre ni `is_disabled` ni `emergent`** (`P11HelpMenu.tsx:727-736`) → il affiche **tous** les rôles `set1`.
- `computeRoleFrequency` (`roleFrequency.ts`) ne connaît **pas** la liste de bannissement en dur → pour un rôle banni mais non désactivé (ex. Loup-garou, type TUEUR Méchant), il calculera un **% d'apparition non nul et mensonger**.

**Trois sources de vérité concurrentes** pour « ce rôle peut-il sortir ? » : `is_disabled` (DB), `emergent` (DB), liste en dur (`drawRoles`). À unifier (idéalement tout sur `is_disabled`).

### 6.2 🟠 Blocs morts dans `closeVote`
- **Fidèle** : `fidele` est retiré (banni au tirage, `isFidele = false // rôle retiré` `PA2Capability.tsx:415`). Pourtant tout le bloc de substitution subsiste : `closeVote` (`actions.ts:1483-1493`) + la fonction exportée `fideleVolunteer` (`actions.ts:1574`). Jamais atteignable.
- **Immunité Avocat** : `closeVote` (`actions.ts:1499-1513`) lit `immune_vote_cycle`, qu'aucun rôle actuel ne pose (l'Avocat est passif depuis `…20260608010645`). Mort.

### 6.3 🟡 `tueur_isole` — UI conservée pour un rôle banni
`tueur_isole` est banni au tirage, mais l'UI le gère encore : `isTueurIsole`, `tueurIsoleEnJeu`, bandeau « Le tueur solitaire brouille les lignes… » (`PA2Capability.tsx:416-418, 600`) et masquage de la bannière tueur (`PlayerShell.tsx:480`). Jamais déclenché en pratique.

### 6.4 🟡 Lore poussée sur un rôle désactivé
`…20260617120000_role_lore_descriptions.sql:13` met à jour la `description` de `detective` (désactivé, injouable). UPDATE inutile.

### 6.5 🟡 Nommage prêtant à confusion : `roleFreq` vs `roleFrequency`
Deux fichiers aux noms quasi identiques mais rôles différents :
- `src/lib/roleFreq.ts` → `frequencyChips()` : libellés d'**usage** (« 1×/phase libre »).
- `src/lib/roleFrequency.ts` → `computeRoleFrequency()` : **probabilité d'apparition** d'un rôle.
Pas un doublon, mais un piège de maintenance (facile de confondre l'import). Renommer l'un (ex. `roleUsageChips.ts` / `roleAppearance.ts`).

### 6.6 🔵 `registry.tsx` = infra de galerie
`FRAMES`, `frameById`, `SECTIONS`, et les prédicats `requires` ne servent qu'à `/dev`. À documenter clairement comme tel (sinon on croit que c'est le routeur de production).

### 6.7 🔵 Non-doublons confirmés
- `src/lib/gameToast.tsx` (fonction `gameToast()`) vs `src/components/GameToast.tsx` (la carte rendue) : distincts, OK.
- `V1Vote` vs `V1VoteSuspicion` : variantes réelles, sélectionnées par `game.variant` (`PlayerShell.tsx:425`). OK.

---

## 7. Dette technique & risques

### 7.1 🟠 Fichiers monolithiques
- `src/engine/actions.ts` ≈ **3 484 lignes** (cycle de vie + 44 handlers de capacité + cascades de mort + promotions + bots utils). Très difficile à maintenir/tester unitairement.
- `src/components/frames/screens/PA2Capability.tsx` ≈ **2 554 lignes** (un panneau par rôle dans un seul composant). Idem.
> Suggestion : extraire les handlers de capacité par fichier (ou par faction), et sortir les panneaux PA2 en sous-composants par rôle.

### 7.2 🟠 Couplage texte ↔ logique de phase
`allowedActivePhases`/`whyCannotUse` (`actions.ts:167, 196`) déduisent la **logique** (phase autorisée, cooldown, quota) en lisant les **chaînes** `usage_label`/`capacite_full_text` (regex sur « phase libre », « rassemblement », « cooldown N », « max N », « 1×/partie »…). Réécrire une fiche de rôle peut **changer silencieusement** son comportement moteur. Risque élevé pour un jeu dont les textes sont éditables en base.
> Suggestion : colonnes structurées dédiées (`active_phases`, `cooldown_cycles`, `total_uses`) plutôt que du parsing de prose.

### 7.3 🟡 `role_meta` = sac JSON non typé
Toute la mécanique d'état (poison, bénédiction, liens, marques, cooldowns, inventaire…) vit dans `players.role_meta` (JSON libre). Aucun schéma → fautes de frappe de clé silencieuses, pas d'autocomplétion. Acceptable au stade prototype, risqué à l'échelle.

### 7.4 🟡 Quelques flags partiels d'objets
- Médaillon du Vieux Maître (`items.ts:328`) : `protected_until_cycle = max(cur, tour)` → ne couvre que le **tour courant** alors que la description dit « 1 jour entier ». À aligner si l'intention est de protéger le rassemblement suivant.
- Lettre Scellée (`items.ts:336`) : pose `blocked_until_cycle` sans `blocked_from_cycle` (défaut `-Infinity`, donc fonctionne) — mais l'asymétrie avec les autres poseurs de blocage est fragile.

---

## 8. Plan d'action priorisé

### P0 — À corriger avant toute partie « sérieuse »
- [ ] **Veuve noire** : réécrire `capacite_full_text` pour décrire la vraie mécanique (cibles + déclencheur de vote). *(§2.1)*
- [ ] **Codex** : filtrer `RolesList` sur `is_disabled = false && emergent = false` (et idéalement la liste de bannissement). *(§2.2/§6.1)*
- [ ] **Décision** : le vote doit-il révéler le rôle de l'emprisonné ? Sinon masquer dans `closeVote`. *(§3.3)*

### P1 — Cohérence & nettoyage à fort ROI
- [ ] Unifier la « source de vérité » des rôles jouables sur `is_disabled` (supprimer la liste en dur de `drawRoles`, désactiver en base les rôles retirés). *(§6.1)*
- [ ] Supprimer les blocs morts **Fidèle** et **immunité Avocat** dans `closeVote` + `fideleVolunteer`. *(§6.2)*
- [ ] Recâbler ou archiver explicitement `P5Cemetery` / `V2Results` (et nettoyer `V2Results` du `bg-mystic`). *(§4.3/§5)*
- [ ] Harmoniser `PA2Capability` (`PANEL_TONE`/`PANEL_ACCENT`) avec la palette DA chaude. *(§4.2)*

### P2 — Dette de fond (plus long)
- [ ] Remplacer le parsing de prose par des colonnes structurées de comportement. *(§7.2)*
- [ ] Découper `actions.ts` et `PA2Capability.tsx`. *(§7.1)*
- [ ] Renommer `roleFreq.ts` / `roleFrequency.ts`. *(§6.5)*
- [ ] Retirer la lore de `detective`, le handler et l'UI `tueur_isole`. *(§6.3/§6.4)*
- [ ] Harmoniser la terminologie « TOUR » ↔ phases nommées dans les fiches. *(§2.4)*

---

## Annexe — Inventaire des handlers de capacité

44 `case` dans `executeCapability` (`actions.ts:2318-3384`). Sans handler dédié (→ `default`) mais **intentionnellement** : `avocat` (passif UI), tous les passifs purs renvoyant un message générique. Rôles avec lore mais **désactivés/non tirés** : `detective`. Rôles bannis au tirage mais toujours en base : voir §6.1.

---

## Journal des corrections (session de remédiation — 2026-06-17)

### Corrections de l'audit lui-même (faux positifs détectés en re-vérifiant)
- **§2.1 Veuve noire** → ❌ **FAUX POSITIF**. Le `capacite_full_text` réellement en vigueur (migration `20260603141521`) décrit déjà la bonne mécanique (« cibles + déclencheur de vote »). L'audit avait cité une version périmée (`20260524152409`), écrasée depuis. **Aucun correctif nécessaire.**
- **§6.1 « le codex affiche plein de rôles fantômes »** → ❌ **LARGEMENT FAUX POSITIF**. Les rôles legacy (comptable, notaire, reveur, fidele, loup_garou, ivrogne, mort_vivant, scientifique, taupe, pelerin, voisin_coupable, non_coupable) ont été **supprimés** par `20260602114707` ; `tueur_isole`/`spy`/`mythomane`/`policier_modifie` aussi. Seul `detective` (`is_disabled`) restait visible. La liste de bannissement en dur de `drawRoles` n'est donc que de la **redondance défensive**, pas une 3ᵉ source de vérité active.

### Correctifs appliqués
| # | Sujet | Fichier(s) | Détail |
|---|-------|-----------|--------|
| 2 | Codex : masquer les désactivés | `P11HelpMenu.tsx` (`RolesList`) | `.filter(r => !r.is_disabled)` → masque le Détective ; rôles émergents (Chasseur de Vampire) conservés. |
| 3 | Vote → rien révélé | `actions.ts` (`closeVote`) | Le verdict n'annonce plus que « X est emprisonné. » — **ni rôle ni faction** ; `role_slug` retiré du payload (anti-fuite). Le rôle/faction n'est révélé qu'à la **mort réelle** (annonces). |
| 4 | Code mort (Fidèle / Avocat) | `actions.ts` | Bloc substitution Fidèle + branche `immune_vote_cycle` retirés de `closeVote` ; fonction `fideleVolunteer` (jamais appelée) supprimée. |
| 4 | Code mort | `StatusBandeau.tsx` | Badge « Défendu » (`immune_vote_cycle`, jamais posé) + import `Scale` retirés. |
| 4 | Code mort (`tueur_isole`) | `PA2Capability.tsx` | `isTueurIsole`, `tueurIsoleEnJeu`, message « Le tueur solitaire brouille les lignes… » retirés ; `isMechantTeam`/`chatAvailable` simplifiés. |
| 4 | Code mort (`tueur_isole`) | `PlayerShell.tsx` | Garde `slug !== "tueur_isole"` retirée. |
| 5 | DA : PA2 re-basé sur les tokens | `PA2Capability.tsx` | `PANEL_ACCENT` + `PANEL_TONE` (couleurs Tailwind brutes `violet-500`…) fusionnés en une seule table `PANEL_TOKEN` → tokens DA `--citoyens`/`--mechants`/`--neutres`/`--accent` ; `PanelCard` rendu en `color-mix` inline. **Vérifié en preview** (le panneau Oracle résout bien vers `--neutres`). |
| 6 | Suppression des écrans morts | `registry.tsx`, `dev.tsx` + 7 fichiers supprimés | **Supprimés** : `O1`, `L1`, `CH1LoupsChat`, `GenericFrame` (100 % morts, référencés uniquement par le catalogue `FRAMES` mort) + `P5Cemetery`, `V2Results`, `D1Dead` (galerie `/dev` only, jamais en jeu réel). `FRAMES`/`SECTIONS`/`frameById` (jamais importés) retirés de `registry.tsx` (type `FrameContext` conservé). Scènes correspondantes retirées de `dev.tsx`. **Vérifié** : `tsc` clean + galerie `/dev` recharge sans erreur, scènes absentes, reste intact. |
| 7 | PA2 — finitions DA | `PA2Capability.tsx` | `isFidele` (no-op `= false`) + ses 3 gardes retirés. 4 panneaux **mono-rôle Méchant** recolorés violet/purple/fuchsia → rouge `--mechants` : Usurpateur (« Couverture verrouillée »), Marionnettiste (« Marionnette préparée » + « Manipulation en cours »), Falsificateur (« Joueurs falsifiés » + son badge interne). Panneau **partagé** Cartomancien/Journaliste laissé tel quel (factions mixtes : Méchant + Civil). **Vérifié en preview** (Falsificateur résout vers `--mechants`). |
| 8 | Renommage + suppression Détective | `roleUsageChips.ts`, `roleAppearance.ts`, `actions.ts`, `bots.ts`, `dev.tsx`, + migration | **Rename** (`git mv`) : `roleFreq.ts`→`roleUsageChips.ts` (libellés d'usage `frequencyChips`) et `roleFrequency.ts`→`roleAppearance.ts` (proba d'apparition `computeRoleFrequency`) + 4 imports mis à jour. **Détective supprimé** : migration `20260618120000_remove_detective.sql` (NULL des joueurs + DELETE + array_remove des bans) + retrait des `case "detective"` (handler `executeCapability` + IA bots, fall-through vers l'Assistant) + fixture `/dev` corrigée. **Vérifié** : `tsc` clean + galerie `/dev` OK. *(NB : un redémarrage de Vite a été nécessaire — cache HMR obsolète après les `git mv`/suppressions, pas un bug de code.)* |
| 9 | Audit texte↔code sur la BASE LIVE (44 rôles) | migrations `…fix_parieur_text`, `…fix_executeur_juge_freq` + `PA2Capability.tsx` | Balayage des **44 rôles via la vraie base Supabase** (lecture des fiches de révélation dans `/dev`). **40 OK.** Corrigés : **Parieur tricheur** (texte = vieux mécanisme de dés ≠ code « 2d6 garde-le-meilleur » → texte réaligné + `usage_label` → 1×/partie) ; **Voisin** (code → révèle désormais le **RÔLE** du visiteur, plus seulement le nom — respecte la couverture Usurpateur) ; **Executeur**/**Juge** (libellés « unique »/« passif » → « 1×/tour »). |

> ### ⚠️ Découverte majeure — dérive base live ↔ migrations
> Le texte live du **Parieur** (« jet le plus bas / relancer 1×/partie ») **n'existe dans aucune migration** ; le bon texte (« 2d6 ») existait pourtant dans `20260616120000_parieur_d6`, **jamais appliquée à la base**. ⟹ **La base Supabase de production a dérivé des migrations** (éditée à la main / hors pipeline). Conséquences : (1) tout audit « texte vs comportement » doit se faire contre la **base live**, pas les fichiers de migration ; (2) ajouter des migrations ne suffit pas si elles ne sont pas appliquées — il faut soit réparer le pipeline `supabase db push`, soit coller le SQL correctif dans l'éditeur SQL Supabase.

**Validation** : `tsc --noEmit` sans erreur. Les avertissements `prettier/prettier` d'ESLint sont **pré-existants** (le dépôt n'est pas formaté prettier ; reformatter créerait un diff bruité incohérent avec le reste du code).

### Restant (non traité — en attente de décision/priorisation)
- **PA6 prison** : ✅ désormais cohérent — la carte « prison » de l'onglet Annonces n'affiche rien, et le verdict du vote non plus (décision finale : zéro info révélée à l'emprisonnement).
- **DA** : §4.2 `PA2Capability` → **chrome des panneaux re-basé sur les tokens (fait)**. Reste optionnel : (a) les 3 panneaux Méchants (Usurpateur/Marionnettiste/Cartomancien) restent en `--neutres` violet (choix : token-rebase sans recolor faction) ; (b) les couleurs codées en dur DANS chaque panneau (boutons Oracle fuchsia, chips Empoisonneur emerald…) non touchées. §4.3 `V2Results` + §5 écrans injoignables → **résolus par suppression** (item 6).
- **Mineurs restants** : seulement la terminologie « TOUR » vs phases nommées — **volontairement non traitée** (grosse migration de texte, faible valeur, risque de re-désynchroniser texte/logique de phase). *(`isFidele`, renommage `roleFreq`/`roleFrequency`, rôle `detective` : ✅ traités.)*

*Fin de l'audit.*
