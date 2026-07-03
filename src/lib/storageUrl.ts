// Résout un `image_url` stocké en DB (tables roles/avatars) vers une URL
// publique du projet Supabase COURANT. Formats acceptés :
//   - "icon-role/tueur.png" — chemin bucket (format écrit par le trigger
//     sync_icon_from_storage depuis la migration 20260704120000) ;
//   - "https://<ancien-projet>.supabase.co/storage/v1/object/public/icon-role/tueur.png"
//     — ancien format absolu : on ne garde que le chemin, pour que les icônes
//     survivent à une migration du backend (le host stocké peut pointer vers
//     un projet Supabase mort) ;
//   - toute autre URL http(s) — renvoyée telle quelle.
import { supabase } from "@/integrations/supabase/client";

const PUBLIC_MARKER = "/storage/v1/object/public/";

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
  return supabase.storage.from(bucket).getPublicUrl(path.slice(slash + 1)).data.publicUrl;
}
