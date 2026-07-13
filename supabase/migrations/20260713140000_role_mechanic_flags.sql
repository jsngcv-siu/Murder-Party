-- ─────────────────────────────────────────────────────────────────────────────
-- Découplage mécanique ↔ ambiance (phase 2 de l'assainissement, 2026-07-13).
--
-- Le champ `type` (PROTECTEUR/TUEUR/…/MAL/CHAOS/BÉNIN) servait à la fois de
-- label d'ambiance ET de pivot moteur (conditions de victoire, succession du
-- Tueur, blocage par bénédiction). On introduit des drapeaux EXPLICITES par
-- rôle ; le backfill reproduit À L'IDENTIQUE la logique actuelle par type →
-- aucun changement de comportement. Le code lit ces drapeaux avec repli sur
-- l'ancienne logique type, donc l'ordre (migration avant/après déploiement)
-- est sans risque.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS is_benign boolean;
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS is_hostile boolean;
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS is_killer_class boolean;
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS mechanic text;

COMMENT ON COLUMN public.roles.is_benign IS
  'Neutre « bénin » : ne bloque pas la victoire des Civils, peut gagner avec n''importe quel camp (ex-type BÉNIN).';
COMMENT ON COLUMN public.roles.is_hostile IS
  'Action hostile : bloquée par la bénédiction du Saint (ex Méchant ou Neutre MAL/CHAOS).';
COMMENT ON COLUMN public.roles.is_killer_class IS
  'Tueur méchant générique : slot Tueur au tirage, succession d''Acolyte, camouflage au verdict du Policier (ex Méchant+TUEUR).';
COMMENT ON COLUMN public.roles.mechanic IS
  'Taxonomie mécanique réelle (indicative, UX/équilibrage) : LETAL, PROTECTION, INFO, CONTROLE, CONVERSION, WINCON, POLYVALENT, UTILITAIRE.';

-- ── Backfill : copie exacte de la logique moteur actuelle ──────────────────
UPDATE public.roles SET is_benign       = (faction::text = 'Neutre'  AND upper(type::text) = 'BÉNIN');
UPDATE public.roles SET is_hostile      = (faction::text = 'Méchant' OR (faction::text = 'Neutre' AND type::text IN ('MAL', 'CHAOS')));
UPDATE public.roles SET is_killer_class = (faction::text = 'Méchant' AND type::text = 'TUEUR');

-- ── Taxonomie mécanique (audit des handlers, 2026-07-13) ───────────────────
UPDATE public.roles SET mechanic = 'LETAL'      WHERE slug IN ('tueur','croque_mitaine','stratege','executeur','cuisinier','vengeur','chasseur_de_vampire','veuve_noire','parieur_tricheur');
UPDATE public.roles SET mechanic = 'PROTECTION' WHERE slug IN ('ange_gardien','saint','majordome','babysitter','barman');
UPDATE public.roles SET mechanic = 'INFO'       WHERE slug IN ('policier','boussole','assistant_du_detective','guetteur','cartomancien','heritier_dechu','mouchard','medecin_legiste','medium','avocat','temoin');
UPDATE public.roles SET mechanic = 'CONTROLE'   WHERE slug IN ('maitre_chanteur','marionnettiste','cleaner','usurpateur');
UPDATE public.roles SET mechanic = 'UTILITAIRE' WHERE slug IN ('juge','facteur');
UPDATE public.roles SET mechanic = 'POLYVALENT' WHERE slug IN ('apothicaire');
UPDATE public.roles SET mechanic = 'CONVERSION' WHERE slug IN ('vampire','imitateur');
UPDATE public.roles SET mechanic = 'WINCON'     WHERE slug IN ('oracle','entremetteur','empoisonneur');

-- Verrouillage : une fois backfillés, les drapeaux deviennent obligatoires.
ALTER TABLE public.roles ALTER COLUMN is_benign SET NOT NULL;
ALTER TABLE public.roles ALTER COLUMN is_hostile SET NOT NULL;
ALTER TABLE public.roles ALTER COLUMN is_killer_class SET NOT NULL;
ALTER TABLE public.roles ALTER COLUMN is_benign SET DEFAULT false;
ALTER TABLE public.roles ALTER COLUMN is_hostile SET DEFAULT false;
ALTER TABLE public.roles ALTER COLUMN is_killer_class SET DEFAULT false;

-- Contrôle rapide (à exécuter après, doit renvoyer 37 lignes cohérentes) :
--   SELECT slug, faction, type, is_benign, is_hostile, is_killer_class, mechanic
--   FROM public.roles WHERE set_id = 'set1' ORDER BY faction, slug;
