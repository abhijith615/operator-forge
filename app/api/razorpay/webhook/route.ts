import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";

/**
 * Razorpay payment webhook.
 *
 * This route only relays. The raw body and Razorpay's signature go to the
 * `razorpay_webhook` database function, which checks the HMAC against the
 * secret held in Supabase Vault and, only if it matches, records the payment
 * and marks the matching registration paid. Nothing here trusts the body, and
 * no key that bypasses row level security is needed.
 *
 * Razorpay retries anything that is not a 2xx, so only a missing
 * configuration or a failed call answers with an error.
 */

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 256 * 1024;

const STATUS: Record<string, number> = {
  matched: 200,
  duplicate: 200,
  ignored: 200,
  recorded_unmatched: 200,
  rejected: 401,
  not_configured: 503,
};

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ status: "not_configured" }, { status: 503 });
  }

  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) return NextResponse.json({ status: "rejected" }, { status: 401 });

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return NextResponse.json({ status: "rejected" }, { status: 413 });

  // The signature covers these exact bytes, so the body is never re-serialised.
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) return NextResponse.json({ status: "rejected" }, { status: 413 });

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("razorpay_webhook", {
    p_body: body,
    p_signature: signature,
  });

  if (error) {
    console.error("[razorpay] webhook not processed:", error.code, error.message);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }

  const status = typeof data === "string" ? data : "error";
  if (status !== "matched" && status !== "duplicate" && status !== "ignored") {
    console.warn("[razorpay] webhook result:", status);
  }
  return NextResponse.json({ status }, { status: STATUS[status] ?? 500 });
}
