import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DayTwoSimulation } from "@/components/challenge/day-two/simulation";
import { replayBlocked, requireChallengeAccess } from "@/lib/challenge/access";
import { recordDayOpen } from "@/lib/challenge/opens";
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
  if (await replayBlocked(2)) redirect("/challenge/day-2/scorecard");

  // Counted only once the page is actually going to render a shift.
  await recordDayOpen(2);

  return <DayTwoSimulation operatorName={operator.fullName} />;
}
