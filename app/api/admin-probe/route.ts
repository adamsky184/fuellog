import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Diagnostic endpoint for the admin crash — runs the same queries that
 * `app/(app)/admin/layout.tsx` and `app/(app)/admin/page.tsx` run, but
 * catches each step individually and returns the full result as JSON.
 *
 * This exists because the production admin page hits a "Server Components
 * render error" with an opaque digest — Next masks the real message and
 * Vercel log access from the client isn't possible. If you can open this
 * URL and see a JSON body, we can pinpoint which step actually failed.
 *
 * Access-gated to admins only (same rule as /admin) to avoid leaking
 * schema/row counts to randoms.
 */
export const dynamic = "force-dynamic";

async function step<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<{ step: string; ok: boolean; value?: T; error?: string; stack?: string }> {
  try {
    const value = await fn();
    return { step: name, ok: true, value };
  } catch (e) {
    return {
      step: name,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    };
  }
}

export async function GET() {
  // v2.10.0 — gate to admins ONLY before exposing env-state, query-counts,
  // or schema diagnostics. Previously any authenticated user could call
  // this. Anonymous → 401, non-admin → 403, admin → full diagnostics.
  const supabaseGate = await createClient();
  const { data: gateUser } = await supabaseGate.auth.getUser();
  if (!gateUser.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { data: gateProfile } = await supabaseGate
    .from("profiles")
    .select("is_admin")
    .eq("id", gateUser.user.id)
    .maybeSingle();
  if (!gateProfile?.is_admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const out: Record<string, unknown> = {
    now: new Date().toISOString(),
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
        ? "set"
        : "MISSING",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? "set"
        : "MISSING",
    },
  };

  // 1) createClient()
  const clientStep = await step("createClient", async () => {
    const c = await createClient();
    return { ok: !!c };
  });
  out.client = clientStep;
  if (!clientStep.ok) return NextResponse.json(out, { status: 200 });

  // 2) auth.getUser()
  const authStep = await step("auth.getUser", async () => {
    const c = await createClient();
    const { data, error } = await c.auth.getUser();
    return { userId: data.user?.id ?? null, email: data.user?.email ?? null, error: error?.message ?? null };
  });
  out.auth = authStep;
  const userId =
    authStep.ok && authStep.value && typeof authStep.value === "object"
      ? (authStep.value as { userId: string | null }).userId
      : null;
  if (!userId) {
    out.early_exit = "no userId";
    return NextResponse.json(out, { status: 200 });
  }

  // 3) profile + is_admin (kept for diagnostic completeness — the gate
  //    above already proved admin-ness for this user, but the report
  //    still surfaces if the SELECT can be reached at all.)
  const profileStep = await step("profiles.is_admin", async () => {
    const c = await createClient();
    const { data, error } = await c
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle();
    return {
      row: data,
      error: error
        ? {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          }
        : null,
    };
  });
  out.profile = profileStep;

  // 4) admin RPCs
  out.rpc_users = await step("rpc admin_list_users", async () => {
    const c = await createClient();
    const { data, error } = await c.rpc("admin_list_users");
    return {
      count: Array.isArray(data) ? data.length : null,
      first: Array.isArray(data) ? data[0] : null,
      error: error
        ? {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          }
        : null,
    };
  });

  out.rpc_garages = await step("rpc admin_list_garages", async () => {
    const c = await createClient();
    const { data, error } = await c.rpc("admin_list_garages");
    return {
      count: Array.isArray(data) ? data.length : null,
      error: error
        ? {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          }
        : null,
    };
  });

  out.rpc_vehicles = await step("rpc admin_list_vehicles", async () => {
    const c = await createClient();
    const { data, error } = await c.rpc("admin_list_vehicles");
    return {
      count: Array.isArray(data) ? data.length : null,
      error: error
        ? {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          }
        : null,
    };
  });

  return NextResponse.json(out, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
