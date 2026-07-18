-- Variété du slot TUEUR méchant : le Tueur de base à poids 10 sortait dans
-- ~80 % des parties, écrasant Croque-mitaine/Stratège/Armurier (et les futurs
-- tueurs validés : Franc-tireur, Détrousseur, Vautour). Décision Jason
-- 2026-07-18 : poids 4-5 → on pose 5. La succession d'Acolyte garantit de
-- toute façon un tueur en jeu quel que soit le tirage.

UPDATE public.roles SET draw_weight = 5 WHERE slug = 'tueur' AND set_id = 'set1';
