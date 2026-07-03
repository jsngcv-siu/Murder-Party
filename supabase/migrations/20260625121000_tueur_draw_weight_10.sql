-- Tueur principal : le tueur classique sort ~80 % du temps, ~20 % une variante
-- (croque_mitaine / stratege / armurier) pour l'imprévu. Les 4 restent dans le pool.
-- Poids 3 -> 10 : à 7j 83% tueur / 17% surprise ; à 8j+ 77% / 23%.
UPDATE public.roles
SET draw_weight = 10
WHERE slug = 'tueur' AND set_id = 'set1';
