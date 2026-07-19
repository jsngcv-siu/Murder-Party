-- Bretteur : nombre de parades scalé par la table (décision Jason 2026-07-18).
-- 1 parade jusqu'à 10 joueurs, 2 parades à partir de 11 (grandes tables = plus
-- de tueurs). Moteur aligné : parseTotalLimit(bretteur) = n>=11 ? 2 : 1 ; le
-- total est enforced par whyCannotUse. Le libellé passe à « 1-2×/partie » (ne
-- doit plus matcher « 1×/partie » exact, sinon le scaling serait écrasé).

UPDATE public.roles SET
  capacite_full_text =
    'Lève ta garde pour un tour : si on t''attaque cette nuit-là, tu pares et tu embroches — l''attaque échoue ET l''attaquant meurt. Si personne ne t''attaque, ta garde est perdue. Utilisable une fois dans la partie ; deux fois à partir de 11 joueurs.',
  usage_label = '1-2×/partie',
  frequency_label = '1-2×/partie'
WHERE slug = 'bretteur';
