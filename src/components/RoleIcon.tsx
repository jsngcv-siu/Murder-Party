// Affiche l'illustration d'un rôle si disponible (image_url), sinon l'emoji.
import type { RoleRow } from "@/engine/actions";
import { resolveStorageUrl } from "@/lib/storageUrl";

type AnyRole = Partial<RoleRow> & {
  icon?: string | null;
  image_url?: string | null;
  name_fr?: string | null;
};

export function RoleIcon({
  role,
  size = 32,
  className = "",
}: {
  role: AnyRole | null | undefined;
  size?: number;
  className?: string;
}) {
  if (!role) return <span className={className}>❓</span>;
  const url = resolveStorageUrl((role as { image_url?: string | null }).image_url);
  if (url) {
    return (
      <img
        src={url}
        alt={role.name_fr ?? ""}
        width={size}
        height={size}
        className={`inline-block rounded-full object-cover align-middle ${className}`}
        style={{ width: size, height: size }}
        loading="lazy"
      />
    );
  }
  return (
    <span
      className={`inline-block align-middle ${className}`}
      style={{ fontSize: size * 0.9, lineHeight: 1 }}
    >
      {role.icon ?? "❓"}
    </span>
  );
}
