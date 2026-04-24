import { NextResponse } from "next/server";
import { APP_VERSION, APP_BUILD_DATE } from "@/lib/version";

/**
 * Tiny endpoint that reports which version is actually running on the server.
 *
 * Purpose: production error masking means a crash looks identical across
 * deploys (same digest), so we can't tell from the UI whether a new build
 * has landed. GETting /api/version from the crash screen confirms whether
 * Vercel is serving the latest code or a stale build.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      version: APP_VERSION,
      buildDate: APP_BUILD_DATE,
      now: new Date().toISOString(),
      // Help distinguish Vercel regions / environments if we ever wonder.
      region: process.env.VERCEL_REGION ?? null,
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
