-- Le Corrupteur — Méchant/CONTRÔLE (demande Jason 2026-07-19).
-- 1×/partie : fait évader un prisonnier (ayant purgé ≥1 tour), libéré au début du
-- tour suivant. Réutilise EXACTEMENT le rail du Juge (`pending_release_for_cycle`) →
-- l'annonce Gazette publique et la notif au prisonnier sont indiscernables d'une
-- libération du Juge (semer le trouble, cf. handler `case "corrupteur"`).
-- Icône : emoji 🗝️ en attendant un webp généré (image_url NULL → fallback emoji).

INSERT INTO public.roles (
  slug, name_fr, icon, faction, type, presence, phase_activation, difficulte,
  capacite_full_text, carte_app, description, target_mode, instruction_verb,
  usage_label, frequency_label, min_players, draw_weight,
  police_verdict, is_benign, is_hostile, is_killer_class, mechanic,
  is_disabled, set_id, image_url
) VALUES
  ('corrupteur', 'Le Corrupteur', '🗝️', 'Méchant', 'CONTRÔLE', 'OPTIONAL', 'Enquête', 'Moyen',
   'Une fois dans la partie, corromps le gardien et fais évader un prisonnier (ayant purgé au moins un tour) : il est libre au début du tour suivant. L''évasion est annoncée comme une libération ordinaire — la ville peut croire que c''est le Juge.',
   'Corromps le gardien',
   'Quelques pièces au bon gardien, une porte qu''on oublie de verrouiller. La ville n''y verra que la main du Juge.',
   'single', 'Fais évader', '1×/partie', '1×/partie', 8, 0.8,
   'suspicious', false, true, false, 'CONTROLE', false, 'set1', NULL)

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
