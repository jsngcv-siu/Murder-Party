-- Ferme la fenêtre de test lot 1 (cf. 20260718170000_lot1_test_enable) : les 5
-- nouveaux rôles redeviennent désactivés jusqu'au merge de la branche
-- ajout-de-roles (l'app prod déployée depuis main n'a pas leurs handlers).
-- Test bots du 2026-07-18 : tirage OK (Archiviste + Chat du Manoir dans une
-- partie 14 j.), boucle intacte sur 2 tours, dossier d'écrou Archiviste vérifié
-- en conditions réelles, QA 0 problème.

UPDATE public.roles SET is_disabled = true
WHERE slug IN ('archiviste','physionomiste','chat_du_manoir','photographe','aubergiste');
