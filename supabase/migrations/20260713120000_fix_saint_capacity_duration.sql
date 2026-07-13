-- Fix Saint : la carte de capacité disait « immunité totale ce tour » alors que
-- le moteur pose une bénédiction de 2 cycles complets (blessed_until_cycle =
-- tour + 2, cf. src/engine/actions.ts case "saint"). La subtilité du dossier
-- (roleExtraInfo.ts) et le message de résolution annoncent déjà « 2 tours
-- complets » : on aligne le texte de base sur le comportement réel.

UPDATE public.roles
SET capacite_full_text = '1×/partie. Bénit 1 joueur (toi-même autorisé) : immunité totale pendant 2 tours complets. Si emprisonné par vote : DÉFAITE Citoyens immédiate.'
WHERE slug = 'saint';
