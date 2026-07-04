-- Réaligne la fiche du Parieur tricheur sur le COMPORTEMENT réel du code.
-- La base live décrivait un ancien mécanisme (« jet le plus bas / relancer 1 fois
-- par partie ») qui ne correspond plus au handler `executeCapability` :
--   • le tricheur lance 2 dés à 6 faces et garde le MEILLEUR ; la cible n'en lance qu'un ;
--   • le plus petit nombre meurt à la prochaine annonce (mort différée, protégeable) ;
--   • égalité → relance automatique jusqu'à départage (pas un choix du joueur).
-- On corrige aussi usage_label : il valait « 1×/phase libre » (le code laissait donc
-- rejouer chaque phase libre) alors que l'intention est 1×/partie.
-- NB : ce texte existait déjà dans 20260616120000_parieur_d6 mais n'avait pas été
-- appliqué à la base live (dérive base ≠ migrations).
UPDATE public.roles SET
  usage_label = '1×/partie',
  frequency_label = '1×/partie',
  phase_activation = 'Phase Libre',
  capacite_full_text = 'Une fois dans la partie, provoque 1 joueur en duel de dés : tu lances 2 dés à 6 faces et gardes le meilleur, ta cible n''en lance qu''un seul. Le plus petit nombre meurt à la prochaine annonce (une protection peut le sauver d''ici là). En cas d''égalité, on relance jusqu''à départage. Tu gagnes si tu es le seul en vie — mais si tu perds le pari, tu ne peux plus gagner en solo.'
WHERE slug = 'parieur_tricheur';
