import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RunSummary } from "@/components/challenge/run-summary";
import { Day2Scorecard } from "@/components/challenge/day-two/scorecard";
import { requireChallengeAccess } from "@/lib/challenge/access";
import { readOwnResult, readOwnRun } from "@/lib/challenge/runs";

export const metadata: Metadata = {
  title: "Day 2 · Your scorecard",
  description: "The result of your Day 2 inventory audit at Store 114.",
};

export const dynamic = "force-dynamic";

export default async function DayTwoScorecardPage() {
  await requireChallengeAccess("/challenge/day-2/scorecard");

  const run = await readOwnRun(2);
  // Exact complement of the guard on /challenge/day-2, so the two cannot bounce.
  if (!run) redirect("/challenge/day-2");

  const result = await readOwnResult(2);

  if (!result) {
    return (
      <div className="min-h-dvh bg-obsidian">
        <main id="main" className="mx-auto max-w-3xl px-4 py-10">
          <RunSummary run={run} />
        </main>
      </div>
    );
  }

  return <Day2Scorecard result={result} />;
}
