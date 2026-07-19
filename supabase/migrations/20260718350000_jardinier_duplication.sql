-- Jardinier : refonte totale (décision Jason 2026-07-18). Il ne ratisse plus
-- les objets des morts — il DUPLIQUE. 1×/Enquête, il cible un joueur vivant et
-- copie son dernier objet reçu (l'original reste à la cible ; le Jardinier
-- obtient un double identique). Passe donc de sans-cible à cible unique.
-- Moteur aligné (case "jardinier" : duplication silencieuse).

UPDATE public.roles SET
  capacite_full_text =
    'Une fois par Enquête, choisis un joueur : tu DUPLIQUES son dernier objet reçu. Il garde le sien ; tu reçois une copie identique. Silencieux — la cible ne sait pas qu''elle a été bouturée.',
  carte_app = 'Bouture un objet',
  description =
    'Bouturiste de génie : il lui suffit d''un contact pour repiquer n''importe quel objet et le faire pousser chez lui.',
  target_mode = 'single',
  instruction_verb = 'Bouture'
WHERE slug = 'jardinier';
