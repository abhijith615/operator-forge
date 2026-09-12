import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DayFiveSimulation } from "@/components/challenge/day-five/simulation";
import { getOperator } from "@/lib/auth/session";
import { readOwnRun } from "@/lib/challenge/runs";
import { LOGIN_ROUTE, ONBOARDING_ROUTE } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Day 5 · Protect the Promise",
  description:
    "Four orders are on time, in policy and inside target — and every one of them fails the person who ordered it. Find what the customer actually came for, and protect that.",
};

export const dynamic = "force-dynamic";

const NEXT = "%2Fchallenge%2Fday-5";

export default async function DayFivePage() {
  const operator = await getOperator();
  if (!operator) redirect(`${LOGIN_ROUTE}?next=${NEXT}`);
  if (!operator.onboarded) redirect(`${ONBOARDING_ROUTE}?next=${NEXT}`);

  // Played once, like every other day.
  const existing = await readOwnRun(5);
  if (existing) redirect("/challenge/day-5/scorecard");

  return <DayFiveSimulation operatorName={operator.fullName} />;
}
