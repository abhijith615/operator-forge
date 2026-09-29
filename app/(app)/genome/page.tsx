import type { Metadata } from "next";

import { GenomeView } from "@/components/genome/genome-view";
import { requireOperator } from "@/lib/auth/session";
import { buildGenome } from "@/lib/genome/build";
import { canRunShift } from "@/lib/mission/attempts";
import { loadLatestCompletedRun } from "@/lib/mission/history";

export const metadata: Metadata = {
  title: "Genome",
  description: "How you operated, across ten capabilities.",
};

export default async function GenomePage() {
  const operator = await requireOperator();
  const firstName = operator.fullName.split(" ")[0] ?? "Operator";

  // Built here from the stored run so the reading survives a cleared browser.
  // The live stores still win when they hold the shift that just ended — the
  // snapshot is written after the clock stops and may be a moment behind.
  const stored = await loadLatestCompletedRun();
  const storedGenome = stored
    ? buildGenome({
        runId: stored.runId,
        decisions: stored.decisions,
        events: stored.telemetry,
        threads: stored.conversations,
        world: stored.world,
      })
    : null;

  return (
    <GenomeView
      firstName={firstName}
      canRunAgain={await canRunShift()}
      storedGenome={storedGenome}
      storedTraces={stored?.traces ?? []}
      storedTimeline={stored?.timeline ?? []}
      storedAchievements={stored?.achievements ?? []}
    />
  );
}
