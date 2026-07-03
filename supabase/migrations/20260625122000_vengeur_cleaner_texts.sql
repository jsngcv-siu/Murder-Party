-- Vengeur : l'être cher se choisit parmi 2 Civils proposés au hasard (limite la
-- fuite d'info : il sait juste que ces 2-là sont Civils, sans cartographier la table).
UPDATE public.roles
SET capacite_full_text = 'À la 1ère phase libre, choisis ton être cher parmi 2 Civils proposés au hasard (tu sais donc que ces deux-là sont des Civils). Si ton être cher meurt, tu reçois un couteau pour te venger.'
WHERE slug = 'vengeur' AND set_id = 'set1';

-- Cleaner : efface une mort causée par une attaque des Méchants (pas seulement le
-- Tueur classique) — Croque-mitaine, Stratège, et tout objet méchant comme le
-- couteau de l'Armurier, même volé ou utilisé par un civil.
UPDATE public.roles
SET capacite_full_text = 'Une fois par partie (deux fois à 10 joueurs ou plus) durant la phase libre, tu peux effacer le rôle complet d''une personne qui va mourir d''une attaque des Méchants (Tueur, Croque-mitaine, ou tout objet méchant comme le couteau de l''Armurier — même volé ou utilisé par un civil). Sa faction publique devient « Inconnue » et le Médecin légiste n''apprend pas son rôle.'
WHERE slug = 'cleaner' AND set_id = 'set1';
