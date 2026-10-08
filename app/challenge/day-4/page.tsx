import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DayFourSimulation } from "@/components/challenge/day-four/simulation";
import { replayBlocked, requireChallengeAccess } from "@/lib/challenge/access";
import { recordDayOpen } from "@/lib/challenge/opens";

export const metadata: Metadata = {
  title: "Day 4 · Clear the Floor",
  description: "Three vehicles have arrived and peak starts in 42 minutes. Find the bottleneck and get the store ready before lunch.",
};

export const dynamic = "force-dynamic";

export default async function DayFourPage() {
  const operator = await requireChallengeAccess("/challenge/day-4");

  // Played once, like every other day.
  if (await replayBlocked(4)) redirect("/challenge/day-4/scorecard");

  // Counted only once the page is actually going to render a shift.
  await recordDayOpen(4);

  return <DayFourSimulation operatorName={operator.fullName} />;
}
