"use client";

import * as React from "react";

import { buildGenome } from "@/lib/genome/build";
import { saveRunSnapshot } from "@/lib/mission/persistence";
import { useChatStore } from "@/stores/chat-store";
import { useMissionStore } from "@/stores/mission-store";
import { useTelemetryStore } from "@/stores/telemetry-store";

const SYNC_INTERVAL_MS = 60_000;

/**
 * Pushes a snapshot of the run to Supabase periodically and on completion.
 * Deliberately not on every tick — the live state lives in the browser, and
 * this is the durable record, not the source of truth.
 */
export function useRunSync(): void {
  const status = useMissionStore((state) => state.status);
  const runId = useMissionStore((state) => state.runId);
  const lastSaved = React.useRef<string | null>(null);

  const push = React.useCallback(async () => {
    const mission = useMissionStore.getState();
    if (!mission.runId || !mission.world || !mission.startedAt) return;

    const signature = `${mission.runId}:${mission.status}:${mission.world.elapsed}`;
    if (signature === lastSaved.current) return;
    lastSaved.current = signature;

    const telemetry = useTelemetryStore.getState().events;
    const threads = useChatStore.getState().threads;

    // The rating is only meaningful once the shift is over, and it is what the
    // cohort ranks on — so it is computed here rather than stored per tick.
    const rating =
      mission.status === "complete"
        ? buildGenome({
            runId: mission.runId,
            decisions: mission.decisions,
            events: telemetry,
            threads,
            world: mission.world,
          }).rating
        : null;

    try {
      await saveRunSnapshot({
        runId: mission.runId,
        status: mission.status,
        startedAt: mission.startedAt,
        completedAt: mission.completedAt,
        world: mission.world,
        timeline: mission.timeline,
        conversations: threads,
        tasks: mission.tasks,
        decisions: mission.decisions,
        achievements: mission.achievements,
        telemetry,
        traces: mission.traces,
        rating,
      });
    } catch {
      // The run continues regardless; the browser copy is authoritative.
    }
  }, []);

  React.useEffect(() => {
    if (!runId) return;
    if (status !== "live" && status !== "complete") return;

    void push();
    if (status === "complete") return;

    const interval = window.setInterval(() => void push(), SYNC_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [runId, status, push]);
}
