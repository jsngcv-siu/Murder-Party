// Résout l'icône PNG d'un objet depuis le bucket Storage `icon-objet`.
//
// Les objets sont définis en code (ITEM_CATALOG / RELIQUE_CATALOG dans
// src/engine/items.ts), pas en base : il n'y a donc pas de colonne `image_url`.
// On dérive la clé de l'objet (slug, ou variante pour une relique) et on
// reconstruit l'URL publique du projet Supabase courant via resolveStorageUrl,
// comme le fait RoleIcon pour les rôles.
//
// L'URL est TOUJOURS calculable (Supabase la fabrique même si le fichier
// n'existe pas) : c'est <ItemIcon> qui retombe sur l'emoji via `onError` quand
// le PNG n'a pas encore été déposé dans le bucket.
import type { Item, ItemSlug, ReliqueVariant } from "@/engine/items";
import { resolveStorageUrl } from "@/lib/storageUrl";

const BUCKET = "icon-objet";

/**
 * Clé de fichier d'un objet (sans extension) :
 *   • relique  → sa variante (ex "coeur_du_manoir"), chaque relique a son visuel ;
 *   • autres   → le slug (ex "fiole_mort").
 */
export function itemIconKey(item: Pick<Item, "slug" | "payload">): string {
  if (item.slug === "relique") {
    const variant = item.payload?.variant as ReliqueVariant | undefined;
    if (variant) return variant;
  }
  return item.slug;
}

/** URL publique du PNG d'un objet (ou d'une clé slug/variant directe). */
export function itemIconUrl(item: Pick<Item, "slug" | "payload">): string | null {
  return resolveStorageUrl(`${BUCKET}/${itemIconKey(item)}.png`);
}

/** Variante pratique quand on n'a qu'un slug/variant (catalogue, use-modal). */
export function iconUrlForKey(key: ItemSlug | ReliqueVariant): string | null {
  return resolveStorageUrl(`${BUCKET}/${key}.png`);
}
