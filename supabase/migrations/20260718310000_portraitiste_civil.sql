-- Le Portraitiste — Civil/INVESTIGATION (validé par Jason 2026-07-18, chat).
-- Jumeau civil du Physionomiste : même moteur (handler partagé, mêmes règles
-- falsification/déguisements), il apprend le TYPE de rôle, jamais le rôle exact.
-- Grille côté ville : TROMPERIE/CONTRÔLE ⇒ Méchant sûr · PROTECTEUR/SUPPORT ⇒
-- Civil sûr · TUEUR/INVESTIGATION ambigus.
-- Inséré ACTIF (is_disabled=false) comme les 17 de la branche en revue.

INSERT INTO public.roles (
  slug, name_fr, icon, faction, type, presence, phase_activation, difficulte,
  capacite_full_text, carte_app, description, target_mode, instruction_verb,
  usage_label, frequency_label, min_players, draw_weight,
  police_verdict, is_benign, is_hostile, is_killer_class, mechanic,
  is_disabled, set_id, image_url
) VALUES
  ('portraitiste', 'Le Portraitiste', '🎨', 'Civil', 'INVESTIGATION', 'OPTIONAL', 'Enquête', 'Moyen',
   'Une fois par Enquête, croque le portrait d''un joueur : tu apprends son TYPE de rôle (PROTECTEUR, TROMPERIE, SUPPORT…) sans le rôle exact. Les déguisements te trompent ; sans effet sur une cible falsifiée.',
   'Croque un portrait', 'Quelques traits de fusain lui suffisent : la posture, le regard — le portrait finit toujours par révéler la vraie nature du modèle.',
   'single', 'Croque', '1×/Enquête', '1×/Enquête', 7, 1.0,
   'innocent', false, false, false, 'INFO', false, 'set1', 'icon-role/portraitiste.webp')

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
  is_disabled = EXCLUDED.is_disabled, image_url = EXCLUDED.image_url;
