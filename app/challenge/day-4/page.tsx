import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DayFourSimulation } from "@/components/challenge/day-four/simulation";
import { getOperator } from "@/lib/auth/session";
import { readOwnRun } from "@/lib/challenge/runs";
import { LOGIN_ROUTE, ONBOARDING_ROUTE } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Day 4 · Clear the Floor",
  description: "Three vehicles have arrived and peak starts in 42 minutes. Find the bottleneck and get the store ready before lunch.",
};

export const dynamic = "force-dynamic";

const NEXT = "%2Fchallenge%2Fday-4";

export default async function DayFourPage() {
  const operator = await getOperator();
  if (!operator) redirect(`${LOGIN_ROUTE}?next=${NEXT}`);
  if (!operator.onboarded) redirect(`${ONBOARDING_ROUTE}?next=${NEXT}`);

  // Played once, like every other day.
  const existing = await readOwnRun(4);
  if (existing) redirect("/challenge/day-4/scorecard");

  return <DayFourSimulation operatorName={operator.fullName} />;
}
