import "server-only";

import { COUPONS, checkCoupon, couponSaving, type Coupon } from "@/lib/constants/coupons";
import type { CouponResponse } from "@/lib/offer/coupon";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Where a typed code is judged. Everything that decides a price happens here,
 * on the server: the registration route asks for the coupon before choosing a
 * payment link, and the check endpoint asks the same question so the page can
 * show the discount before somebody commits.
 */

type SupabaseClient = Awaited<ReturnType<typeof getSupabaseServerClient>>;

/** True when the code exists, is in date, and is under its usage cap. */
export async function resolveCoupon(raw: string, supabase?: SupabaseClient): Promise<Coupon | null> {
  const result = await judgeCoupon(raw, supabase);
  return result.status === "valid" ? COUPONS.find((entry) => entry.code === result.code) ?? null : null;
}

/** The same judgement, with the reason — for telling somebody why. */
export async function judgeCoupon(raw: string, supabase?: SupabaseClient): Promise<CouponResponse | { status: "none" }> {
  const checked = checkCoupon(raw);
  if (checked.status !== "valid") return checked.status === "none" ? { status: "none" } : { status: checked.status };

  const { coupon } = checked;
  if (coupon.maxUses !== null) {
    const client = supabase ?? (await getSupabaseServerClient());
    // Unable to count is not permission to overspend the cap.
    if (!client) return { status: "used_up" };
    const { data, error } = await client.rpc("coupon_use_count", { p_code: coupon.code });
    if (error || typeof data !== "number") return { status: "used_up" };
    if (data >= coupon.maxUses) return { status: "used_up" };
  }

  return {
    status: "valid",
    code: coupon.code,
    price: coupon.price,
    label: coupon.label,
    saving: couponSaving(coupon),
  };
}
