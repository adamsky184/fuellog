-- v2.9.13 — propagate garage membership to vehicles inside the garage.
--
-- Bug:
--   Adam invited milan@simacek.org as garage_members of MILANOVA GARÁŽ -
--   PAST/CURRENT, but Milan saw zero cars in the app. Reason: vehicles
--   RLS only checked `vehicle_members`, ignoring `garage_members`. Each
--   shared vehicle would have needed an individual vehicle_members row.
--
-- Fix:
--   Update is_vehicle_member / can_write_vehicle to ALSO return true
--   when the user is a member of the vehicle's garage at the appropriate
--   role. With these helpers updated, every existing RLS policy that
--   uses them automatically picks up the new behaviour:
--     vehicles.vehicles_select_members         (SELECT)
--     vehicles.vehicles_update_writers         (UPDATE)
--     vehicles.vehicles_delete_owner           (DELETE  — still owner-only via vm)
--     fill_ups.fillups_select_members          (SELECT)
--     fill_ups.fillups_update_writers          (UPDATE)
--     fill_ups.fillups_delete_writers          (DELETE)
--     maintenance_entries.* (SELECT/UPDATE/DELETE/INSERT)
--   Storage policies on the `photos` bucket use the same helpers, so
--   shared vehicles' receipt/odometer photos are also unlocked.
--
-- Already applied to production via supabase MCP apply_migration; this
-- file is checked in for repo-side traceability only.

CREATE OR REPLACE FUNCTION public.is_vehicle_member(v_id uuid, u_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.vehicle_members
      WHERE vehicle_id = v_id AND user_id = u_id
    )
    OR EXISTS (
      -- Any garage_members row covers viewer / editor / owner.
      SELECT 1
      FROM public.vehicles v
      JOIN public.garage_members gm
        ON gm.garage_id = v.garage_id AND gm.user_id = u_id
      WHERE v.id = v_id
    );
$$;

CREATE OR REPLACE FUNCTION public.can_write_vehicle(v_id uuid, u_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.vehicle_members
      WHERE vehicle_id = v_id AND user_id = u_id
        AND role IN ('owner', 'editor')
    )
    OR EXISTS (
      SELECT 1
      FROM public.vehicles v
      JOIN public.garage_members gm
        ON gm.garage_id = v.garage_id AND gm.user_id = u_id
      WHERE v.id = v_id
        AND gm.role IN ('owner', 'editor')
    );
$$;
