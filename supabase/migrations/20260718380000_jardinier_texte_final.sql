-- Jardinier : formulation finale de la carte (décision Jason 2026-07-18).
-- Précise le « secrètement » (la cible ne sait pas). Cible unique, verbe Bouture.

UPDATE public.roles SET
  capacite_full_text =
    'Une fois par Enquête, choisis un joueur : tu DUPLIQUES secrètement son dernier objet reçu. Il garde le sien ; tu reçois une copie identique.'
WHERE slug = 'jardinier';
