UPDATE public.roles
SET
  target_mode = 'single',
  usage_label = '1×/tour',
  phase_activation = 'PHASE_LIBRE',
  instruction_verb = 'Libère',
  capacite_full_text = 'À chaque phase libre. Libère un joueur emprisonné depuis au moins un tour complet.',
  description = 'Peut libérer un prisonnier après un tour complet de détention.'
WHERE slug = 'juge';