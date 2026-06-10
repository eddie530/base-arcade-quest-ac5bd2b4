DROP POLICY IF EXISTS "flips insert own" ON public.flips;
DROP POLICY IF EXISTS "spins insert own" ON public.spins;
DROP POLICY IF EXISTS "profiles update own" ON public.profiles;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_spin_at timestamp with time zone;
