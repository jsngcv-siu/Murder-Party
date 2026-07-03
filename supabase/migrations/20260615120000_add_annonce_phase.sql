-- Ajoute la phase "Annonce" dans la boucle de jeu.
-- Nouvelle boucle : Phase Libre → Annonce (dénouement du resolver) → Rassemblement → Vote.
-- La valeur est insérée AVANT 'gathering' pour respecter l'ordre logique de l'enum.
ALTER TYPE phase_t ADD VALUE IF NOT EXISTS 'annonce' BEFORE 'gathering';
