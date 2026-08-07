"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { TelemetryEvent, TelemetryKind } from "@/types/telemetry";

/** Enough to describe a 30-minute shift without unbounded growth. */
const EVENT_CAP = 1500;

interface TelemetryState {
  /** Tied to a run so a new shift never inherits the last one's record. */
  runId: string | null;
  events: TelemetryEvent[];

  start: (runId: string) => void;
  record: (
    kind: TelemetryKind,
    target: string,
    at: number,
    extra?: { value?: number; meta?: TelemetryEvent["meta"] },
  ) => void;
  reset: () => void;
}

let counter = 0;

export const useTelemetryStore = create<TelemetryState>()(
  persist(
    (set, get) => ({
      runId: null,
      events: [],

      start: (runId) => set({ runId, events: [] }),

      record: (kind, target, at, extra) => {
        // Before a run exists there is nothing to attribute events to.
        if (!get().runId) return;
        counter += 1;
        const event: TelemetryEvent = {
          id: `tm-${at}-${counter}`,
          at,
          kind,
          target,
          value: extra?.value,
          meta: extra?.meta,
        };
        set((state) => ({ events: [...state.events, event].slice(-EVENT_CAP) }));
      },

      reset: () => set({ runId: null, events: [] }),
    }),
    { name: "of.telemetry", version: 1 },
  ),
);

/** Fire-and-forget helper for components that should not subscribe. */
export function recordTelemetry(
  kind: TelemetryKind,
  target: string,
  at: number,
  extra?: { value?: number; meta?: TelemetryEvent["meta"] },
): void {
  useTelemetryStore.getState().record(kind, target, at, extra);
}
