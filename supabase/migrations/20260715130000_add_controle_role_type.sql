-- Ajoute la valeur 'CONTRÔLE' à l'enum role_type_t (types de rôle affichés/tirés).
-- Nouvelle famille : rôles qui BLOQUENT / VOLENT / DÉTOURNENT une capacité
-- (Cleaner, Maître chanteur, Voleur, Marionnettiste) — aujourd'hui éparpillés
-- entre SUPPORT et TROMPERIE côté Méchant.
--
-- ⚠️ Postgres : une nouvelle valeur d'enum doit être COMMITTÉE avant de pouvoir
-- être utilisée dans un UPDATE. L'attribution aux rôles vit donc dans une
-- migration séparée (20260715130100_controle_reassign_roles.sql), appliquée après.
ALTER TYPE public.role_type_t ADD VALUE IF NOT EXISTS 'CONTRÔLE';
