
-- 1) Convert columns from enums to text so we can freely rewrite values
ALTER TABLE public.roles ALTER COLUMN faction TYPE text USING faction::text;
ALTER TABLE public.roles ALTER COLUMN type TYPE text USING type::text;

-- 2) Drop the old faction enum (no longer referenced)
DROP TYPE IF EXISTS faction_t CASCADE;

-- 3) Add new columns
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS is_special boolean NOT NULL DEFAULT false;
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS secondary_type text;

-- 4) Reclassify all 43 roles (set1)
-- Civils
UPDATE public.roles SET faction='Civil', type='PROTECTEUR' WHERE slug IN ('ange_gardien','babysitter','barman','majordome','saint');
UPDATE public.roles SET faction='Civil', type='INVESTIGATION' WHERE slug IN ('assistant_du_detective','boussole','juge','medecin_legiste','policier','voisin');
UPDATE public.roles SET faction='Civil', type='SUPPORT' WHERE slug IN ('apothicaire','facteur','medium','avocat');
UPDATE public.roles SET faction='Civil', type='TUEUR' WHERE slug IN ('vengeur','executeur','cuisinier');
UPDATE public.roles SET faction='Civil', type='BOULET' WHERE slug='guetteur';
UPDATE public.roles SET faction='Civil', type='SUPPORT', secondary_type='BOULET' WHERE slug='temoin';

-- Méchants
UPDATE public.roles SET faction='Méchant', type='TUEUR' WHERE slug IN ('tueur','croque_mitaine','stratege','tueur_isole');
UPDATE public.roles SET faction='Méchant', type='TROMPERIE' WHERE slug IN ('usurpateur','marionnettiste','voleur','accusateur');
UPDATE public.roles SET faction='Méchant', type='INVESTIGATION' WHERE slug IN ('cartomancien','mouchard');
UPDATE public.roles SET faction='Méchant', type='SUPPORT' WHERE slug IN ('cleaner','maitre_chanteur');

-- Neutres
UPDATE public.roles SET faction='Neutre', type='CHAOS' WHERE slug IN ('entremetteur','imitateur','vampire','parieur_tricheur','conservateur');
UPDATE public.roles SET faction='Neutre', type='MAL' WHERE slug IN ('empoisonneur','heritier_dechu','veuve_noire');
UPDATE public.roles SET faction='Neutre', type='BÉNIN' WHERE slug='oracle';

-- Spéciaux (cumul de faction)
UPDATE public.roles SET faction='Civil', type='INVESTIGATION', is_special=true WHERE slug='detective';
UPDATE public.roles SET faction='Neutre', type='INVESTIGATION', secondary_type='TUEUR', is_special=true WHERE slug='chasseur_de_vampire';

-- 5) Sanity check : aucun NULL ne doit subsister
DO $$
DECLARE missing int;
BEGIN
  SELECT count(*) INTO missing FROM public.roles WHERE set_id='set1' AND (faction IS NULL OR type IS NULL);
  IF missing > 0 THEN
    RAISE EXCEPTION 'Migration incomplète : % rôles sans faction/type', missing;
  END IF;
END $$;

-- 6) Recréer une enum stricte pour faction (3 valeurs)
CREATE TYPE faction_t AS ENUM ('Civil','Méchant','Neutre');
ALTER TABLE public.roles ALTER COLUMN faction TYPE faction_t USING faction::faction_t;

-- 7) Recréer une enum stricte pour type
CREATE TYPE role_type_t AS ENUM ('PROTECTEUR','TUEUR','INVESTIGATION','SUPPORT','TROMPERIE','BOULET','MAL','CHAOS','BÉNIN');
ALTER TABLE public.roles ALTER COLUMN type TYPE role_type_t USING type::role_type_t;
ALTER TABLE public.roles ALTER COLUMN secondary_type TYPE role_type_t USING secondary_type::role_type_t;
