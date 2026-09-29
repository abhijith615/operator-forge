"use client";

import { GenomeReport } from "@/components/genome/genome-report";
import { LockedPanel } from "@/components/shell/locked-panel";
import { PageShell } from "@/components/shell/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useGenome } from "@/hooks/use-genome";
import { useMissionHydrated } from "@/hooks/use-mission";
import type { OperatorGenome } from "@/types/genome";
import type { TimelineEntry } from "@/types/mission-run";
import type { Achievement } from "@/types/tasks";
import type { WorldTrace } from "@/types/telemetry";

const PENDING_CONTENTS = [
  "Ten capabilities on an animated radar — no percentages, no marks",
  "A replay of your shift, minute by minute, with what you did at each turn",
  "Where your judgement held and where it slipped, quoted from the record",
  "What to keep doing, written as advice rather than as a grade",
] as const;

export function GenomeView({
  firstName,
  canRunAgain = false,
  storedGenome = null,
  storedTraces = [],
  storedTimeline = [],
  storedAchievements = [],
}: {
  firstName: string;
  canRunAgain?: boolean;
  /** Rebuilt on the server from `mission_runs`, for a browser that has forgotten. */
  storedGenome?: OperatorGenome | null;
  storedTraces?: WorldTrace[];
  storedTimeline?: TimelineEntry[];
  storedAchievements?: Achievement[];
}) {
  const hydrated = useMissionHydrated();
  const live = useGenome();

  if (!hydrated) {
    return (
      <PageShell className="max-w-6xl">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-5 h-10 w-96" />
        <Skeleton className="mt-6 h-20 w-full max-w-3xl" />
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <Skeleton className="h-44 rounded-panel" />
          <Skeleton className="h-44 rounded-panel" />
        </div>
        <Skeleton className="mt-6 h-96 rounded-panel" />
      </PageShell>
    );
  }

  // The browser's own copy first: it is the shift that just ended, and the
  // snapshot behind it may be a moment old. The stored run is what answers on
  // a cleared browser or a second device.
  const genome = live ?? storedGenome;
  if (!genome) return <LockedPanel href="/genome" contents={PENDING_CONTENTS} />;

  return (
    <GenomeReport
      genome={genome}
      firstName={firstName}
      canRunAgain={canRunAgain}
      fallbackTraces={storedTraces}
      fallbackTimeline={storedTimeline}
      fallbackAchievements={storedAchievements}
    />
  );
}
