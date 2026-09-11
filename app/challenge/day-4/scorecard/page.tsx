import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RunSummary } from "@/components/challenge/run-summary";
import { Day4Scorecard } from "@/components/challenge/day-four/scorecard";
import { getOperator } from "@/lib/auth/session";
import { readOwnResult, readOwnRun } from "@/lib/challenge/runs";
import { LOGIN_ROUTE, ONBOARDING_ROUTE } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Day 4 · Your scorecard",
  description: "How you cleared the floor before the lunch peak.",
};

export const dynamic = "force-dynamic";

const NEXT = "%2Fchallenge%2Fday-4%2Fscorecard";

export default async function DayFourScorecardPage() {
  const operator = await getOperator();
  if (!operator) redirect(`${LOGIN_ROUTE}?next=${NEXT}`);
  if (!operator.onboarded) redirect(`${ONBOARDING_ROUTE}?next=${NEXT}`);

  const run = await readOwnRun(4);
  // Exact complement of the guard on /challenge/day-4, so the two cannot bounce.
  if (!run) redirect("/challenge/day-4");

  const result = await readOwnResult(4);
  if (!result) {
    return (
      <div className="min-h-dvh bg-obsidian">
        <main id="main" className="mx-auto max-w-3xl px-4 py-10">
          <RunSummary run={run} />
        </main>
      </div>
    );
  }
  return <Day4Scorecard result={result} />;
}
