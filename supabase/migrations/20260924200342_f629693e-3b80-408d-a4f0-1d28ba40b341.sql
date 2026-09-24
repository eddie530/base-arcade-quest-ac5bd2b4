CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  -- Callers may only ask about themselves (RLS always passes auth.uid()).
  -- Service role (trusted server code) may ask about anyone.
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN auth.role() = 'service_role' OR _user_id = auth.uid() THEN
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_leaderboard()
 RETURNS TABLE(user_id uuid, username text, xp integer, streak integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.user_id, p.username, p.xp, p.streak
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL OR auth.role() = 'service_role'
  ORDER BY p.xp DESC
  LIMIT 100;
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated, service_role;