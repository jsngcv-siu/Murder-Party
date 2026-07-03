-- Corrige les libellés de fréquence trompeurs de l'Executeur et du Juge.
-- L'Executeur affichait « unique » et le Juge « passif » : tous deux sont en fait
-- des capacités ACTIVES, utilisables une fois par tour (dans la limite de leur
-- quota total, qui scale avec le nombre de joueurs — géré côté moteur par slug,
-- inchangé). On affiche donc « 1×/tour », et on aligne usage_label dessus pour que
-- le moteur applique bien un plafond d'1 usage par tour (cohérent avec l'affichage).
UPDATE public.roles SET usage_label = '1×/tour', frequency_label = '1×/tour' WHERE slug = 'executeur';
UPDATE public.roles SET usage_label = '1×/tour', frequency_label = '1×/tour' WHERE slug = 'juge';
