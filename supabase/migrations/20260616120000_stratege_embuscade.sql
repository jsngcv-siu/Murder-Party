-- Refonte du Stratège : tueur « embuscade ».
-- Réactive le rôle (auparavant désactivé avec la mécanique cassée des « 3 Fidèles »)
-- et le redéfinit comme tueur principal alternatif (type=TUEUR déjà en place) :
--   • reçoit un couteau au setup (kill immédiat),
--   • marque une cible par phase libre (kill télégraphié, résolu à l'annonce du tour suivant).
UPDATE public.roles SET
  is_disabled = false,
  target_mode = 'single',
  usage_label = '1×/phase libre',
  phase_activation = 'Phase Libre',
  instruction_verb = 'Marque ta cible',
  capacite_full_text = 'Tu reçois un couteau au début de la partie. Chaque phase libre, marque une cible : elle est prévenue au rassemblement qu''elle est visée et meurt à l''annonce du tour suivant (sauf protection, ou si tu es neutralisé avant). Tu peux aussi utiliser ton couteau pour frapper immédiatement.'
WHERE slug = 'stratege';
