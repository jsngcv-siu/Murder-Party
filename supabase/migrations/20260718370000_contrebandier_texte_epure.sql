-- Contrebandier : épure du texte de carte (décision Jason 2026-07-18).
-- On retire « Passif. » du début et la liste d'objets (déportée dans le panneau
-- « Ta malle » de l'écran capacité). La carte ne garde que le principe.

UPDATE public.roles SET capacite_full_text =
  'Tous les 2 tours, tes connexions te livrent un objet aléatoire de ta malle, droit dans ton inventaire. Rien ne se livre tant que tu es en prison.'
WHERE slug = 'contrebandier';
