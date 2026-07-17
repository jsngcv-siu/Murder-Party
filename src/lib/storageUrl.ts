// Résout un `image_url` stocké en DB (tables roles) ou une clé d'objet vers
// l'URL de l'icône. Depuis 2026-07-17, les icônes sont BUNDLÉES dans
// `public/icons/<bucket>/` en WebP (servies par Vercel, zéro egress Supabase)
// au lieu d'être tirées du Storage Supabase.
//
// Formats acceptés en entrée :
//   - "icon-role/tueur.png" — chemin bucket (format écrit par le trigger
//     sync_icon_from_storage) ;
//   - "https://<projet>.supabase.co/storage/v1/object/public/icon-role/tueur.png"
//     — ancien format absolu : on n'en garde que le chemin ;
//   - toute autre URL http(s) — renvoyée telle quelle.
//
// Sortie : pour nos 3 buckets d'icônes → "/icons/<bucket>/<nom>.webp" (fichier
// local bundlé). L'extension d'origine (.png/.jpg) est remplacée par .webp.
// Le composant appelant (<RoleIcon>/<ItemIcon>) retombe déjà sur un emoji via
// `onError` si un fichier venait à manquer.
import { supabase } from "@/integrations/supabase/client";

const PUBLIC_MARKER = "/storage/v1/object/public/";
// Buckets dont les icônes sont désormais bundlées localement (public/icons/…).
const LOCAL_BUCKETS = new Set(["icon-role", "icon-avatar", "icon-objet"]);

const stripExt = (n: string) => n.replace(/\.(png|jpe?g|webp|gif|avif)$/i, "");

export function resolveStorageUrl(stored: string | null | undefined): string | null {
  if (!stored) return null;
  let path = stored;
  if (/^https?:\/\//i.test(stored)) {
    const i = stored.indexOf(PUBLIC_MARKER);
    if (i < 0) return stored;
    path = stored.slice(i + PUBLIC_MARKER.length);
  }
  const slash = path.indexOf("/");
  if (slash <= 0) return null;
  const bucket = path.slice(0, slash);
  const file = path.slice(slash + 1);

  // Icônes bundlées → chemin local WebP servi par Vercel.
  if (LOCAL_BUCKETS.has(bucket)) {
    return `/icons/${bucket}/${stripExt(file)}.webp`;
  }

  // Repli : tout autre bucket reste servi par le Storage Supabase.
  return supabase.storage.from(bucket).getPublicUrl(file).data.publicUrl;
}
