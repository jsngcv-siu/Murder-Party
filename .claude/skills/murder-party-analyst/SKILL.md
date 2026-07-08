---
name: murder-party-analyst
description: >-
  Analyse et améliore le jeu Murder Party (déduction sociale à rôles cachés, web/Supabase) :
  équilibrage des factions/rôles, cohérence texte↔moteur, évaluation d'un nouveau rôle,
  revue des règles et de la résolution. Utiliser quand l'utilisateur veut « équilibrer le
  jeu », « analyser un rôle », « vérifier l'équilibrage », « le rôle X est trop fort/faible »,
  « ajouter/évaluer un rôle », « auditer les règles », « pourquoi les Civils perdent », ou
  parle de win-rate, factions, phases, capacités, rassemblement, résolution.
allowed-tools: Read, Glob, Grep, Bash, Write, AskUserQuestion
user-invocable: true
---

# Murder Party — Analyste de jeu

Skill sur-mesure pour comprendre et améliorer **ce** jeu (pas un jeu générique).
Il connaît la déduction sociale à rôles cachés, ta structure factions/phases/résolution,
et tes outils de sim/QA.

## Avant toute chose

1. **Lis [reference/game-model.md](reference/game-model.md)** — modèle du jeu, sources de
   vérité, cibles d'équilibrage, garde-fous. C'est le socle de toute analyse.
2. **Ne duplique jamais les données de rôles** : lis-les en base (`public.roles`) ou via les
   migrations / `scripts/role-static-audit.mjs`. Elles dérivent — travailler sur une copie
   périmée produit de fausses conclusions.
3. **Distingue toujours fréquence (combien) et phase (quand)** — cf. game-model §4. La
   décision « 5 rôles multi-phases = voulu » est actée : ne pas la re-signaler comme bug.

Si la demande est floue, demande le **domaine** (équilibrage / cohérence rôle / nouveau rôle
/ règles) avant de lancer quoi que ce soit.

---

## Playbook A — Analyse d'équilibrage

Quand : « équilibre le jeu », « telle faction gagne trop », « pourquoi les Civils perdent ».

1. **Mesure l'état actuel** : `node sim/balance.mjs` (win-rates par faction × taille + neutres).
2. **Compare à la cible** : Civils **55 %** / Méchants **45 %** (parties tranchées, cf. §8).
   Note les écarts par taille (l'équilibre dérive souvent avec le nombre de joueurs).
3. **Neutres** : repère ceux qui **dominent** (>~45 % quand présents) ou qui sont **inutiles**
   (<~15 %). État connu : Empoisonneur trop fort, Parieur/Oracle/Veuve trop faibles.
4. **Isole un levier** : `node sim/scenarios.mjs` (impact quantifié de chaque levier) et
   `node sim/sweep.mjs` (précision enquête × létalité Tueur).
5. **Rappelle la limite** : la sim est un **modèle comportemental séparé** du vrai moteur →
   présente les chiffres comme **indicatifs**, jamais comme preuve.
6. **Propose des ajustements** ciblés (condition de victoire, cooldown, quota, poids de tirage)
   AVANT de toucher au code/données. Un changement de rôle = décision de game design → confirme.

Appliquer un correctif d'équilibrage : les stats de rôles vivent en **base** → migration SQL
`supabase/migrations/` (pas de hardcode). Re-mesure avec la sim après.

## Playbook B — Cohérence d'un rôle (texte ↔ moteur)

Quand : « le rôle X fait-il ce que dit sa carte », « audite les rôles », doute sur une phase/quota.

1. `node scripts/role-static-audit.mjs` — écarts texte↔moteur (phase, quota one-shot, passif/cible).
2. **Angle mort connu** : l'audit ne détecte PAS le cas « autorisé dans toutes les phases »
   (jamais en contradiction avec le texte). Pour vérifier la phase réelle d'un rôle, lis
   `allowedActivePhases()` dans `src/engine/actions.ts` et déroule-le sur `usage_label` +
   `phase_activation` du rôle.
3. Croise le **handler** (`executeCapability` → `case "slug"`) avec le **texte joueur**
   (`capacite_full_text`) : l'effet codé correspond-il à la promesse ?
4. Pour un effet différé, vérifie la **couche** de résolution (`resolver.ts`, §5) et l'ordre.

## Playbook C — Évaluer / ajouter un rôle

Quand : « j'ai une idée de rôle », « est-ce que ce rôle serait équilibré ».

1. **Question-first** (comme un game designer) : quel fantasme joueur ? quelle faction ? quelle
   interaction avec les rôles existants ? quel contre-jeu ?
2. **Cadre technique** : suis `docs/ROLES_FRAMEWORK.md` (DB → handler → resolver → setup →
   statut → condition de victoire → UI → tirage). Vérifie chaque étape nécessaire.
3. **Cohérence système** : la capacité crée-t-elle une **stratégie dégénérée** (kill garanti,
   état inkillable, boucle) ? interagit-elle proprement avec protection/blocage/conversion ?
4. **Impact équilibrage** : estime son camp et son pouvoir ; si possible, ajoute-le au modèle
   `sim/balance.mjs` pour chiffrer. Sinon, raisonne par analogie avec un rôle existant proche.
5. Ne l'implémente qu'après validation du design par l'utilisateur.

## Playbook D — Revue des règles / résolution

Quand : « ce combo est-il correct », « qui gagne dans ce cas », bug de résolution suspecté.

1. Déroule `resolver.ts` couche par couche (PROTECT/CURE → ATTACK → CASCADE/CONVERT) sur le
   scénario ; vérifie les re-checks LIVE et l'annulation « acteur mort ce tour ».
2. Déroule `evaluateWin` (winConditions.ts) dans l'ordre des blocs pour le cas de fin.
3. Pour du concret, lance une partie avec bots via `/demo` + le sweep d'invariants du harnais
   QA (`src/engine/qa/`). Nécessite un `.env` Supabase.
4. Garde le modèle **MJ-autoritaire** en tête pour toute question de triche/sécurité.

## Playbook E — Écran de capacité animé (nouveau rôle)

Quand : « anime l'écran du rôle X », « rends la capacité plus vivante », « nouveau rôle → son écran ».

1. **Lis [reference/motion-pattern.md](reference/motion-pattern.md)** — le pattern GSAP **maison**
   (à copier, pas à réinventer) : `gsap.matchMedia()` pour le reduced-motion, `useGSAP` + timeline,
   easing `power3.out`/`back.out()`, cleanup scopé.
2. **Copie un écran de référence existant** selon l'effet voulu :
   `O5Reveal` (révélation), `T1Transition` (choréo/stagger), `DiceDuelModal` (capacité spectaculaire).
3. **Pose le panel** dans `PA2Capability.tsx` à côté des panels existants (le handler de capacité
   s'appelle `runCapacity`). Cible via classes scopées (`.cap-*`), anime `transform`/`opacity`.
4. **Respecte ui-ux-pro-max §7** (durées 150–300 ms micro / ≤ 500 ms transitions, 1–2 anims clés,
   ease-out à l'entrée) et le skill **gsap-react** pour `useGSAP`/cleanup.
5. **Vérifie dans le preview** : reduced-motion (contenu lisible sans anim), 60fps, pas de layout shift.
   Suis la checklist de fin de `motion-pattern.md`.

Enchaînement type d'un nouveau rôle : **Playbook C** (design/équilibrage) → implémentation
(`docs/ROLES_FRAMEWORK.md`) → **Playbook E** (écran animé).

---

## Format de sortie

Termine une analyse par : **constat chiffré → cause → recommandation priorisée**. Sépare
clairement ce qui est **mesuré** (sim/audit) de ce qui est **estimé**. Pour tout changement
touchant le gameplay, propose et **fais confirmer** avant d'éditer code ou données.
