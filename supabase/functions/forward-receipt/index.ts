// deno-lint-ignore-file no-explicit-any
//
// v2.5.0 — admin auto-forward receipt e-mail.
//
// Called by the client right after a fill-up with a receipt photo is saved.
// The function:
//   1. Verifies the caller's JWT and membership in the vehicle (via the
//      SECURITY DEFINER RPC get_forward_receipt_context).
//   2. If the vehicle has `forward_receipts_to_email` set, downloads the
//      receipt photo from the `photos` bucket using the service role, and
//      e-mails it to that address via Resend.
//   3. Returns { forwarded: true/false, to: "<email>" | null } so the client
//      can silently no-op if there's nothing configured.
//
// Request:  { fill_up_id: uuid }
// Response: { forwarded: bool, to: string | null, skipped?: reason }
//
// Required secrets (Supabase Edge Function env):
//   RESEND_API_KEY       — Resend server API key
//   RESEND_FROM_EMAIL    — verified "From:" address (e.g. no-reply@fuellog.app)
//
// If RESEND_API_KEY is missing we return `{ forwarded: false, skipped: "no_resend_key" }`
// so the feature degrades gracefully on installations without a mailer.

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

type ForwardContext = {
  forward_to: string | null;
  receipt_photo_path: string | null;
  vehicle_name: string | null;
  vehicle_plate: string | null;
  fill_up_date: string | null;
  liters: number | null;
  total_price: number | null;
  currency: string | null;
  station_brand: string | null;
  city: string | null;
  address: string | null;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "no_auth" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
    const RESEND_FROM_EMAIL =
      Deno.env.get("RESEND_FROM_EMAIL") ?? "no-reply@fuellog.app";

    // v2.5.1 — one-shot diagnostic. Booleans only (never the secret value).
    console.log("[forward-receipt] invoked", {
      has_resend_key: RESEND_API_KEY.length > 0,
      has_service_role: SUPABASE_SERVICE_ROLE_KEY.length > 0,
      from: RESEND_FROM_EMAIL,
    });

    // 1) Auth + context via user JWT (the RPC enforces membership).
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const body = await req.json().catch(() => ({}));
    const fillUpId: string | undefined = body?.fill_up_id;
    if (!fillUpId) {
      console.warn("[forward-receipt] bad_request: missing fill_up_id");
      return json({ error: "bad_request" }, 400);
    }

    const { data: ctxRows, error: ctxErr } = await userClient.rpc(
      "get_forward_receipt_context",
      { p_fill_up_id: fillUpId },
    );
    if (ctxErr) {
      console.warn("[forward-receipt] context_failed", ctxErr.message);
      return json(
        { error: "context_failed", detail: ctxErr.message },
        ctxErr.message.includes("not a vehicle member") ? 403 : 500,
      );
    }
    const ctx = (ctxRows as ForwardContext[] | null)?.[0];
    if (!ctx) {
      console.warn("[forward-receipt] fill_up_not_found", fillUpId);
      return json({ error: "fill_up_not_found" }, 404);
    }

    console.log("[forward-receipt] context loaded", {
      has_forward_to: !!ctx.forward_to,
      has_receipt: !!ctx.receipt_photo_path,
    });

    // 2) Silent no-op when feature not configured.
    if (!ctx.forward_to) {
      console.log("[forward-receipt] skipped: not_configured");
      return json({ forwarded: false, to: null, skipped: "not_configured" });
    }
    if (!ctx.receipt_photo_path) {
      console.log("[forward-receipt] skipped: no_receipt_photo");
      return json({
        forwarded: false,
        to: ctx.forward_to,
        skipped: "no_receipt_photo",
      });
    }
    if (!RESEND_API_KEY) {
      console.warn(
        "[forward-receipt] RESEND_API_KEY missing — returning skipped.",
      );
      return json({
        forwarded: false,
        to: ctx.forward_to,
        skipped: "no_resend_key",
      });
    }

    // 3) Download the receipt photo via service role (RLS bypass).
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: fileBlob, error: dlErr } = await admin
      .storage
      .from("photos")
      .download(ctx.receipt_photo_path);
    if (dlErr || !fileBlob) {
      console.error("[forward-receipt] download_failed", {
        detail: dlErr?.message ?? "no_blob",
        path: ctx.receipt_photo_path,
      });
      return json(
        { error: "download_failed", detail: dlErr?.message ?? "no_blob" },
        500,
      );
    }

    // Blob → base64 for Resend attachment.
    const bytes = new Uint8Array(await fileBlob.arrayBuffer());
    const base64 = base64FromBytes(bytes);
    const mime = guessMime(ctx.receipt_photo_path);
    const filename = filenameFromPath(ctx.receipt_photo_path);

    // 4) Compose and send via Resend.
    const subject = buildSubject(ctx);
    const html = buildHtml(ctx);
    const plain = buildText(ctx);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [ctx.forward_to],
        subject,
        html,
        text: plain,
        attachments: [
          {
            filename,
            content: base64,
            content_type: mime,
          },
        ],
      }),
    });
    if (!resendRes.ok) {
      const t = await resendRes.text();
      console.error("[forward-receipt] resend_failed", {
        status: resendRes.status,
        detail: t.slice(0, 400),
      });
      return json(
        { error: "resend_failed", status: resendRes.status, detail: t.slice(0, 400) },
        502,
      );
    }
    const resendBody = await resendRes.json().catch(() => ({}));
    console.log("[forward-receipt] forwarded", {
      to_prefix: ctx.forward_to?.split("@")[0] ?? null,
      id: resendBody?.id ?? null,
    });

    return json({
      forwarded: true,
      to: ctx.forward_to,
      provider: "resend",
      id: resendBody?.id ?? null,
    });
  } catch (e) {
    console.error("forward-receipt error", e);
    return json(
      { error: "internal", detail: e instanceof Error ? e.message : String(e) },
      500,
    );
  }
});

/* -------------------- helpers -------------------- */

function buildSubject(ctx: ForwardContext): string {
  const bits: string[] = ["Tankování"];
  if (ctx.station_brand) bits.push(ctx.station_brand);
  if (ctx.fill_up_date) bits.push(ctx.fill_up_date);
  if (ctx.vehicle_plate) bits.push(`(${ctx.vehicle_plate})`);
  return bits.join(" · ");
}

function buildText(ctx: ForwardContext): string {
  const lines: string[] = [];
  lines.push("Nové tankování zaznamenané ve FuelLog.");
  lines.push("");
  if (ctx.vehicle_name) lines.push(`Vozidlo: ${ctx.vehicle_name}${ctx.vehicle_plate ? ` (${ctx.vehicle_plate})` : ""}`);
  if (ctx.fill_up_date) lines.push(`Datum: ${ctx.fill_up_date}`);
  if (ctx.station_brand) lines.push(`Čerpačka: ${ctx.station_brand}`);
  const loc = [ctx.city, ctx.address].filter(Boolean).join(", ");
  if (loc) lines.push(`Místo: ${loc}`);
  if (ctx.liters != null) lines.push(`Litry: ${ctx.liters}`);
  if (ctx.total_price != null) lines.push(`Cena: ${ctx.total_price} ${ctx.currency ?? ""}`);
  lines.push("");
  lines.push("Účtenka je v příloze.");
  return lines.join("\n");
}

function buildHtml(ctx: ForwardContext): string {
  const row = (k: string, v: string | number | null | undefined) =>
    v != null && v !== ""
      ? `<tr><td style="color:#64748b;padding:4px 12px 4px 0">${esc(k)}</td><td style="font-weight:600">${esc(String(v))}</td></tr>`
      : "";
  const loc = [ctx.city, ctx.address].filter(Boolean).join(", ");
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a">
<div style="max-width:520px;margin:0 auto;padding:24px">
  <h2 style="margin:0 0 12px;color:#0284c7">FuelLog — nové tankování</h2>
  <table style="font-size:14px;border-collapse:collapse">
    ${row("Vozidlo", ctx.vehicle_name ? `${ctx.vehicle_name}${ctx.vehicle_plate ? ` (${ctx.vehicle_plate})` : ""}` : null)}
    ${row("Datum", ctx.fill_up_date)}
    ${row("Čerpačka", ctx.station_brand)}
    ${row("Místo", loc || null)}
    ${row("Litry", ctx.liters)}
    ${row("Cena", ctx.total_price != null ? `${ctx.total_price} ${ctx.currency ?? ""}` : null)}
  </table>
  <p style="color:#64748b;font-size:12px;margin-top:20px">Účtenka je v příloze. Tento e-mail byl odeslán automaticky z FuelLog, protože u vozidla je nastaveno přeposílání účtenek.</p>
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

function base64FromBytes(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

function guessMime(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".pdf")) return "application/pdf";
  return "image/jpeg";
}

function filenameFromPath(path: string): string {
  const base = path.split("/").pop() ?? "uctenka.jpg";
  return base;
}
