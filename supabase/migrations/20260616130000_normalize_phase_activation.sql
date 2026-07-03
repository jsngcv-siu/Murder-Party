-- Réconcilie `phase_activation` avec le libellé joueur (`usage_label` / `frequency_label`).
-- Le moteur déduit désormais la phase autorisée via allowedActivePhases() (src/engine/actions.ts),
-- qui lit en priorité usage_label ; cette migration aligne simplement les données existantes
-- pour que les deux champs cessent de dériver (orthographes "JOUR"/"PHASE_LIBRE"/"phase_libre"…).
--
-- Règles (insensibles à la casse / aux séparateurs) :
--   • libellé contient "phase libre" ET "rassemblement"  → 'Phase Libre + Rassemblement' (ex: Conservateur)
--   • libellé contient "phase libre"                     → 'Phase Libre'
--   • libellé contient "rassemblement"                   → 'Rassemblement'
--   • passifs / permanents et autres                     → inchangés

WITH lbl AS (
  SELECT
    slug,
    lower(coalesce(usage_label, '') || ' ' || coalesce(frequency_label, '')) AS l
  FROM public.roles
)
UPDATE public.roles r SET phase_activation =
  CASE
    WHEN lbl.l ~ 'phase[ _]*libre' AND lbl.l ~ 'rassemblement' THEN 'Phase Libre + Rassemblement'
    WHEN lbl.l ~ 'phase[ _]*libre' THEN 'Phase Libre'
    WHEN lbl.l ~ 'rassemblement' THEN 'Rassemblement'
    ELSE r.phase_activation
  END
FROM lbl
WHERE lbl.slug = r.slug
  AND (lbl.l ~ 'phase[ _]*libre' OR lbl.l ~ 'rassemblement');
