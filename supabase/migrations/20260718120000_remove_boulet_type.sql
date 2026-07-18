-- BOULET n'existe plus comme famille de rôles (purge actée 2026-07-13 : les
-- anciens « Civil Boulet » ont été reclassés ou supprimés). Dernières traces :
--   1. roles.secondary_type = 'BOULET' sur le Témoin (vestige de 20260603000413) ;
--   2. la valeur 'BOULET' dans l'enum role_type_t.
-- Cette migration efface les deux. Idempotente : re-jouable sans effet.

UPDATE public.roles SET secondary_type = NULL WHERE secondary_type = 'BOULET';

-- Postgres ne sait pas retirer une valeur d'un enum en place → colonnes en
-- text, recréation du type sans BOULET, re-cast. DROP TYPE sans CASCADE =
-- garde-fou : la migration échoue si une autre colonne référençait encore
-- role_type_t (aucune connue : seuls roles.type et roles.secondary_type).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'role_type_t' AND e.enumlabel = 'BOULET'
  ) THEN
    ALTER TABLE public.roles ALTER COLUMN type TYPE text USING type::text;
    ALTER TABLE public.roles ALTER COLUMN secondary_type TYPE text USING secondary_type::text;
    DROP TYPE public.role_type_t;
    CREATE TYPE public.role_type_t AS ENUM
      ('PROTECTEUR','TUEUR','INVESTIGATION','SUPPORT','TROMPERIE','CONTRÔLE','MAL','CHAOS','BÉNIN');
    ALTER TABLE public.roles ALTER COLUMN type TYPE public.role_type_t
      USING type::public.role_type_t;
    ALTER TABLE public.roles ALTER COLUMN secondary_type TYPE public.role_type_t
      USING secondary_type::public.role_type_t;
  END IF;
END $$;
