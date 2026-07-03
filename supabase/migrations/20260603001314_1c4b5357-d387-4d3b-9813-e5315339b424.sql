-- Rename "cycle" terminology to "tour" across the schema
ALTER TABLE public.games RENAME COLUMN current_cycle TO current_tour;
ALTER TABLE public.role_actions RENAME COLUMN cycle TO tour;
ALTER TABLE public.votes RENAME COLUMN cycle TO tour;
ALTER TABLE public.gathering_calls RENAME COLUMN cycle TO tour;

-- Update default for usage_label
ALTER TABLE public.roles ALTER COLUMN usage_label SET DEFAULT '1×/tour';

-- Update existing data: chat channel "loups" -> "mechants"
UPDATE public.chat_messages SET channel = 'mechants' WHERE channel = 'loups';

-- Update role text content: JOUR/Jour/jour -> TOUR/Tour/tour and cycle -> tour
UPDATE public.roles SET
  capacite_full_text = regexp_replace(
    regexp_replace(
      regexp_replace(capacite_full_text, '\mJOUR\M', 'TOUR', 'g'),
      '\mcycles?\M', 'tour', 'gi'
    ),
    '\mjours?\M', 'tour', 'gi'
  ),
  usage_label = regexp_replace(
    regexp_replace(usage_label, '\mcycles?\M', 'tour', 'gi'),
    '\mjours?\M', 'tour', 'gi'
  ),
  frequency_label = regexp_replace(
    regexp_replace(COALESCE(frequency_label, ''), '\mcycles?\M', 'tour', 'gi'),
    '\mjours?\M', 'tour', 'gi'
  ),
  carte_app = regexp_replace(
    regexp_replace(COALESCE(carte_app, ''), '\mcycles?\M', 'tour', 'gi'),
    '\mjours?\M', 'tour', 'gi'
  ),
  description = regexp_replace(
    regexp_replace(COALESCE(description, ''), '\mcycles?\M', 'tour', 'gi'),
    '\mjours?\M', 'tour', 'gi'
  ),
  phase_activation = regexp_replace(
    regexp_replace(phase_activation, '\mcycles?\M', 'tour', 'gi'),
    '\mjours?\M', 'tour', 'gi'
  );
