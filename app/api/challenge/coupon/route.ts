import { NextResponse, type NextRequest } from "next/server";

import { judgeCoupon } from "@/lib/offer/coupon-server";

/**
 * Checks one typed coupon code.
 *
 * Answers only about the code it was given — it never lists codes, and a
 * refusal says why without hinting at what would work. The discount it
 * reports is confirmed again when the registration is submitted, so this
 * endpoint decides what the page displays, never what anybody is charged.
 */

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let code = "";
  try {
    const body = (await request.json()) as { code?: unknown };
    code = typeof body.code === "string" ? body.code.slice(0, 40) : "";
  } catch {
    return NextResponse.json({ status: "unknown" });
  }

  if (!code.trim()) return NextResponse.json({ status: "unknown" });

  const result = await judgeCoupon(code);
  return NextResponse.json(result.status === "none" ? { status: "unknown" } : result, {
    headers: { "cache-control": "no-store" },
  });
}
