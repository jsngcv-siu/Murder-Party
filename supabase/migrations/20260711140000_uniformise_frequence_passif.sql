-- Uniformise le vocabulaire des fréquences NON cadencées, en 2 familles claires
-- (en plus des rôles cadencés « N×/… » qui, eux, ne bougent pas).

-- 1) PASSIF : trait toujours actif, aucune action du joueur.
--    « Permanent » / « Setup permanent » → « Passif »
--    (Guetteur, Juge, Médecin légiste, Médium, Comptable, Rêveur, Usurpateur…).
UPDATE public.roles
SET frequency_label = 'Passif'
WHERE frequency_label IN ('Permanent', 'Setup permanent');

UPDATE public.roles
SET usage_label = 'Passif'
WHERE usage_label IN ('Permanent', 'Setup permanent');

-- 2) SETUP : reçoit un ou des objet(s) ou une info au départ (on ne compte pas).
--    Le Cuisinier (couteau) et l'Apothicaire (3 fioles) rejoignent la famille
--    « Setup » déjà utilisée par Mouchard / Témoin / Oracle / Entremetteur.
UPDATE public.roles
SET frequency_label = 'Setup',
    usage_label = 'Setup'
WHERE slug IN ('cuisinier', 'apothicaire');
