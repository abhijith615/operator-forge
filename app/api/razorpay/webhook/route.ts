import { createClient } from "@supabase/supabase-js";
import { NextResponse, after, type NextRequest } from "next/server";

import { OFFER, OFFER_ROUTE } from "@/lib/constants/offer";
import { sendMetaEvent } from "@/lib/meta/capi";

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

interface RazorpayEntity {
  id?: string;
  amount?: number;
  currency?: string;
  email?: string;
  contact?: string;
}

/** Reads the payment out of the (already verified) event and tells Meta. */
async function reportPurchase(rawBody: string, request: NextRequest): Promise<void> {
  let entity: RazorpayEntity | undefined;
  try {
    entity = (JSON.parse(rawBody) as { payload?: { payment?: { entity?: RazorpayEntity } } })?.payload?.payment?.entity;
  } catch {
    return;
  }
  if (!entity?.id) return;

  await sendMetaEvent({
    name: "Purchase",
    eventId: `purchase_${entity.id}`,
    sourceUrl: new URL(OFFER_ROUTE, request.nextUrl.origin).toString(),
    user: { email: entity.email ?? undefined, phone: entity.contact ?? undefined },
    value: typeof entity.amount === "number" ? entity.amount / 100 : OFFER.price,
    currency: entity.currency ?? OFFER.currency,
    contentName: OFFER.name,
  });
}

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

  // A matched payment is a confirmed sale: the database accepted the
  // signature before saying so. Report it to Meta from here — the one place
  // that knows the money actually arrived — sharing an id with the browser's
  // Purchase on the thank-you page so the two are counted once.
  if (status === "matched") after(() => reportPurchase(body, request));
  if (status !== "matched" && status !== "duplicate" && status !== "ignored") {
    console.warn("[razorpay] webhook result:", status);
  }
  return NextResponse.json({ status }, { status: STATUS[status] ?? 500 });
}
