// deno-lint-ignore-file no-explicit-any
//
// v2.6.0 — send a garage/vehicle invitation e-mail via Resend.
//
// Called by the client right after add_garage_member / add_vehicle_member
// returns `{ ok: true, pending: true, invite_id, token }` (meaning the
// invitee has no FuelLog account yet — we're inviting them cold).
//
// This function:
//   1. Verifies the caller's JWT and looks up the invite via SECURITY DEFINER
//      RPC get_invite_context, which enforces invited_by = current user.
//   2. Builds a sign-up link containing the invite token (for future use —
//      today the acceptance is purely email-based via accept_pending_invites,
//      but embedding the token keeps the door open for "accept this specific
//      invite" UIs without another migration).
//   3. Sends a Czech HTML e-mail via Resend using the admin's verified
//      RESEND_FROM_EMAIL (same secret already used by forward-receipt).
//
// Request:  { invite_id: uuid }
// Response: { sent: bool, to: string | null, id?: string, skipped?: reason }
//
// Required secrets (Supabase Edge Function env):
//   RESEND_API_KEY       — Resend server API key (reused from forward-receipt)
//   RESEND_FROM_EMAIL    — verified "From:" address
//   APP_URL              — public site URL for the signup link
//                          (e.g. https://fuellog.app). Falls back to
//                          SUPABASE_URL host if unset — not pretty but works.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

type InviteContext = {
  invite_id: string;
  token: string;
  invited_email: string;
  role: "owner" | "editor" | "viewer";
  garage_id: string | null;
  garage_name: string | null;
  vehicle_id: string | null;
  vehicle_name: string | null;
  vehicle_plate: string | null;
  inviter_id: string;
  inviter_display_name: string | null;
  inviter_email: string | null;
  expires_at: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "no_auth" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
    const RESEND_FROM_EMAIL =
      Deno.env.get("RESEND_FROM_EMAIL") ?? "no-reply@fuellog.app";
    const APP_URL = (Deno.env.get("APP_URL") ?? "https://fuellog.app").replace(
      /\/+$/,
      "",
    );

    console.log("[send-invite] invoked", {
      has_resend_key: RESEND_API_KEY.length > 0,
      from: RESEND_FROM_EMAIL,
      app_url: APP_URL,
    });

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const body = await req.json().catch(() => ({}));
    const inviteId: string | undefined = body?.invite_id;
    if (!inviteId) {
      return json({ error: "bad_request", detail: "missing invite_id" }, 400);
    }

    const { data: ctxRows, error: ctxErr } = await userClient.rpc(
      "get_invite_context",
      { p_invite_id: inviteId },
    );
    if (ctxErr) {
      console.warn("[send-invite] context_failed", ctxErr.message);
      return json({ error: "context_failed", detail: ctxErr.message }, 500);
    }
    const ctx = (ctxRows as InviteContext[] | null)?.[0];
    if (!ctx) return json({ error: "invite_not_found" }, 404);

    if (!RESEND_API_KEY) {
      console.warn("[send-invite] RESEND_API_KEY missing — skipping send");
      return json({
        sent: false,
        to: ctx.invited_email,
        skipped: "no_resend_key",
      });
    }

    // Link back to the app. The signup flow will (after v2.6.0 frontend
    // work) read `?invite=<token>` to personalize the page, but even without
    // that, logging in with the invited e-mail is enough — the login hook
    // calls accept_pending_invites() which matches by email.
    const signupUrl = `${APP_URL}/login?invite=${ctx.token}&email=${encodeURIComponent(ctx.invited_email)}`;

    const target = ctx.garage_name
      ? `garáže „${ctx.garage_name}"`
      : ctx.vehicle_name
        ? `vozidla „${ctx.vehicle_name}${ctx.vehicle_plate ? ` (${ctx.vehicle_plate})` : ""}"`
        : "vozidla";
    const inviterLabel =
      ctx.inviter_display_name ?? ctx.inviter_email ?? "někdo z FuelLog";

    const subject = `${inviterLabel} tě zve do FuelLog`;
    const html = buildHtml({
      inviterLabel,
      target,
      role: ctx.role,
      signupUrl,
      expiresAt: ctx.expires_at,
    });
    const plain = buildText({
      inviterLabel,
      target,
      role: ctx.role,
      signupUrl,
      expiresAt: ctx.expires_at,
    });

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [ctx.invited_email],
        reply_to: ctx.inviter_email ?? undefined,
        subject,
        html,
        text: plain,
      }),
    });
    if (!resendRes.ok) {
      const t = await resendRes.text();
      console.error("[send-invite] resend_failed", {
        status: resendRes.status,
        detail: t.slice(0, 400),
      });
      return json(
        { error: "resend_failed", status: resendRes.status, detail: t.slice(0, 400) },
        502,
      );
    }
    const resendBody = await resendRes.json().catch(() => ({}));
    console.log("[send-invite] sent", {
      to_prefix: ctx.invited_email.split("@")[0],
      id: resendBody?.id ?? null,
    });

    return json({
      sent: true,
      to: ctx.invited_email,
      id: resendBody?.id ?? null,
    });
  } catch (e) {
    console.error("send-invite error", e);
    return json(
      { error: "internal", detail: e instanceof Error ? e.message : String(e) },
      500,
    );
  }
});

/* -------------------- helpers -------------------- */

type TemplateArgs = {
  inviterLabel: string;
  target: string;
  role: "owner" | "editor" | "viewer";
  signupUrl: string;
  expiresAt: string;
};

function roleLabel(r: TemplateArgs["role"]): string {
  return r === "owner" ? "vlastník" : r === "editor" ? "editor" : "jen čtení";
}

function buildText({ inviterLabel, target, role, signupUrl, expiresAt }: TemplateArgs): string {
  const d = new Date(expiresAt);
  const pretty = isNaN(d.getTime()) ? expiresAt : d.toISOString().slice(0, 10);
  return [
    `Ahoj,`,
    ``,
    `${inviterLabel} tě zve do FuelLog — sdíleného přehledu tankování a servisu ${target} (role: ${roleLabel(role)}).`,
    ``,
    `Pro přijetí si založ účet na stejný e-mail:`,
    signupUrl,
    ``,
    `Pozvánka platí do ${pretty}.`,
    ``,
    `— FuelLog`,
  ].join("\n");
}

function buildHtml({ inviterLabel, target, role, signupUrl, expiresAt }: TemplateArgs): string {
  const d = new Date(expiresAt);
  const pretty = isNaN(d.getTime()) ? expiresAt : d.toISOString().slice(0, 10);
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;background:#f8fafc;padding:0;margin:0">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
  <h2 style="margin:0 0 12px;color:#0284c7">FuelLog — pozvánka</h2>
  <p style="font-size:15px;line-height:1.5;margin:0 0 16px">
    <strong>${esc(inviterLabel)}</strong> tě zve do FuelLog, sdíleného přehledu tankování a servisu ${esc(target)}.
  </p>
  <p style="font-size:14px;color:#475569;margin:0 0 20px">Role: <strong>${esc(roleLabel(role))}</strong></p>
  <div style="margin:24px 0">
    <a href="${esc(signupUrl)}" style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#4f46e5);color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">
      Přijmout pozvánku a založit účet
    </a>
  </div>
  <p style="font-size:12px;color:#64748b;margin:20px 0 0;line-height:1.5">
    Odkaz si založí účet na e-mail, na který tato pozvánka přišla. Po přihlášení se automaticky připojíš ke sdíleným autům.
  </p>
  <p style="font-size:12px;color:#94a3b8;margin:8px 0 0">Pozvánka platí do ${esc(pretty)}.</p>
</div></body></html>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
