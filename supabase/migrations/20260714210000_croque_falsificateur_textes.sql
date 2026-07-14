-- Croque-mitaine : retire la fuite technique « le backend tire au hasard » et
-- reformule proprement (l'un des deux, tiré au hasard, meurt).
-- Falsificateur : abandonne le champ « maquillage / protection » au profit de la
-- logique réelle — il falsifie un joueur CONTRE SON GRÉ pour lui faire porter le
-- chapeau (impossible à blanchir). Aucun changement moteur.

UPDATE public.roles
SET capacite_full_text =
  '1×/Enquête. Désigne 2 joueurs vivants : l''un des deux, tiré au hasard, meurt. L''autre reçoit « Vous avez survécu à un danger ».'
WHERE slug = 'croque_mitaine';

UPDATE public.roles
SET capacite_full_text =
  'Une fois dans la partie, falsifie un joueur contre son gré : jusqu''à la fin de la partie, toute enquête le concernant renvoie « falsifié » et ne révèle rien. Impossible à blanchir, il porte le chapeau. Bloqué par la bénédiction du Saint.'
WHERE slug = 'falsificateur';
