import { NextResponse } from "next/server";

import { isAdmin, readAdminSnapshot } from "@/lib/admin/queries";
import { getOperator } from "@/lib/auth/session";

export const runtime = "nodejs";
/** Live means live. Nothing here may be cached, at any layer. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * What the panel polls. Same authorisation as the page itself — the route is
 * not a back door, and it answers 404 rather than 403 so its existence is not
 * confirmed to anyone who should not have it.
 */
export async function GET() {
  const operator = await getOperator();
  if (!operator) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const snapshot = await readAdminSnapshot();
  if (!snapshot) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json(snapshot, {
    headers: {
      // Personal data. Never store it in a shared cache, and never let a
      // back button resurrect it after sign-out.
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}
