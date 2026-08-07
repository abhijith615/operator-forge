"use client";

import * as React from "react";

import { buildGenome } from "@/lib/genome/build";
import { useChatStore } from "@/stores/chat-store";
import { useMissionStore } from "@/stores/mission-store";
import { useTelemetryStore } from "@/stores/telemetry-store";
import type { OperatorGenome } from "@/types/genome";

/**
 * Builds the Genome from whatever the finished run left behind. Recomputed
 * rather than stored, so a change to the scoring model applies to past shifts
 * too — the record is the decisions, not the reading of them.
 */
export function useGenome(): OperatorGenome | null {
  const status = useMissionStore((state) => state.status);
  const runId = useMissionStore((state) => state.runId);
  const world = useMissionStore((state) => state.world);
  const decisions = useMissionStore((state) => state.decisions);
  const events = useTelemetryStore((state) => state.events);
  const threads = useChatStore((state) => state.threads);

  return React.useMemo(() => {
    if (status !== "complete" || !runId || !world) return null;
    return buildGenome({ runId, decisions, events, threads, world });
  }, [status, runId, world, decisions, events, threads]);
}
