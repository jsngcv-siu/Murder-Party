
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS image_url text;

UPDATE public.roles SET image_url = '/__l5e/assets-v1/80bedb3a-eee9-4cf8-a530-1a5ea753c28e/ange_gardien.png' WHERE slug = 'ange_gardien';
UPDATE public.roles SET image_url = '/__l5e/assets-v1/b83bdbcf-b9fa-465f-9821-7c841705cd18/barman.png' WHERE slug = 'barman';
UPDATE public.roles SET image_url = '/__l5e/assets-v1/0acd1290-d783-4d82-9aca-4fc71232760f/detective.png' WHERE slug IN ('detective','assistant_du_detective');
UPDATE public.roles SET image_url = '/__l5e/assets-v1/95c9190d-3e8b-4ec1-a7a4-df19885d6405/entremetteur.png' WHERE slug = 'entremetteur';
