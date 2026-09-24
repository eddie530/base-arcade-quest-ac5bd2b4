ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS slot_bonus_spins integer NOT NULL DEFAULT 0;

CREATE TABLE public.slot_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grid jsonb NOT NULL,
  wins jsonb NOT NULL DEFAULT '[]'::jsonb,
  xp integer NOT NULL CHECK (xp >= 0 AND xp <= 1000),
  is_bonus boolean NOT NULL DEFAULT false,
  bonus_awarded integer NOT NULL DEFAULT 0,
  spin_day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX slot_spins_user_day_idx ON public.slot_spins (user_id, spin_day);
GRANT SELECT ON public.slot_spins TO authenticated;
GRANT ALL ON public.slot_spins TO service_role;
ALTER TABLE public.slot_spins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slot_spins read own" ON public.slot_spins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "slot_spins no insert" ON public.slot_spins FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "slot_spins no update" ON public.slot_spins FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "slot_spins no delete" ON public.slot_spins FOR DELETE TO authenticated USING (false);

CREATE OR REPLACE FUNCTION public.record_slot_spin(
  _user_id uuid, _grid jsonb, _wins jsonb, _base_xp integer, _bonus_awarded integer,
  _daily_limit integer, _bonus_multiplier integer, _xp_cap integer, _bonus_bank_cap integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bonus int; v_used int; v_is_bonus boolean; v_xp int; v_new_xp int; v_new_bonus int;
  v_day date := (now() AT TIME ZONE 'utc')::date;
BEGIN
  SELECT slot_bonus_spins INTO v_bonus FROM profiles WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_profile'); END IF;
  SELECT count(*) INTO v_used FROM slot_spins WHERE user_id = _user_id AND spin_day = v_day AND is_bonus = false;
  IF v_bonus > 0 THEN v_is_bonus := true;
  ELSIF v_used < _daily_limit THEN v_is_bonus := false;
  ELSE RETURN jsonb_build_object('ok', false, 'reason', 'daily_limit', 'used', v_used);
  END IF;
  v_xp := LEAST(GREATEST(_base_xp, 0) * CASE WHEN v_is_bonus THEN _bonus_multiplier ELSE 1 END, _xp_cap);
  v_new_bonus := LEAST(v_bonus - CASE WHEN v_is_bonus THEN 1 ELSE 0 END + GREATEST(_bonus_awarded, 0), _bonus_bank_cap);
  INSERT INTO slot_spins (user_id, grid, wins, xp, is_bonus, bonus_awarded, spin_day)
    VALUES (_user_id, _grid, _wins, v_xp, v_is_bonus, _bonus_awarded, v_day);
  UPDATE profiles SET xp = xp + v_xp, slot_bonus_spins = v_new_bonus WHERE user_id = _user_id
    RETURNING xp INTO v_new_xp;
  RETURN jsonb_build_object('ok', true, 'xp', v_xp, 'is_bonus', v_is_bonus, 'total_xp', v_new_xp,
    'bonus_spins', v_new_bonus, 'used', v_used + CASE WHEN v_is_bonus THEN 0 ELSE 1 END);
END; $$;
REVOKE EXECUTE ON FUNCTION public.record_slot_spin(uuid, jsonb, jsonb, integer, integer, integer, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_slot_spin(uuid, jsonb, jsonb, integer, integer, integer, integer, integer, integer) TO service_role;