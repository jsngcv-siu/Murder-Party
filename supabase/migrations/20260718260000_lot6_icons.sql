-- LOT 6 — icônes des 17 nouveaux rôles : générées dans le style du set
-- (chibi, badge circulaire, fond rouge Méchant / bleu Civil / violet Neutre ;
-- Nano Banana 2 + référence de style tueur.webp), bundlées en WebP local
-- public/icons/icon-role/<slug>.webp (zéro egress Storage, cf. Tier 1).
-- image_url pointe le chemin bucket : resolveStorageUrl le mappe vers le
-- fichier local bundlé.

UPDATE public.roles SET image_url = 'icon-role/' || slug || '.webp'
WHERE slug IN (
  'archiviste','physionomiste','chat_du_manoir','photographe','aubergiste',
  'garde_chasse','bretteur','conjure',
  'contrebandier','jardinier','detrousseur','franc_tireur',
  'geolier','poltergeist','vautour',
  'ventriloque','pyromane'
);
