-- Parieur tricheur : passage du d100 au duel de dés à 6 faces.
-- Le tricheur lance 2 dés à 6 faces et garde le meilleur ; la cible en lance 1.
-- Le plus petit nombre meurt à la prochaine annonce (mort différée, donc
-- protégeable) ; une égalité relance le duel (personne ne meurt).
UPDATE public.roles
SET capacite_full_text = '1×/partie. Provoque 1 joueur en duel de dés : tu lances 2 dés à 6 faces et gardes le meilleur, ta cible n''en lance qu''un seul. Le plus petit nombre meurt à la prochaine annonce (une protection peut le sauver d''ici là). En cas d''égalité, on relance jusqu''à départage. Si tu perds le pari, tu ne peux plus gagner en solo.'
WHERE slug = 'parieur_tricheur';
