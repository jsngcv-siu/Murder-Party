-- ─────────────────────────────────────────────────────────────────────────────
-- LOT 2 — 3 rôles Civil/TUEUR (design validé, docs/NOUVEAUX_ROLES.md §12).
--   • Le Garde-chasse — patrouille : l'attaquant du patrouillé meurt (cible non sauvée)
--   • Le Bretteur     — 1×/partie : garde levée, pare et embroche l'attaquant
--   • Le Conjuré      — 1×/partie : pacte d'assassinat (cible + complice anonyme)
-- Un civil qui tue le fait SUR CONVICTION, avec risque d'erreur — jamais de
-- « tue si méchant » automatique. Tirage : union civile INVESTIGATION/SUPPORT/TUEUR.
-- ⚠️ INSÉRÉS DÉSACTIVÉS (is_disabled = true) — même règle que le lot 1 :
-- activation au merge de la branche ajout-de-roles.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.roles (
  slug, name_fr, icon, faction, type, presence, phase_activation, difficulte,
  capacite_full_text, carte_app, description, target_mode, instruction_verb,
  usage_label, frequency_label, min_players, draw_weight,
  police_verdict, is_benign, is_hostile, is_killer_class, mechanic,
  is_disabled, set_id
) VALUES
  ('garde_chasse', 'Le Garde-chasse', '🌲', 'Civil', 'TUEUR', 'OPTIONAL', 'Enquête', 'Moyen',
   'Une fois par Enquête, patrouille devant la porte d''un joueur. Si on l''attaque ce tour, l''attaquant meurt — mais la cible, elle, n''est pas sauvée : au matin on trouve deux corps.',
   'Patrouille', 'Il ne protège personne — il venge sur place. Quiconque frappe une maison patrouillée y laisse sa peau.',
   'single', 'Patrouille', '1×/Enquête', '1×/Enquête', 7, 1.0,
   'innocent', false, false, false, 'LETAL', true, 'set1'),

  ('bretteur', 'Le Bretteur', '🤺', 'Civil', 'TUEUR', 'OPTIONAL', 'Enquête', 'Moyen',
   'Une fois dans la partie, lève ta garde pour un tour : si on t''attaque cette nuit-là, tu pares et tu embroches — l''attaque échoue ET l''attaquant meurt. Tout est dans le timing.',
   'Lève ta garde', 'Un duel d''anticipation permanent : sentir la nuit où l''on vient pour lui, et transformer sa lame en tombeau.',
   'none', 'Lève ta garde', '1×/partie', '1×/partie', 7, 1.0,
   'innocent', false, false, false, 'LETAL', true, 'set1'),

  ('conjure', 'Le Conjuré', '🤝', 'Civil', 'TUEUR', 'OPTIONAL', 'Enquête', 'Difficile',
   'Une fois dans la partie, monte un pacte d''assassinat : choisis une victime PUIS un complice. Le complice reçoit une demande anonyme — s''il accepte, la victime meurt à l''Annonce ; s''il refuse, rien ne se passe, mais il sait désormais qu''un conjuré rôde.',
   'Scelle un pacte', 'Il ne tue jamais seul : deux consciences valent mieux qu''une… sauf quand le complice sollicité savoure déjà le crime.',
   'double', 'Scelle le pacte', '1×/partie', '1×/partie', 8, 0.8,
   'innocent', false, false, false, 'LETAL', true, 'set1')

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
