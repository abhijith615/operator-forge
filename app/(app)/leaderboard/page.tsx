import type { Metadata } from "next";

import { StandingsView } from "@/components/leaderboard/standings-view";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Your Operator Rating, your movement, and where you stand.",
};

export default function LeaderboardPage() {
  return <StandingsView />;
}
