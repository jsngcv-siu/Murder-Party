-- ─────────────────────────────────────────────────────────────────────────────
-- Uniformisation du vocabulaire de fréquence : « 1×/tour » → « 1×/Enquête ».
--
-- Depuis la refonte de boucle, TOUTES les capacités actives se jouent en
-- Enquête : « tour » et « jour » sont des vestiges de l'ancien vocabulaire.
-- Zéro impact moteur : isPerCycle/perCycleLimit matchent déjà « enquête »,
-- cooldownCycles lit « cooldown N » indépendamment, parseTotalLimit ne regarde
-- que « 1×/partie » / « max N ». Seul l'affichage joueur change.
-- ─────────────────────────────────────────────────────────────────────────────

-- Libellés (pastilles de la fiche de rôle).
-- replace() préserve les suffixes, ex. « 1×/tour (cooldown 1) » (Vampire).
UPDATE public.roles
SET usage_label = replace(usage_label, '1×/tour', '1×/Enquête')
WHERE usage_label LIKE '%1×/tour%';

UPDATE public.roles
SET frequency_label = replace(frequency_label, '1×/tour', '1×/Enquête')
WHERE frequency_label LIKE '%1×/tour%';

-- Textes de carte (prose lue par le joueur) : « 1×/TOUR » et « 1×/JOUR »
-- (Chasseur de Vampire) → « 1×/Enquête ».
UPDATE public.roles
SET capacite_full_text = replace(capacite_full_text, '1×/TOUR', '1×/Enquête')
WHERE capacite_full_text LIKE '%1×/TOUR%';

UPDATE public.roles
SET capacite_full_text = replace(capacite_full_text, '1×/JOUR', '1×/Enquête')
WHERE capacite_full_text LIKE '%1×/JOUR%';

-- Contrôle : plus AUCUNE occurrence de tour/jour dans les fréquences —
--   SELECT slug, usage_label, frequency_label
--   FROM public.roles
--   WHERE usage_label ILIKE '%tour%' OR frequency_label ILIKE '%tour%'
--      OR capacite_full_text LIKE '%1×/TOUR%' OR capacite_full_text LIKE '%1×/JOUR%';
--   (attendu : 0 ligne)
