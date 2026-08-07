"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { evaluateAchievements } from "@/lib/mission/achievements";
import { applyOperatorAction, type OperatorAction } from "@/lib/mission/actions";
import { cloneWorld } from "@/lib/mission/clone";
import { applyEffects } from "@/lib/mission/effects";
import { MISSION_DURATION_SECONDS, missionTimeScale } from "@/lib/mission/config";
import { STEP_SECONDS, stepWorld } from "@/lib/mission/engine";
import { applyEvent, eventsDueBetween } from "@/lib/mission/events";
import { createInitialWorld } from "@/lib/mission/initial-state";
import { seedFrom } from "@/lib/mission/random";
import { TEMPLATES_BY_ID } from "@/lib/mission/tasks";
import {
  advanceTasks,
  seedInitialTasks,
  streamToSource,
} from "@/lib/mission/tasks/scheduler";
import { FIRST_SHIFT } from "@/lib/constants/mission";
import type {
  MissionNotification,
  RunStatus,
  TimelineEntry,
} from "@/types/mission-run";
import { recordTelemetry, useTelemetryStore } from "@/stores/telemetry-store";
import type { Achievement, MissionTask, TaskDecision } from "@/types/tasks";
import type { WorldTrace } from "@/types/telemetry";
import type { WorldState } from "@/types/world";

/** Never chew through more than this many steps in one tick. */
const MAX_STEPS_PER_TICK = 240;
const TIMELINE_CAP = 500;

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
  timelineReadAt: number;

  /* ── The queue ──────────────────────────────────────────────────────── */
  tasks: MissionTask[];
  decisions: TaskDecision[];
  achievements: Achievement[];
  nextSpawnAt: number;
  templateLastUsed: Record<string, number>;
  /** Sampled floor state, for the debrief replay and trend lines. */
  traces: WorldTrace[];

  begin: (operatorId: string) => void;
  tick: () => void;
  dispatch: (action: OperatorAction) => void;
  resolveTask: (taskId: string, optionId: string) => void;
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
    tasks: [] as MissionTask[],
    decisions: [] as TaskDecision[],
    achievements: [] as Achievement[],
    nextSpawnAt: 0,
    templateLastUsed: {} as Record<string, number>,
    traces: [] as WorldTrace[],
  };
}

/** One sample every half minute is enough to draw the shift afterwards. */
const TRACE_INTERVAL = 30;

function traceOf(world: WorldState, pendingTasks: number): WorldTrace {
  return {
    at: world.elapsed,
    rating: Number(world.rating.toFixed(3)),
    otif: Number(world.metrics.otif.toFixed(3)),
    openOrders: world.orders.filter((order) =>
      ["queued", "picking", "packed", "dispatched"].includes(order.status),
    ).length,
    pendingTasks,
    activeWorkers: world.workers.filter((worker) => worker.status === "active").length,
    breached: world.metrics.ordersBreached,
  };
}

export const useMissionStore = create<MissionState>()(
  persist(
    (set, get) => ({
      ...initialSlice(),

      begin: (operatorId) => {
        const runId = `run-${operatorId.slice(0, 8)}-${Date.now()}`;
        const seed = seedFrom(runId);
        const world = createInitialWorld(seed);
        const seeded = seedInitialTasks(world, seed);

        // Telemetry is scoped to the run, so it starts clean alongside it.
        useTelemetryStore.getState().start(runId);

        set({
          ...initialSlice(),
          runId,
          status: "live",
          startedAt: Date.now(),
          world,
          tasks: seeded.tasks,
          templateLastUsed: seeded.templateLastUsed,
          nextSpawnAt: 12,
          traces: [traceOf(world, seeded.tasks.length)],
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
        const state = get();
        if (state.status !== "live" || !state.startedAt || !state.world) return;

        const target = Math.min(
          MISSION_DURATION_SECONDS,
          Math.floor(((Date.now() - state.startedAt) / 1000) * missionTimeScale()),
        );

        if (target <= state.world.elapsed) {
          if (target >= MISSION_DURATION_SECONDS) get().complete();
          return;
        }

        let world = state.world;
        const newEntries: TimelineEntry[] = [];
        const newNotifications: MissionNotification[] = [];
        const fired = [...state.firedEvents];
        let steps = 0;

        while (world.elapsed + STEP_SECONDS <= target && steps < MAX_STEPS_PER_TICK) {
          const before = world.elapsed;
          const result = stepWorld(world);
          world = result.world;
          newEntries.push(...result.entries);

          for (const event of eventsDueBetween(before, world.elapsed)) {
            if (fired.includes(event.id)) continue;
            const applied = applyEvent(event, world);
            fired.push(event.id);
            newEntries.push(applied.entry);
            newNotifications.push(applied.notification);
          }

          steps += 1;
        }

        if (steps === 0) return;

        // The queue is advanced once per tick against the settled world.
        const queued = advanceTasks({
          world,
          tasks: state.tasks,
          elapsed: world.elapsed,
          seed: world.seed,
          nextSpawnAt: state.nextSpawnAt,
          templateLastUsed: state.templateLastUsed,
        });

        newEntries.push(...queued.entries);
        const decisions = [...state.decisions, ...queued.decisions];

        const earned = evaluateAchievements({
          decisions,
          tasks: queued.tasks,
          elapsed: world.elapsed,
          earned: state.achievements,
        });

        const lastTrace = state.traces[state.traces.length - 1];
        const traces =
          !lastTrace || world.elapsed - lastTrace.at >= TRACE_INTERVAL
            ? [
                ...state.traces,
                traceOf(
                  world,
                  queued.tasks.filter((task) => task.status === "pending").length,
                ),
              ]
            : state.traces;

        set({
          world,
          firedEvents: fired,
          tasks: queued.tasks,
          decisions,
          traces,
          nextSpawnAt: queued.nextSpawnAt,
          templateLastUsed: queued.templateLastUsed,
          achievements: [...state.achievements, ...earned],
          timeline: [...newEntries.reverse(), ...state.timeline].slice(0, TIMELINE_CAP),
          notifications: [...get().notifications, ...newNotifications].slice(-6),
        });

        if (world.elapsed >= MISSION_DURATION_SECONDS) get().complete();
      },

      resolveTask: (taskId, optionId) => {
        const state = get();
        if (state.status !== "live" || !state.world) return;

        const task = state.tasks.find((entry) => entry.id === taskId);
        if (!task || task.status !== "pending") return;

        const option = task.options.find((entry) => entry.id === optionId);
        if (!option) return;

        const elapsed = state.world.elapsed;
        const world = cloneWorld(state.world);
        if (option.effects) applyEffects(world, option.effects);

        const queueDepth = state.tasks.filter((entry) => entry.status === "pending").length;

        const tasks = state.tasks.map((entry) =>
          entry.id === taskId
            ? {
                ...entry,
                status: "resolved" as const,
                resolvedAt: elapsed,
                resolvedOptionId: optionId,
              }
            : entry,
        );

        // Choosing an option can pull its own consequences onto the board. The
        // scheduler builds them on the next tick with fresh context, so all we
        // do here is clear their cooldown.
        const templateLastUsed = { ...state.templateLastUsed };
        for (const templateId of option.cascades ?? []) {
          if (TEMPLATES_BY_ID.has(templateId)) templateLastUsed[templateId] = -10_000;
        }

        const decision: TaskDecision = {
          taskId,
          templateId: task.templateId,
          stream: task.stream,
          priority: task.priority,
          at: elapsed,
          latency: elapsed - task.createdAt,
          optionId,
          optionLabel: option.label,
          quality: option.quality,
          capabilities: option.capabilities,
          expired: false,
          queueDepth,
        };

        const decisions = [...state.decisions, decision];

        recordTelemetry("decide", task.templateId, elapsed, {
          value: decision.latency,
          meta: {
            option: optionId,
            stream: task.stream,
            priority: task.priority,
            queueDepth,
          },
        });

        const entry: TimelineEntry = {
          id: `d-${taskId}`,
          at: elapsed,
          kind: "action",
          tone: "neutral",
          title: option.label,
          detail: option.outcome,
          source: streamToSource(task.stream),
        };

        const earned = evaluateAchievements({
          decisions,
          tasks,
          elapsed,
          earned: state.achievements,
        });

        set({
          world,
          tasks,
          decisions,
          templateLastUsed,
          achievements: [...state.achievements, ...earned],
          timeline: [entry, ...state.timeline].slice(0, TIMELINE_CAP),
        });
      },

      dispatch: (action) => {
        const state = get();
        if (!state.world || state.status !== "live") return;

        const result = applyOperatorAction(state.world, action);
        if (!result.entry) return;

        recordTelemetry("control", action.type, state.world.elapsed);

        set({
          world: result.world,
          timeline: [result.entry, ...state.timeline].slice(0, TIMELINE_CAP),
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
              detail: "The next manager has the floor.",
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
      version: 2,
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
        tasks: state.tasks,
        decisions: state.decisions,
        achievements: state.achievements,
        nextSpawnAt: state.nextSpawnAt,
        templateLastUsed: state.templateLastUsed,
        traces: state.traces,
      }),
    },
  ),
);

/** Convenience selectors — components should never reach for the whole store. */
export const selectWorld = (state: MissionState) => state.world;
export const selectStatus = (state: MissionState) => state.status;
export const selectElapsed = (state: MissionState) => state.world?.elapsed ?? 0;
