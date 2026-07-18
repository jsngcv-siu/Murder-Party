-- Ferme la fenêtre de test lot 6 : les 17 nouveaux rôles redeviennent
-- désactivés. Validation finale du 2026-07-18 (démo bots 16 j.) : tirage OK
-- (Détrousseur en tueur principal, Contrebandier, Jardinier, Photographe),
-- kill Détrousseur + livraison de la malle vérifiés en live, boucle intacte
-- sur 2 tours, QA 0 problème, audit statique 60/60 sans écart.
-- ACTIVATION DÉFINITIVE au merge de la branche ajout-de-roles, APRÈS
-- `npm run deploy:edge` (bundle phase-ticker à jour requis en prod).

UPDATE public.roles SET is_disabled = true
WHERE slug IN (
  'archiviste','physionomiste','chat_du_manoir','photographe','aubergiste',
  'garde_chasse','bretteur','conjure',
  'contrebandier','jardinier','detrousseur','franc_tireur',
  'geolier','poltergeist','vautour',
  'ventriloque','pyromane'
);
