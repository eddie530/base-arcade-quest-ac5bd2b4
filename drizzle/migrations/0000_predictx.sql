ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS predict_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS predict_correct integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS predict_resolved integer NOT NULL DEFAULT 0;

CREATE TABLE public.predict_markets (
  id text PRIMARY KEY,
  question text NOT NULL,
  category text NOT NULL DEFAULT 'Crypto',
  cadence text NOT NULL DEFAULT 'daily' CHECK (cadence IN ('daily','weekly')),
  closes_at timestamptz NOT NULL,
  resolution text CHECK (resolution IN ('yes','no')),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.predict_markets TO authenticated;
GRANT ALL ON public.predict_markets TO service_role;
ALTER TABLE public.predict_markets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "markets readable by signed-in" ON public.predict_markets FOR SELECT TO authenticated USING (true);

CREATE TABLE public.predict_picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  market_id text NOT NULL REFERENCES public.predict_markets(id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('yes','no')),
  correct boolean,
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0 AND xp <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, market_id)
);
GRANT SELECT ON public.predict_picks TO authenticated;
GRANT ALL ON public.predict_picks TO service_role;
ALTER TABLE public.predict_picks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "picks read own" ON public.predict_picks FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.place_predict_pick(_user_id uuid, _market_id text, _side text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE m record;
BEGIN
  IF _side NOT IN ('yes','no') THEN RETURN jsonb_build_object('ok',false,'reason','bad_side'); END IF;
  SELECT * INTO m FROM predict_markets WHERE id = _market_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','not_found'); END IF;
  IF m.resolution IS NOT NULL OR m.closes_at <= now() THEN RETURN jsonb_build_object('ok',false,'reason','closed'); END IF;
  INSERT INTO predict_picks (user_id, market_id, side) VALUES (_user_id, _market_id, _side)
  ON CONFLICT (user_id, market_id) DO UPDATE SET side = EXCLUDED.side, created_at = now();
  RETURN jsonb_build_object('ok',true);
END; $$;

-- Resolves a market once and awards XP: 50 + 10 per current streak step (max +50).
CREATE OR REPLACE FUNCTION public.resolve_predict_market(_market_id text, _outcome text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p record; v_streak int; v_xp int; v_n int := 0;
BEGIN
  IF _outcome NOT IN ('yes','no') THEN RETURN jsonb_build_object('ok',false,'reason','bad_outcome'); END IF;
  UPDATE predict_markets SET resolution = _outcome, resolved_at = now()
    WHERE id = _market_id AND resolution IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','already_resolved'); END IF;
  FOR p IN SELECT * FROM predict_picks WHERE market_id = _market_id ORDER BY created_at LOOP
    SELECT predict_streak INTO v_streak FROM profiles WHERE user_id = p.user_id FOR UPDATE;
    IF p.side = _outcome THEN
      v_xp := 50 + 10 * LEAST(COALESCE(v_streak,0), 5);
      UPDATE predict_picks SET correct = true, xp = v_xp WHERE id = p.id;
      UPDATE profiles SET xp = xp + v_xp, predict_streak = predict_streak + 1,
        predict_correct = predict_correct + 1, predict_resolved = predict_resolved + 1
        WHERE user_id = p.user_id;
    ELSE
      UPDATE predict_picks SET correct = false, xp = 0 WHERE id = p.id;
      UPDATE profiles SET predict_streak = 0, predict_resolved = predict_resolved + 1 WHERE user_id = p.user_id;
    END IF;
    INSERT INTO user_achievements (user_id, badge)
      SELECT pr.user_id, b FROM profiles pr,
        LATERAL (VALUES ('oracle_5', pr.predict_correct >= 5), ('oracle_25', pr.predict_correct >= 25),
                        ('hot_streak_5', pr.predict_streak >= 5)) AS t(b, ok)
      WHERE pr.user_id = p.user_id AND t.ok
      ON CONFLICT DO NOTHING;
    v_n := v_n + 1;
  END LOOP;
  RETURN jsonb_build_object('ok',true,'picks',v_n);
END; $$;

REVOKE ALL ON FUNCTION public.place_predict_pick(uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_predict_market(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_predict_pick(uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_predict_market(text,text) TO service_role;

INSERT INTO public.predict_markets (id, question, category, cadence, closes_at) VALUES
 ('eth-5k', 'Will ETH close above $5,000 this week?', 'Crypto', 'weekly', now() + interval '7 days'),
 ('base-tvl', 'Will Base TVL hit a new all-time high this month?', 'Onchain', 'weekly', now() + interval '7 days'),
 ('btc-dom', 'Will BTC dominance rise above 60% by Friday?', 'Crypto', 'weekly', now() + interval '5 days'),
 ('fc-users', 'Will Farcaster daily casts exceed 1M today?', 'Social', 'daily', now() + interval '1 day'),
 ('gas-low', 'Will Base gas stay under 0.01 gwei today?', 'Onchain', 'daily', now() + interval '1 day'),
 ('eth-green', 'Will ETH close the day green?', 'Crypto', 'daily', now() + interval '1 day')
ON CONFLICT (id) DO NOTHING;