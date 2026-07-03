UPDATE public.roles SET 
  capacite_full_text = 'À chaque rassemblement, cible une personne à protéger. Si protection réussie : la cible survit, tu meurs, et la personne qui l''a visée meurt aussi.',
  frequency_label = 'rassemblement',
  usage_label = '1×/rassemblement'
WHERE slug = 'majordome';

UPDATE public.roles SET 
  capacite_full_text = 'À chaque rassemblement, cible 2 joueurs pour les protéger de la mort, mais l''un devient ivre. Tu ne sais pas lequel. (Ivre = capacité bloquée pendant 1 jour.)',
  frequency_label = 'rassemblement',
  usage_label = '1×/rassemblement'
WHERE slug = 'barman';