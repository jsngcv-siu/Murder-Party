-- Le Corrupteur : lie l'icône générée (webp local, style du set) au rôle.
-- Le fichier public/icons/icon-role/corrupteur.webp est committé/déployé ; on
-- remplace le fallback emoji 🗝️ par l'illustration.
UPDATE public.roles
SET image_url = 'icon-role/corrupteur.webp'
WHERE slug = 'corrupteur';
