import type { Metadata } from "next";

import { FcAssessment } from "@/components/fc/assessment";
import { isAdmin } from "@/lib/admin/queries";
import type { FcStarted } from "@/lib/fc/actions";
import { fcProfileFrom, fcResultFrom, readFcAttempt } from "@/lib/fc/server";
import { FC_SECONDS } from "@/lib/fc/weights";

/**
 * The FC Executive Hiring Test. Not linked from anywhere yet: reached by its
 * link only, and kept out of search engines.
 */
export const metadata: Metadata = {
  title: "Hiring Test — FC Executive",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function FcExecutivePage() {
  const [attempt, admin] = await Promise.all([readFcAttempt(), isAdmin()]);

  if (attempt && attempt.status !== "in_progress") {
    const { result, incomplete } = fcResultFrom(attempt.actions);
    return <FcAssessment initial={null} profile={fcProfileFrom(result, incomplete)} name={attempt.candidate_name ?? ""} canRetake={admin} />;
  }

  const resumed: FcStarted | null = attempt
    ? {
        id: attempt.id,
        status: attempt.status,
        startedAt: Date.parse(attempt.started_at),
        serverNow: attempt.server_now ? Date.parse(attempt.server_now) : Date.now(),
        limit: attempt.time_limit_seconds ?? FC_SECONDS,
        actions: attempt.actions,
      }
    : null;

  return <FcAssessment initial={resumed} profile={null} name={attempt?.candidate_name ?? null} canRetake={admin} />;
}
