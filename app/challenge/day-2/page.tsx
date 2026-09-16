import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DayTwoSimulation } from "@/components/challenge/day-two/simulation";
import { requireChallengeAccess } from "@/lib/challenge/access";
import { readOwnRun } from "@/lib/challenge/runs";
import { DAY_TWO_TOTAL_VARIANCE, rupees } from "@/lib/challenge/day-two/ledger";

export const metadata: Metadata = {
  title: `Day 2 · ${rupees(DAY_TWO_TOTAL_VARIANCE)} Is Missing`,
  description:
    "A late-night inventory audit. The system says the stock exists; the store says otherwise.",
};

export const dynamic = "force-dynamic";

export default async function DayTwoPage() {
  const operator = await requireChallengeAccess("/challenge/day-2");

  // Same rule as Day 1: an audit you can re-run until the numbers flatter you
  // is not an assessment.
  const existing = await readOwnRun(2);
  if (existing) redirect("/challenge/day-2/scorecard");

  return <DayTwoSimulation operatorName={operator.fullName} />;
}
