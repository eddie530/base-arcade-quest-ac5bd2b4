CREATE TABLE public.admin_wallets (
  wallet_address text PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_wallets TO authenticated;
GRANT ALL ON public.admin_wallets TO service_role;

ALTER TABLE public.admin_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read admin wallets" ON public.admin_wallets FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  ) OR (
    _role = 'admin'::app_role AND EXISTS (
      SELECT 1 FROM public.admin_wallets aw
      JOIN public.profiles p ON LOWER(p.wallet_address) = LOWER(aw.wallet_address)
      WHERE p.user_id = _user_id
    )
  );
$$;