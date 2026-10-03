import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DayOneSimulation } from "@/components/challenge/simulation";
import { replayBlocked, requireChallengeAccess } from "@/lib/challenge/access";

export const metadata: Metadata = {
  title: "Day 1 · The 180-Second Shift",
  description:
    "Fifteen minutes running a quick-commerce dark store through a breakfast peak.",
};

/** The clock is the store's, not the browser's — nothing here is cached. */
export const dynamic = "force-dynamic";

export default async function DayOnePage() {
  // Signed in before the floor opens, so the score has an account to belong to;
  // onboarded, so the leaderboard has a name to show; and registered, because
  // the challenge is for the people who signed up for it.
  const operator = await requireChallengeAccess("/challenge/day-1");

  // Day 1 is played once — coming back shows the scorecard. Admins are the
  // exception, because they are testing the day rather than competing on it;
  // `replayBlocked` is where that rule lives.
  if (await replayBlocked(1)) redirect("/challenge/day-1/scorecard");

  return <DayOneSimulation operatorName={operator.fullName} />;
}
