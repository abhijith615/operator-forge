import "server-only";

import { OFFER } from "@/lib/constants/offer";

/**
 * Coupon codes for the challenge.
 *
 * Each code maps to its own Razorpay payment page, because a Payment Page
 * has one fixed amount — the discount is not applied at checkout, it is a
 * different link. The server decides which link somebody is sent to, so a
 * code typed into the browser can never change what is actually charged.
 *
 * To add or change a code, edit this file: the code, the price, the payment
 * link it goes to, when it stops working and (optionally) how many times it
 * may be used.
 *
 * Server-only on purpose. These codes are given to influencers and partners
 * to hand out, so the landing page must not contain them: anything in the
 * page source is found and shared. The browser can ask whether one code is
 * valid (/api/challenge/coupon) and learns nothing else.
 */

export interface Coupon {
  /** Compared case-insensitively; always written in capitals. */
  code: string;
  /** What the buyer pays, in rupees. */
  price: number;
  /** The Razorpay payment page for that amount. */
  paymentUrl: string;
  /** Shown beside the price, e.g. "50% off". */
  label: string;
  /** ISO date-time. After this the code stops working. */
  expiresAt: string;
  /**
   * How many registrations may use it. `null` is unlimited — set a number
   * before sharing a code anywhere public, or it becomes your new price.
   */
  maxUses: number | null;
}

export const COUPONS: Coupon[] = [
  {
    code: "OF50",
    price: 249,
    paymentUrl: "https://rzp.io/rzp/TBz7x7T",
    label: "50% off",
    // The cohort starts on 12 Oct; the code dies with the cohort it is for.
    expiresAt: OFFER.endsAt,
    maxUses: null,
  },
];

/** The cheapest a valid registration can ever be, for the payment checks. */
export const MIN_COUPON_PRICE: number = COUPONS.reduce<number>(
  (low, coupon) => Math.min(low, coupon.price),
  OFFER.price,
);

export type CouponCheck =
  | { status: "none" }
  | { status: "valid"; coupon: Coupon }
  | { status: "unknown" }
  | { status: "expired" };

/**
 * Checks a code as typed. Usage limits are counted in the database, so this
 * says only whether the code exists and is still in date — the server applies
 * the cap before sending anyone to a discounted link.
 */
export function checkCoupon(raw: string | null | undefined, now: Date = new Date()): CouponCheck {
  const code = (raw ?? "").trim().toUpperCase();
  if (!code) return { status: "none" };

  const coupon = COUPONS.find((entry) => entry.code === code);
  if (!coupon) return { status: "unknown" };
  if (now.getTime() > Date.parse(coupon.expiresAt)) return { status: "expired" };
  return { status: "valid", coupon };
}

/** What a coupon does to the price, for the copy beside the form. */
export function couponSaving(coupon: Coupon): number {
  return Math.max(0, OFFER.price - coupon.price);
}
