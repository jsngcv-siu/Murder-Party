-- Stratège — refonte complète : l'ancien fonctionnement (couteau au setup + marque
-- « embuscade » télégraphiée) est supprimé côté moteur. Nouveau : chaque Enquête,
-- il choisit 1 de 3 modes (jamais le même deux tours de suite) :
--   • Discrétion   → tue 1 cible ;
--   • Bain de sang → tue 2 cibles distinctes, mais un Civil au hasard reçoit un
--     indice révélant son identité ;
--   • Sabotage     → ne tue personne, bloque totalement la capacité d'1 cible au
--     tour suivant.
-- L'icône du rôle reste inchangée. On ne touche que des colonnes existantes.

UPDATE public.roles
SET
  capacite_full_text =
    'À chaque Enquête, choisis 1 de tes 3 modes — jamais le même deux tours de suite. Discrétion : tue 1 cible. Bain de sang : tue 2 cibles distinctes, mais un Civil au hasard reçoit un indice révélant ton identité. Sabotage : ne tue personne, mais bloque totalement la capacité d''1 cible au prochain tour.',
  target_mode = 'double',
  frequency_label = '1×/Enquête',
  usage_label = '1×/Enquête'
WHERE slug = 'stratege';
