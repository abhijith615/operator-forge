"use client";

import * as React from "react";

import { useGenome } from "@/hooks/use-genome";
import { useHistoryStore } from "@/stores/history-store";
import { useMissionStore } from "@/stores/mission-store";

/**
 * Files a finished shift into the operator's history exactly once, so the
 * leaderboard can show movement and a streak rather than a single number.
 */
export function useRecordRun(): void {
  const status = useMissionStore((state) => state.status);
  const completedAt = useMissionStore((state) => state.completedAt);
  const world = useMissionStore((state) => state.world);
  const record = useHistoryStore((state) => state.record);
  const genome = useGenome();

  React.useEffect(() => {
    if (status !== "complete" || !genome || !world) return;
    record({
      runId: genome.runId,
      completedAt: completedAt ?? Date.now(),
      rating: genome.rating,
      signature: genome.signature,
      tasksHandled: genome.stats.tasksHandled,
      tasksExpired: genome.stats.tasksExpired,
      hubRating: genome.stats.ratingAtClose,
    });
  }, [status, genome, world, completedAt, record]);
}
