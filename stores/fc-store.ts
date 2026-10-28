"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { FcTelemetry } from "@/lib/fc/actions";
import { expire, reduce, replay } from "@/lib/fc/engine";
import type { Action, FcState, Stamped } from "@/lib/fc/types";
import { FC_VERSION } from "@/lib/fc/weights";
import { deviceType } from "@/lib/hiring/view";

/**
 * The FC Executive attempt as this browser holds it. Only the actions are
 * kept; the state is rebuilt from them, so a reload lands exactly where the
 * candidate was.
 */

export interface FcAttempt {
  id: string;
  startedAt: number;
  skew: number;
  limit: number;
  /** A practice run on this device only: never saved. */
  local?: boolean;
}

interface FcStore {
  attempt: FcAttempt | null;
  actions: Stamped[];
  state: FcState | null;
  queue: FcTelemetry[];
  saved: number;
  begin: (attempt: FcAttempt, serverActions: Stamped[]) => void;
  dispatch: (action: Action) => boolean;
  note: (eventType: string, payload?: Record<string, unknown>) => void;
  markSaved: (count: number) => void;
  drain: (count: number) => void;
  timeUp: () => void;
  reset: () => void;
}

const isPrefix = (shorter: Stamped[], longer: Stamped[]) =>
  shorter.length <= longer.length && shorter.every((entry, index) => JSON.stringify(entry) === JSON.stringify(longer[index]));

export const useFcStore = create<FcStore>()(
  persist(
    (set, get) => ({
      attempt: null,
      actions: [],
      state: null,
      queue: [],
      saved: 0,

      begin: (attempt, serverActions) => {
        const held = get();
        const ahead = held.attempt?.id === attempt.id && isPrefix(serverActions, held.actions);
        const actions = ahead ? held.actions : serverActions;
        set({ attempt, actions, state: replay(actions), queue: ahead ? held.queue : [], saved: serverActions.length });
      },

      dispatch: (action) => {
        const { attempt, actions, state, queue } = get();
        if (!attempt || !state || state.scene === "done") return false;
        const stamped: Stamped = { a: action, at: Math.max(0, Date.now() + attempt.skew - attempt.startedAt) };
        const next = reduce(state, stamped);
        if (next === state) return false;
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
              payload: { seq: entry.seq, scene: entry.scene, assessmentVersion: FC_VERSION, deviceType: deviceType(), candidateAction: entry.action },
            },
          ].slice(-400),
        });
        return true;
      },

      note: (eventType, payload = {}) => {
        const { attempt, state, queue } = get();
        if (!attempt) return;
        set({
          queue: [
            ...queue,
            { eventType, realMs: Math.max(0, Date.now() + attempt.skew - attempt.startedAt), simTime: state?.clock ?? 0, payload: { scene: state?.scene, deviceType: deviceType(), ...payload } },
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
      name: "of.fc.v1",
      version: 1,
      partialize: ({ attempt, actions, queue, saved }) => ({ attempt, actions, queue, saved }),
      onRehydrateStorage: () => (held) => {
        if (held?.attempt) held.state = replay(held.actions);
      },
    },
  ),
);
