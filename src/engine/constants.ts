// Engine constants.
// Bot tick base interval (ms). Multiplier divides this.
export const BOT_TICK_BASE_MS = 4000;

// ─────────── Composition : combien de chaque faction selon la taille ───────────
// SOURCE UNIQUE des PROPORTIONS. Ces fonctions décident *combien* de méchants /
// neutres une partie contient ; le reste des joueurs sont des civils. Elles sont
// consommées à la fois par le configurateur (`buildDefaultPool`, src/lib/poolConfig.ts)
// et par le tirage auto sans config (`drawRoles` passe désormais par le même
// `buildDefaultPool`). Régler l'équilibrage = régler CES nombres — jamais un
// quota de type en dur (les *types* vivent dans les patterns FILL de poolConfig).
//
// Invariant produit : les proportions Méch/Civ/Neu dépendent UNIQUEMENT du nombre
// de joueurs. Forcer un rôle ou bannir un rôle ne change que *quel* rôle occupe un
// slot, jamais *combien* de chaque faction.

// Nombre d'acolytes méchants (hors Tueur principal, qui est toujours présent).
// → Méchants total = acolytes + 1. Courbe visée ~20 % de méchants — DÉLIBÉRÉMENT
//   SOUS le ~25 % du Loup-Garou : dans ce jeu les méchants (Tueur & co) tapent plus
//   fort individuellement, donc on en met MOINS pour compenser (décision 2026-07-18).
//   Plafond 4 méchants. ≤11 → 2 méch · 12-16 → 3 méch · 17-20 → 4 méch.
//   6-7 j. restent à 2 méch (33/29 %) : plancher structurel (Tueur + 1 acolyte pour
//   un vrai jeu d'équipe ; en dessous = loup solitaire). 8 j.+ passent tous sous 25 %.
export function acolytesCountFor(playerCount: number): number {
  if (playerCount <= 11) return 1; // 2 méchants
  if (playerCount <= 16) return 2; // 3 méchants
  return 3; // 17–20 joueurs → 4 méchants
}

// Nombre de neutres selon la taille de partie.
// Rééquilibré : on retarde l'apparition du 2ᵉ neutre pour garder Civ/Menace ≈ 2.0.
// Étendu à 20 j. : 3ᵉ neutre seulement aux très grandes tables (chaos dosé).
export function neutresCountFor(playerCount: number): number {
  if (playerCount <= 7) return 0;
  if (playerCount <= 11) return 1;
  if (playerCount <= 17) return 2;
  return 3; // 18–20 joueurs
}

// Pondération par type pour le tirage neutre (appliquée par le tirage de slots
// dans actions.ts quand un slot neutre est une union "MAL/BÉNIN/CHAOS").
// BÉNIN dominant (le moins hostile), MAL en retrait, CHAOS rare mais possible
// dès le 1ᵉʳ neutre.
export const NEUTRE_TYPE_WEIGHTS: Record<string, number> = {
  BÉNIN: 1.0,
  MAL: 0.45,
  CHAOS: 0.2,
};
