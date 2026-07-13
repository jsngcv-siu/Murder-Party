-- ─────────────────────────────────────────────────────────────────────────────
-- Réintégration des 8 rôles « fantômes » (2026-07-13).
--
-- Contexte : ces rôles avaient du code (handlers, bots, objets, onglets capacité)
-- mais N'ONT JAMAIS eu de ligne dans public.roles — les UPDATE des migrations
-- passées les concernant frappaient 0 ligne. Le commit 7242ee4 avait purgé leur
-- code ; il a été restauré et adapté à la boucle actuelle (Enquête/Annonce/
-- Débat/Vote, free-only). Cette migration CRÉE enfin leurs lignes, actives
-- (is_disabled = false), avec les drapeaux mécaniques explicites (phase 2).
--
-- ⚠ Colonnes calées sur le schéma RÉEL de prod (pas de `fonctions`/`archetypes` :
-- dérive de schéma vs anciennes migrations). `type` est l'enum role_type_t.
--
-- Tirage : les rôles entrent automatiquement dans le pool par (faction, type) —
--   • Civil INVESTIGATION / SUPPORT  → quotas civils
--   • Méchant TROMPERIE              → acolytes
--   • Méchant TUEUR (is_killer_class)→ slot Tueur principal (alternative rare)
--   • Neutre CHAOS                   → pondération neutre
-- ⚠ Équilibrage non retesté (choix produit : activation immédiate).
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.roles (
  slug, name_fr, icon, faction, type, presence, phase_activation, difficulte,
  capacite_full_text, carte_app, description, target_mode, instruction_verb,
  usage_label, frequency_label, min_players, draw_weight,
  police_verdict, is_benign, is_hostile, is_killer_class, mechanic,
  is_disabled, set_id
) VALUES
  -- ── Le Voisin — Civil / INVESTIGATION ──
  ('voisin', 'Le Voisin', '🏘️', 'Civil', 'INVESTIGATION', 'OPTIONAL', 'Enquête', 'Facile',
   'Une fois par Enquête, surveille un joueur : tu apprends le rôle de tous ceux qui viennent le cibler. Sans effet sur une cible falsifiée.',
   'Espionne', 'Rideau entrouvert, il surveille un seul logis et démasque quiconque ose s''en approcher.',
   'single', 'Surveille', '1×/Enquête', '1×/Enquête', 7, 1.0,
   'innocent', false, false, false, 'INFO', false, 'set1'),

  -- ── Le Journaliste — Civil / INVESTIGATION ──
  ('journaliste', 'Le Journaliste', '📰', 'Civil', 'INVESTIGATION', 'OPTIONAL', 'Enquête', 'Facile',
   'Une fois par Enquête, espionne le tableau de suspicions d''un joueur jusqu''au prochain tour : tu vois qui il soupçonne. Sans effet sur une cible falsifiée.',
   'Espionne', 'Curieux jusqu''à l''indiscrétion, il feuillette en secret le carnet de soupçons d''un autre.',
   'single', 'Espionne', '1×/Enquête', '1×/Enquête', 6, 1.0,
   'innocent', false, false, false, 'INFO', false, 'set1'),

  -- ── Le Paranoïaque — Civil / SUPPORT (cible imposée, protège ou tue 1×/partie) ──
  ('paranoiaque', 'Le Paranoïaque', '😰', 'Civil', 'SUPPORT', 'OPTIONAL', 'Enquête', 'Moyen',
   'Le manoir t''assigne une cible au hasard. Une fois dans la partie, tu tranches : la protéger ou la tuer (résolu à l''Annonce). À toi de deviner son camp.',
   'Protège ou tue', 'Un inconnu lui est lié, et le doute le ronge : faut-il le protéger… ou l''abattre avant qu''il ne frappe ?',
   'none', 'Décide', '1×/partie', '1×/partie', 7, 0.6,
   'innocent', false, false, false, 'POLYVALENT', false, 'set1'),

  -- ── L'Accusateur — Méchant / TROMPERIE (marque suspect) ──
  ('accusateur', 'L''Accusateur', '👉', 'Méchant', 'TROMPERIE', 'OPTIONAL', 'Enquête', 'Moyen',
   'Une fois par Enquête, désigne un joueur : il apparaît « suspect » à toute la table jusqu''au prochain tour. Bloqué par la bénédiction du Saint.',
   'Accuse', 'Une parole venimeuse lui suffit : il pointe du doigt et fait peser le soupçon sur un innocent.',
   'single', 'Accuse', '1×/Enquête', '1×/Enquête', 7, 1.0,
   'suspicious', false, true, false, 'CONTROLE', false, 'set1'),

  -- ── Le Voleur — Méchant / TROMPERIE (vole le dernier objet) ──
  ('voleur', 'Le Voleur', '🥷', 'Méchant', 'TROMPERIE', 'OPTIONAL', 'Enquête', 'Moyen',
   'Une fois par Enquête, dérobe le dernier objet reçu par une cible — vivante ou morte. Si elle n''a aucun objet, ton tour est perdu.',
   'Vole', 'Doigts agiles, il subtilise l''objet le plus précieux d''un vivant… ou d''un mort.',
   'single', 'Vole', '1×/Enquête', '1×/Enquête', 7, 1.0,
   'suspicious', false, true, false, 'CONTROLE', false, 'set1'),

  -- ── Le Falsificateur — Méchant / TROMPERIE (falsification permanente) ──
  ('falsificateur', 'Le Falsificateur', '🎭', 'Méchant', 'TROMPERIE', 'OPTIONAL', 'Enquête', 'Difficile',
   'Une fois dans la partie, maquille un joueur : toute enquête le concernant renvoie « falsifié » et ne révèle rien, jusqu''à la fin de la partie. Bloqué par la bénédiction du Saint.',
   'Falsifie', 'Il maquille une cible à jamais : les enquêteurs n''en tireront plus que du brouillard.',
   'single', 'Falsifie', '1×/partie', '1×/partie', 7, 0.7,
   'suspicious', false, true, false, 'CONTROLE', false, 'set1'),

  -- ── L'Armurier — Méchant / TUEUR (couteau anonyme, classe tueur) ──
  ('armurier', 'L''Armurier', '🗡️', 'Méchant', 'TUEUR', 'OPTIONAL', 'Enquête', 'Moyen',
   'Une fois par Enquête, remets anonymement un couteau à un joueur vivant. Il ignore qui le lui donne et peut s''en servir une fois pour tuer — la mort tombe à l''Annonce.',
   'Arme en secret', 'Il ne se salit jamais les mains — il glisse un couteau anonyme à qui fera le sale travail.',
   'single', 'Arme', '1×/Enquête', '1×/Enquête', 7, 0.4,
   'innocent', false, true, true, 'LETAL', false, 'set1'),

  -- ── Le Conservateur — Neutre / CHAOS (reliques, victoire au Cœur du Manoir) ──
  ('conservateur', 'Le Conservateur', '🗝️', 'Neutre', 'CHAOS', 'OPTIONAL', 'Enquête', 'Difficile',
   'Deux fois par Enquête, désigne une cible qui reçoit une relique maudite au hasard. Tu gagnes immédiatement si tu confies « Le Cœur du Manoir ».',
   'Distribue les reliques', 'Gardien des reliques maudites, il les distribue jusqu''à ce que le Cœur du Manoir trouve une main.',
   'single', 'Confie une relique', '2×/Enquête', '2×/Enquête', 7, 0.7,
   'suspicious', false, true, false, 'WINCON', false, 'set1')

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
  is_disabled       = false;

-- Contrôle (doit renvoyer 8 lignes actives cohérentes) :
--   SELECT slug, faction, type, is_hostile, is_killer_class, mechanic, is_disabled
--   FROM public.roles
--   WHERE slug IN ('voisin','journaliste','paranoiaque','accusateur','voleur',
--                  'falsificateur','armurier','conservateur')
--   ORDER BY faction, slug;
