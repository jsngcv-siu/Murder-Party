// Cellule — barreaux verticaux d'acier + cadre de fer posés sur la photo d'un
// joueur emprisonné (la photo reste entièrement visible derrière).
//
// COMPOSANT PARTAGÉ : consommé par le mur des suspects (PA3Suspicions) et par
// le cadre d'annonce « prison » (GazetteCard). À modifier ICI uniquement, pour
// que le joueur derrière les barreaux soit identique partout.
//
// Le parent doit être `position: relative` et rogner (`overflow: hidden`).
//
// `frameWidth` : épaisseur du cadre de fer. 4px convient aux grandes photos du
// mur des suspects ; sur une petite vignette (polaroïd d'annonce, 48×56) le même
// trait paraît énorme — d'où le réglage.
export function PrisonBars({ frameWidth = 4 }: { frameWidth?: number }) {
  const bar = {
    width: "5%",
    background: "linear-gradient(90deg, #34383e 0%, #c8cdd3 32%, #8b9199 56%, #34383e 100%)",
    boxShadow: "1.5px 0 2px oklch(0 0 0 / 0.4)",
  };
  return (
    <span aria-hidden className="absolute inset-0 z-20 pointer-events-none">
      {/* Barreaux verticaux */}
      {["16%", "37%", "58%", "79%"].map((left) => (
        <span key={left} className="absolute top-0 bottom-0" style={{ left, ...bar }} />
      ))}
      {/* Cadre de fer — contour noir épais */}
      <span
        className="absolute inset-0"
        style={{
          border: `${frameWidth}px solid #1e2024`,
          boxShadow: "inset 0 0 0 1px oklch(0.72 0.02 250 / 0.3)",
        }}
      />
    </span>
  );
}
