
REVOKE EXECUTE ON FUNCTION public.is_game_mj(uuid)              FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_player_in_game(uuid)       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_player_id(uuid)            FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_chat_channel(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_game_mj(uuid)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_player_in_game(uuid)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_player_id(uuid)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_chat_channel(uuid, text) TO authenticated;
