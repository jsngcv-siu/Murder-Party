// Carousel horizontal des « feuilles » du dossier de rôle.
//
// Page 0 = l'identité + la capacité (rendu par l'appelant). Pages suivantes =
// les subtilités (roleExtraInfo). On slide d'une feuille à l'autre : flèche
// animée qui déborde du bord droit et invite à glisser, points de pagination,
// swipe tactile, et hauteur de la feuille animée pour épouser la page active.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function RoleDossierSlider({ pages }: { pages: ReactNode[] }) {
  const count = pages.length;
  const [index, setIndex] = useState(0);
  const [height, setHeight] = useState<number | undefined>(undefined);
  // Une fois que le joueur a slidé au moins une fois, on coupe le « nudge » de
  // la flèche : l'affordance a été comprise.
  const [hintDone, setHintDone] = useState(false);

  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const chevronRef = useRef<HTMLSpanElement>(null);

  const canPrev = index > 0;
  const canNext = index < count - 1;

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(count - 1, next));
    if (clamped !== index) {
      setIndex(clamped);
      setHintDone(true);
    }
  };

  // Hauteur de la feuille = hauteur de la page active. On observe la page active
  // (ResizeObserver) pour suivre ses changements (ex. capacité qu'on déplie).
  useLayoutEffect(() => {
    const el = slideRefs.current[index];
    if (!el) return;
    const measure = () => setHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [index, count]);

  // Flèche invitante : petit va-et-vient du chevron tant que le joueur n'a pas
  // encore slidé (et s'il reste une page à droite). Coupé si prefers-reduced-motion.
  // On anime le chevron SEUL (pas le bouton positionné) pour ne pas casser son
  // placement en débord de bord.
  useEffect(() => {
    const el = chevronRef.current;
    if (!el || hintDone || !canNext) return;
    const mm = gsap.matchMedia();
    mm.add({ ok: "(prefers-reduced-motion: no-preference)" }, () => {
      gsap.to(el, { x: 3, duration: 0.7, repeat: -1, yoyo: true, ease: "sine.inOut" });
    });
    return () => mm.revert();
  }, [hintDone, canNext, index]);

  // ── Swipe tactile / souris (drag) ────────────────────────────────
  const drag = useRef({ active: false, startX: 0, dx: 0 });
  const [dragDx, setDragDx] = useState(0);

  const onPointerDown = (e: React.PointerEvent) => {
    if (count <= 1) return;
    drag.current = { active: true, startX: e.clientX, dx: 0 };
    setDragDx(0);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    let dx = e.clientX - drag.current.startX;
    // Résistance en bout de course (pas de page de ce côté).
    if ((dx > 0 && !canPrev) || (dx < 0 && !canNext)) dx *= 0.25;
    drag.current.dx = dx;
    setDragDx(dx);
  };
  const endDrag = () => {
    if (!drag.current.active) return;
    const dx = drag.current.dx;
    drag.current.active = false;
    setDragDx(0);
    const threshold = 44;
    if (dx <= -threshold && canNext) go(index + 1);
    else if (dx >= threshold && canPrev) go(index - 1);
  };

  const dragging = drag.current.active;
  const trackTransform = `translateX(calc(${-index * 100}% + ${dragDx}px))`;

  return (
    <div className="relative">
      <div
        className="overflow-hidden touch-pan-y"
        style={{ height, transition: "height 0.32s cubic-bezier(0.4, 0, 0.2, 1)" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        <div
          className="flex items-start"
          style={{
            transform: trackTransform,
            transition: dragging ? "none" : "transform 0.36s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {pages.map((page, i) => (
            <div
              key={i}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              className="w-full shrink-0"
              aria-hidden={i !== index}
            >
              {page}
            </div>
          ))}
        </div>
      </div>

      {/* Flèche gauche — feuille précédente (dans la marge gauche de la feuille) */}
      {canPrev && (
        <button
          type="button"
          onClick={() => go(index - 1)}
          aria-label="Feuille précédente"
          className="absolute left-1 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full transition active:scale-90"
          style={{
            background: "color-mix(in oklab, var(--paper-ink) 8%, transparent)",
            color: "var(--paper-ink-soft)",
          }}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
      )}

      {/* Flèche droite — invite à glisser vers les infos supplémentaires */}
      {canNext && (
        <button
          type="button"
          onClick={() => go(index + 1)}
          aria-label="Infos supplémentaires"
          className="absolute right-1 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-white shadow-md transition active:brightness-90"
          style={{
            // Rouge de l'épingle du dossier (tokens --pin-red-*, partagés avec
            // .pin::before) : la flèche appartient à la même grammaire visuelle.
            background: "radial-gradient(circle at 35% 30%, var(--pin-red-hi), var(--pin-red-lo))",
            boxShadow: "0 4px 12px -3px color-mix(in oklab, var(--pin-red-lo) 60%, transparent)",
          }}
        >
          <span ref={chevronRef} className="grid place-items-center">
            <ChevronRight className="size-4" aria-hidden />
          </span>
        </button>
      )}

      {/* Points de pagination */}
      {count > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Feuille ${i + 1}`}
              aria-current={i === index}
              className="rounded-full transition-all"
              style={{
                width: i === index ? 18 : 6,
                height: 6,
                background:
                  i === index
                    ? "color-mix(in oklab, var(--paper-ink) 62%, transparent)"
                    : "color-mix(in oklab, var(--paper-ink) 24%, transparent)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
