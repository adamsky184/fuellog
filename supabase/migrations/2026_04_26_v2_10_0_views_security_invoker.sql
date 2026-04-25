-- v2.10.0 — switch fill_up_stats_v and vehicle_date_range_v to security_invoker.
--
-- Default Postgres view behaviour is "security_definer" (a.k.a. SECURITY DEFINER
-- in advisor-speak) — the view runs as its owner, so RLS on the underlying
-- tables is evaluated against the owner, not the caller. The Supabase advisor
-- correctly flags this as a smell: even though `fill_ups` / `vehicles` policies
-- happen to already filter by `auth.uid()` for ordinary access, a view running
-- with definer-rights bypasses that intent.
--
-- security_invoker = true makes the view run with the CALLER's RLS, which is
-- what every existing client query already assumes. No client change required.
--
-- Already applied to production via supabase MCP apply_migration; this file is
-- checked in for repo-side traceability only.

ALTER VIEW public.fill_up_stats_v SET (security_invoker = true);
ALTER VIEW public.vehicle_date_range_v SET (security_invoker = true);
