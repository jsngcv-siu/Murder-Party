-- Guetteur : nouvelle formulation du texte de capacité (suppression de la
-- phrase "Les tours précédents restent consultables", jugée superflue).
-- Aucun changement moteur — même mécanique.

UPDATE public.roles
SET capacite_full_text =
  'Une fois par Enquête, choisis 1 autre joueur vivant : ton journal note en direct, dans l''ordre, qui le cible ce tour.'
WHERE set_id = 'set1' AND slug = 'guetteur';
