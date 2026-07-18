-- Pyromane : barème de victoire recalé par simulation (sim/pyromane.mjs,
-- 2026-07-18). L'ancien « 2 morts ≤10 joueurs » donnait ~45-50 % de victoires
-- quand présent (cible Neutre/MAL ≈ 25-40 %). Nouveau barème : 3 (≤15 j.),
-- 4 (16+) → 22-38 % sur toutes les tailles. Moteur aligné (pyroThreshold).

UPDATE public.roles SET capacite_full_text =
  'À chaque Enquête, asperge discrètement 1 joueur d''essence (aucun effet visible ; plafond limité). Une fois dans la partie, CRAQUE L''ALLUMETTE : tous les aspergés vivants et libres meurent à l''Annonce (protections applicables ; la prison ne brûle pas). Tu gagnes si assez de joueurs meurent par le feu : 3 (jusqu''à 15 joueurs), 4 (16+).'
WHERE slug = 'pyromane';
