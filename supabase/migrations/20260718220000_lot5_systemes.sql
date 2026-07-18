-- ─────────────────────────────────────────────────────────────────────────────
-- LOT 5 — systèmes (design validé, docs/NOUVEAUX_ROLES.md §5/§9).
--   • Le Ventriloque — Méchant/TROMPERIE : forge une lettre signée d'un autre
--   • Le Pyromane    — Neutre/MAL : asperge, puis craque l'allumette (1×)
-- + CHANGEMENT SYSTÉMIQUE (décision Jason) : les lettres ne sont plus
--   anonymes — toute lettre envoyée arrive SIGNÉE de son expéditeur. C'est ce
--   qui donne son mordant à la contrefaçon du Ventriloque.
-- Pyromane : barème de victoire scalé (2 morts ≤10 j., 3 en 11-15, 4 à 16+),
-- plafond d'aspergés = barème + 1 ; un aspergé en prison ne brûle pas.
-- ⚠️ INSÉRÉS DÉSACTIVÉS — activation au merge. Passage en sim/balance AVANT
-- l'activation (passe finale lot 6) — le verrou « sim d'abord » est tenu au
-- niveau de l'ACTIVATION, les rôles étant invisibles d'ici là.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.roles (
  slug, name_fr, icon, faction, type, presence, phase_activation, difficulte,
  capacite_full_text, carte_app, description, target_mode, instruction_verb,
  usage_label, frequency_label, min_players, draw_weight,
  police_verdict, is_benign, is_hostile, is_killer_class, mechanic,
  is_disabled, set_id
) VALUES
  ('ventriloque', 'Le Ventriloque', '🎙️', 'Méchant', 'TROMPERIE', 'OPTIONAL', 'Enquête', 'Difficile',
   'Une fois dans la partie, forge une lettre : elle arrive chez le destinataire de ton choix, SIGNÉE du nom d''un autre joueur vivant — indiscernable d''une vraie. Fausse accusation, faux aveu… le joueur imité devra nier.',
   'Forge une lettre', 'Sa plume imite toutes les écritures — et depuis que les lettres sont signées, une signature vaut une condamnation.',
   'none', 'Forge', '1×/partie', '1×/partie', 8, 0.8,
   'suspicious', false, true, false, 'CONTROLE', true, 'set1'),

  ('pyromane', 'Le Pyromane', '🔥', 'Neutre', 'MAL', 'OPTIONAL', 'Enquête', 'Difficile',
   'À chaque Enquête, asperge discrètement 1 joueur d''essence (aucun effet visible ; plafond limité). Une fois dans la partie, CRAQUE L''ALLUMETTE : tous les aspergés vivants et libres meurent à l''Annonce (protections applicables ; la prison ne brûle pas). Tu gagnes si assez de joueurs meurent par le feu : 2 (jusqu''à 10 joueurs), 3 (11-15), 4 (16+).',
   'Asperge', 'Il ne tue jamais tout de suite. Il prépare. Et une nuit, le manoir sent l''essence.',
   'single', 'Asperge', '1×/Enquête', '1×/Enquête', 8, 0.6,
   'suspicious', false, true, false, 'WINCON', true, 'set1')

ON CONFLICT (slug) DO UPDATE SET
  name_fr = EXCLUDED.name_fr, icon = EXCLUDED.icon, faction = EXCLUDED.faction,
  type = EXCLUDED.type, presence = EXCLUDED.presence,
  phase_activation = EXCLUDED.phase_activation, difficulte = EXCLUDED.difficulte,
  capacite_full_text = EXCLUDED.capacite_full_text, carte_app = EXCLUDED.carte_app,
  description = EXCLUDED.description, target_mode = EXCLUDED.target_mode,
  instruction_verb = EXCLUDED.instruction_verb, usage_label = EXCLUDED.usage_label,
  frequency_label = EXCLUDED.frequency_label, min_players = EXCLUDED.min_players,
  draw_weight = EXCLUDED.draw_weight, police_verdict = EXCLUDED.police_verdict,
  is_benign = EXCLUDED.is_benign, is_hostile = EXCLUDED.is_hostile,
  is_killer_class = EXCLUDED.is_killer_class, mechanic = EXCLUDED.mechanic,
  is_disabled = EXCLUDED.is_disabled;

-- Lettres signées : le Facteur l'annonce désormais sur sa carte.
UPDATE public.roles SET capacite_full_text =
  'À chaque Enquête. Désigne un joueur : il reçoit une « lettre » dans son inventaire. Il pourra l''envoyer à la personne de son choix — elle arrivera SIGNÉE de son nom.'
WHERE slug = 'facteur';
