-- Remove the overly-broad UPDATE and DELETE policies on profiles.
-- Profile updates are handled server-side via supabaseAdmin with
-- input validation (username/wallet_address only), so RLS UPDATE
-- is not needed and would allow privilege escalation / game-state tampering.
DROP POLICY IF EXISTS "profiles update own" ON public.profiles;
DROP POLICY IF EXISTS "profiles delete own" ON public.profiles;