-- Journaliste : nouvelle formulation du texte de capacité (suppression de la
-- phrase "Sans effet sur une cible falsifiée", jugée superflue dans le texte
-- principal — la falsification reste gérée par le moteur : cible falsifiée =>
-- message "Le joueur a été falsifié" et aucun accès au tableau).
-- Aucun changement moteur — même mécanique.

UPDATE public.roles
SET capacite_full_text =
  'Une fois par Enquête, espionne le tableau de suspicions d''un joueur jusqu''au prochain tour : tu vois qui il soupçonne.'
WHERE set_id = 'set1' AND slug = 'journaliste';
