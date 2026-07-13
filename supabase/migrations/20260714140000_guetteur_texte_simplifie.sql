-- Guetteur : simplification du texte de capacité (trop long / redondant).
-- Aucun changement moteur — reformulation de la même mécanique (choisit 1 vivant,
-- journal en direct des cibleurs dans l'ordre pour ce tour, tours passés consultables).

UPDATE public.roles
SET capacite_full_text =
  'Une fois par Enquête, choisis 1 autre joueur vivant : ton journal note en direct, dans l''ordre, qui le cible ce tour. Les tours précédents restent consultables.'
WHERE set_id = 'set1' AND slug = 'guetteur';
