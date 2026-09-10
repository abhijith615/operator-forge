import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DayOneSimulation } from "@/components/challenge/simulation";
import { getOperator } from "@/lib/auth/session";
import { readOwnRun } from "@/lib/challenge/runs";
import { LOGIN_ROUTE, ONBOARDING_ROUTE } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Day 1 · The 180-Second Shift",
  description:
    "Fifteen minutes running a quick-commerce dark store through a breakfast peak.",
};

/** The clock is the store's, not the browser's — nothing here is cached. */
export const dynamic = "force-dynamic";

export default async function DayOnePage() {
  const operator = await getOperator();

  // Signed in before the floor opens, so the score has an account to belong to
  // and the leaderboard has a name to show. `next` brings them straight back.
  if (!operator) redirect(`${LOGIN_ROUTE}?next=%2Fchallenge%2Fday-1`);

  // Onboarding is where the name and number are collected. The leaderboard
  // needs the name, so an operator without one goes there first.
  if (!operator.onboarded) {
    redirect(`${ONBOARDING_ROUTE}?next=%2Fchallenge%2Fday-1`);
  }

  // Day 1 is played once. A shift you can retake until the score flatters you
  // is not an assessment, and the leaderboard is only worth reading if every
  // row on it is somebody's first attempt. Coming back shows the scorecard.
  const existing = await readOwnRun(1);
  if (existing) redirect("/challenge/day-1/scorecard");

  return <DayOneSimulation operatorName={operator.fullName} />;
}
