-- Facteur : précise dans le texte de capacité que le destinataire de la lettre
-- pourra ensuite s'en servir pour envoyer un message à une autre personne
-- (mécanique déjà en place, cf. items.ts « lettre »). Simple ajout de prose.

UPDATE public.roles
SET capacite_full_text =
  'À chaque Enquête. Désigne un joueur : il reçoit une « lettre » dans son inventaire. La personne pourra envoyer un message à une autre personne.'
WHERE slug = 'facteur';
