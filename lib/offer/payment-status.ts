import "server-only";

import { createClient } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";

/**
 * Whether a Razorpay payment really arrived.
 *
 * The thank-you page will not report a Purchase on somebody's say-so: the id
 * in the return URL is checked against the payments the signed webhook
 * recorded. The database answers with the amount and nothing personal, so a
 * guessed id reveals nothing about anyone.
 */

const PAYMENT_ID = /^pay_[A-Za-z0-9]{6,40}$/;

export interface PaymentStatus {
  paid: boolean;
  amount?: number;
  currency?: string;
}

export async function verifyPayment(paymentId: string | undefined): Promise<PaymentStatus> {
  const id = (paymentId ?? "").trim();
  if (!PAYMENT_ID.test(id) || !isSupabaseConfigured) return { paid: false };

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("verify_challenge_payment", { p_payment_id: id });
  const row = (Array.isArray(data) ? data[0] : data) as
    | { paid: boolean; amount_paise: number | null; currency: string | null }
    | undefined;
  if (error || !row?.paid) return { paid: false };

  return {
    paid: true,
    amount: row.amount_paise === null ? undefined : row.amount_paise / 100,
    currency: row.currency ?? undefined,
  };
}
