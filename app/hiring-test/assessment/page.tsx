import type { Metadata } from "next";

import { CandidateEntry, HiringAssessment } from "@/components/hiring/assessment";
import { getOperator } from "@/lib/auth/session";
import type { StartedAttempt } from "@/lib/hiring/actions";
import { HIRING_CONTACT } from "@/lib/hiring/content";
import { candidateProfileFrom, readCurrentAttempt, readTimeLimit, resultFrom } from "@/lib/hiring/server";
import { ASSESSMENT_SECONDS } from "@/lib/hiring/weights";

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

  // Sat on a simulation that has since been replaced. It cannot be replayed on
  // this one, so it is neither resumed nor scored here.
  if (attempt?.retired) {
    return (
      <div className="min-h-dvh bg-void text-hi">
        <main id="main" className="mx-auto max-w-xl px-4 pt-16 pb-20 sm:px-6">
          <p className="font-mono text-[11.5px] tracking-[0.2em] text-ember-500 uppercase">Operator Forge · Hiring Test</p>
          <h1 className="mt-2 text-[26px] leading-tight font-bold tracking-[-0.03em] text-hi">The test you sat has been replaced.</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-mid">
            You sat an earlier version of this simulation. It has since been rebuilt, and an earlier attempt is not
            scored against the new one. To sit the current version, write to{" "}
            <a href={`mailto:${HIRING_CONTACT}`} className="underline underline-offset-4 hover:text-hi">
              {HIRING_CONTACT}
            </a>{" "}
            from {operator.email}.
          </p>
        </main>
      </div>
    );
  }

  if (attempt && attempt.status !== "in_progress") {
    const { result, incomplete } = resultFrom(attempt.scenario_variant, attempt.actions);
    return <HiringAssessment email={operator.email} initial={null} profile={candidateProfileFrom(result, incomplete)} limit={ASSESSMENT_SECONDS} />;
  }

  const initial: StartedAttempt | null = attempt
    ? {
        id: attempt.id,
        form: attempt.scenario_variant,
        status: attempt.status,
        startedAt: Date.parse(attempt.started_at),
        serverNow: attempt.server_now ? Date.parse(attempt.server_now) : Date.now(),
        limit: attempt.time_limit_seconds ?? ASSESSMENT_SECONDS,
        actions: attempt.actions,
      }
    : null;

  // Nothing started yet: say how long they will have before they agree to start.
  const limit = initial ? initial.limit : await readTimeLimit();

  return <HiringAssessment email={operator.email} initial={initial} profile={null} limit={limit} />;
}
