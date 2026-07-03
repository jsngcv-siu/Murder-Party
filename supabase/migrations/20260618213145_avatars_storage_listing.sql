-- Avatars pilotés directement par le bucket Storage `icon-avatar`.
-- Le client liste le contenu du bucket (supabase.storage.from('icon-avatar').list())
-- pour construire la liste des avatars : déposer un PNG le fait apparaître dans
-- l'UI, sans limite, rangé par dossier-catégorie (femmes/ hommes/ autres/).
--
-- Pour que le `list()` fonctionne côté anon/authenticated, il faut :
--   1. le bucket public,
--   2. une policy SELECT sur storage.objects pour ce bucket.
-- (La policy SELECT existe déjà — 20260612203009 — on la (re)garantit ici de
--  façon idempotente. Le trigger sync_icon_from_storage et la table `avatars`
--  ne pilotent plus les avatars ; ils restent en place pour les rôles
--  `icon-role` et ne sont pas supprimés.)

-- 1) Bucket public (no-op s'il l'est déjà).
UPDATE storage.buckets SET public = true WHERE id = 'icon-avatar';

-- 2) Lecture/listing publics du bucket icon-avatar.
DROP POLICY IF EXISTS "Public read icon-avatar" ON storage.objects;
CREATE POLICY "Public read icon-avatar"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'icon-avatar');
