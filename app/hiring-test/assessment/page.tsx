import type { Metadata } from "next";

import { CandidateEntry, HiringAssessment } from "@/components/hiring/assessment";
import { getOperator } from "@/lib/auth/session";
import type { StartedAttempt } from "@/lib/hiring/actions";
import { candidateProfileFrom, readCurrentAttempt, resultFrom } from "@/lib/hiring/server";

export const metadata: Metadata = {
  title: "Hiring Test — Dark Store Manager Simulation",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The candidate's route.
 *
 * Signed out: an email address. Signed in and not started: the positioning
 * screen. Mid-shift: straight back into the store. Finished: the profile.
 * Which of those it is gets decided here, from the database, so reloading or
 * coming back on another device never restarts an attempt.
 */
export default async function HiringAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const operator = await getOperator();
  if (!operator) return <CandidateEntry error={(await searchParams).error} />;

  const attempt = await readCurrentAttempt();

  if (attempt && attempt.status !== "in_progress") {
    const { result, incomplete } = resultFrom(attempt.scenario_variant, attempt.actions);
    return <HiringAssessment email={operator.email} initial={null} profile={candidateProfileFrom(result, incomplete)} />;
  }

  const initial: StartedAttempt | null = attempt
    ? {
        id: attempt.id,
        form: attempt.scenario_variant,
        status: attempt.status,
        startedAt: Date.parse(attempt.started_at),
        serverNow: attempt.server_now ? Date.parse(attempt.server_now) : Date.now(),
        actions: attempt.actions,
      }
    : null;

  return <HiringAssessment email={operator.email} initial={initial} profile={null} />;
}
