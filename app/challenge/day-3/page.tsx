import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DayThreeSimulation } from "@/components/challenge/day-three/simulation";
import { replayBlocked, requireChallengeAccess } from "@/lib/challenge/access";
import { recordDayOpen } from "@/lib/challenge/opens";

export const metadata: Metadata = {
  title: "Day 3 · Onam Eve — Build the Shift",
  description: "Five people are out and the festival peak begins in ninety minutes. Build the team that survives it.",
};

export const dynamic = "force-dynamic";

export default async function DayThreePage() {
  const operator = await requireChallengeAccess("/challenge/day-3");

  // Played once, like every other day: the first plan is the one assessed.
  if (await replayBlocked(3)) redirect("/challenge/day-3/scorecard");

  // Counted only once the page is actually going to render a shift.
  await recordDayOpen(3);

  return <DayThreeSimulation operatorName={operator.fullName} />;
}
