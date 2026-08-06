"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { applyOperatorAction, type OperatorAction } from "@/lib/mission/actions";
import { MISSION_DURATION_SECONDS, missionTimeScale } from "@/lib/mission/config";
import { STEP_SECONDS, stepWorld } from "@/lib/mission/engine";
import { applyEvent, eventsDueBetween } from "@/lib/mission/events";
import { createInitialWorld } from "@/lib/mission/initial-state";
import { seedFrom } from "@/lib/mission/random";
import { FIRST_SHIFT } from "@/lib/constants/mission";
import type {
  MissionNotification,
  RunStatus,
  TimelineEntry,
} from "@/types/mission-run";
import type { WorldState } from "@/types/world";

/** Never chew through more than this many steps in one tick. */
const MAX_STEPS_PER_TICK = 240;
const TIMELINE_CAP = 400;

interface MissionState {
  runId: string | null;
  status: RunStatus;
  /** Epoch ms. The clock derives from this so a refresh cannot rewind it. */
  startedAt: number | null;
  completedAt: number | null;
  world: WorldState | null;
  timeline: TimelineEntry[];
  notifications: MissionNotification[];
  firedEvents: string[];
  /** Bumped whenever the operator opens the timeline, to clear the dot. */
  timelineReadAt: number;

  begin: (operatorId: string) => void;
  tick: () => void;
  dispatch: (action: OperatorAction) => void;
  dismissNotification: (id: string) => void;
  markTimelineRead: () => void;
  complete: () => void;
  reset: () => void;
}

function initialSlice() {
  return {
    runId: null,
    status: "briefing" as RunStatus,
    startedAt: null,
    completedAt: null,
    world: null,
    timeline: [] as TimelineEntry[],
    notifications: [] as MissionNotification[],
    firedEvents: [] as string[],
    timelineReadAt: 0,
  };
}

export const useMissionStore = create<MissionState>()(
  persist(
    (set, get) => ({
      ...initialSlice(),

      begin: (operatorId) => {
        const runId = `run-${operatorId.slice(0, 8)}-${Date.now()}`;
        const world = createInitialWorld(seedFrom(runId));

        set({
          runId,
          status: "live",
          startedAt: Date.now(),
          completedAt: null,
          world,
          firedEvents: [],
          notifications: [],
          timelineReadAt: 0,
          timeline: [
            {
              id: "t-open",
              at: 0,
              kind: "system",
              tone: "info",
              title: "Shift started",
              detail: `${FIRST_SHIFT.location}. You have the floor.`,
              source: "hub",
            },
          ],
        });
      },

      tick: () => {
        const { status, startedAt, world, firedEvents, timeline } = get();
        if (status !== "live" || !startedAt || !world) return;

        const target = Math.min(
          MISSION_DURATION_SECONDS,
          Math.floor(((Date.now() - startedAt) / 1000) * missionTimeScale()),
        );

        if (target <= world.elapsed) {
          if (target >= MISSION_DURATION_SECONDS) get().complete();
          return;
        }

        let nextWorld = world;
        const newEntries: TimelineEntry[] = [];
        const newNotifications: MissionNotification[] = [];
        const fired = [...firedEvents];
        let steps = 0;

        while (nextWorld.elapsed + STEP_SECONDS <= target && steps < MAX_STEPS_PER_TICK) {
          const before = nextWorld.elapsed;
          const result = stepWorld(nextWorld);
          nextWorld = result.world;
          newEntries.push(...result.entries);

          for (const event of eventsDueBetween(before, nextWorld.elapsed)) {
            if (fired.includes(event.id)) continue;
            const applied = applyEvent(event, nextWorld);
            fired.push(event.id);
            newEntries.push(applied.entry);
            newNotifications.push(applied.notification);
          }

          steps += 1;
        }

        if (steps === 0) return;

        set({
          world: nextWorld,
          firedEvents: fired,
          timeline: [...newEntries.reverse(), ...timeline].slice(0, TIMELINE_CAP),
          notifications: [...get().notifications, ...newNotifications].slice(-6),
        });

        if (nextWorld.elapsed >= MISSION_DURATION_SECONDS) get().complete();
      },

      dispatch: (action) => {
        const { world, timeline, status } = get();
        if (!world || status !== "live") return;

        const result = applyOperatorAction(world, action);
        if (!result.entry) return;

        set({
          world: result.world,
          timeline: [result.entry, ...timeline].slice(0, TIMELINE_CAP),
        });
      },

      dismissNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((item) => item.id !== id),
        })),

      markTimelineRead: () =>
        set((state) => ({ timelineReadAt: state.world?.elapsed ?? 0 })),

      complete: () => {
        if (get().status === "complete") return;
        set((state) => ({
          status: "complete",
          completedAt: Date.now(),
          notifications: [],
          timeline: [
            {
              id: "t-close",
              at: state.world?.elapsed ?? MISSION_DURATION_SECONDS,
              kind: "system",
              tone: "info",
              title: "Shift over",
              detail: "The next supervisor has the floor.",
              source: "hub",
            },
            ...state.timeline,
          ],
        }));
      },

      reset: () => set(initialSlice()),
    }),
    {
      name: "of.mission",
      version: 1,
      // Toasts are ephemeral; everything else must survive a refresh.
      partialize: (state) => ({
        runId: state.runId,
        status: state.status,
        startedAt: state.startedAt,
        completedAt: state.completedAt,
        world: state.world,
        timeline: state.timeline,
        firedEvents: state.firedEvents,
        timelineReadAt: state.timelineReadAt,
      }),
    },
  ),
);

/** Convenience selectors — components should never reach for the whole store. */
export const selectWorld = (state: MissionState) => state.world;
export const selectStatus = (state: MissionState) => state.status;
export const selectElapsed = (state: MissionState) => state.world?.elapsed ?? 0;
