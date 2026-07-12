-- Chasseur de Vampire : reclassé en TUEUR (primaire) au lieu d'INVESTIGATION.
--
-- Motivation : le rôle était perçu comme un enquêteur alors que son cœur est un
-- KILL conditionnel (il élimine sa cible si elle est Vampire, sinon la blanchit).
-- Le résultat « exécution programmée à l'Annonce » créait une confusion sur un
-- rôle étiqueté « Investigation ». On aligne l'étiquette sur la mécanique réelle.
--
-- La mécanique NE change PAS (handler inchangé) : désigne 1 joueur → si Vampire,
-- attaque différée résolue à l'Annonce ; sinon, il apprend que la cible n'en est
-- pas un. Reste immunisé (non convertible). Faction Neutre (allié des Civils)
-- conservée → verdict Policier inchangé ; rôle émergent → hors tirage et hors
-- leurres du Détective, donc le changement de type n'a pas d'effet de bord.

UPDATE public.roles
SET
  type = 'TUEUR',
  capacite_full_text = 'Apparaît après la 1re morsure du Vampire. 1×/JOUR, désigne 1 joueur : s''il est Vampire, tu l''élimines (dénouement à l''Annonce) ; sinon tu apprends qu''il n''en est pas un. Immunisé contre la morsure du Vampire : il ne peut pas être converti.'
WHERE slug = 'chasseur_de_vampire';
