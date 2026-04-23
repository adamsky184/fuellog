// deno-lint-ignore-file no-explicit-any
//
// BYO-AI photo OCR — parses a fuel-station receipt or odometer photo
// using the authenticated user's own Gemini / OpenAI / Anthropic / OpenRouter
// API key (stored in public.user_ai_keys, never returned through the REST API).
//
// Request:
//   { image: <data URL>, kind: "receipt" | "odometer", previous_km?: number }
// Response:
//   ParsedReceipt or ParsedOdometer (see lib/ocr/types.ts).

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

const RECEIPT_PROMPT = `Extract data from this Czech fuel-station receipt as JSON.
Rules:
- "liters": total volume filled, decimal number (e.g. 31.42). null if unreadable.
- "total_price": total amount paid. null if unreadable.
- "price_per_liter": unit price per liter. null if unreadable.
- "station_brand": uppercase brand (SHELL, ORLEN, BENZINA, MOL, OMV, ARAL, EUROOIL, GLOBUS, MAKRO, TOTAL, AGIP, ROBINOIL, STOPKA, HRUBY, PRIM, LUKOIL, TESCO). null if unknown.
- "date": ISO date yyyy-mm-dd. null if unreadable.
- "currency": "CZK" | "EUR" | "USD". Default "CZK" for Czech receipts.
Return only the JSON object, nothing else.`;

const ODOMETER_PROMPT = (prev?: number) => `Extract the odometer reading from this dashboard photo.
Return JSON with a single field "km" (integer, whole kilometers; ignore trip-meter subdisplays).
${prev ? `Previous known reading was ${prev} km — the new reading must be >= that.` : ""}
If unreadable, return {"km": null}. Return only the JSON object.`;

const RECEIPT_SCHEMA = {
  type: "object",
  properties: {
    liters: { type: "number", nullable: true },
    total_price: { type: "number", nullable: true },
    price_per_liter: { type: "number", nullable: true },
    station_brand: { type: "string", nullable: true },
    date: { type: "string", nullable: true },
    currency: { type: "string", nullable: true, enum: ["CZK", "EUR", "USD"] },
  },
  required: ["liters", "total_price", "station_brand", "date", "currency"],
};

const ODOMETER_SCHEMA = {
  type: "object",
  properties: {
    km: { type: "integer", nullable: true },
  },
  required: ["km"],
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

    // 1) Identify the caller from their JWT.
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const {
      data: { user },
      error: authErr,
    } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "not_authenticated" }, 401);

    // 2) Parse payload.
    const body = await req.json().catch(() => ({}));
    const kind: "receipt" | "odometer" = body?.kind;
    const image: string = body?.image;
    const previousKm: number | undefined = body?.previous_km;
    if (!image || (kind !== "receipt" && kind !== "odometer")) {
      return json({ error: "bad_request" }, 400);
    }

    // 3) Load AI key via service role (bypasses RLS).
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: keyRows, error: keyErr } = await admin.rpc(
      "_get_ai_key_for_user",
      { p_user_id: user.id },
    );
    if (keyErr) return json({ error: "key_fetch_failed", detail: keyErr.message }, 500);
    if (!keyRows || keyRows.length === 0) {
      return json({ error: "no_ai_key", hint: "Set your AI key in /profile." }, 400);
    }
    const { provider, api_key } = keyRows[0] as {
      provider: string;
      api_key: string;
    };

    // 4) Strip data-URL prefix → raw base64 + mime.
    const { base64, mime } = splitDataUrl(image);

    // 5) Dispatch to provider.
    const prompt =
      kind === "receipt" ? RECEIPT_PROMPT : ODOMETER_PROMPT(previousKm);
    const schema = kind === "receipt" ? RECEIPT_SCHEMA : ODOMETER_SCHEMA;

    let parsed: any;
    switch (provider) {
      case "gemini":
        parsed = await callGemini(api_key, prompt, schema, base64, mime);
        break;
      case "openai":
        parsed = await callOpenAI(api_key, prompt, base64, mime);
        break;
      case "openrouter":
        parsed = await callOpenRouter(api_key, prompt, base64, mime);
        break;
      case "anthropic":
        parsed = await callAnthropic(api_key, prompt, base64, mime);
        break;
      default:
        return json({ error: "unsupported_provider", provider }, 400);
    }

    // 6) Shape to our TS types.
    if (kind === "receipt") {
      return json({
        liters: numOrNull(parsed.liters),
        total_price: numOrNull(parsed.total_price),
        price_per_liter: numOrNull(parsed.price_per_liter),
        station_brand: strOrNull(parsed.station_brand)?.toUpperCase() ?? null,
        date: strOrNull(parsed.date),
        currency: (["CZK", "EUR", "USD"].includes(parsed.currency)
          ? parsed.currency
          : "CZK") as "CZK" | "EUR" | "USD",
        confidence: 0.95,
        raw_text: "",
      });
    }
    return json({
      km: intOrNull(parsed.km),
      confidence: 0.95,
      raw_text: "",
    });
  } catch (e) {
    console.error("ocr-parse error", e);
    return json(
      { error: "internal", detail: e instanceof Error ? e.message : String(e) },
      500,
    );
  }
});

/* -------------------- providers -------------------- */

async function callGemini(
  apiKey: string,
  prompt: string,
  schema: unknown,
  base64: string,
  mime: string,
): Promise<any> {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
    encodeURIComponent(apiKey);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: mime, data: base64 } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1,
      },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  return JSON.parse(text);
}

async function callOpenAI(
  apiKey: string,
  prompt: string,
  base64: string,
  mime: string,
): Promise<any> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: `data:${mime};base64,${base64}` },
            },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(text);
}

async function callOpenRouter(
  apiKey: string,
  prompt: string,
  base64: string,
  mime: string,
): Promise<any> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-exp:free",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: `data:${mime};base64,${base64}` },
            },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(text);
}

async function callAnthropic(
  apiKey: string,
  prompt: string,
  base64: string,
  mime: string,
): Promise<any> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mime, data: base64 },
            },
            { type: "text", text: prompt + "\nReturn ONLY a raw JSON object, no prose, no markdown fences." },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.content?.[0]?.text ?? "{}";
  // Strip optional markdown fence.
  const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  return JSON.parse(cleaned);
}

/* -------------------- helpers -------------------- */

function splitDataUrl(dataUrl: string): { base64: string; mime: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return { base64: dataUrl, mime: "image/jpeg" };
  return { mime: m[1], base64: m[2] };
}

function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function intOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? Math.round(v) : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}
function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}
