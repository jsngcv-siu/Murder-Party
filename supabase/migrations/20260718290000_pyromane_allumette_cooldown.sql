-- Pyromane : l'allumette n'est plus 1×/partie (décision Jason 2026-07-18).
-- Elle devient ILLIMITÉE avec un cooldown de 2 tours pleins : craquée au
-- tour T → re-disponible au tour T+3 (ex. T2 → T5). Toujours uniquement
-- pendant l'Enquête. L'aspersion continue à chaque Enquête pendant le
-- cooldown. Barème de victoire inchangé : 3 (≤15 j.), 4 (16+) — recalé par
-- sim/pyromane.mjs (migration 20260718230000).
-- Moteur aligné : pyromaneIgnite (pyro_ignite_last_tour + PYRO_IGNITE_COOLDOWN).

UPDATE public.roles SET capacite_full_text =
  'À chaque Enquête, asperge discrètement 1 joueur d''essence (aucun effet visible ; plafond limité). Pendant l''Enquête, CRAQUE L''ALLUMETTE : tous les aspergés vivants et libres meurent à l''Annonce (protections applicables ; la prison ne brûle pas). La boîte met ensuite 2 tours à se recharger avant la flamme suivante. Tu gagnes si assez de joueurs meurent par le feu : 3 (jusqu''à 15 joueurs), 4 (16+).'
WHERE slug = 'pyromane';
