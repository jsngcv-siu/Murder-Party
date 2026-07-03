UPDATE public.roles
SET
  target_mode = 'single',
  instruction_verb = 'Désigne',
  capacite_full_text = 'À chaque phase libre. Désigne un joueur : il reçoit une « lettre » dans son inventaire.',
  description = 'Donne une lettre anonyme à un joueur ciblé.'
WHERE slug = 'facteur';