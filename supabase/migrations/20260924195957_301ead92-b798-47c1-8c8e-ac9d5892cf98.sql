ALTER TABLE public.slot_spins DROP CONSTRAINT IF EXISTS slot_spins_xp_check;
ALTER TABLE public.slot_spins ADD CONSTRAINT slot_spins_xp_check CHECK (xp >= 0 AND xp <= 2500);
ALTER TABLE public.slot_spins ADD COLUMN IF NOT EXISTS jackpot boolean NOT NULL DEFAULT false;