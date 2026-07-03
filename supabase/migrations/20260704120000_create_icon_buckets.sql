-- Rend le backend recréable sur un projet Supabase personnel avec un simple
-- `supabase db push` (les buckets avaient été créés à la main via le dashboard
-- du projet d'origine géré par Lovable Cloud, et le trigger de sync codait en
-- dur le host de ce projet).

-- 1) Création idempotente des buckets Storage requis par l'app.
--    icon-avatar : avatars des joueurs — listé en live par le client
--                  (src/lib/avatars.ts), lecture publique.
--    icon-role   : icônes des rôles — synchronisées vers roles.image_url
--                  par le trigger sync_icon_from_storage.
insert into storage.buckets (id, name, public)
values
  ('icon-avatar', 'icon-avatar', true),
  ('icon-role', 'icon-role', true)
on conflict (id) do update set public = excluded.public;

-- 2) Le trigger (20260612203009) stockait des URLs absolues avec le host du
--    projet d'origine codé en dur — cassées dès qu'on change de projet.
--    On stocke désormais le chemin "bucket/fichier" ; le client reconstruit
--    l'URL publique du projet courant (src/lib/storageUrl.ts).
CREATE OR REPLACE FUNCTION public.sync_icon_from_storage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_bucket text;
  v_name text;
  v_key text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_bucket := OLD.bucket_id;
    v_name := OLD.name;
  ELSE
    v_bucket := NEW.bucket_id;
    v_name := NEW.name;
  END IF;

  IF v_bucket NOT IN ('icon-avatar', 'icon-role') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- key = filename sans extension (basename)
  v_key := regexp_replace(split_part(v_name, '/', -1), '\.[^.]+$', '');

  IF TG_OP = 'DELETE' THEN
    IF v_bucket = 'icon-avatar' THEN
      UPDATE public.avatars SET image_url = NULL WHERE id = v_key;
    ELSE
      UPDATE public.roles SET image_url = NULL WHERE slug = v_key;
    END IF;
  ELSE
    IF v_bucket = 'icon-avatar' THEN
      UPDATE public.avatars SET image_url = v_bucket || '/' || v_name WHERE id = v_key;
    ELSE
      UPDATE public.roles SET image_url = v_bucket || '/' || v_name WHERE slug = v_key;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 3) Réécrit les URLs absolues déjà stockées (dont le seed 20260612230315,
--    qui pointait vers l'ancien projet) au format chemin portable.
UPDATE public.roles
SET image_url = split_part(image_url, '/storage/v1/object/public/', 2)
WHERE image_url LIKE '%/storage/v1/object/public/%';

UPDATE public.avatars
SET image_url = split_part(image_url, '/storage/v1/object/public/', 2)
WHERE image_url LIKE '%/storage/v1/object/public/%';
