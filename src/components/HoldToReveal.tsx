// HoldToReveal — primitive anti-peek (invariant « privacy by default »).
//
// Tant que ce n'est pas révélé, les enfants NE SONT PAS montés : rien à
// espionner dans le DOM, et l'UI affichée est strictement uniforme d'un rôle à
// l'autre (sigle neutre + « Maintiens pour révéler »). Au bout d'un appui
// maintenu de 0,5 s — N'IMPORTE OÙ sur la zone, pas juste le cercle — on révèle
// et on rend les enfants tels quels (fragment pur, aucun wrapper → on ne casse
// ni le sticky ni le scroll du contenu).
//
// Re-masquage : automatique quand l'app passe en arrière-plan / écran éteint
// (téléphone posé ou échangé). Le changement d'onglet du bas remonte déjà ce
// composant, ce qui re-masque aussi naturellement.
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { EyeOff, Fingerprint } from "lucide-react";

const HOLD_MS = 500;

export function HoldToReveal({
  children,
  label = "Ta capacité",
  hint = "Maintiens pour révéler",
}: {
  children: ReactNode;
  label?: string;
  hint?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);

  const stopHold = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setProgress(0);
  }, []);

  const tick = useCallback(() => {
    const p = Math.min(1, (performance.now() - startRef.current) / HOLD_MS);
    setProgress(p);
    if (p >= 1) {
      rafRef.current = null;
      setProgress(0);
      setRevealed(true);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startHold = useCallback(() => {
    startRef.current = performance.now();
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  // Re-masque dès que l'app n'est plus au premier plan.
  useEffect(() => {
    if (!revealed) return;
    const onVis = () => { if (document.visibilityState === "hidden") setRevealed(false); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [revealed]);

  // Nettoyage du rAF au démontage.
  useEffect(() => () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); }, []);

  if (revealed) return <>{children}</>;

  // Anneau de progression (SVG, démarre en haut via la rotation -90°).
  const R = 34;
  const CIRC = 2 * Math.PI * R;
  const holding = progress > 0;

  return (
    // Toute la zone est la cible de press : maintenir N'IMPORTE OÙ révèle.
    <button
      type="button"
      onPointerDown={startHold}
      onPointerUp={stopHold}
      onPointerLeave={stopHold}
      onPointerCancel={stopHold}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setRevealed(true); } }}
      style={{ touchAction: "none", WebkitTapHighlightColor: "transparent" }}
      className="relative w-full flex flex-col items-center justify-center text-center px-6 py-14 min-h-full select-none cursor-pointer overflow-hidden"
      aria-label="Maintenir pour révéler ta capacité"
    >
      {/* Halo d'ambiance « lampe de bureau » au centre */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 85% 55% at 50% 40%, oklch(0.24 0.06 60 / 0.6), transparent 72%)" }}
      />

      {/* Empreintes fantômes en fond — motif signature de la DA, opacité faible,
          disposées autour du sceau central. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <Fingerprint className="absolute left-[6%] top-[14%] size-28 -rotate-12 opacity-[0.05]" style={{ color: "var(--primary)" }} />
        <Fingerprint className="absolute right-[4%] top-[26%] size-32 rotate-[14deg] opacity-[0.055]" style={{ color: "oklch(0.70 0.08 75)" }} />
        <Fingerprint className="absolute left-[14%] bottom-[10%] size-24 rotate-6 opacity-[0.045]" style={{ color: "oklch(0.70 0.08 75)" }} />
        <Fingerprint className="absolute right-[12%] bottom-[14%] size-20 -rotate-[8deg] opacity-[0.05]" style={{ color: "var(--primary)" }} />
      </div>

      {/* En-tête « dossier confidentiel » */}
      <div
        className="relative text-[11px] uppercase tracking-[0.34em] font-bold"
        style={{ fontFamily: "var(--font-display)", color: "oklch(0.82 0.13 82)" }}
      >
        {label}
      </div>
      <div
        className="relative mt-1 text-[13px]"
        style={{ fontFamily: "var(--font-hand)", color: "oklch(0.78 0.06 70)" }}
      >
        dossier confidentiel
      </div>

      {/* Sceau / cadran de laiton à presser — agrandi pour devenir la cible
          principale du geste « pose ton pouce ». */}
      <div className={`relative mt-9 grid place-items-center size-44 rounded-full ${holding ? "" : "pulse-gold"}`}>
        {/* Anneau de progression */}
        <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 80 80" aria-hidden>
          <circle cx="40" cy="40" r={R} fill="none" stroke="oklch(0.42 0.05 60 / 0.6)" strokeWidth="3" />
          <circle
            cx="40"
            cy="40"
            r={R}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - progress)}
            style={{ filter: "drop-shadow(0 0 5px var(--primary))", transition: holding ? "none" : "stroke-dashoffset 0.2s" }}
          />
        </svg>

        {/* Disque central — sceau de laiton gravé, frappé de l'empreinte. */}
        <span
          className="grid place-items-center size-36 rounded-full transition-transform"
          style={{
            background: "radial-gradient(circle at 38% 30%, oklch(0.32 0.04 58), oklch(0.15 0.02 40) 78%)",
            boxShadow:
              "inset 0 0 0 1px oklch(0.62 0.12 78 / 0.45), inset 0 7px 16px oklch(0 0 0 / 0.65), 0 10px 24px -10px oklch(0 0 0 / 0.85)",
            color: "var(--primary)",
            transform: holding ? "scale(0.96)" : "scale(1)",
          }}
        >
          <Fingerprint className="size-16" style={{ filter: holding ? "drop-shadow(0 0 8px var(--primary))" : undefined }} aria-hidden />
        </span>
      </div>

      {/* Instruction principale */}
      <div className="relative mt-8 text-base font-bold text-glow-gold" style={{ fontFamily: "var(--font-display)" }}>
        {hint}
      </div>

      {/* Avertissement anti-peek — pastille papier */}
      <div
        className="relative mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5"
        style={{ fontFamily: "var(--font-hand)", fontSize: 13, color: "oklch(0.80 0.04 75)" }}
      >
        <EyeOff className="size-3.5 opacity-80" aria-hidden />
        Cache ton écran des autres joueurs.
      </div>
    </button>
  );
}
