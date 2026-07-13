-- Barman et Majordome étaient les 2 seuls rôles avec un frequency_label
-- tronqué (« Enquête » au lieu de « 1×/Enquête ») : la pastille de fréquence
-- de la fiche de rôle s'affichait sans compteur de charges. On aligne sur
-- leur usage_label (le moteur limite déjà à 1 usage par Enquête).
UPDATE public.roles
SET frequency_label = '1×/Enquête'
WHERE slug IN ('barman', 'majordome') AND frequency_label = 'Enquête';

-- Contrôle : SELECT slug, frequency_label FROM public.roles WHERE slug IN ('barman','majordome');
