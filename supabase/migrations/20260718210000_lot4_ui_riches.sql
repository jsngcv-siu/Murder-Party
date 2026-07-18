-- ─────────────────────────────────────────────────────────────────────────────
-- LOT 4 — rôles à UI riche (design validé, docs/NOUVEAUX_ROLES.md §4/§8/§11).
--   • Le Geôlier     — Civil/SUPPORT : parloir (chat privé avec un prisonnier)
--   • Le Poltergeist — Neutre/CHAOS : POST-MORTEM, déplace les objets des vivants
--   • Le Vautour     — Méchant/TUEUR : ne tue que les votés du dernier Vote
-- Poltergeist : is_hostile = FALSE (décision rationnelle — vivant il est inerte,
-- un blocage de victoire civile par un rôle inactif serait un stall absurde ;
-- sa victoire est une CO-victoire au mérite : un mortel meurt d'un objet déplacé).
-- ⚠️ INSÉRÉS DÉSACTIVÉS — activation au merge de la branche ajout-de-roles.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.roles (
  slug, name_fr, icon, faction, type, presence, phase_activation, difficulte,
  capacite_full_text, carte_app, description, target_mode, instruction_verb,
  usage_label, frequency_label, min_players, draw_weight,
  police_verdict, is_benign, is_hostile, is_killer_class, mechanic,
  is_disabled, set_id
) VALUES
  ('geolier', 'Le Geôlier', '🔐', 'Civil', 'SUPPORT', 'OPTIONAL', 'Enquête', 'Moyen',
   'Une fois par Enquête, ouvre le parloir avec un prisonnier de ton choix : un chat privé s''ouvre entre vous pour le tour. Il ne sait pas qui tu es — fais-le parler, il peut mentir.',
   'Ouvre le parloir', 'Il a les clés, le temps, et l''oreille : au parloir, tout détenu finit par parler — ou par mentir.',
   'single', 'Ouvre le parloir', '1×/Enquête', '1×/Enquête', 8, 1.0,
   'innocent', false, false, false, 'INFO', true, 'set1'),

  ('poltergeist', 'Le Poltergeist', '👻', 'Neutre', 'CHAOS', 'OPTIONAL', 'CONTINU', 'Difficile',
   'De ton vivant : rien. Une fois MORT, tu hantes le manoir : à chaque Enquête, déplace UN objet de l''inventaire d''un vivant vers un autre — ni l''un ni l''autre ne sauront d''où ça vient. Tu gagnes (en plus du camp vainqueur) si quelqu''un meurt d''un objet que tu as déplacé.',
   'Hante', 'Les objets changent de poche sans témoin. Et parfois, le couteau déplacé finit par frapper.',
   'none', 'Hante', '1×/Enquête', '1×/Enquête', 8, 0.6,
   'innocent', false, false, false, 'WINCON', true, 'set1'),

  ('vautour', 'Le Vautour', '🦅', 'Méchant', 'TUEUR', 'OPTIONAL', 'Enquête', 'Moyen',
   'Une fois par Enquête, tue 1 cible — mais uniquement parmi les joueurs ayant reçu au moins une voix au dernier Vote. Au tour 1 (aucun vote encore), tu reçois un couteau à la place. Quand ta victime était votée, la table croit avoir lynché un coupable.',
   'Charogne', 'Il ne chasse pas : il suit les voix. Chaque vote posé au tribunal peint une cible dans un dos.',
   'single', 'Charogne', '1×/Enquête', '1×/Enquête', 8, 1.0,
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
