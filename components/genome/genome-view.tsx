"use client";

import { GenomeReport } from "@/components/genome/genome-report";
import { LockedPanel } from "@/components/shell/locked-panel";
import { PageShell } from "@/components/shell/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useGenome } from "@/hooks/use-genome";
import { useMissionHydrated } from "@/hooks/use-mission";

const PENDING_CONTENTS = [
  "Ten capabilities on an animated radar — no percentages, no marks",
  "A replay of your shift, minute by minute, with what you did at each turn",
  "Where your judgement held and where it slipped, quoted from the record",
  "What to keep doing, written as advice rather than as a grade",
] as const;

export function GenomeView({ firstName }: { firstName: string }) {
  const hydrated = useMissionHydrated();
  const genome = useGenome();

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

  if (!genome) return <LockedPanel href="/genome" contents={PENDING_CONTENTS} />;

  return <GenomeReport genome={genome} firstName={firstName} />;
}
