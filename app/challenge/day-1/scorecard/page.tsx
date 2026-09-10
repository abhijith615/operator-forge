import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RunSummary } from "@/components/challenge/run-summary";
import { Scorecard } from "@/components/challenge/scorecard";
import { getOperator } from "@/lib/auth/session";
import { readOwnResult, readOwnRun } from "@/lib/challenge/runs";
import { LOGIN_ROUTE, ONBOARDING_ROUTE } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Day 1 · Your scorecard",
  description: "The result of your Day 1 shift at Store 114.",
};

export const dynamic = "force-dynamic";

const NEXT = "%2Fchallenge%2Fday-1%2Fscorecard";

/**
 * A finished day, shown again.
 *
 * Day 1 is played once, so this is where the second click lands. It reads the
 * scorecard back off the run rather than rebuilding one — the assessment an
 * operator returns to should be the assessment they earned, word for word.
 */
export default async function DayOneScorecardPage() {
  const operator = await getOperator();
  if (!operator) redirect(`${LOGIN_ROUTE}?next=${NEXT}`);
  if (!operator.onboarded) redirect(`${ONBOARDING_ROUTE}?next=${NEXT}`);

  const run = await readOwnRun(1);
  // Nothing played yet. Send them to the shift rather than to an empty page
  // apologising for itself — and note this is the exact complement of the
  // guard on /challenge/day-1, so the two can never bounce off each other.
  if (!run) redirect("/challenge/day-1");

  const result = await readOwnResult(1);

  return (
    <div className="min-h-dvh bg-obsidian">
      <main id="main" className="mx-auto max-w-3xl px-4 py-10">
        <p className="mb-8 rounded-card border border-line bg-surface px-4 py-3 text-[12.5px] leading-relaxed text-lo">
          Day 1 is played once. This is the shift you ran on{" "}
          {new Date(run.completed_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "Asia/Kolkata",
          })}
          , kept as it was recorded.
        </p>

        {result ? <Scorecard result={result} /> : <RunSummary run={run} />}
      </main>
    </div>
  );
}
