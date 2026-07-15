-- Vampire — nettoyage texte (Option A) : retrait de la mention « cooldown ».
--
-- Contexte : le Vampire portait « 1×/Enquête (cooldown 1) » + « avec cooldown 1
-- phase » dans son texte. Or ce cooldown 1 est INERTE : le moteur (cooldownCycles
-- => cd=1) bloque seulement une 2e morsure DANS LE MÊME TOUR, ce que la limite
-- « 1×/Enquête » (per-cycle) fait déjà. La mention faisait donc doublon et
-- affichait une unité fausse (« phase » alors que le moteur compte en tours).
--
-- Aucun changement d'équilibrage : sans le mot « cooldown » dans le libellé,
-- cooldownCycles() renvoie 0, mais le plafond « 1×/Enquête » garde la morsure à
-- une fois par tour — comportement identique.

UPDATE public.roles
SET
  usage_label = '1×/Enquête',
  capacite_full_text = '1×/Enquête. Mord 1 non-vampire et le convertit. 1re morsure : annonce publique anonyme + émergence du Chasseur.'
WHERE set_id = 'set1'
  AND slug = 'vampire';
