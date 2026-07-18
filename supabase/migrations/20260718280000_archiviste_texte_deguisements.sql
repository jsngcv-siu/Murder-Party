-- P3 cohérence (audit 2026-07-18) : la carte de l'Archiviste promettait « rôle
-- exact » sans dire que les déguisements le trompent — alors que le moteur
-- applique la doctrine (falsifié = illisible, Usurpateur sous couverture, tueur
-- camouflé lu « Citoyen », cf. actions.ts passif d'emprisonnement). On aligne le
-- texte joueur sur le comportement réel, comme la carte du Physionomiste.

UPDATE public.roles SET capacite_full_text =
  'Passif. Dès qu''un joueur est emprisonné, tu apprends son rôle — mais les déguisements te trompent : un dossier falsifié est illisible, l''Usurpateur ressort sous sa couverture, un tueur camouflé se lit « Citoyen ». Chaque vote de la ville alimente tes dossiers.'
WHERE slug = 'archiviste';
