-- Apothicaire — refonte : ne reçoit plus ses fioles au setup. Chaque Enquête,
-- elle joue 1 fiole via sa capacité, soit en l'utilisant elle-même sur une cible,
-- soit en l'offrant à un joueur. Budgets séparés sur la partie : 1 usage perso +
-- 1 don au maximum → la 3ᵉ fiole ne sert jamais. Le moteur (src/engine/actions.ts)
-- porte la logique ; ici on réaligne le texte et la fréquence (n'était plus un
-- rôle « Setup »). NB : ne touche que des colonnes existantes en prod.

UPDATE public.roles
SET
  capacite_full_text =
    'À chaque Enquête, joue 1 de tes 3 fioles (Vie protège, Mort tue, Clairvoyance révèle une faction) : soit tu l''utilises toi-même sur une cible, soit tu l''offres à un joueur qui la gardera pour plus tard. Sur la partie : 1 usage perso ET 1 don au maximum — ta 3ᵉ fiole ne servira pas.',
  frequency_label = '1×/Enquête',
  usage_label = '1×/Enquête'
WHERE slug = 'apothicaire';
