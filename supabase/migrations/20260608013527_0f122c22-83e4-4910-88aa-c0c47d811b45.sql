
CREATE TABLE public.avatars (
  id text PRIMARY KEY,
  label text NOT NULL,
  emoji text NOT NULL DEFAULT '🗝️',
  image_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.avatars TO anon, authenticated;
GRANT ALL ON public.avatars TO service_role;

ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Avatars are readable by everyone"
ON public.avatars FOR SELECT
USING (true);

INSERT INTO public.avatars (id, label, emoji, sort_order) VALUES
  ('detective','Détective','🕵️',1),
  ('lady','Lady','👒',2),
  ('butler','Majordome','🤵',3),
  ('doctor','Médecin','🥼',4),
  ('priest','Prêtre','⛪',5),
  ('soldier','Soldat','🎖️',6),
  ('artist','Artiste','🎨',7),
  ('scholar','Érudit','📚',8),
  ('noble','Noble','🎩',9),
  ('sailor','Marin','⚓',10),
  ('witch','Voyante','🔮',11),
  ('stranger','L''Étranger','🗝️',12);

UPDATE public.avatars
SET image_url = '/__l5e/assets-v1/9258b809-ad2a-4661-9d49-7ad2d15e72bd/usurpateur_sample.png'
WHERE id = 'stranger';
