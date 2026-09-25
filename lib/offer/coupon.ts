/**
 * What the browser is allowed to know about coupons: nothing, until somebody
 * types a code and the server confirms it.
 *
 * The codes themselves live in `lib/constants/coupons.ts`, which is
 * server-only — they are handed to influencers and partners, and a code
 * sitting in the page source would be found and shared within a day.
 */

export const COUPON_ENDPOINT = "/api/challenge/coupon";

/** A code the server has accepted, and what it does to the price. */
export interface AppliedCoupon {
  code: string;
  price: number;
  /** e.g. "50% off" — how the discount is described beside the price. */
  label: string;
  /** Rupees off the usual price. */
  saving: number;
}

export type CouponResponse =
  | ({ status: "valid" } & AppliedCoupon)
  | { status: "unknown" }
  | { status: "expired" }
  | { status: "used_up" };

/** The line shown when a code is refused. Never says which codes exist. */
export function couponRefusal(status: CouponResponse["status"]): string | null {
  switch (status) {
    case "expired":
      return "That code has expired.";
    case "used_up":
      return "That code has reached its limit.";
    case "unknown":
      return "We don't recognise that code.";
    default:
      return null;
  }
}
