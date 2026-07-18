-- ─────────────────────────────────────────────────────────────────────────────
-- LOT 1 — 5 nouveaux rôles (design validé, docs/NOUVEAUX_ROLES.md).
--   • L'Archiviste       — Méchant / INVESTIGATION (passif prison)
--   • Le Physionomiste   — Méchant / INVESTIGATION (révèle le TYPE)
--   • Le Chat du Manoir  — Neutre  / BÉNIN (une vie, survie)
--   • Le Photographe     — Neutre  / BÉNIN (pellicule, wincon N morts photographiés)
--   • L'Aubergiste       — Neutre  / BÉNIN (chambre 1 Enquête sur 2, survie)
-- Tirage : entrent automatiquement dans les pools (faction, type) — acolytes
-- INVESTIGATION pour les 2 Méchants, pondération NEUTRE_TYPE_WEIGHTS pour les
-- 3 BÉNIN (le type le plus tiré n'a plus l'Oracle pour seul représentant).
--
-- ⚠️ INSÉRÉS DÉSACTIVÉS (is_disabled = true) : la base est partagée avec l'app
-- prod déployée depuis main, qui n'a pas encore les handlers. Une migration
-- d'ACTIVATION (is_disabled = false) partira au merge de la branche
-- `ajout-de-roles`. Pour les tests bots locaux : activation temporaire en SQL.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.roles (
  slug, name_fr, icon, faction, type, presence, phase_activation, difficulte,
  capacite_full_text, carte_app, description, target_mode, instruction_verb,
  usage_label, frequency_label, min_players, draw_weight,
  police_verdict, is_benign, is_hostile, is_killer_class, mechanic,
  is_disabled, set_id
) VALUES
  -- ── L'Archiviste — Méchant / INVESTIGATION (passif) ──
  ('archiviste', 'L''Archiviste', '🗄️', 'Méchant', 'INVESTIGATION', 'OPTIONAL', 'CONTINU', 'Facile',
   'Passif. Dès qu''un joueur est emprisonné, tu apprends son rôle exact. Chaque vote de la ville alimente tes dossiers.',
   'Consulte les dossiers', 'Greffier corrompu du manoir : chaque détenu qui entre en cellule lui livre son dossier complet.',
   'none', 'Consulte', 'Passif', 'Passif', 7, 1.0,
   'suspicious', false, true, false, 'INFO', true, 'set1'),

  -- ── Le Physionomiste — Méchant / INVESTIGATION (type de rôle) ──
  ('physionomiste', 'Le Physionomiste', '🧐', 'Méchant', 'INVESTIGATION', 'OPTIONAL', 'Enquête', 'Moyen',
   'Une fois par Enquête, dévisage un joueur : tu apprends son TYPE de rôle (PROTECTEUR, INVESTIGATION, SUPPORT…) sans le rôle exact. Les déguisements te trompent ; sans effet sur une cible falsifiée.',
   'Dévisage', 'Un regard lui suffit pour jauger un invité : la posture d''un protecteur, l''œil d''un enquêteur — rien ne lui échappe.',
   'single', 'Dévisage', '1×/Enquête', '1×/Enquête', 7, 1.0,
   'suspicious', false, true, false, 'INFO', true, 'set1'),

  -- ── Le Chat du Manoir — Neutre / BÉNIN (une vie, survie) ──
  ('chat_du_manoir', 'Le Chat du Manoir', '🐈', 'Neutre', 'BÉNIN', 'OPTIONAL', 'CONTINU', 'Facile',
   'Tu es le chat du manoir. Passif : la première attaque portée contre toi ne te tue pas — le manoir entend alors un miaulement dans la nuit. Tu gagnes si tu es en vie à la fin, quel que soit le camp vainqueur.',
   'Ronronne', 'Neuf vies, aucune allégeance : il se faufile entre les drames et réclame simplement de voir l''aube.',
   'none', 'Survis', 'Passif', 'Passif', 8, 1.0,
   'innocent', true, false, false, 'WINCON', true, 'set1'),

  -- ── Le Photographe mondain — Neutre / BÉNIN (pellicule macabre) ──
  ('photographe', 'Le Photographe mondain', '📸', 'Neutre', 'BÉNIN', 'OPTIONAL', 'Enquête', 'Moyen',
   'Une fois par Enquête, photographie discrètement un joueur vivant (il n''en sait rien). Tu gagnes si tu es en vie à la fin et qu''assez de personnes photographiées de leur vivant sont mortes : 2 (jusqu''à 10 joueurs), 3 (11-15), 4 (16+).',
   'Photographie', 'Paparazzi macabre : son objectif flaire le drame avant tout le monde, et sa pellicule vaut de l''or.',
   'single', 'Photographie', '1×/Enquête', '1×/Enquête', 8, 0.9,
   'innocent', true, false, false, 'WINCON', true, 'set1'),

  -- ── L'Aubergiste — Neutre / BÉNIN (chambre une Enquête sur deux) ──
  ('aubergiste', 'L''Aubergiste', '🏨', 'Neutre', 'BÉNIN', 'OPTIONAL', 'Enquête', 'Moyen',
   'Une Enquête sur deux, offre une chambre à un autre joueur : il est protégé ce tour. Si on a tenté de l''attaquer, tu l''apprends — sans jamais savoir qui. Tu gagnes si tu es en vie à la fin, quel que soit le camp vainqueur.',
   'Héberge', 'Son auberge ne désemplit pas : les murs sont épais, les verrous solides, et lui entend tout ce qui frappe aux portes.',
   'single', 'Héberge', '1 Enquête sur 2', '1 Enquête sur 2', 8, 0.8,
   'innocent', true, false, false, 'PROTECTION', true, 'set1')

ON CONFLICT (slug) DO UPDATE SET
  name_fr           = EXCLUDED.name_fr,
  icon              = EXCLUDED.icon,
  faction           = EXCLUDED.faction,
  type              = EXCLUDED.type,
  presence          = EXCLUDED.presence,
  phase_activation  = EXCLUDED.phase_activation,
  difficulte        = EXCLUDED.difficulte,
  capacite_full_text= EXCLUDED.capacite_full_text,
  carte_app         = EXCLUDED.carte_app,
  description       = EXCLUDED.description,
  target_mode       = EXCLUDED.target_mode,
  instruction_verb  = EXCLUDED.instruction_verb,
  usage_label       = EXCLUDED.usage_label,
  frequency_label   = EXCLUDED.frequency_label,
  min_players       = EXCLUDED.min_players,
  draw_weight       = EXCLUDED.draw_weight,
  police_verdict    = EXCLUDED.police_verdict,
  is_benign         = EXCLUDED.is_benign,
  is_hostile        = EXCLUDED.is_hostile,
  is_killer_class   = EXCLUDED.is_killer_class,
  mechanic          = EXCLUDED.mechanic,
  -- Replay-safe : garde l'état inséré (true) ; la migration d'activation,
  -- toujours rejouée APRÈS celle-ci, posera le false définitif.
  is_disabled       = EXCLUDED.is_disabled;
