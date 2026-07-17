-- P2 (audit 2026-07-16) — toilettage de TEXTES joueur périmés/imprécis.
-- Affichage uniquement (capacite_full_text) : aucune modif de label, de phase
-- ou de logique. Corrige : vocabulaire « 1×/TOUR » → « 1×/Enquête », jargon
-- technique « le backend… » visible en jeu, et « Au setup » là où le choix se
-- fait en réalité à la première Enquête. Aligne aussi le Mouchard sur son vrai
-- comportement (les déguisements trompent sa révélation — ce n'est pas « exact »).

UPDATE public.roles
SET capacite_full_text =
  '1×/Enquête. Désigne 1 joueur : tu obtiens un trio (son vrai rôle + 2 leurres). Seul rôle à percer les déguisements — le Tueur et l''Usurpateur ressortent sous leur VRAI rôle. Une cible falsifiée reste indétectable.'
WHERE slug = 'assistant_du_detective' AND set_id = 'set1';

UPDATE public.roles
SET capacite_full_text =
  '1×/Enquête. Désigne 1 joueur. Verdict binaire : suspect ou non. Le Tueur ET l''Usurpateur ressortent « pas suspect » — seul l''Assistant du détective les démasque.'
WHERE slug = 'policier' AND set_id = 'set1';

UPDATE public.roles
SET capacite_full_text =
  'Au setup, un Citoyen aléatoire t''est révélé : son identité et son rôle exact.'
WHERE slug = 'temoin' AND set_id = 'set1';

UPDATE public.roles
SET capacite_full_text =
  'À la première Enquête, choisis 1 joueur et apprends son rôle. Les déguisements te trompent (l''Usurpateur ressort sous sa couverture, un tueur camouflé en Citoyen, une cible falsifiée en « falsifié »). Révélation privée permanente.'
WHERE slug = 'mouchard' AND set_id = 'set1';

UPDATE public.roles
SET capacite_full_text =
  'À la première Enquête, lie 2 joueurs autres que toi. Si l''un meurt, l''autre meurt automatiquement. Gagne si le couple survit.'
WHERE slug = 'entremetteur' AND set_id = 'set1';
