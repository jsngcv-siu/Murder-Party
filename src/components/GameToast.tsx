// GameToast — carte de notification volante alignée sur la DA de l'app
// (verre sombre, ring/glow teintés par le ton, barre d'accent, titre Cinzel).
// Utilisée par les 2 notifs volantes du jeu (nouvel objet / nouvelle annonce)
// via `gameToast()`. Les couleurs viennent de la source unique @/lib/tones, donc
// un même concept rend pareil ici et dans les modales (PlayerEventModal).
//
// Entrée animée avec GSAP : la carte se pose (back.out), l'icône surgit, le
// texte cascade. Respecte prefers-reduced-motion (aucune anim si l'utilisateur
// la demande — les `.from` ne sont alors jamais créés, l'élément reste visible).
import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { toast } from "sonner";
import { type Tone, eventTheme } from "@/lib/tones";

export type GameToastProps = {
  toastId: string | number;
  tone: Tone;
  /** Icône : composant Lucide (coloré par le ton) ou emoji de contenu (objets). */
  icon: ReactNode;
  label: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function GameToast({
  toastId,
  tone,
  icon,
  label,
  title,
  description,
  actionLabel,
  onAction,
}: GameToastProps) {
  const root = useRef<HTMLDivElement>(null);
  const t = eventTheme(tone);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      // Anim seulement si l'utilisateur n'a PAS demandé de mouvement réduit.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from(root.current, {
            autoAlpha: 0,
            y: -12,
            scale: 0.96,
            duration: 0.45,
            ease: "back.out(1.4)",
          })
          .from("[data-tt-bar]", { scaleY: 0, transformOrigin: "top", duration: 0.4 }, "-=0.30")
          .from(
            "[data-tt-icon]",
            { scale: 0, rotation: -25, autoAlpha: 0, duration: 0.5, ease: "back.out(2)" },
            "-=0.32",
          )
          .from(
            "[data-tt-text] > *",
            { y: 8, autoAlpha: 0, duration: 0.32, stagger: 0.06 },
            "-=0.30",
          )
          .from(
            "[data-tt-action]",
            { scale: 0.8, autoAlpha: 0, duration: 0.3, ease: "back.out(1.8)" },
            "-=0.24",
          );
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const dismiss = () => toast.dismiss(toastId);

  return (
    <div
      ref={root}
      onClick={dismiss}
      className="group relative flex w-[340px] max-w-[92vw] cursor-pointer overflow-hidden rounded-2xl press"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.20 0.025 35 / 0.85), oklch(0.15 0.02 35 / 0.85))",
        backdropFilter: "blur(14px) saturate(1.2)",
        WebkitBackdropFilter: "blur(14px) saturate(1.2)",
        border: "1px solid oklch(1 0 0 / 0.07)",
        // Une seule ombre « relief » : pas de halo coloré derrière (qui se lisait
        // comme un second cadre). La couleur du ton vit dans la barre d'accent.
        boxShadow: "var(--shadow-raised)",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Barre d'accent teintée */}
      <div data-tt-bar className="w-1.5 shrink-0" style={{ background: t.accent }} />

      <div className="flex flex-1 items-center gap-3 p-3 pr-2.5">
        {/* Icône en pastille */}
        <div
          data-tt-icon
          className="grid size-11 shrink-0 place-items-center rounded-xl text-2xl [&_svg]:size-6"
          style={{
            background: "oklch(0.12 0.02 35 / 0.8)",
            boxShadow: `0 0 0 1.5px ${t.ring}, inset 0 0 18px ${t.ring}`,
          }}
        >
          <span style={{ filter: `drop-shadow(0 0 6px ${t.accent})`, color: t.accent }}>
            {icon}
          </span>
        </div>

        {/* Textes */}
        <div data-tt-text className="min-w-0 flex-1">
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: t.accent }}
          >
            {label}
          </div>
          <div
            className="mt-0.5 truncate text-sm font-semibold"
            style={{ fontFamily: "var(--font-display)", color: "oklch(0.96 0.01 90)" }}
          >
            {title}
          </div>
          {description && (
            <div className="truncate text-[11px] text-muted-foreground">{description}</div>
          )}
        </div>

        {/* Action */}
        {actionLabel && (
          <button
            data-tt-action
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAction?.();
              dismiss();
            }}
            className="press shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold"
            style={{
              background: t.accent,
              color: "oklch(0.14 0.02 35)",
              boxShadow: `0 4px 12px ${t.ring}`,
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
