-- Policier & Héritier déchu : le verdict d'enquête n'est PAS une lecture de
-- faction. Il inclut tous les Neutres et exclut les tueurs camouflés → on le
-- reformule « suspect / pas suspect » au lieu de « Méchant / non-Méchant ».
-- Cohérent avec les subtilités (src/lib/roleExtraInfo.ts) et les bandeaux de
-- résultat (src/engine/actions.ts). Aucun changement moteur.

UPDATE public.roles
SET capacite_full_text =
  '1×/TOUR. Désigne 1 joueur. Verdict binaire : suspect ou non. Le Tueur ET l''Usurpateur ressortent « pas suspect » — seul l''Assistant du détective les démasque.'
WHERE slug = 'policier';

UPDATE public.roles
SET capacite_full_text =
  '1×/Enquête. Apprends si une cible ressort suspecte ou non. Peut gagner avec les Méchants si un Tueur survit à la fin.'
WHERE slug = 'heritier_dechu';
