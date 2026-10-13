import { NextResponse, type NextRequest } from "next/server";

import { getOperator } from "@/lib/auth/session";
import { renderCandidateProfileImage } from "@/lib/hiring/profile-image";
import { candidateProfileFrom, readCurrentAttempt, readGuestAttempt, resultFrom } from "@/lib/hiring/server";

/**
 * The candidate's own profile as a PNG download: the signed-in candidate's, or
 * the one this browser sat under a name.
 *
 * Replayed from their saved attempt on request, exactly as the page does it,
 * so the file and the screen cannot disagree. Anyone without a finished
 * attempt is sent back to the assessment page, which knows what to show them.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ASSESSMENT_ROUTE = "/hiring-test/assessment";

export async function GET(request: NextRequest) {
  const back = NextResponse.redirect(new URL(ASSESSMENT_ROUTE, request.url));

  const operator = await getOperator();
  const attempt = operator ? await readCurrentAttempt() : await readGuestAttempt();
  if (!attempt || attempt.retired || attempt.status === "in_progress") return back;

  const { result, incomplete } = resultFrom(attempt.scenario_variant, attempt.actions);
  const image = await renderCandidateProfileImage(
    candidateProfileFrom(result, incomplete),
    operator?.email ?? attempt.candidate_name ?? "",
  );

  const headers = new Headers(image.headers);
  headers.set("Content-Disposition", 'attachment; filename="Dark-Store-Manager-Profile.png"');
  headers.set("Cache-Control", "private, no-store");
  return new Response(image.body, { status: 200, headers });
}
