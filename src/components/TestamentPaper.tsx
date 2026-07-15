// Parchemin scellé — COQUILLE VISUELLE PARTAGÉE (DA « tableau d'enquête ») :
// papier réglé vieilli + scotchs d'angle qui dépassent du haut.
//
// Source unique de la DA du testament, consommée par :
//  - TestamentEditor (rédaction, joueur mort/prisonnier) ;
//  - la lecture du testament d'un défunt (onglet Annonces / Cimetière).
// Toute retouche du parchemin se fait ICI pour que les deux écrans ne divergent
// jamais.
import type { ReactNode } from "react";

export function TestamentPaper({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative ${className}`}
      style={{
        borderRadius: "3px 3px 2px 2px",
        background:
          "repeating-linear-gradient(180deg, transparent 0 27px, oklch(0.55 0.06 70 / 0.16) 27px 28px), radial-gradient(120% 80% at 50% 0%, oklch(0.95 0.03 90), oklch(0.90 0.045 80))",
        boxShadow:
          "0 14px 30px -14px oklch(0 0 0 / 0.8), inset 0 0 44px oklch(0.45 0.10 55 / 0.32), inset 0 0 0 1px oklch(0.55 0.08 60 / 0.3)",
      }}
    >
      {/* Scotch d'angle (gauche / droite) */}
      <span
        aria-hidden
        className="absolute"
        style={{
          top: -10,
          left: 22,
          width: 62,
          height: 18,
          background: "oklch(0.86 0.04 85 / 0.5)",
          transform: "rotate(-3deg)",
          boxShadow: "0 2px 4px oklch(0 0 0 / 0.25)",
        }}
      />
      <span
        aria-hidden
        className="absolute"
        style={{
          top: -10,
          right: 22,
          width: 62,
          height: 18,
          background: "oklch(0.86 0.04 85 / 0.5)",
          transform: "rotate(3deg)",
          boxShadow: "0 2px 4px oklch(0 0 0 / 0.25)",
        }}
      />

      <div className="px-5 pt-5 pb-4">{children}</div>
    </div>
  );
}

/** Titre manuscrit du parchemin (« Mes dernières volontés »). */
export function TestamentTitle({ children }: { children: ReactNode }) {
  return (
    <div
      className="leading-none"
      style={{
        fontFamily: "var(--font-hand)",
        fontWeight: 700,
        fontSize: 28,
        color: "oklch(0.40 0.08 45)",
        transform: "rotate(-1deg)",
      }}
    >
      {children}
    </div>
  );
}
