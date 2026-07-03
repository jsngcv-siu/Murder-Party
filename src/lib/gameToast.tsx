// Helper d'émission des 2 notifs volantes du jeu (nouvel objet / nouvelle
// annonce) sous forme de carte custom `GameToast`, alignée sur la DA et animée
// en GSAP. Les toasts système (succès/erreur) restent en `toast()` standard.
import type { ReactNode } from "react";
import { toast } from "sonner";
import { GameToast } from "@/components/GameToast";
import type { Tone } from "@/lib/tones";

export function gameToast(opts: {
  tone: Tone;
  icon: ReactNode;
  label: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}) {
  toast.custom(
    (id) => (
      <GameToast
        toastId={id}
        tone={opts.tone}
        icon={opts.icon}
        label={opts.label}
        title={opts.title}
        description={opts.description}
        actionLabel={opts.actionLabel}
        onAction={opts.onAction}
      />
    ),
    {
      duration: opts.duration ?? 4000,
      // `GameToast` porte déjà sa propre carte (verre sombre, ring, barre d'accent).
      // On neutralise le cadre par défaut du Toaster (toastOptions.style, prévu pour
      // les toasts système) sinon il dépasse derrière la carte.
      unstyled: true,
      style: { background: "transparent", border: "none", boxShadow: "none", padding: 0, backdropFilter: "none" },
    },
  );
}
