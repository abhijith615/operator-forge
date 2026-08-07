"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { MISSION_DURATION_SECONDS, missionTimeScale } from "@/lib/mission/config";
import { useMissionStore } from "@/stores/mission-store";
import { recordTelemetry, useTelemetryStore } from "@/stores/telemetry-store";

/** Elapsed seconds without subscribing to the store — safe inside effects. */
function elapsedNow(): number {
  const { status, startedAt, world } = useMissionStore.getState();
  if (status !== "live" || !startedAt) return world?.elapsed ?? 0;
  return Math.min(
    MISSION_DURATION_SECONDS,
    Math.floor(((Date.now() - startedAt) / 1000) * missionTimeScale()),
  );
}

/**
 * Watches navigation and attention for the whole shell. Mounted once. Records
 * which panel the operator opened, how long they stayed, and when they looked
 * away — the ordering of that is most of what "curiosity" means in the debrief.
 */
export function useTelemetry(): void {
  const pathname = usePathname();
  const runId = useMissionStore((state) => state.runId);
  const status = useMissionStore((state) => state.status);
  const arrivedAt = React.useRef<number | null>(null);

  // A new run gets a clean record.
  React.useEffect(() => {
    if (!runId || status !== "live") return;
    if (useTelemetryStore.getState().runId === runId) return;
    useTelemetryStore.getState().start(runId);
  }, [runId, status]);

  React.useEffect(() => {
    if (!runId || status !== "live") return;

    const at = elapsedNow();
    recordTelemetry("navigate", pathname, at);
    arrivedAt.current = at;

    return () => {
      const left = elapsedNow();
      const from = arrivedAt.current;
      if (from === null) return;
      recordTelemetry("dwell", pathname, left, { value: Math.max(0, left - from) });
    };
  }, [pathname, runId, status]);

  React.useEffect(() => {
    if (!runId || status !== "live") return;

    const onVisibility = () => {
      recordTelemetry("focus", document.visibilityState, elapsedNow());
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [runId, status]);
}

/** Records something the operator did, resolving mission time for the caller. */
export function useRecordEvent() {
  return React.useCallback(
    (
      kind: Parameters<typeof recordTelemetry>[0],
      target: string,
      extra?: Parameters<typeof recordTelemetry>[3],
    ) => {
      recordTelemetry(kind, target, elapsedNow(), extra);
    },
    [],
  );
}
