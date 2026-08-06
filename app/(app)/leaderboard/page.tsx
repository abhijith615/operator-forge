import type { Metadata } from "next";

import { LockedPanel } from "@/components/shell/locked-panel";

export const metadata: Metadata = { title: "Leaderboard" };

export default function LeaderboardPage() {
  return (
    <LockedPanel
      href="/leaderboard"
      contents={[
        "Your Operator Rating and where it sits against the same hub",
        "Movement since your last shift, not a raw total",
        "Weekly streak, and what it takes to hold one",
        "Operators appear by callsign — the board is about the shift, not the name",
      ]}
    />
  );
}
