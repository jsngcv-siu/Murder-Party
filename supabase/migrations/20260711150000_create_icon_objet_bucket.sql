-- Bucket Storage des icônes d'OBJETS (fioles, couteau, lettre, indice, reliques…).
--
-- Contrairement aux rôles (lignes de la table `roles`, avec une colonne
-- `image_url` synchronisée par un trigger), les objets sont définis EN CODE
-- (ITEM_CATALOG / RELIQUE_CATALOG dans src/engine/items.ts). Il n'y a donc ni
-- ligne DB ni trigger : le client résout directement `icon-objet/<clé>.png`
-- (src/lib/itemIcon.ts), exactement comme les avatars listent `icon-avatar`.
--
-- Convention de nom de fichier (basename = clé de l'objet) :
--   • objets de base : <slug>.png
--       fiole_mort.png, fiole_vie.png, fiole_clairvoyance.png,
--       couteau.png, lettre.png, indice.png
--   • reliques : <variant>.png
--       coeur_du_manoir.png, oeil_damnation.png, medaillon_vieux_maitre.png,
--       lettre_scellee.png, miroir_minuit.png, clef_aile_interdite.png,
--       poupee_grenier.png, lettre_oubliee.png, portrait_dame_blanche.png,
--       bougie_des_ames.png
--
-- Si un PNG n'existe pas encore, l'UI retombe automatiquement sur l'emoji.
insert into storage.buckets (id, name, public)
values ('icon-objet', 'icon-objet', true)
on conflict (id) do update set public = excluded.public;
