CREATE OR REPLACE FUNCTION public.increment_xp(_user_id uuid, _delta integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  UPDATE public.profiles SET xp = xp + _delta WHERE user_id = _user_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_xp(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_xp(uuid, integer) TO service_role;

-- Prevent duplicate referrals at the DB level
ALTER TABLE public.referrals ADD CONSTRAINT unique_referred_id UNIQUE (referred_id);