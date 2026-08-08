"use server";

import { z } from "zod";

import { getOperator } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { FormState } from "@/lib/auth/form-state";

const schema = z.object({
  email: z.string().trim().min(1, "An email is needed.").email("Check the email address."),
});

/**
 * One list covering advanced missions, mentor calls and benchmarking — the
 * waitlist asks for all three together, so splitting them would record an
 * intent nobody expressed. Kept as a column so a second list needs no DDL.
 *
 * Not exported: a `"use server"` file may only export async functions, and a
 * stray const here is a build error rather than a type error — `tsc` passes
 * and `next build` does not.
 */
const EARLY_ACCESS = "early-access";

/**
 * Records that somebody would want the 1:1 sessions if they existed.
 *
 * This is not an order and takes no money. Nothing about the sessions is
 * built, priced or staffed, and the copy on the dialog says so — this action
 * exists so that claim stays true while still capturing whether anyone cares.
 */
export async function registerInterest(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = schema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the email address.",
      fieldErrors: { email: parsed.error.issues[0]?.message },
    };
  }

  const operator = await getOperator();
  if (!operator) {
    return { status: "error", message: "Your session expired. Sign in again." };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    // Simulator Mode has nowhere durable to put this, and pretending it was
    // recorded would be worse than saying so.
    return {
      status: "error",
      message: "This needs a signed-in account to record. Not available in Simulator Mode.",
    };
  }

  const { error } = await supabase.from("interest_signals").upsert(
    {
      operator_id: operator.id,
      topic: EARLY_ACCESS,
      email: parsed.data.email,
    },
    { onConflict: "operator_id,topic" },
  );

  if (error) {
    return { status: "error", message: error.message };
  }

  return {
    status: "success",
    message: "You're on the list. We'll be in touch when early access opens.",
  };
}
