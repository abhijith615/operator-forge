import { NextResponse, type NextRequest } from "next/server";

import { getOperator } from "@/lib/auth/session";
import { hasChallengeAccess } from "@/lib/challenge/access";
import { buildOperatorProfile } from "@/lib/challenge/day-six/profile";
import { profileFileName, renderProfileImage } from "@/lib/challenge/day-six/profile-image";
import { readWeek } from "@/lib/challenge/runs";
import { LOGIN_ROUTE } from "@/lib/constants/routes";

/**
 * The signed-in operator's profile as a PNG download. Drawn on request from
 * their own stored runs, so it always matches what the page says — there is
 * no cached copy to go stale when a day is replayed.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROFILE_ROUTE = "/challenge/day-6";

export async function GET(request: NextRequest) {
  const operator = await getOperator();
  if (!operator) {
    return NextResponse.redirect(
      new URL(`${LOGIN_ROUTE}?next=${encodeURIComponent(PROFILE_ROUTE)}`, request.url),
    );
  }
  if (!(await hasChallengeAccess())) {
    return NextResponse.redirect(new URL(PROFILE_ROUTE, request.url));
  }

  const profile = buildOperatorProfile(await readWeek());
  // Nothing played is nothing to draw. The page explains that far better than
  // an image of ten dashes would.
  if (profile.daysDone === 0) {
    return NextResponse.redirect(new URL(PROFILE_ROUTE, request.url));
  }

  const image = await renderProfileImage(profile, operator.fullName);
  const headers = new Headers(image.headers);
  headers.set("Content-Disposition", `attachment; filename="${profileFileName(operator.fullName)}"`);
  headers.set("Cache-Control", "private, no-store");
  return new Response(image.body, { status: 200, headers });
}
