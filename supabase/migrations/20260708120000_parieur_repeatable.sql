-- Parieur tricheur : passage de 1×/partie à 1×/TOUR (répétable).
--
-- Diagnostic (sim) : à 1×/partie, le Parieur gagne ~3,5 % (rôle quasi mort). La cause
-- n'est PAS le duel de dés (il le gagne déjà ~79 % : 3d6 garde le meilleur vs 1d6) mais
-- sa condition de victoire (SEUL survivant) avec un unique kill dans toute la partie.
-- Le levier réel = la RÉPÉTABILITÉ : en pouvant provoquer un duel chaque tour, il peut
-- enchaîner les kills pour tenter d'être seul en vie — mais chaque duel le risque (21 %
-- de mourir). Push-your-luck assumé : win-rate faible mais gagné par la prise de risque.
--
-- Le handler `executeCapability → case "parieur_tricheur"` ne change pas (3d6 vs 1d6,
-- mort différée protégeable). Seul le quota (usage_label) passe à 1×/tour.
UPDATE public.roles SET
  usage_label = '1×/tour',
  frequency_label = '1×/tour',
  phase_activation = 'Phase Libre',
  capacite_full_text = 'Chaque tour, provoque 1 joueur en duel de dés : tu lances 3 dés à 6 faces et gardes le meilleur, ta cible n''en lance qu''un seul. Le plus petit nombre meurt à la prochaine annonce (une protection peut le sauver d''ici là). En cas d''égalité, on relance jusqu''à départage. Tu gagnes si tu es le seul en vie — mais si tu perds un pari, tu meurs. Enchaîne les paris pour vider la table… tant que ta chance tient.'
WHERE slug = 'parieur_tricheur' AND set_id = 'set1';
