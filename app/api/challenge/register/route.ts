import { NextResponse, after, type NextRequest } from "next/server";

import { OFFER, OFFER_ROUTE } from "@/lib/constants/offer";
import {
  HONEYPOT_FIELD,
  attributionFrom,
  validateRegistration,
  type RegistrationResult,
} from "@/lib/offer/registration";
import { newEventId, pixelCookies, requestContext, sendMetaEvent } from "@/lib/meta/capi";
import { resolveCoupon } from "@/lib/offer/coupon-server";
import { sendRegistrationToSheet } from "@/lib/offer/sheets";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Saves a landing-page registration and sends the person to payment.
 *
 * A plain route rather than a server action, so it works however the form is
 * sent: the page's script posts here and navigates itself, and a form
 * submitted before that script has loaded — a slow phone, an in-app browser —
 * posts here natively and is redirected straight to Razorpay.
 *
 * Saving must never stand between someone and paying: a storage failure is
 * logged, without the person's details, and they go to payment anyway.
 */

export const dynamic = "force-dynamic";

function wantsJson(request: NextRequest): boolean {
  return (request.headers.get("accept") ?? "").includes("application/json");
}

function respond(request: NextRequest, result: RegistrationResult): NextResponse {
  if (wantsJson(request)) return NextResponse.json(result);

  if (result.status === "ready") return NextResponse.redirect(result.paymentUrl, 303);
  const back = new URL(OFFER_ROUTE, request.url);
  back.searchParams.set("form", result.status);
  back.hash = "register";
  return NextResponse.redirect(back, 303);
}

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return respond(request, { status: "invalid", errors: {} });
  }

  if (Date.now() > Date.parse(OFFER.endsAt)) {
    return respond(request, {
      status: "closed",
      message: "This cohort has finished. Message us on WhatsApp to hear about the next one.",
    });
  }

  const checked = validateRegistration({
    name: String(form.get("name") ?? ""),
    phone: String(form.get("phone") ?? ""),
    email: String(form.get("email") ?? ""),
  });
  if (!checked.ok) return respond(request, { status: "invalid", errors: checked.errors });

  // The trap field only flags a registration. Browser autofill can fill it for
  // a real person, so it must never stop anyone reaching payment.
  const attribution = attributionFrom(form);
  // A form sent before the page script ran has no ad tags of its own; the
  // landing URL it was sent from still does.
  if (Object.keys(attribution).length === 0) {
    const referer = request.headers.get("referer");
    if (referer) {
      try {
        const params = new URL(referer).searchParams;
        const fromReferer = new FormData();
        params.forEach((value, key) => fromReferer.append(key, value));
        Object.assign(attribution, attributionFrom(fromReferer));
      } catch {
        // Not a URL; nothing to recover.
      }
    }
  }
  if (String(form.get(HONEYPOT_FIELD) ?? "").trim() !== "") attribution.flag = "trap-field";

  // Meta's click identifiers, kept with the registration so the Purchase the
  // payment webhook reports later can be matched to the same ad click.
  const cookies = pixelCookies(request.headers.get("cookie"));
  const fbp = String(form.get("fbp") ?? "") || cookies.fbp || "";
  const fbc = String(form.get("fbc") ?? "") || cookies.fbc || "";
  if (fbp) attribution.fbp = fbp.slice(0, 120);
  if (fbc) attribution.fbc = fbc.slice(0, 200);

  // The coupon decides which payment page they are sent to. Checked here and
  // nowhere else: whatever the browser claims, the price is the link's price.
  const supabase = await getSupabaseServerClient();
  const coupon = await resolveCoupon(String(form.get("coupon") ?? ""), supabase);
  if (coupon) attribution.coupon = coupon.code;
  const price = coupon?.price ?? OFFER.price;
  const paymentUrl = coupon?.paymentUrl ?? OFFER.paymentUrl;

  let stored = false;
  if (supabase) {
    // No `.select()`: the table is insert-only through the API.
    const { error } = await supabase.from("challenge_registrations").insert({
      cohort: OFFER.cohort,
      name: checked.value.name,
      phone: checked.value.phone,
      email: checked.value.email,
      attribution,
    });
    if (error) console.error("[7-day-challenge] registration not stored:", error.code, error.message);
    else stored = true;
  } else {
    console.error("[7-day-challenge] registration not stored: Supabase is not configured");
  }

  // A copy for the Google Sheet, sent once the response is on its way so it
  // can never hold up the move to payment.
  const submittedAt = new Date().toISOString();
  after(() =>
    sendRegistrationToSheet({
      submittedAt,
      name: checked.value.name,
      phone: checked.value.phone,
      email: checked.value.email,
      cohort: OFFER.cohort,
      coupon: coupon?.code,
      stored,
      attribution,
    }),
  );

  // One Lead, reported from both sides under the same id so Meta counts it
  // once. Sent after the response, so measurement never delays payment.
  const leadEventId = newEventId("lead");
  const sourceUrl = request.headers.get("referer") ?? new URL(OFFER_ROUTE, request.url).toString();
  const context = requestContext(request.headers);
  after(() =>
    sendMetaEvent({
      name: "Lead",
      eventId: leadEventId,
      sourceUrl,
      user: {
        email: checked.value.email,
        phone: checked.value.phone,
        fbp: fbp || undefined,
        fbc: fbc || undefined,
        ...context,
      },
      value: price,
      currency: OFFER.currency,
      contentName: OFFER.name,
    }),
  );

  return respond(request, { status: "ready", paymentUrl, leadEventId, price, coupon: coupon?.code });
}
