import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RunSummary } from "@/components/challenge/run-summary";
import { Day3Scorecard } from "@/components/challenge/day-three/scorecard";
import { requireChallengeAccess } from "@/lib/challenge/access";
import { readOwnResult, readOwnRun } from "@/lib/challenge/runs";

export const metadata: Metadata = {
  title: "Day 3 · Your scorecard",
  description: "How you built and kept a team through the Onam Eve peak.",
};

export const dynamic = "force-dynamic";

export default async function DayThreeScorecardPage() {
  await requireChallengeAccess("/challenge/day-3/scorecard");

  const run = await readOwnRun(3);
  // Exact complement of the guard on /challenge/day-3, so the two cannot bounce.
  if (!run) redirect("/challenge/day-3");

  const result = await readOwnResult(3);
  if (!result) {
    return (
      <div className="min-h-dvh bg-obsidian">
        <main id="main" className="mx-auto max-w-3xl px-4 py-10">
          <RunSummary run={run} />
        </main>
      </div>
    );
  }
  return <Day3Scorecard result={result} />;
}
