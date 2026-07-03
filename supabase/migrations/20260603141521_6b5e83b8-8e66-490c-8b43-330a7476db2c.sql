UPDATE public.roles
SET
  usage_label = '1×/rassemblement',
  phase_activation = 'PHASE_RASSEMBLEMENT',
  instruction_verb = 'Désigne',
  target_mode = 'double',
  capacite_full_text = 'À chaque rassemblement, choisis 2 cibles. Si l''une d''entre elles vote contre toi, les deux cibles meurent au prochain rassemblement.',
  description = 'Représailles de vote : pose un piège sur 2 cibles à chaque rassemblement, déclenché si l''une vote contre elle.'
WHERE slug = 'veuve_noire';