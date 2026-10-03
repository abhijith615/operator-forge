import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DayFiveSimulation } from "@/components/challenge/day-five/simulation";
import { replayBlocked, requireChallengeAccess } from "@/lib/challenge/access";

export const metadata: Metadata = {
  title: "Day 5 · Protect the Promise",
  description:
    "Four orders are on time, in policy and inside target — and every one of them fails the person who ordered it. Find what the customer actually came for, and protect that.",
};

export const dynamic = "force-dynamic";

export default async function DayFivePage() {
  const operator = await requireChallengeAccess("/challenge/day-5");

  // Played once, like every other day.
  if (await replayBlocked(5)) redirect("/challenge/day-5/scorecard");

  return <DayFiveSimulation operatorName={operator.fullName} />;
}
