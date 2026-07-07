// Briques visuelles partagées par les fenêtres « dossier » de la direction
// artistique The Board (cf. design page 11 « modales »). Une modale = une carte
// de papier kraft épinglée : punaise rouge, ficelle tendue optionnelle, tampon
// de catégorie, pastille emoji d'angle.
import type { CSSProperties, ReactNode } from "react";

export const PAPER = "linear-gradient(180deg,#f6eedd,#ece2cc)";
export const PAPER_BORDER = "#d9c9a6";
export const INK_SOFT = "#9a7b52";
export const INK_BODY = "#4a3322";

/** Punaise rouge ronde. `light` = variante claire pour les fonds sombres. */
export function BoardPin({
  size = 14,
  light = false,
  style,
}: {
  size?: number;
  light?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      style={{
        display: "block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: light
          ? "radial-gradient(circle at 35% 30%,#ffd0b0,#c0392b)"
          : "radial-gradient(circle at 35% 30%,#ff8e98,#b01b2c)",
        boxShadow: "0 4px 8px rgba(0,0,0,.5)",
        ...style,
      }}
    />
  );
}

/** Ficelle rouge tendue en arc au-dessus de la carte, ancrée par deux punaises. */
export function BoardStringArc() {
  return (
    <>
      <svg
        viewBox="0 0 200 26"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          top: -13,
          left: "6%",
          width: "88%",
          height: 24,
          overflow: "visible",
        }}
        aria-hidden
      >
        <path
          d="M4,5 Q100,33 196,5"
          fill="none"
          stroke="#b01f2c"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M4,5 Q100,33 196,5"
          fill="none"
          stroke="#ef5566"
          strokeWidth="0.7"
          strokeLinecap="round"
        />
      </svg>
      <span
        style={{ position: "absolute", left: "6%", top: -13, transform: "translate(-50%,-50%)" }}
      >
        <BoardPin size={13} />
      </span>
      <span
        style={{ position: "absolute", left: "94%", top: -13, transform: "translate(-50%,-50%)" }}
      >
        <BoardPin size={13} />
      </span>
    </>
  );
}

/** Pastille ronde « cire » avec un emoji, posée dans un angle de la carte. */
export function BoardEmojiBadge({
  emoji,
  bg,
  corner = "br",
  size = 42,
}: {
  emoji: ReactNode;
  bg: string;
  corner?: "tr" | "br";
  size?: number;
}) {
  const pos: CSSProperties =
    corner === "tr" ? { top: -16, right: -12 } : { bottom: -12, right: -8 };
  return (
    <span
      className="bm-emoji"
      style={{
        position: "absolute",
        ...pos,
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        boxShadow: "0 6px 12px -3px rgba(0,0,0,.6),inset 0 0 0 2.5px rgba(255,255,255,.16)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        transform: "rotate(-8deg)",
      }}
    >
      {emoji}
    </span>
  );
}

/** Tampon encreur (mot de catégorie encadré, légèrement tourné). */
export function BoardStamp({
  children,
  color,
  bg,
  rotate = -2.2,
}: {
  children: ReactNode;
  color: string;
  bg?: string;
  rotate?: number;
}) {
  return (
    <span
      className="bm-stamp"
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 11,
        letterSpacing: ".08em",
        color,
        border: `2px solid ${color}`,
        borderRadius: 4,
        padding: "3px 9px",
        transform: `rotate(${rotate}deg)`,
        background: bg ?? "transparent",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
