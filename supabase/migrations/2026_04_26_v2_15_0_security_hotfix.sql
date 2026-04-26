-- v2.15.0 — security hotfix bundle.
--
-- Already applied to production via Supabase MCP apply_migration.
-- This file is checked in for repo-side traceability only.
--
-- Three concerns addressed:
--   1. Cross-user AI key read via _get_ai_key_for_user
--   2. Unbounded growth + insert spam on error_log
--   3. Old error_log rows beyond 30 days swept once

-- 1. _get_ai_key_for_user was granted to anon + authenticated. The
-- function is SECURITY DEFINER and accepts p_user_id, so any logged-in
-- user could read any other user's plaintext API key. The function is
-- only meant to be called by Supabase edge functions running with
-- service_role (which bypasses RLS / GRANTs anyway).
REVOKE EXECUTE ON FUNCTION public._get_ai_key_for_user(uuid) FROM anon, authenticated, public;

-- 2. error_log: bound row sizes so a runaway client can't fill the DB.
ALTER TABLE public.error_log
  ADD CONSTRAINT error_log_message_length CHECK (length(message) <= 2000) NOT VALID;
ALTER TABLE public.error_log VALIDATE CONSTRAINT error_log_message_length;

ALTER TABLE public.error_log
  ADD CONSTRAINT error_log_stack_length CHECK (stack IS NULL OR length(stack) <= 8000) NOT VALID;
ALTER TABLE public.error_log VALIDATE CONSTRAINT error_log_stack_length;

-- 3. Sweep the existing rows older than 30 days (one-shot).
DELETE FROM public.error_log WHERE occurred_at < now() - interval '30 days';

-- 4. Replace log_error with a rate-limited / clamped-length variant.
--    Hard cap: 60 inserts per user per 5 minutes (or 60 / 5min total
--    for anon). Beyond that, silently drop — never throw to the client.
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
  recent_count int;
  caller uuid := auth.uid();
BEGIN
  IF caller IS NOT NULL THEN
    SELECT count(*) INTO recent_count
    FROM public.error_log
    WHERE user_id = caller AND occurred_at > now() - interval '5 minutes';
  ELSE
    SELECT count(*) INTO recent_count
    FROM public.error_log
    WHERE user_id IS NULL AND occurred_at > now() - interval '5 minutes';
  END IF;

  IF recent_count >= 60 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.error_log (user_id, message, severity, url, user_agent, stack, context)
  VALUES (
    caller,
    left(coalesce(p_message, ''), 2000),
    p_severity,
    left(coalesce(p_url, ''), 2000),
    left(coalesce(p_user_agent, ''), 500),
    CASE WHEN p_stack IS NULL THEN NULL ELSE left(p_stack, 8000) END,
    p_context
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_error(text, text, text, text, text, jsonb) TO authenticated, anon;
