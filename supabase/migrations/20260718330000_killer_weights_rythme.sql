-- Slot TUEUR garanti : remontée du rythme de sortie des tueurs alternatifs
-- (demande Jason 2026-07-18). Avant : Tueur 5 / alternatifs 1 / Armurier 0.4
-- → Tueur ~48 %, chaque alternatif ~10 %. Après : Tueur 1.0 (référence) /
-- Croque-mitaine, Stratège, Franc-tireur, Détrousseur, Vautour 0.8 /
-- Armurier 0.6 → Tueur ~18 %, chaque alternatif ~14 %, Armurier ~11 %.
-- Impact d'équilibrage quasi nul : tous portent le même slot killer-class
-- (1 kill fiable/Enquête + un twist) — seule la VARIÉTÉ des parties change.

UPDATE public.roles SET draw_weight = 1.0 WHERE slug = 'tueur';
UPDATE public.roles SET draw_weight = 0.8 WHERE slug IN
  ('croque_mitaine', 'stratege', 'franc_tireur', 'detrousseur', 'vautour');
UPDATE public.roles SET draw_weight = 0.6 WHERE slug = 'armurier';
