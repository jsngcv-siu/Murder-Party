// Résout l'icône PNG d'un objet depuis le bucket Storage `icon-objet`.
//
// Les objets sont définis en code (ITEM_CATALOG dans src/engine/items.ts),
// pas en base : il n'y a donc pas de colonne `image_url`. On dérive la clé de
// l'objet (slug) et on reconstruit l'URL publique du projet Supabase courant
// via resolveStorageUrl, comme le fait RoleIcon pour les rôles.
//
// L'URL est TOUJOURS calculable (Supabase la fabrique même si le fichier
// n'existe pas) : c'est <ItemIcon> qui retombe sur l'emoji via `onError` quand
// le PNG n'a pas encore été déposé dans le bucket.
import type { Item, ItemSlug } from "@/engine/items";
import { resolveStorageUrl } from "@/lib/storageUrl";

const BUCKET = "icon-objet";

/** Clé de fichier d'un objet (sans extension) : son slug (ex "fiole_mort"). */
export function itemIconKey(item: Pick<Item, "slug" | "payload">): string {
  return item.slug;
}

/** URL publique du PNG d'un objet (ou d'une clé slug directe). */
export function itemIconUrl(item: Pick<Item, "slug" | "payload">): string | null {
  return resolveStorageUrl(`${BUCKET}/${itemIconKey(item)}.png`);
}

/** Variante pratique quand on n'a qu'un slug (catalogue, use-modal). */
export function iconUrlForKey(key: ItemSlug): string | null {
  return resolveStorageUrl(`${BUCKET}/${key}.png`);
}
