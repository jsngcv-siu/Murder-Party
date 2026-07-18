-- RÉACTIVATION pour la revue de Jason (2026-07-18) : le livre d'aide et le
-- tirage filtrent is_disabled=false — les 17 nouveaux rôles étaient invisibles
-- dans « Les rôles ». Jason revoit la branche en dev : on les active.
-- ⚠️ Conséquence assumée : l'app prod (main) peut les tirer AVANT le merge —
-- rôles inertes côté vieux front. Fenêtre courte acceptée pour la revue ;
-- le merge + deploy:edge doivent suivre rapidement.

UPDATE public.roles SET is_disabled = false
WHERE slug IN (
  'archiviste','physionomiste','chat_du_manoir','photographe','aubergiste',
  'garde_chasse','bretteur','conjure',
  'contrebandier','jardinier','detrousseur','franc_tireur',
  'geolier','poltergeist','vautour',
  'ventriloque','pyromane'
);
