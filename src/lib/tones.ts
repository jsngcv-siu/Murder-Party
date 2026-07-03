// Source UNIQUE des teintes sémantiques de l'app.
//
// Tout ce qui est coloré par "nature d'événement / de statut" (badges de la
// StatusBandeau, modales d'événement perso) lit ses couleurs ici. Avant, chaque
// surface redéfinissait ses propres valeurs oklch à la main → un même concept
// (mort = rouge, prison = ambre…) ne rendait pas pareil d'une surface à l'autre.
//
// Deux représentations dérivent du registre :
//  • `TONE_CLS`   → classes Tailwind pour les petites pastilles (badges).
//  • `eventTheme` → styles oklch générés pour les grandes surfaces (modales).
//
// Note : badges et modales ne partagent PAS toujours la même teinte par choix
// (ex. le badge « Mort » est volontairement vert-cadavre). Le registre unifie
// le vocabulaire, pas les décisions de design.

export type Tone =
  | "sky" | "emerald" | "rose" | "redDark" | "amber" | "yellow"
  | "orange" | "purple" | "pink" | "fuchsia" | "stone" | "deadGreen";

/** Teinte de base (hue) + chroma de chaque ton sémantique. */
export const TONE_HUE: Record<Tone, { hue: number; chroma: number }> = {
  sky:       { hue: 230, chroma: 0.16 },
  emerald:   { hue: 145, chroma: 0.18 },
  rose:      { hue: 22,  chroma: 0.22 },
  redDark:   { hue: 22,  chroma: 0.22 },
  amber:     { hue: 60,  chroma: 0.16 },
  yellow:    { hue: 85,  chroma: 0.18 },
  orange:    { hue: 45,  chroma: 0.18 },
  purple:    { hue: 300, chroma: 0.20 },
  pink:      { hue: 350, chroma: 0.22 },
  fuchsia:   { hue: 320, chroma: 0.24 },
  stone:     { hue: 55,  chroma: 0.04 },
  deadGreen: { hue: 145, chroma: 0.16 },
};

/** Pastilles (badges) — rendu Tailwind, aligné sur les hues de `TONE_HUE`. */
export const TONE_CLS: Record<Tone, string> = {
  sky:       "bg-sky-500/12 text-sky-200 border-sky-400/40 shadow-[0_0_12px_-4px_oklch(0.70_0.16_230/0.5)]",
  emerald:   "bg-emerald-500/12 text-emerald-200 border-emerald-400/40 shadow-[0_0_12px_-4px_oklch(0.70_0.18_145/0.5)]",
  rose:      "bg-rose-500/12 text-rose-200 border-rose-400/40 shadow-[0_0_12px_-4px_oklch(0.65_0.22_22/0.5)]",
  redDark:   "bg-red-900/30 text-red-200 border-red-700/55 shadow-[0_0_12px_-4px_oklch(0.50_0.22_22/0.5)]",
  amber:     "bg-amber-500/12 text-amber-200 border-amber-400/40 shadow-[0_0_12px_-4px_oklch(0.78_0.16_60/0.5)]",
  yellow:    "bg-yellow-500/12 text-yellow-200 border-yellow-400/40 shadow-[0_0_12px_-4px_oklch(0.86_0.18_85/0.55)]",
  orange:    "bg-orange-500/12 text-orange-200 border-orange-400/40 shadow-[0_0_12px_-4px_oklch(0.72_0.18_45/0.5)]",
  purple:    "bg-purple-500/15 text-purple-200 border-purple-400/45 shadow-[0_0_12px_-4px_oklch(0.60_0.20_300/0.5)]",
  pink:      "bg-pink-500/12 text-pink-200 border-pink-400/40 shadow-[0_0_12px_-4px_oklch(0.68_0.22_350/0.5)]",
  fuchsia:   "bg-fuchsia-500/12 text-fuchsia-200 border-fuchsia-400/40 shadow-[0_0_12px_-4px_oklch(0.65_0.24_320/0.5)]",
  stone:     "bg-stone-500/15 text-stone-200 border-stone-400/40 shadow-[0_0_12px_-4px_oklch(0.60_0.04_55/0.4)]",
  deadGreen: "bg-emerald-700/22 text-emerald-200 border-emerald-700/50 shadow-[0_0_12px_-4px_oklch(0.50_0.16_145/0.55)]",
};

export type SurfaceTheme = { ring: string; bg: string; accent: string; glow: string };

/**
 * Thème généré pour une grande surface (modale d'événement), dérivé du hue/chroma
 * du ton. Garantit que toutes les modales partagent la même grammaire visuelle.
 */
export function eventTheme(tone: Tone): SurfaceTheme {
  const { hue, chroma: c } = TONE_HUE[tone];
  const f = (n: number) => n.toFixed(3);
  return {
    ring: `oklch(0.58 ${c} ${hue} / 0.55)`,
    bg: `linear-gradient(160deg, oklch(0.18 ${f(c * 0.34)} ${hue} / 0.98), oklch(0.10 ${f(c * 0.2)} ${hue} / 0.98))`,
    accent: `oklch(0.78 ${c} ${hue})`,
    glow: `0 0 80px oklch(0.58 ${c} ${hue} / 0.5)`,
  };
}
