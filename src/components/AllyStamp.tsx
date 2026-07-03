// Tampon « ALLIÉ » — tampon caoutchouc rouge plein posé sur la photo d'un
// complice Méchant (cf. catalogue « Tampon caoutchouc » : rouge plein = allié).
// Pensé pour ressortir même quand le fond de l'image est rouge : texte clair,
// liseré clair et ombre portée. À placer dans un conteneur `relative`.
export function AllyStamp({ className = "" }: { className?: string }) {
  return (
    <span
      aria-label="Allié"
      className={`absolute left-1/2 top-[15%] -translate-x-1/2 z-20 pointer-events-none px-1.5 py-0.5 leading-none uppercase ${className}`}
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 9,
        letterSpacing: "0.12em",
        color: "oklch(0.98 0.02 20)",
        background: "var(--primary)",
        border: "1.5px solid oklch(0.97 0.02 25 / 0.92)",
        borderRadius: 3,
        transform: "rotate(-9deg)",
        boxShadow: "0 2px 7px oklch(0 0 0 / 0.7), 0 0 0 1px oklch(0 0 0 / 0.25)",
      }}
    >
      Allié
    </span>
  );
}
