-- 1. Restrict profiles SELECT to self only
DROP POLICY IF EXISTS "profiles readable by all authenticated" ON public.profiles;

CREATE POLICY "profiles select own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Public leaderboard view (no wallet_address / referral_code)
DROP VIEW IF EXISTS public.leaderboard;
CREATE VIEW public.leaderboard
WITH (security_invoker = off) AS
  SELECT user_id, username, xp, streak
  FROM public.profiles
  ORDER BY xp DESC
  LIMIT 100;

REVOKE ALL ON public.leaderboard FROM PUBLIC, anon;
GRANT SELECT ON public.leaderboard TO authenticated;

-- 3. Restrict user_achievements SELECT to self only
DROP POLICY IF EXISTS "achievements readable by all authenticated" ON public.user_achievements;

CREATE POLICY "achievements select own"
  ON public.user_achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Lock down SECURITY DEFINER helper functions
-- has_role is referenced by RLS policies; authenticated must keep EXECUTE.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Trigger-only helpers: nobody should call them via the API
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
