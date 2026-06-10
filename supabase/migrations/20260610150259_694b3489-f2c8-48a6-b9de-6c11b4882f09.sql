REVOKE EXECUTE ON FUNCTION public.increment_xp(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_xp(uuid, integer) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.get_leaderboard() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard() FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- Ensure the ones that need it still have it
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_xp(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_xp(uuid, integer) TO service_role;