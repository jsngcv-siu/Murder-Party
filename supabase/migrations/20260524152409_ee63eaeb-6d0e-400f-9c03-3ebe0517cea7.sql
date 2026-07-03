
ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS verdict_mythomane text,
  ADD COLUMN IF NOT EXISTS civil_group text;

-- Verdict mythomane : suspicieux par défaut pour non-citoyens, civils boulets ; non_suspicieux pour citoyens sains
UPDATE public.roles SET verdict_mythomane = CASE
  WHEN faction <> 'Citoyens' THEN 'suspicieux'
  WHEN type = 'Civil Boulet' THEN 'suspicieux'
  ELSE 'non_suspicieux'
END;

-- Catégories de civils pour pondérer le pool (le MJ peut bannir par groupes)
UPDATE public.roles SET civil_group = 'investigateur'
  WHERE faction='Citoyens' AND slug IN (
    'detective','assistant_du_detective','policier','policier_modifie',
    'boussole','cartomancien','chasseur_de_vampire','medecin_legiste','medium',
    'guetteur','voisin','voisin_coupable','scientifique','spy','comptable',
    'mouchard','oracle','reveur','temoin'
  );

UPDATE public.roles SET civil_group = 'support'
  WHERE faction='Citoyens' AND slug IN (
    'apothicaire','avocat','babysitter','barman','cuisinier','empoisonneur',
    'majordome','ange_gardien','facteur','notaire','entremetteur','stratege',
    'fidele','executeur','vengeur','non_coupable','juge','usurpateur',
    'imitateur','taupe','marionnettiste','cleaner','maitre_chanteur'
  );

UPDATE public.roles SET civil_group = 'boulet'
  WHERE faction='Citoyens' AND type = 'Civil Boulet';

-- Refonte fiche Mythomane
UPDATE public.roles SET
  name_fr = 'Le Mythomane',
  icon = '🤥',
  type = 'Civil Boulet',
  tier = 'Moyen',
  difficulte = 'Moyen',
  usage_label = '1×/JOUR',
  instruction_verb = 'Enquête sur',
  target_mode = 'single',
  phase_activation = 'Phase Libre',
  min_players = 8,
  capacite_full_text = 'Chaque JOUR, enquête sur 1 joueur : verdict 🟠 « Est suspicieux » ou 🟢 « N''est pas suspicieux ». Le verdict est vrai 50% du temps, aléatoire 50% du temps — tu ne sais pas lequel. Si tu cibles le MÊME joueur 2 JOURs consécutifs, le 2e verdict est garanti vrai (badge ✅ Verdict confirmé). Attention : les Civils Boulets te paraîtront 🟠 même quand le verdict est vrai.',
  description = 'Tu sens les ondes louches chez les gens. Recouper tes impressions en insistant 2 jours d''affilée sur la même personne te donne une certitude.'
WHERE slug = 'mythomane';

-- Veuve Noire : précise le quota (cible quota selon nb de joueurs)
UPDATE public.roles SET
  capacite_full_text = 'Au début de la partie, choisis un époux. Il meurt 2 cycles après le mariage. Quota à atteindre pour gagner : 1 époux mort si ≤9 joueurs, 2 si 10-12 joueurs, 3 si 13+ joueurs.'
WHERE slug = 'veuve_noire';
