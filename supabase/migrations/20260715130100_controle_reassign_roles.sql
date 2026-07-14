-- Reclassement des rôles dans la nouvelle famille CONTRÔLE + nettoyages.
-- Dépend de 20260715130000 (valeur d'enum 'CONTRÔLE' déjà committée).
--
-- 1) 4 rôles Méchants → CONTRÔLE (bloque/vole/détourne). TROMPERIE ne garde alors
--    que les vrais trompeurs (Accusateur, Falsificateur, Usurpateur), et la famille
--    Méchant/SUPPORT devient vide (retirée des quotas acolytes côté moteur).
UPDATE public.roles
SET type = 'CONTRÔLE'
WHERE set_id = 'set1'
  AND slug IN ('cleaner', 'maitre_chanteur', 'voleur', 'marionnettiste');

-- 2) Le Chasseur de Vampire : supprime le doublon muet secondary_type=TUEUR.
UPDATE public.roles
SET secondary_type = NULL
WHERE set_id = 'set1'
  AND slug = 'chasseur_de_vampire';

-- 3) L'Apothicaire (multifonction puissant : Vie/Mort/Clairvoyance) reste SUPPORT
--    mais devient RARE via un poids de tirage abaissé — le poids gère sa rareté,
--    pas un tier de puissance dédié.
UPDATE public.roles
SET draw_weight = 0.4
WHERE set_id = 'set1'
  AND slug = 'apothicaire';
