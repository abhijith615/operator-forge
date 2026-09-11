import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DayThreeSimulation } from "@/components/challenge/day-three/simulation";
import { getOperator } from "@/lib/auth/session";
import { readOwnRun } from "@/lib/challenge/runs";
import { LOGIN_ROUTE, ONBOARDING_ROUTE } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Day 3 · Onam Eve — Build the Shift",
  description: "Five people are out and the festival peak begins in ninety minutes. Build the team that survives it.",
};

export const dynamic = "force-dynamic";

const NEXT = "%2Fchallenge%2Fday-3";

export default async function DayThreePage() {
  const operator = await getOperator();
  if (!operator) redirect(`${LOGIN_ROUTE}?next=${NEXT}`);
  if (!operator.onboarded) redirect(`${ONBOARDING_ROUTE}?next=${NEXT}`);

  // Played once, like every other day: the first plan is the one assessed.
  const existing = await readOwnRun(3);
  if (existing) redirect("/challenge/day-3/scorecard");

  return <DayThreeSimulation operatorName={operator.fullName} />;
}
