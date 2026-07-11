// Affiche l'illustration PNG d'un objet si elle existe dans le bucket
// `icon-objet`, sinon retombe sur l'emoji du catalogue. Pendant à <RoleIcon>.
//
// L'URL de l'objet est toujours calculable : on ne peut donc pas savoir a
// priori si le PNG a été déposé. On tente l'image et, en cas d'erreur de
// chargement (404 tant que le fichier n'existe pas), on bascule sur l'emoji.
import { useState } from "react";
import type { Item } from "@/engine/items";
import { itemIconUrl } from "@/lib/itemIcon";

type Props = {
  item: Pick<Item, "slug" | "icon" | "name" | "payload">;
  /** Taille en px du cadre carré. */
  size?: number;
  className?: string;
  /** Coupe / forme. Par défaut carré arrondi. */
  rounded?: "full" | "xl" | "lg" | "md" | "none";
  /** Taille de police de l'emoji fallback (par défaut ~0.85·size). */
  emojiFontSize?: number;
};

const ROUNDED: Record<NonNullable<Props["rounded"]>, string> = {
  full: "rounded-full",
  xl: "rounded-xl",
  lg: "rounded-lg",
  md: "rounded-md",
  none: "",
};

export function ItemIcon({
  item,
  size = 32,
  className = "",
  rounded = "lg",
  emojiFontSize,
}: Props) {
  const [failed, setFailed] = useState(false);
  const url = failed ? null : itemIconUrl(item);
  const roundedCls = ROUNDED[rounded];

  if (url) {
    return (
      <img
        src={url}
        alt={item.name}
        width={size}
        height={size}
        loading="lazy"
        draggable={false}
        onError={() => setFailed(true)}
        className={`inline-block object-cover object-center align-middle ${roundedCls} ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center align-middle leading-none ${roundedCls} ${className}`}
      style={{ width: size, height: size, fontSize: emojiFontSize ?? Math.round(size * 0.85) }}
    >
      {item.icon}
    </span>
  );
}
