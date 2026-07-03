// Avatar au format "polaroid" : photo carrée + passe-partout blanc + nom
// dessous. Utilisé par le picker et le salon d'attente. Pendant visuel de
// AvatarImg (qui reste pour les petites pastilles en jeu).
import type { AvatarDef } from "@/lib/avatars";

type Props = {
  avatar: AvatarDef;
  /** Largeur de la carte en px. */
  size?: number;
  selected?: boolean;
  disabled?: boolean;
  /** Affiche la légende (nom). Défaut: true. */
  caption?: boolean;
  className?: string;
};

export function AvatarPolaroid({
  avatar,
  size = 96,
  selected = false,
  disabled = false,
  caption = true,
  className = "",
}: Props) {
  // Le cadre blanc : fines marges en haut/côtés, marge plus large en bas pour
  // la légende (codes du polaroid). Les valeurs scalent avec `size`.
  const pad = Math.max(4, Math.round(size * 0.06));

  return (
    <div
      className={`inline-flex flex-col rounded-[3px] bg-[#f4efe4] shadow-[0_2px_10px_-2px_rgba(0,0,0,0.55)] ring-1 transition-all duration-150 ${
        selected
          ? "ring-2 ring-gold shadow-[0_0_22px_-4px_oklch(0.78_0.16_75/0.6)] -rotate-1"
          : "ring-black/10"
      } ${disabled ? "opacity-40 grayscale" : ""} ${className}`}
      style={{ width: size, padding: pad, paddingBottom: caption ? Math.round(pad * 1.4) : pad }}
    >
      <div className="relative w-full aspect-square overflow-hidden rounded-[2px] bg-[#e7e0d2]">
        {avatar.image_url ? (
          <img
            src={avatar.image_url}
            alt={avatar.name}
            draggable={false}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-2xl text-black/40">
            {avatar.emoji}
          </div>
        )}
      </div>
      {caption && (
        <div
          className="mt-1 text-center font-semibold tracking-wide text-[#2b2620] truncate"
          style={{ fontSize: Math.max(9, Math.round(size * 0.12)) }}
          title={avatar.name}
        >
          {avatar.name}
        </div>
      )}
    </div>
  );
}
