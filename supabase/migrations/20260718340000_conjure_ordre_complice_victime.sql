-- Conjuré : ordre de sélection inversé (demande Jason 2026-07-18) —
-- le 1er joueur choisi est le COMPLICE, le 2e la VICTIME. Le sélecteur UI
-- étiquette chaque choix (COMPLICE ✓ / VICTIME ✓). Moteur aligné
-- (case "conjure" : t1 = complice, t2 = victime). La carte suit.

UPDATE public.roles SET capacite_full_text =
  'Une fois dans la partie, monte un pacte d''assassinat : choisis ton COMPLICE puis la VICTIME. Le complice reçoit une demande anonyme — s''il accepte, la victime meurt à l''Annonce ; s''il refuse, rien ne se passe, mais il sait désormais qu''un conjuré rôde.'
WHERE slug = 'conjure';
