-- v2.11.0 hotfix — fix infinite recursion in profiles_select_self_or_shared.
--
-- Adam reported the layout's "soft warning" card showing
--   `profile`: infinite recursion detected in policy for relation "profiles"
-- right after v2.11.0's DB migrations went live.
--
-- Cause: the SELECT policy I added used a subquery
--   (SELECT is_admin FROM public.profiles WHERE id = (SELECT auth.uid()))
-- which itself triggers the SELECT policy on `profiles` for that admin
-- check, which evaluates the same subquery, ad infinitum.
--
-- Fix: use the existing SECURITY DEFINER helper `public.is_admin()` which
-- bypasses RLS entirely when reading the caller's own row. Same pattern
-- applied to `error_log` to pre-empt the same bug class.
--
-- Already applied to production via supabase MCP apply_migration; this
-- file is checked in for repo-side traceability only.

DROP POLICY IF EXISTS profiles_select_self_or_shared ON public.profiles;

CREATE POLICY profiles_select_self_or_shared ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR public.shares_resource_with_me(id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS error_log_admin_select ON public.error_log;

CREATE POLICY error_log_admin_select ON public.error_log
  FOR SELECT TO authenticated
  USING (public.is_admin());
