-- Fenêtre de TEST lot 6 (passe finale) : active les 17 nouveaux rôles pour la
-- démo bots de validation globale. Refermée par 20260718250000_lot6_test_disable.
-- Le couple enable/disable est neutre au replay ; l'activation DÉFINITIVE
-- arrivera au merge de la branche ajout-de-roles (après npm run deploy:edge).

UPDATE public.roles SET is_disabled = false
WHERE slug IN (
  'archiviste','physionomiste','chat_du_manoir','photographe','aubergiste',
  'garde_chasse','bretteur','conjure',
  'contrebandier','jardinier','detrousseur','franc_tireur',
  'geolier','poltergeist','vautour',
  'ventriloque','pyromane'
);
