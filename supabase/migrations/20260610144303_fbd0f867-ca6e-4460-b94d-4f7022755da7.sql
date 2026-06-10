DROP VIEW IF EXISTS public.leaderboard;

CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (user_id uuid, username text, xp integer, streak integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id, username, xp, streak
  FROM public.profiles
  ORDER BY xp DESC
  LIMIT 100;
$$;

REVOKE EXECUTE ON FUNCTION public.get_leaderboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;
