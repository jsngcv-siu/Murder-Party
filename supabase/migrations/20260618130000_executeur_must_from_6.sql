-- L'Exécuteur devient un rôle MUST dès 6 joueurs (auparavant 8+).
-- La ville a besoin d'un pouvoir de tueur civil garanti à toutes les tailles —
-- son seul levier pour franchir une fin de partie serrée, d'autant que les
-- Méchants gagnent désormais à la MAJORITÉ STRICTE (et non plus à la parité).
-- On aligne min_players sur 6 pour la cohérence codex / tirage du pool.
UPDATE public.roles SET min_players = 6 WHERE slug = 'executeur';
