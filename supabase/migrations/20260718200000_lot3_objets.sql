-- ─────────────────────────────────────────────────────────────────────────────
-- LOT 3 — objets & pillards (design validé, docs/NOUVEAUX_ROLES.md §6/§11).
--   • Le Contrebandier — Civil/SUPPORT : malle exclusive, 1 objet / 2 tours
--   • Le Jardinier     — Civil/SUPPORT : ratisse 1 objet au hasard d'un mort
--   • Le Détrousseur   — Méchant/TUEUR : tue + loot (braquage total 1×/partie)
--   • Le Franc-tireur  — Méchant/TUEUR : tue ; balle perforante 1×/partie
-- Ordre de résolution des inventaires (doctrine) : Voleur/Jardinier = INSTANT
-- en Enquête (premier arrivé, premier servi) ; Détrousseur = à l'Annonce, APRÈS
-- le kill ; Poltergeist (lot 4) = instant depuis l'au-delà en Enquête.
-- ⚠️ INSÉRÉS DÉSACTIVÉS — activation au merge de la branche ajout-de-roles.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.roles (
  slug, name_fr, icon, faction, type, presence, phase_activation, difficulte,
  capacite_full_text, carte_app, description, target_mode, instruction_verb,
  usage_label, frequency_label, min_players, draw_weight,
  police_verdict, is_benign, is_hostile, is_killer_class, mechanic,
  is_disabled, set_id
) VALUES
  ('contrebandier', 'Le Contrebandier', '🎒', 'Civil', 'SUPPORT', 'OPTIONAL', 'CONTINU', 'Facile',
   'Passif. Tous les 2 tours, tes connexions te livrent un objet aléatoire de TA malle : Passe-partout (évasion), Gilet matelassé, Rhum de contrebande, Monocle du douanier ou Double-fond. Rien ne se livre en prison.',
   'Réceptionne', 'On ne sait jamais ce qu''il va sortir de sa malle — mais tout le monde la convoite.',
   'none', 'Réceptionne', 'Passif', 'Passif', 7, 1.0,
   'innocent', false, false, false, 'UTILITAIRE', true, 'set1'),

  ('jardinier', 'Le Jardinier', '🌱', 'Civil', 'SUPPORT', 'OPTIONAL', 'Enquête', 'Facile',
   'Une fois par Enquête, ratisse les parterres : tu récupères UN objet au hasard laissé par un mort (s''il en reste). Les affaires des défunts reviennent à la ville.',
   'Ratisse', 'Sous ses rosiers, il trouve tout ce que les morts ont abandonné — et le remet en circulation.',
   'none', 'Ratisse', '1×/Enquête', '1×/Enquête', 7, 1.0,
   'innocent', false, false, false, 'UTILITAIRE', true, 'set1'),

  ('detrousseur', 'Le Détrousseur', '💰', 'Méchant', 'TUEUR', 'OPTIONAL', 'Enquête', 'Moyen',
   'Une fois par Enquête, tue 1 cible et empoche son dernier objet reçu. Une fois dans la partie, arme ton BRAQUAGE : ce kill-là rafle TOUT l''inventaire de la victime.',
   'Détrousse', 'Il fait ses courses sur les cadavres — et son inventaire raconte son tableau de chasse.',
   'single', 'Détrousse', '1×/Enquête', '1×/Enquête', 7, 1.0,
   'innocent', false, true, true, 'LETAL', true, 'set1'),

  ('franc_tireur', 'Le Franc-tireur', '🎯', 'Méchant', 'TUEUR', 'OPTIONAL', 'Enquête', 'Moyen',
   'Une fois par Enquête, tue 1 cible. Une fois dans la partie, arme ta BALLE PERFORANTE : ce tir-là ignore TOUTES les protections — bénédiction du Saint comprise.',
   'Tire', 'Depuis son affût, aucune porte, aucun bouclier, aucune prière n''arrête son unique balle gravée.',
   'single', 'Tire', '1×/Enquête', '1×/Enquête', 7, 1.0,
   'innocent', false, true, true, 'LETAL', true, 'set1')

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
