-- Lever A : stocker le vainqueur directement sur la ligne `games`.
--
-- Motivation : l'écran de fin (E1EndGame) affichait « Calcul… » quelques secondes
-- car il refaisait une requête `notifications` (game_end) après montage. En écrivant
-- le vainqueur dans le MÊME update que `status = ended`, l'info arrive dans le même
-- payload realtime que le changement de statut → l'écran se peuple dès la première
-- frame, sans requête supplémentaire. Fin du flash « Calcul… ».
--
-- `winner`     : camp/rôle gagnant (NULL = fin sans vainqueur, ex. aucun survivant).
-- `win_reason` : phrase de clôture. Sa présence (non-NULL) signale que la ligne porte
--                un résultat terminal résolu — le client s'en sert pour distinguer
--                « pas encore écrit » d'un « winner NULL » légitime.
alter table public.games
  add column if not exists winner text,
  add column if not exists win_reason text;
