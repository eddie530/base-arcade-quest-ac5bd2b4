-- Allow authenticated users to update their own profile
CREATE POLICY "profiles update own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete their own profile
CREATE POLICY "profiles delete own"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Restrictive policies: explicitly block authenticated writes to game tables
-- so inserts can only happen via server-side service_role

CREATE POLICY "flips no authenticated insert"
ON public.flips
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "flips no authenticated update"
ON public.flips
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "flips no authenticated delete"
ON public.flips
FOR DELETE
TO authenticated
USING (false);

CREATE POLICY "spins no authenticated insert"
ON public.spins
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "spins no authenticated update"
ON public.spins
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "spins no authenticated delete"
ON public.spins
FOR DELETE
TO authenticated
USING (false);

CREATE POLICY "user_achievements no authenticated insert"
ON public.user_achievements
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "user_achievements no authenticated update"
ON public.user_achievements
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "user_achievements no authenticated delete"
ON public.user_achievements
FOR DELETE
TO authenticated
USING (false);