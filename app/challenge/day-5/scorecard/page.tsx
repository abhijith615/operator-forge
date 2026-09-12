import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RunSummary } from "@/components/challenge/run-summary";
import { Day5Scorecard } from "@/components/challenge/day-five/scorecard";
import { getOperator } from "@/lib/auth/session";
import { readOwnResult, readOwnRun } from "@/lib/challenge/runs";
import { LOGIN_ROUTE, ONBOARDING_ROUTE } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Day 5 · Your scorecard",
  description: "What each customer ended up holding.",
};

export const dynamic = "force-dynamic";

const NEXT = "%2Fchallenge%2Fday-5%2Fscorecard";

export default async function DayFiveScorecardPage() {
  const operator = await getOperator();
  if (!operator) redirect(`${LOGIN_ROUTE}?next=${NEXT}`);
  if (!operator.onboarded) redirect(`${ONBOARDING_ROUTE}?next=${NEXT}`);

  const run = await readOwnRun(5);
  // Exact complement of the guard on /challenge/day-5, so the two cannot bounce.
  if (!run) redirect("/challenge/day-5");

  const result = await readOwnResult(5);
  if (!result) {
    return (
      <div className="min-h-dvh bg-obsidian">
        <main id="main" className="mx-auto max-w-3xl px-4 py-10">
          <RunSummary run={run} />
        </main>
      </div>
    );
  }
  return <Day5Scorecard result={result} />;
}
