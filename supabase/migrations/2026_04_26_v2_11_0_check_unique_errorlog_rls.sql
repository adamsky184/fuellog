-- v2.11.0 — data integrity + observability + tightened profiles RLS.
--
-- Audit (run before this migration) confirmed all rows pass the new
-- CHECK constraints and (vehicle_id, date, odometer_km) is already
-- UNIQUE in current data.
--
-- Already applied to production via supabase MCP apply_migration; this
-- file is checked in for repo-side traceability only.

-- ---------------------------------------------------------------------------
-- CHECK constraints — fill_ups
-- ---------------------------------------------------------------------------
ALTER TABLE public.fill_ups
  ADD CONSTRAINT fill_ups_liters_positive
    CHECK (liters IS NULL OR liters > 0) NOT VALID;
ALTER TABLE public.fill_ups VALIDATE CONSTRAINT fill_ups_liters_positive;

ALTER TABLE public.fill_ups
  ADD CONSTRAINT fill_ups_total_price_nonneg
    CHECK (total_price IS NULL OR total_price >= 0) NOT VALID;
ALTER TABLE public.fill_ups VALIDATE CONSTRAINT fill_ups_total_price_nonneg;

ALTER TABLE public.fill_ups
  ADD CONSTRAINT fill_ups_odometer_nonneg
    CHECK (odometer_km >= 0) NOT VALID;
ALTER TABLE public.fill_ups VALIDATE CONSTRAINT fill_ups_odometer_nonneg;

ALTER TABLE public.fill_ups
  ADD CONSTRAINT fill_ups_date_sane
    CHECK (date >= '1990-01-01' AND date <= CURRENT_DATE + INTERVAL '1 day') NOT VALID;
ALTER TABLE public.fill_ups VALIDATE CONSTRAINT fill_ups_date_sane;

-- UNIQUE — prevents duplicate xlsx imports of the same fill-up.
ALTER TABLE public.fill_ups
  ADD CONSTRAINT fill_ups_unique_vehicle_date_odo
    UNIQUE (vehicle_id, date, odometer_km);

-- ---------------------------------------------------------------------------
-- CHECK constraints — vehicles
-- ---------------------------------------------------------------------------
ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_year_sane
    CHECK (year IS NULL OR (year BETWEEN 1900 AND extract(year FROM now())::int + 1)) NOT VALID;
ALTER TABLE public.vehicles VALIDATE CONSTRAINT vehicles_year_sane;

ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_tank_sane
    CHECK (tank_capacity_liters IS NULL OR (tank_capacity_liters > 0 AND tank_capacity_liters <= 1000)) NOT VALID;
ALTER TABLE public.vehicles VALIDATE CONSTRAINT vehicles_tank_sane;

-- ---------------------------------------------------------------------------
-- error_log table (Sentry replacement for free tier).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.error_log (
  id          bigserial PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent  text,
  url         text,
  message     text NOT NULL,
  stack       text,
  severity    text NOT NULL DEFAULT 'error' CHECK (severity IN ('debug','info','warn','error','fatal')),
  context     jsonb
);

CREATE INDEX IF NOT EXISTS error_log_occurred_at_idx ON public.error_log (occurred_at DESC);
CREATE INDEX IF NOT EXISTS error_log_user_id_idx     ON public.error_log (user_id);

ALTER TABLE public.error_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY error_log_admin_select ON public.error_log
  FOR SELECT TO authenticated
  USING ((SELECT is_admin FROM public.profiles WHERE id = (SELECT auth.uid())) = true);

CREATE OR REPLACE FUNCTION public.log_error(
  p_message text,
  p_severity text DEFAULT 'error',
  p_url text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_stack text DEFAULT NULL,
  p_context jsonb DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id bigint;
BEGIN
  INSERT INTO public.error_log (user_id, message, severity, url, user_agent, stack, context)
  VALUES (auth.uid(), p_message, p_severity, p_url, p_user_agent, p_stack, p_context)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_error(text, text, text, text, text, jsonb) TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- profiles RLS narrowing — self + sharing partners + admin
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.shares_resource_with_me(other uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vehicle_members vm1
    JOIN public.vehicle_members vm2 ON vm1.vehicle_id = vm2.vehicle_id
    WHERE vm1.user_id = (SELECT auth.uid()) AND vm2.user_id = other
  )
  OR EXISTS (
    SELECT 1 FROM public.garage_members gm1
    JOIN public.garage_members gm2 ON gm1.garage_id = gm2.garage_id
    WHERE gm1.user_id = (SELECT auth.uid()) AND gm2.user_id = other
  );
$$;

GRANT EXECUTE ON FUNCTION public.shares_resource_with_me(uuid) TO authenticated;

DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
DROP POLICY IF EXISTS profiles_select_self ON public.profiles;
DROP POLICY IF EXISTS profiles_select_self_or_shared ON public.profiles;

CREATE POLICY profiles_select_self_or_shared ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR public.shares_resource_with_me(id)
    OR (SELECT is_admin FROM public.profiles WHERE id = (SELECT auth.uid())) = true
  );

-- ---------------------------------------------------------------------------
-- get_user_label — give the client a single RPC that returns a friendly
-- label (display_name | email) for a user_id, gated to self / shares / admin.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_label(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_self        boolean := (p_user_id = auth.uid());
  is_admin_user  boolean;
  shares         boolean;
  display        text;
  email          text;
BEGIN
  SELECT is_admin INTO is_admin_user FROM public.profiles WHERE id = auth.uid();
  shares := public.shares_resource_with_me(p_user_id);
  IF NOT (is_self OR coalesce(is_admin_user, false) OR shares) THEN
    RETURN NULL;
  END IF;

  SELECT display_name INTO display FROM public.profiles WHERE id = p_user_id;
  SELECT u.email      INTO email   FROM auth.users u   WHERE u.id = p_user_id;

  RETURN coalesce(nullif(trim(display), ''), email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_label(uuid) TO authenticated;
