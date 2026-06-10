ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_flip_at timestamp with time zone;
