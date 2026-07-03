INSERT INTO public.avatars (id, label, emoji, image_url, sort_order)
SELECT 'avatar'||i, 'Avatar '||i, '👤',
  'https://svxjejyaytytfwjnkubv.supabase.co/storage/v1/object/public/icon-avatar/avatar'||i||'.png',
  i
FROM generate_series(21, 32) AS i
ON CONFLICT (id) DO UPDATE SET image_url = EXCLUDED.image_url, sort_order = EXCLUDED.sort_order;