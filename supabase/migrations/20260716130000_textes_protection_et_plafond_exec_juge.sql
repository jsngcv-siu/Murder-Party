-- Décisions design 2026-07-16 (P1-B) — mises à jour de TEXTE uniquement.
--
-- 1. Protection ↔ effet : le moteur bloque désormais la morsure du Vampire quand
--    la cible est protégée/bénie (comme il bloquait déjà le poison). On l'annonce
--    sur les deux cartes concernées pour que l'interaction soit lisible.
-- 2. Exécuteur & Juge : le moteur plafonne leurs usages sur la PARTIE (1 jusqu'à
--    10 joueurs, 2 de 11 à 13, 3 à 14+) alors que le texte laissait croire à un
--    usage à chaque Enquête. On garde le plafond (l'illimité serait trop fort pour
--    la ville) et on l'annonce honnêtement.
--
-- Texte seul : aucun impact schéma/RLS, aucun ordre requis vs le déploiement code.

UPDATE public.roles
SET capacite_full_text =
  '1×/Enquête. Mord 1 non-vampire et le convertit. Une cible protégée ou bénie échappe à la morsure. 1re morsure : annonce publique anonyme + émergence du Chasseur.'
WHERE slug = 'vampire' AND set_id = 'set1';

UPDATE public.roles
SET capacite_full_text =
  'À chaque Enquête. Empoisonne 1 joueur (le poison ne tue pas : il sert ta victoire). Une cible protégée ou bénie échappe au poison. Tu gagnes si toutes les cibles vivantes et hors de prison sont empoisonnées.'
WHERE slug = 'empoisonneur' AND set_id = 'set1';

UPDATE public.roles
SET capacite_full_text =
  'Après qu''une personne a passé un tour complet en prison, tu peux choisir de l''exécuter. Utilisable un nombre limité de fois dans la partie : 1 (jusqu''à 10 joueurs), 2 (11-13), 3 (14+).'
WHERE slug = 'executeur' AND set_id = 'set1';

UPDATE public.roles
SET capacite_full_text =
  'À chaque Enquête, libère un joueur emprisonné depuis au moins un tour complet. Utilisable un nombre limité de fois dans la partie : 1 (jusqu''à 10 joueurs), 2 (11-13), 3 (14+).'
WHERE slug = 'juge' AND set_id = 'set1';
