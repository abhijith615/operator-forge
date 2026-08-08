/**
 * UPI collect details.
 *
 * A VPA is a public identifier — it is what a payment QR encodes, so there is
 * nothing to protect here and `NEXT_PUBLIC_` is correct. Absent config means
 * the whole block is hidden rather than rendered broken, the same way the app
 * treats a missing Supabase project or OpenAI key.
 */
export const upiVpa = process.env.NEXT_PUBLIC_UPI_VPA?.trim() ?? "";
export const upiPayeeName = process.env.NEXT_PUBLIC_UPI_PAYEE_NAME?.trim() ?? "";

export const isUpiConfigured = Boolean(upiVpa && upiPayeeName);

/**
 * Deliberately omits `am`. Leaving the amount out is what makes the payer
 * choose it — setting it, even to a suggestion, turns a gift into a price.
 */
export function upiPaymentUri(): string {
  const params = new URLSearchParams({
    pa: upiVpa,
    pn: upiPayeeName,
    cu: "INR",
  });
  return `upi://pay?${params.toString()}`;
}
