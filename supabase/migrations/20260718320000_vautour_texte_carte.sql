-- Vautour : reformulation de la carte (demande Jason 2026-07-18).
-- L'ancienne chute « Quand ta victime était votée, la table croit avoir lynché
-- un coupable » était ambiguë — supprimée. Le vrai sel du rôle (les morts sont
-- toujours des votés → la table doute qu'un rôle soit en jeu) vit dans le
-- livre d'aide (roleExtraInfo), pas sur la carte.

UPDATE public.roles SET capacite_full_text =
  'Une fois par Enquête, tue 1 cible — mais uniquement parmi les joueurs ayant reçu au moins une voix au dernier Vote. Au premier tour, tu reçois un couteau car aucune phase de Vote n''a eu lieu.'
WHERE slug = 'vautour';
