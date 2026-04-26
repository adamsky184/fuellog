-- v2.17.0 — query-pattern indexes inferred from the audit.
-- All idempotent (IF NOT EXISTS) so the migration is safe to re-run.
--
-- Already applied to production via Supabase MCP apply_migration.
-- This file is checked in for repo-side traceability only.

CREATE INDEX IF NOT EXISTS fill_ups_vehicle_date_idx
  ON public.fill_ups (vehicle_id, date DESC);

CREATE INDEX IF NOT EXISTS maintenance_entries_vehicle_next_due_idx
  ON public.maintenance_entries (vehicle_id, next_due_date)
  WHERE next_due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS vehicle_members_user_idx
  ON public.vehicle_members (user_id);

CREATE INDEX IF NOT EXISTS garage_members_user_idx
  ON public.garage_members (user_id);
