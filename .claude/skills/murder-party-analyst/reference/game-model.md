# Murder Party — modèle de jeu (référence analyste)

Connaissance durable du jeu, pour analyser/équilibrer sans tout re-découvrir.
**Ne pas dupliquer les données de rôles ici** (elles vivent en base et dérivent) —
ce fichier décrit la STRUCTURE et pointe vers les sources de vérité.

## 1. Nature du produit

Assistant **compagnon** de Murder Party à rôles cachés (famille Loup-Garou/Mafia),
**6–15 joueurs + 1 MJ**, joué **en présentiel** (le vrai jeu est autour de la table ;
l'app synchronise l'état entre téléphones). Stack **web** : TanStack Start (React 19) +
Supabase (Postgres/RLS/Realtime/Storage). **Pas** un jeu vidéo — pas de moteur graphique.

**Modèle de confiance : l'appareil du MJ fait autorité.** Le moteur (`src/engine/`)
tourne côté client MJ ; il n'y a pas d'arbitrage serveur. Les analyses de correction
doivent en tenir compte (un joueur ne peut écrire que ses propres `role_actions` via RLS).

## 2. Factions & camps

- **Civil** (la ville) — gagne quand tous les ennemis sont éliminés.
- **Méchant** — gagne à la **majorité stricte** (surpasse en nombre tous les autres camps réunis ; à égalité 2v2, la ville garde sa chance).
- **Neutre** — objectifs **solo** variés (Empoisonneur, Veuve noire, Parieur, Vampire, Entremetteur/Amoureux, Conservateur…). Certains neutres **BÉNINS** (Oracle) peuvent gagner avec n'importe quel camp ; d'autres **bloquent** la victoire des Civils.

Détails et cas limites (Héritier déchu allié Méchant, Vampire conversion, couple
Entremetteur) → source de vérité : `src/engine/winConditions.ts` (`evaluateWin`).

## 3. Phases (`Phase` dans `src/engine/actions.ts`)

`lobby → free → annonce → gathering → vote → ended` (cycle free→…→vote répété par tour).

- **free** (phase libre) : la plupart des capacités actives se jouent ici.
- **annonce** : dénouement (morts révélées).
- **gathering** (rassemblement) : effets programmés qui affectent le tour suivant.
- **vote** : lynchage.

**Quelle phase pour quel rôle** = `allowedActivePhases(role)` — déduit des libellés
`usage_label`/`phase_activation`. ⚠️ Voir la distinction **fréquence vs phase** ci-dessous.

## 4. Fréquence ≠ phase (piège classique)

Deux axes DISTINCTS sur chaque rôle, à ne jamais confondre :
- **Fréquence** (combien de fois) : `usage_label` = `Nx/[tour|phase libre|rassemblement|partie]` ou `Passif|Setup|Permanent`.
- **Phase** (quand) : `phase_activation` → `allowedActivePhases()`.

**Décision produit actée (2026-07-08) :** 5 rôles actifs (Exécuteur, Journaliste,
Saint, Cartomancien, Imitateur) ont `phase_activation="tour"` → autorisés dans **toutes**
les phases. **C'est VOULU, pas un bug.** Seul le Tueur est volontairement cantonné à la
phase libre. Ne pas « corriger » ça.

## 5. Résolution des actions (`src/engine/resolver.ts`)

Actions différées résolues en **couches** (garantit l'ordre correct intra-tour) :
`LAYER_BY_CATEGORY` → **PROTECT/CURE = 1 → ATTACK = 2 → CASCADE/CONVERT = 3**.
Re-check LIVE des préconditions ; symétrie « acteur tué ce tour → effet annulé »
(Vampire/Empoisonneur relisent `is_alive`). Idempotence via `resolved_at IS NULL`.

État par joueur dans `players.role_meta` (JSON) — **typé** via `src/engine/roleMeta.ts`
(interface `RoleMeta` + `getMeta`/`mergeMeta`). Toute nouvelle clé méta doit y être déclarée.

## 6. Sources de vérité (lire/exécuter, ne jamais recopier)

| Sujet | Fichier |
|---|---|
| Handlers de capacité, phases, quotas | `src/engine/actions.ts` (`executeCapability`, `allowedActivePhases`, `parseTotalLimit`) |
| Résolution différée / couches | `src/engine/resolver.ts` |
| Conditions de victoire | `src/engine/winConditions.ts` |
| Objets/inventaire | `src/engine/items.ts` |
| Bots (modèle comportemental live) | `src/engine/bots.ts` |
| Harnais QA (invariants, expectations) | `src/engine/qa/` |
| Données de rôles (source live) | table Postgres `public.roles` (set `set1`) ; migrations `supabase/migrations/` |
| Comment ajouter un rôle | `docs/ROLES_FRAMEWORK.md` |

## 7. Outils d'analyse (exécutables)

- **`node sim/balance.mjs`** — simulation Monte-Carlo (20k parties/taille par défaut). Sort les win-rates par faction et par taille + win-rate des neutres. ⚠️ **Modèle comportemental séparé** du vrai moteur (params `P` en tête de fichier) → chiffres **indicatifs**, pas une preuve.
- **`node sim/sweep.mjs [N]`** — balaye précision d'enquête × létalité Tueur pour trouver le calibrage. **Cible de design : Civils 55 % / Méchants 45 %** (parmi les parties tranchées).
- **`node sim/scenarios.mjs [N]`** — impact quantifié de chaque levier de rééquilibrage.
- **`node scripts/role-static-audit.mjs`** — audit **texte carte ↔ moteur** (phase/quota/passif) sur les 45 rôles, headless (fetch live). Limite connue : ne détecte pas le cas « autorisé dans TOUTES les phases » (jamais en contradiction avec le texte).

## 8. Cible d'équilibrage & état connu

- **Cible** : Civils **55 %** / Méchants **45 %** (parties tranchées), toutes tailles. Neutres : présence occasionnelle, win-rate « quand présent » raisonnable (~ ne pas dominer).
- **Déséquilibres connus (sim, 2026-07)** : **Empoisonneur surpuissant** (~51 % quand présent à 8j) ; **Parieur tricheur** très faible (~5 %) ; **Oracle** faible (~28 %) ; **Veuve noire** faible ; **Civils s'effondrent** quand la table grandit (59 %→38 % de 6 à 12j).

## 9. Garde-fous d'analyse

- Distinguer **fréquence** vs **phase** (§4). Ne pas re-signaler la décision §4 comme un bug.
- Les refactors du moteur doivent être **préservateurs de comportement** ; vérifier `npx tsc --noEmit`.
- La sim est un **modèle approximatif** — l'étayer, ne pas la présenter comme vérité.
- Respecter le modèle **MJ-autoritaire** (§1) dans toute reco de sécurité/triche.
