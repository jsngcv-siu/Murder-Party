// Engine constants.
// Bot tick base interval (ms). Multiplier divides this.
export const BOT_TICK_BASE_MS = 4000;

// ─────────── Quotas de tirage par type & faction ───────────
// Plafonds appliqués dans drawRoles selon la taille de partie.
// `min`/`max` = bornes inclusives par type ; le pool tire au hasard pondéré (draw_weight)
// entre min et max, dans la limite des slots restants pour la faction.

export type TypeQuota = { min: number; max: number };
export type FactionQuotas = Record<string, TypeQuota>;

function bracket(n: number): "small" | "mid" | "large" | "xl" {
  if (n <= 8) return "small";
  if (n <= 13) return "mid";
  if (n <= 17) return "large";
  return "xl"; // 18–20 joueurs
}

// Côté MÉCHANT (acolytes, hors Tueur principal qui est MUST).
// ⚠ Pas de TUEUR secondaire dans les acolytes (interdit par design).
// Familles acolytes = INVESTIGATION / TROMPERIE / CONTRÔLE (Méchant/SUPPORT n'existe plus :
// Cleaner + Maître chanteur ont migré vers CONTRÔLE avec Voleur + Marionnettiste).
const ACOLYTE_QUOTAS: Record<"small" | "mid" | "large" | "xl", FactionQuotas> = {
  small: {
    INVESTIGATION: { min: 0, max: 1 },
    TROMPERIE: { min: 0, max: 1 },
    CONTRÔLE: { min: 0, max: 1 },
  },
  mid: {
    INVESTIGATION: { min: 1, max: 1 },
    TROMPERIE: { min: 0, max: 1 },
    CONTRÔLE: { min: 0, max: 1 },
  },
  large: {
    INVESTIGATION: { min: 1, max: 1 },
    TROMPERIE: { min: 1, max: 2 },
    CONTRÔLE: { min: 0, max: 2 },
  },
  xl: {
    INVESTIGATION: { min: 1, max: 2 },
    TROMPERIE: { min: 1, max: 2 },
    CONTRÔLE: { min: 1, max: 2 },
  },
};

// Côté CIVIL (hors base MUST : assistant_du_detective + majordome, toujours forcés avant ce tirage).
// Cible de répartition (cf. plan §3) : enquêteurs présents sans envahir la partie.
const CIVIL_QUOTAS: Record<"small" | "mid" | "large" | "xl", FactionQuotas> = {
  small: {
    INVESTIGATION: { min: 1, max: 2 },
    PROTECTEUR: { min: 0, max: 1 },
    TUEUR: { min: 0, max: 1 },
    SUPPORT: { min: 1, max: 2 },
  },
  mid: {
    INVESTIGATION: { min: 2, max: 2 },
    PROTECTEUR: { min: 1, max: 2 },
    TUEUR: { min: 1, max: 1 },
    SUPPORT: { min: 1, max: 2 },
  },
  large: {
    INVESTIGATION: { min: 2, max: 3 },
    PROTECTEUR: { min: 2, max: 2 },
    TUEUR: { min: 1, max: 2 },
    SUPPORT: { min: 2, max: 3 },
  },
  xl: {
    INVESTIGATION: { min: 3, max: 4 },
    PROTECTEUR: { min: 2, max: 3 },
    TUEUR: { min: 1, max: 2 },
    SUPPORT: { min: 2, max: 3 },
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
// Étendu à 20 j. : 3ᵉ neutre seulement aux très grandes tables (chaos dosé, cf. plan §4).
export function neutresCountFor(playerCount: number): number {
  if (playerCount <= 7) return 0;
  if (playerCount <= 11) return 1;
  if (playerCount <= 17) return 2;
  return 3; // 18–20 joueurs
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
// ≤9 → 1 acolyte (2 méchants). Plafond DOUX : 2 acolytes (3 méchants) jusqu'à 17 j.,
// 3 acolytes (4 méchants) à 18–20 j. La sim (sim/balance.mjs) montre qu'aller à 5
// méchants faisait dominer les Méchants (~68 %) ; 4 est déjà limite (~60 %). Le
// scaling méchant reste donc conservateur — un vrai calage 55/45 sur les grandes
// tables demande encore un passage d'équilibrage (cf. note plan §8).
export function acolytesCountFor(playerCount: number): number {
  if (playerCount <= 9) return 1;
  if (playerCount <= 17) return 2;
  return 3; // 18–20 joueurs → 4 méchants
}
