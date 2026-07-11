-- Le Guetteur devient un Civil investigateur actif : il choisit une cible
-- pendant l'Enquête et son journal conserve, dans l'ordre, les personnes
-- qui ont ciblé cette personne. Les données de journal restent dans
-- players.role_meta, donc aucun canal d'annonce personnel n'est créé.
UPDATE public.roles SET
  type = 'INVESTIGATION',
  target_mode = 'single',
  instruction_verb = 'Surveille un joueur',
  usage_label = '1×/Enquête',
  frequency_label = '1×/Enquête',
  phase_activation = 'Enquête',
  description = 'Il observe les actions dirigées vers un convive et consigne les visiteurs.',
  capacite_full_text = 'Une fois par Enquête, choisis 1 autre joueur vivant. Pendant ce tour, ton journal enregistre en direct, dans l''ordre des actions, les joueurs qui le ciblent. Tu peux ensuite consulter la cible et la liste des visiteurs de chaque tour précédent.'
WHERE set_id = 'set1' AND slug = 'guetteur';
