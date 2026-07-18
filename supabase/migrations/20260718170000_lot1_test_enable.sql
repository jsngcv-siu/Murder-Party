-- Fenêtre de TEST lot 1 : active temporairement les 5 nouveaux rôles pour la
-- partie démo bots de vérification (branche ajout-de-roles). La migration
-- 20260718180000_lot1_test_disable les re-désactive aussitôt le test terminé —
-- le couple enable/disable est neutre au replay, l'activation définitive
-- arrivera au merge de la branche.

UPDATE public.roles SET is_disabled = false
WHERE slug IN ('archiviste','physionomiste','chat_du_manoir','photographe','aubergiste');
