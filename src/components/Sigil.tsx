// Sigil — glyphe COLORÉ (sans cadre ni cerclage). Donne de la couleur et de la vie
// aux icônes sans revenir aux emoji, en pilotant la teinte par une couleur d'ACCENT
// (faction / phase / section / tone) dérivée via color-mix.
//
//  • inactif → glyphe dans une version atténuée de l'accent ;
//  • actif   → glyphe dans une version claire de l'accent + léger halo diffus
//              (drop-shadow, pas de contour).
//
// SVG only → rendu identique sur tous les téléphones (contrairement aux emoji).
import type { CSSProperties, ReactNode } from "react";

export function Sigil({
  children,
  active = false,
  size = 38,
  accent = "var(--primary)",
  glyph,
  className = "",
  style,
}: {
  children: ReactNode;
  active?: boolean;
  size?: number;
  /** Couleur pilote du glyphe (faction / phase / section / tone). */
  accent?: string;
  /** Override de la couleur du glyphe à l'état actif. */
  glyph?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const mix = (pct: number, into: string) => `color-mix(in oklab, ${accent} ${pct}%, ${into})`;
  return (
    <span
      aria-hidden
      className={`relative grid place-items-center shrink-0 transition-all duration-300 ease-out ${className}`}
      style={{
        width: size,
        height: size,
        color: active ? (glyph ?? mix(82, "white")) : mix(56, "var(--muted-foreground)"),
        filter: active ? `drop-shadow(0 0 7px ${mix(55, "transparent")})` : undefined,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
