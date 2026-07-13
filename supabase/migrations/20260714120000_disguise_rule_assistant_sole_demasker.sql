-- Règle des déguisements : l'Assistant du détective est le SEUL rôle à percer
-- l'Usurpateur ET le Tueur. Tous les autres enquêteurs sont trompés (l'Usurpateur
-- ressort sous sa couverture Civil, le Tueur camouflé en Citoyen). La falsification
-- bloque tout le monde (inchangé, message dédié côté moteur).
--
-- Cette migration réaligne le texte de capacité (capacite_full_text) affiché dans
-- le codex des rôles, qui portait encore l'ancienne règle (Policier démasqueur,
-- Assistant trompé). Le moteur (src/engine/actions.ts) a déjà été inversé.

-- Assistant du détective : perce désormais TOUS les déguisements.
UPDATE public.roles
SET capacite_full_text =
  '1×/TOUR. Désigne 1 joueur. Le backend renvoie un trio : vrai rôle + 2 leurres. Seul rôle à percer les déguisements : le Tueur et l''Usurpateur ressortent sous leur VRAI rôle.'
WHERE slug = 'assistant_du_detective';

-- Policier : désormais trompé par la couverture de l'Usurpateur (comme par le Tueur).
UPDATE public.roles
SET capacite_full_text =
  '1×/TOUR. Désigne 1 joueur. Verdict binaire : Méchant oui/non. Le Tueur ET l''Usurpateur ressortent « non-Méchant » — seul l''Assistant du détective les démasque.'
WHERE slug = 'policier';
