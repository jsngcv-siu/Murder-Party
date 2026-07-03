
-- Public read on icon buckets (works even if bucket is private; needed for the trigger-built URLs to load once buckets are public)
DROP POLICY IF EXISTS "Public read icon-avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public read icon-role" ON storage.objects;
CREATE POLICY "Public read icon-avatar" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'icon-avatar');
CREATE POLICY "Public read icon-role" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'icon-role');

-- Auto-sync function: filename (sans extension) = id avatar ou slug role
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
  v_url text;
  v_base text := 'https://svxjejyaytytfwjnkubv.supabase.co/storage/v1/object/public';
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
    v_url := v_base || '/' || v_bucket || '/' || v_name;
    IF v_bucket = 'icon-avatar' THEN
      UPDATE public.avatars SET image_url = v_url WHERE id = v_key;
    ELSE
      UPDATE public.roles SET image_url = v_url WHERE slug = v_key;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_icon_insert ON storage.objects;
DROP TRIGGER IF EXISTS trg_sync_icon_update ON storage.objects;
DROP TRIGGER IF EXISTS trg_sync_icon_delete ON storage.objects;

CREATE TRIGGER trg_sync_icon_insert AFTER INSERT ON storage.objects
FOR EACH ROW EXECUTE FUNCTION public.sync_icon_from_storage();
CREATE TRIGGER trg_sync_icon_update AFTER UPDATE ON storage.objects
FOR EACH ROW EXECUTE FUNCTION public.sync_icon_from_storage();
CREATE TRIGGER trg_sync_icon_delete AFTER DELETE ON storage.objects
FOR EACH ROW EXECUTE FUNCTION public.sync_icon_from_storage();
