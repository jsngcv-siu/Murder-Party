// Avatar joueur — image circulaire si avatars.image_url est renseigné dans la
// DB, sinon fallback emoji. Pendant à RoleIcon pour les rôles.
import { avatarOf, type AvatarDef } from "@/lib/avatars";

type Props = {
  /** Soit l'id direct, soit un objet déjà résolu via avatarOf(). */
  id?: string | null;
  avatar?: AvatarDef;
  /** Taille en px du cadre (carré). */
  size?: number;
  /** Classes appliquées au wrapper. */
  className?: string;
  /** Classes appliquées à l'emoji fallback (font-size auto si non fourni). */
  emojiClassName?: string;
  /** Coupe / forme. Par défaut rond. */
  rounded?: "full" | "lg" | "md" | "none";
  /** Remplit son conteneur (100% × 100%) au lieu d'imposer `size` px. Utile
   *  pour un cadre rectangulaire (polaroïd) où l'image épouse la forme. */
  fill?: boolean;
};

export function AvatarImg({
  id,
  avatar,
  size = 32,
  className = "",
  emojiClassName = "",
  rounded = "full",
  fill = false,
}: Props) {
  const av = avatar ?? avatarOf(id);
  const roundedCls =
    rounded === "full" ? "rounded-full"
    : rounded === "lg" ? "rounded-lg"
    : rounded === "md" ? "rounded-md"
    : "";
  const dims = fill ? { width: "100%", height: "100%" } : { width: size, height: size };
  if (av.image_url) {
    return (
      <img
        src={av.image_url}
        alt={av.label}
        width={fill ? undefined : size}
        height={fill ? undefined : size}
        loading="lazy"
        draggable={false}
        className={`inline-block object-cover object-center align-middle ${roundedCls} ${className}`}
        style={dims}
      />
    );
  }
  return (
    <span
      aria-label={av.label}
      className={`inline-flex items-center justify-center align-middle leading-none ${roundedCls} ${className} ${emojiClassName}`}
      style={{
        ...dims,
        fontSize: emojiClassName ? undefined : Math.round(size * 0.7),
      }}
    >
      {av.emoji}
    </span>
  );
}
