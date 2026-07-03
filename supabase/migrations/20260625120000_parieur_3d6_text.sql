-- Parieur tricheur : aligne le texte joueur sur le code (3 dés, garde le meilleur).
-- Le moteur (executeCapability → case "parieur_tricheur") lance 3 d6 et garde le
-- meilleur (~79 % de victoire au pari) ; le texte disait encore « 2 dés ».
UPDATE public.roles
SET capacite_full_text = 'Une fois dans la partie, provoque 1 joueur en duel de dés : tu lances 3 dés à 6 faces et gardes le meilleur, ta cible n''en lance qu''un seul. Le plus petit nombre meurt à la prochaine annonce (une protection peut le sauver d''ici là). En cas d''égalité, on relance jusqu''à départage. Tu gagnes si tu es le seul en vie — mais si tu perds le pari, tu ne peux plus gagner en solo.'
WHERE slug = 'parieur_tricheur' AND set_id = 'set1';
