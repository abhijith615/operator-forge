"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { TelemetryEvent } from "@/lib/hiring/actions";
import { expire, reduce, replay } from "@/lib/hiring/engine";
import type { Action, FormId, HiringState, Stamped } from "@/lib/hiring/types";
import { deviceType } from "@/lib/hiring/view";
import { ASSESSMENT_VERSION } from "@/lib/hiring/weights";

/**
 * The attempt, as the browser holds it.
 *
 * Only the actions are kept. The store's state is whatever the engine makes of
 * them, rebuilt on load — so a refresh, a closed tab or a dead battery brings
 * the candidate back to exactly the store they left, and there is no second
 * copy of the state to drift out of step with the first.
 */

export interface Attempt {
  id: string;
  form: FormId;
  /** Server time the clock started, epoch ms. */
  startedAt: number;
  /** Server clock minus this device's clock, so the timer cannot be moved by changing the phone's time. */
  skew: number;
  /** A practice run that is never saved or scored. */
  local: boolean;
}

interface HiringStore {
  attempt: Attempt | null;
  actions: Stamped[];
  state: HiringState | null;
  /** Telemetry not yet sent. */
  queue: TelemetryEvent[];
  /** How many actions the server is known to hold. */
  saved: number;

  begin: (attempt: Attempt, serverActions: Stamped[]) => void;
  dispatch: (action: Action) => void;
  note: (eventType: string, payload?: Record<string, unknown>) => void;
  markSaved: (count: number) => void;
  drain: (count: number) => void;
  timeUp: () => void;
  reset: () => void;
}

const isPrefix = (shorter: Stamped[], longer: Stamped[]) =>
  shorter.length <= longer.length &&
  shorter.every((entry, index) => JSON.stringify(entry) === JSON.stringify(longer[index]));

export const useHiringStore = create<HiringStore>()(
  persist(
    (set, get) => ({
      attempt: null,
      actions: [],
      state: null,
      queue: [],
      saved: 0,

      begin: (attempt, serverActions) => {
        const held = get();
        // This device may be ahead of the server if the last save did not land.
        const ahead = held.attempt?.id === attempt.id && isPrefix(serverActions, held.actions);
        const actions = ahead ? held.actions : serverActions;
        set({
          attempt,
          actions,
          state: replay(attempt.form, actions),
          queue: ahead ? held.queue : [],
          saved: serverActions.length,
        });
      },

      dispatch: (action) => {
        const { attempt, actions, state, queue } = get();
        if (!attempt || !state || state.scene === "done") return;
        const stamped: Stamped = { a: action, at: Math.max(0, Date.now() + attempt.skew - attempt.startedAt) };
        const next = reduce(state, stamped);
        if (next === state) return;
        const entry = next.log[next.log.length - 1]!;
        set({
          state: next,
          actions: [...actions, stamped],
          queue: [
            ...queue,
            {
              eventType: entry.eventType,
              realMs: entry.realMs,
              simTime: entry.simTime,
              entityId: entry.entityId,
              payload: {
                seq: entry.seq,
                scene: entry.scene,
                assessmentVersion: ASSESSMENT_VERSION,
                scenarioVariant: attempt.form,
                deviceType: deviceType(),
                candidateAction: entry.action,
                stateBefore: entry.before,
                stateAfter: entry.after,
                simAfter: entry.simAfter,
                behaviourTags: entry.tags,
              },
            },
          ].slice(-400),
        });
      },

      note: (eventType, payload = {}) => {
        const { attempt, state, queue } = get();
        if (!attempt) return;
        set({
          queue: [
            ...queue,
            {
              eventType,
              realMs: Math.max(0, Date.now() + attempt.skew - attempt.startedAt),
              simTime: state?.clock ?? 0,
              payload: { scene: state?.scene, scenarioVariant: attempt.form, deviceType: deviceType(), ...payload },
            },
          ].slice(-400),
        });
      },

      markSaved: (count) => set((held) => ({ saved: Math.max(held.saved, count) })),
      drain: (count) => set((held) => ({ queue: held.queue.slice(count) })),

      timeUp: () => {
        const { state } = get();
        if (state && state.scene !== "done") set({ state: expire(state) });
      },

      reset: () => set({ attempt: null, actions: [], state: null, queue: [], saved: 0 }),
    }),
    {
      name: "of.hiring",
      version: 1,
      partialize: ({ attempt, actions, queue, saved }) => ({ attempt, actions, queue, saved }),
      onRehydrateStorage: () => (held) => {
        if (held?.attempt) held.state = replay(held.attempt.form, held.actions);
      },
    },
  ),
);
