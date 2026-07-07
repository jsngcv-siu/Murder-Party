# ROLES_FRAMEWORK — comment ajouter un rôle

## 1. Base de données (`public.roles`)

Insère une ligne via migration avec au minimum :

- `slug` (id technique, snake_case), `name_fr`, `icon`, `faction` (`Civil|Méchant|Neutre`), `type`, `presence`, `phase_activation`
- `usage_label` au format `Nx/[tour|phase libre|rassemblement|partie]` ou `Passif|Setup|Permanent`
- `target_mode` : `none|single|double|multi|self_or_other`
- `capacite_full_text` (texte joueur), `description` (texte MJ)

## 2. Handler engine (`src/engine/actions.ts`)

Dans `executeCapability` → `switch (role.slug)`, ajoute un `case "mon_role"` qui :

1. Valide la cible (`if (!t1) return { ok:false, message:"Cible requise" }`).
2. Soit applique immédiatement un effet via `patchMeta` / `notify` / `killPlayer`,
   soit pose une intention via `submitIntent({ category, timing:"DEFERRED", source:"role:mon_role", payload })`.
3. Appelle `await used({ effect: "mon_effet" })` pour logger.

## 3. Ordre de résolution (`src/engine/resolver.ts`)

- `LAYER_BY_CATEGORY` : `PROTECT/CURE = 1`, `ATTACK = 2`, `CASCADE = 3`.
- Pour ajouter un layer custom, étends `IntentCategory` + `LAYER_BY_CATEGORY` puis ajoute un `applyX()` appelé dans `resolveDeferredIntents`.

## 4. Setup en début de partie

Dans `applySetupEffects(gameId)` : ajoute un bloc qui s'exécute si `ofSlug("mon_role")` existe (lien amoureux, info dévoilée, item de départ via `grantItem`).

## 5. Statut visible

- Ajoute le slug dans `STATUS_BADGE` de `src/components/StatusBandeau.tsx` (label, classe Tailwind, description du toast).
- Si le statut est strictement MJ, ne l'ajoute pas — il restera invisible côté joueur.

## 6. Condition de victoire

Dans `src/engine/winConditions.ts → evaluateWin`, ajoute le bloc dans l'ordre :

1. Objectifs neutres prioritaires
2. Vampires / Morts-Vivants
3. Méchants dominent
4. Amoureux duo
5. Civils par défaut

## 7. UI optionnelle (`PA2Capability.tsx`)

Ajoute un panel dédié (`<MonRolePanel/>`) si le rôle a un suivi propre (tableau de bord, choix initial à verrouiller, etc.). Ajoute aussi `myRole?.slug === "mon_role"` dans les conditions de masquage du sélecteur de cibles standard si l'UI est custom.

## 8. Tirage automatique (`drawRoles`)

Si le rôle doit être MUST : pousse-le dans `slugs` en haut de `drawRoles`. Sinon, range-le dans la bonne pool (méchant / neutre / civil) selon sa faction — c'est automatique.
