import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DayTwoSimulation } from "@/components/challenge/day-two/simulation";
import { getOperator } from "@/lib/auth/session";
import { readOwnRun } from "@/lib/challenge/runs";
import { LOGIN_ROUTE, ONBOARDING_ROUTE } from "@/lib/constants/routes";
import { DAY_TWO_TOTAL_VARIANCE, rupees } from "@/lib/challenge/day-two/ledger";

export const metadata: Metadata = {
  title: `Day 2 · ${rupees(DAY_TWO_TOTAL_VARIANCE)} Is Missing`,
  description:
    "A late-night inventory audit. The system says the stock exists; the store says otherwise.",
};

export const dynamic = "force-dynamic";

const NEXT = "%2Fchallenge%2Fday-2";

export default async function DayTwoPage() {
  const operator = await getOperator();
  if (!operator) redirect(`${LOGIN_ROUTE}?next=${NEXT}`);
  if (!operator.onboarded) redirect(`${ONBOARDING_ROUTE}?next=${NEXT}`);

  // Same rule as Day 1: an audit you can re-run until the numbers flatter you
  // is not an assessment.
  const existing = await readOwnRun(2);
  if (existing) redirect("/challenge/day-2/scorecard");

  return <DayTwoSimulation operatorName={operator.fullName} />;
}
