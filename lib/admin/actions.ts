"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Marks a challenge registration paid, or takes the mark away.
 *
 * The database function checks the caller is an admin, so this action needs
 * no guard of its own to be safe — a non-admin calling it is simply refused.
 */
export async function setRegistrationPaid(
  id: string,
  paid: boolean,
  paymentRef?: string,
): Promise<{ ok: boolean; message?: string }> {
  if (!UUID.test(id)) return { ok: false, message: "Unknown registration." };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, message: "Supabase is not configured." };

  const { error } = await supabase.rpc("admin_set_registration_paid", {
    p_id: id,
    p_paid: paid,
    p_ref: paymentRef?.trim().slice(0, 64) || null,
  });
  if (error) {
    console.error("[admin] could not update registration:", error.code, error.message);
    return { ok: false, message: error.code === "42501" ? "Not authorised." : "Could not save. Try again." };
  }
  return { ok: true };
}

/** Records (or clears) attendance at the live AMA, which the certificate requires. */
export async function setAmaAttended(id: string, attended: boolean): Promise<{ ok: boolean; message?: string }> {
  if (!UUID.test(id)) return { ok: false, message: "Unknown registration." };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, message: "Supabase is not configured." };

  const { error } = await supabase.rpc("admin_set_ama_attended", { p_id: id, p_attended: attended });
  if (error) {
    console.error("[admin] could not update AMA attendance:", error.code, error.message);
    return { ok: false, message: error.code === "42501" ? "Not authorised." : "Could not save. Try again." };
  }
  return { ok: true };
}
