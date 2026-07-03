UPDATE public.roles
SET
  capacite_full_text = '1×/partie. Désigne 1 joueur emprisonné et libère-le.',
  description = 'Libérateur de prison : peut sortir 1 joueur de cellule, 1 fois par partie.',
  carte_app = 'Désigne 1 joueur en prison pour le libérer (1×/partie).',
  instruction_verb = 'Libère',
  usage_label = '1×/partie',
  frequency_label = '1×/partie'
WHERE slug = 'avocat';