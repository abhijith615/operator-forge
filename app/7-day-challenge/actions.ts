"use server";

import { redirect } from "next/navigation";

import { OFFER } from "@/lib/constants/offer";
import {
  attributionFrom,
  validateRegistration,
  type RegistrationResult,
} from "@/lib/offer/registration";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Saves a landing-page registration, then sends the person to payment.
 *
 * The row is written before payment so a registration that never pays can
 * still be followed up. Writing it must never stand between someone and
 * paying, though: if storage fails the failure is logged — without the
 * person's details — and they go to payment anyway.
 *
 * Only returns when it cannot redirect; success ends in `redirect`.
 */
export async function registerForChallenge(form: FormData): Promise<RegistrationResult> {
  // People never see this field. Anything that fills it in is not a person.
  if (String(form.get("company") ?? "").trim() !== "") return { status: "ignored" };

  if (Date.now() > Date.parse(OFFER.endsAt)) {
    return {
      status: "closed",
      message: "This cohort has finished. Message us on WhatsApp to hear about the next one.",
    };
  }

  const checked = validateRegistration({
    name: String(form.get("name") ?? ""),
    phone: String(form.get("phone") ?? ""),
    email: String(form.get("email") ?? ""),
  });
  if (!checked.ok) return { status: "invalid", errors: checked.errors };

  const supabase = await getSupabaseServerClient();
  if (supabase) {
    // No `.select()`: the table is insert-only through the API, so asking for
    // the row back would be refused.
    const { error } = await supabase.from("challenge_registrations").insert({
      cohort: OFFER.cohort,
      name: checked.value.name,
      phone: checked.value.phone,
      email: checked.value.email,
      attribution: attributionFrom(form),
    });
    if (error) console.error("[7-day-challenge] registration not stored:", error.code, error.message);
  } else {
    console.error("[7-day-challenge] registration not stored: Supabase is not configured");
  }

  redirect(OFFER.paymentUrl);
}
