UPDATE public.roles
SET phase_activation = 'NUIT',
    usage_label = '1×/rassemblement',
    frequency_label = '1×/rassemblement'
WHERE slug = 'babysitter';

UPDATE public.roles
SET capacite_full_text = '1×/JOUR. Sélectionne 2 joueurs : 1 des 2 (au hasard) tombe ivre — sa capacité sera bloquée au prochain cycle.'
WHERE slug = 'barman';

UPDATE public.roles
SET capacite_full_text = '1×/JOUR. Empoisonne 1 joueur (statut permanent). Tu gagnes si suffisamment de tes cibles empoisonnées meurent.'
WHERE slug = 'empoisonneur';