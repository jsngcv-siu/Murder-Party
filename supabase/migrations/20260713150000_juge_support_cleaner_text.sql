-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 3 de l'assainissement (2026-07-13) — corrections de données.
-- PRÉREQUIS : 20260713140000_role_mechanic_flags.sql appliquée d'abord.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Le Juge ne produit AUCUNE information : sa capacité libère un prisonnier.
--    Son type INVESTIGATION mentait sur sa carte. Grâce aux drapeaux mécaniques,
--    `type` ne pilote plus victoire/succession/verdict — ce changement n'affecte
--    que le tirage (le Juge concourt désormais au quota civil SUPPORT) et
--    l'affichage de la carte.
UPDATE public.roles SET type = 'SUPPORT' WHERE slug = 'juge';

-- 2) Le texte du Cleaner mentionnait encore « le couteau de l'Armurier »,
--    un rôle retiré du jeu (il n'existe plus ni en base ni dans le moteur).
UPDATE public.roles
SET capacite_full_text = 'Une fois par partie (deux fois à 10 joueurs ou plus) durant l''Enquête, tu peux effacer le rôle complet d''une personne qui va mourir d''une attaque des Méchants (Tueur, Croque-mitaine, ou tout objet d''origine méchante — même volé ou utilisé par un civil). Sa faction publique devient « Inconnue » et le Médecin légiste n''apprend pas son rôle.'
WHERE slug = 'cleaner';

-- Contrôle rapide :
--   SELECT slug, type, mechanic FROM public.roles WHERE slug IN ('juge','cleaner');
