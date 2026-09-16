import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RunSummary } from "@/components/challenge/run-summary";
import { Day5Scorecard } from "@/components/challenge/day-five/scorecard";
import { requireChallengeAccess } from "@/lib/challenge/access";
import { readOwnResult, readOwnRun } from "@/lib/challenge/runs";

export const metadata: Metadata = {
  title: "Day 5 · Your scorecard",
  description: "What each customer ended up holding.",
};

export const dynamic = "force-dynamic";

export default async function DayFiveScorecardPage() {
  await requireChallengeAccess("/challenge/day-5/scorecard");

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
