// Engine constants.
// Bot tick base interval (ms). Multiplier divides this.
export const BOT_TICK_BASE_MS = 4000;

// ─────────── Quotas de tirage par type & faction ───────────
// Plafonds appliqués dans drawRoles selon la taille de partie.
// `min`/`max` = bornes inclusives par type ; le pool tire au hasard pondéré (draw_weight)
// entre min et max, dans la limite des slots restants pour la faction.

export type TypeQuota = { min: number; max: number };
export type FactionQuotas = Record<string, TypeQuota>;

function bracket(n: number): "small" | "mid" | "large" {
  if (n <= 8) return "small";
  if (n <= 13) return "mid";
  return "large";
}

// Côté MÉCHANT (acolytes, hors Tueur principal qui est MUST).
// ⚠ Pas de TUEUR secondaire dans les acolytes (interdit par design).
const ACOLYTE_QUOTAS: Record<"small" | "mid" | "large", FactionQuotas> = {
  small: {
    INVESTIGATION: { min: 0, max: 1 },
    TROMPERIE: { min: 0, max: 1 },
    SUPPORT: { min: 0, max: 1 },
  },
  mid: {
    INVESTIGATION: { min: 1, max: 1 },
    TROMPERIE: { min: 0, max: 1 },
    SUPPORT: { min: 0, max: 1 },
  },
  large: {
    INVESTIGATION: { min: 1, max: 1 },
    TROMPERIE: { min: 1, max: 2 },
    SUPPORT: { min: 0, max: 1 },
  },
};

// Côté CIVIL (hors base MUST : assistant_du_detective + majordome, toujours forcés avant ce tirage).
const CIVIL_QUOTAS: Record<"small" | "mid" | "large", FactionQuotas> = {
  small: {
    INVESTIGATION: { min: 1, max: 2 },
    PROTECTEUR: { min: 0, max: 1 },
    TUEUR: { min: 0, max: 1 },
    SUPPORT: { min: 1, max: 2 },
  },
  mid: {
    INVESTIGATION: { min: 2, max: 2 },
    PROTECTEUR: { min: 1, max: 1 },
    TUEUR: { min: 1, max: 1 },
    SUPPORT: { min: 1, max: 2 },
  },
  large: {
    INVESTIGATION: { min: 2, max: 3 },
    PROTECTEUR: { min: 1, max: 2 },
    TUEUR: { min: 1, max: 1 },
    SUPPORT: { min: 2, max: 2 },
  },
};

export function acolyteQuotasFor(playerCount: number): FactionQuotas {
  return ACOLYTE_QUOTAS[bracket(playerCount)];
}
export function civilQuotasFor(playerCount: number): FactionQuotas {
  return CIVIL_QUOTAS[bracket(playerCount)];
}

// Nombre de neutres selon la taille de partie.
// Rééquilibré : on retarde l'apparition du 2ᵉ neutre pour garder Civ/Menace ≈ 2.0.
export function neutresCountFor(playerCount: number): number {
  if (playerCount <= 7) return 0;
  if (playerCount <= 11) return 1;
  return 2;
}

// Pondération par type pour le tirage neutre.
// BÉNIN dominant (le moins hostile), MAL en retrait, CHAOS rare mais possible
// dès le 1ᵉʳ neutre (à partir de 8 joueurs).
export const NEUTRE_TYPE_WEIGHTS: Record<string, number> = {
  BÉNIN: 1.0,
  MAL: 0.45,
  CHAOS: 0.2,
};

// Nombre d'acolytes (hors Tueur principal).
// ≤9 → 1 acolyte (2 méchants au total) pour éviter la surcharge à 9 joueurs.
// PLAFOND À 2 acolytes (3 méchants max) : à 14-15 joueurs le 4ᵉ méchant faisait
// basculer la parité bien trop tôt (Civils tombaient à ~25 % de victoires).
export function acolytesCountFor(playerCount: number): number {
  if (playerCount <= 9) return 1;
  return 2;
}
