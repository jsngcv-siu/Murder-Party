-- Chat du Manoir : reformulation du texte carte — « la première attaque qui te
-- vise » contenait un verbe de ciblage sur une carte passive (target_mode=none),
-- signalé par role-static-audit. Le fichier d'insert 20260718150000 est
-- synchronisé pour les replays à neuf ; cette migration corrige la ligne déjà
-- posée en prod. Aucun changement de gameplay.

UPDATE public.roles SET capacite_full_text =
  'Tu es le chat du manoir. Passif : la première attaque portée contre toi ne te tue pas — le manoir entend alors un miaulement dans la nuit. Tu gagnes si tu es en vie à la fin, quel que soit le camp vainqueur.'
WHERE slug = 'chat_du_manoir';
