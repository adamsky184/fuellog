import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/vehicles";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // v2.6.0 — pick up any pending garage/vehicle invites that were
      // addressed to this e-mail before the account existed. Failure here
      // is non-fatal: the user still gets in; they'll miss auto-join but
      // the inviter can re-send. Logged so we notice if it ever breaks.
      try {
        const { error: acceptErr } = await supabase.rpc(
          "accept_pending_invites",
        );
        if (acceptErr) {
          console.warn("[auth/callback] accept_pending_invites", acceptErr.message);
        }
      } catch (e) {
        console.warn("[auth/callback] accept_pending_invites threw", e);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
