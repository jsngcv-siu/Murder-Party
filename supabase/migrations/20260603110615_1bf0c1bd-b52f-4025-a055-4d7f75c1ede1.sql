UPDATE public.roles SET
  usage_label = '1×/phase libre',
  capacite_full_text = 'À chaque phase libre. Empoisonne 1 joueur. Tu gagnes si toutes les cibles vivantes et hors de prison sont empoisonnées.'
WHERE slug = 'empoisonneur';

UPDATE public.roles SET
  capacite_full_text = 'Après qu''une personne ait passé un tour complet en prison, tu peux choisir de l''exécuter.'
WHERE slug = 'executeur';

UPDATE public.roles SET
  usage_label = '1×/phase libre',
  capacite_full_text = 'Tu possèdes 3 fioles : poison (tue quelqu''un), vie (protège), clairvoyance (voir la faction) que tu peux garder ou offrir durant le tour à un autre joueur. Limité à 1 par tour.'
WHERE slug = 'apothicaire';

UPDATE public.roles SET
  usage_label = 'Passif',
  capacite_full_text = 'Au début de la partie, tu reçois un couteau dans ton inventaire qui te permet de tuer une personne.'
WHERE slug = 'cuisinier';

UPDATE public.roles SET
  capacite_full_text = 'À chaque phase libre, désigne 1 joueur pour le manipuler. La cible voit le statut « Manipulé » et sa capacité est bloquée pour ce tour.'
WHERE slug = 'marionnettiste';