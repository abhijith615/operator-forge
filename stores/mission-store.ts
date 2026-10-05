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
import { SPOKEN_TO } from "@/lib/mission/tasks/types";
import {
  SCHEDULED_CALLS,
  recallNegotiation,
  type MissionCall,
  type MissionCallOption,
} from "@/lib/mission/calls";
import type {
  MissionNotification,
  RunStatus,
  TimelineEntry,
} from "@/types/mission-run";
import { recordTelemetry, useTelemetryStore } from "@/stores/telemetry-store";
import { useShellStore } from "@/stores/shell-store";
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

  /* ── The phone ──────────────────────────────────────────────────────── */
  /**
   * A call the operator has not finished with: the two scheduled ones, or an
   * outbound negotiation they started by deciding to chase an absentee. Held
   * here rather than in the control room because a refresh mid-call should not
   * hand anyone a free escape from it.
   */
  call: PendingCall | null;
  /** Call ids already rung, so the clock never rings the same one twice. */
  callsDone: string[];

  begin: (operatorId: string) => void;
  /** Starts the shift clock. Called once the walkthrough is done. */
  startClock: () => void;
  tick: () => void;
  dispatch: (action: OperatorAction) => void;
  resolveTask: (taskId: string, optionId: string) => void;
  answerCall: () => void;
  /** Every answer given, in order — or `null` when the call went unanswered. */
  endCall: (answers: MissionCallOption[] | null) => void;
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
    call: null as PendingCall | null,
    callsDone: [] as string[],
  };
}

/** A call on screen, and where in it the operator is. */
export interface PendingCall {
  call: MissionCall;
  /** Shift second the phone started ringing, for the countdown. */
  ringFrom: number;
  answered: boolean;
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

        // So is the walkthrough. It used to be remembered per browser, which
        // meant the second run of the trial opened straight onto a moving
        // floor with no orientation — and since the clock now waits for the
        // walkthrough, "already seen" was the one state where it waited for
        // something that was never going to appear.
        useShellStore.getState().setWalkthroughSeen(false);

        set({
          ...initialSlice(),
          runId,
          status: "live",
          /**
           * Null until the walkthrough is done — `startClock` sets it.
           *
           * Gating the world tick was not enough on its own: the readouts
           * derive elapsed time from `startedAt` against the wall clock, so
           * the shift clock counted down behind the orientation cards and the
           * world would then have jumped forward to catch up the moment they
           * were dismissed. The shift has not started until the operator has
           * been told what they are looking at.
           */
          startedAt: null,
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

      startClock: () => {
        const state = get();
        if (state.status !== "live" || state.startedAt !== null) return;
        set({ startedAt: Date.now() });
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

        // The phone. One call at a time, and never while another is open — a
        // second ring over a live call is a bug, not pressure. A call whose
        // moment passed while the operator was on the other one is dropped
        // rather than queued: a phone that rings late rings for nothing.
        let call = state.call;
        const callsDone = [...state.callsDone];
        if (!call) {
          const due = SCHEDULED_CALLS.find(
            (entry) =>
              entry.at !== undefined &&
              world.elapsed >= entry.at &&
              !callsDone.includes(entry.id),
          );
          if (due) {
            callsDone.push(due.id);
            // Ring from now, not from `at`, so a tab that was backgrounded
            // does not hand back a call that has already timed out.
            if (world.elapsed - (due.at ?? 0) < 60) {
              call = { call: due, ringFrom: world.elapsed, answered: false };
            }
          }
        }

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
          call,
          callsDone,
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

        // Deciding to chase an absentee is not the end of the task, it is the
        // start of the call. Anyone who has done this knows the first ask is
        // never the one that works, so the click opens a conversation instead
        // of closing the card.
        const chasing =
          task.templateId === "ppl-recall" &&
          optionId !== "leave-it" &&
          !state.call &&
          state.world.workers.find((worker) => worker.id === task.subjectId);

        set({
          world,
          tasks,
          decisions,
          templateLastUsed,
          achievements: [...state.achievements, ...earned],
          timeline: [entry, ...state.timeline].slice(0, TIMELINE_CAP),
          ...(chasing
            ? {
                call: {
                  call: recallNegotiation(chasing.name, chasing.id),
                  ringFrom: elapsed,
                  answered: true,
                },
              }
            : {}),
        });
      },

      answerCall: () =>
        set((state) =>
          state.call ? { call: { ...state.call, answered: true } } : {},
        ),

      endCall: (answers) => {
        const state = get();
        const pending = state.call;
        if (!pending || !state.world) {
          set({ call: null });
          return;
        }

        const { call } = pending;
        const elapsed = state.world.elapsed;
        const ignored = answers === null;

        // A call is scored through the ordinary ledger, so it weighs exactly
        // what the task it interrupted would have. Ignoring one is a decision
        // too — recorded, not silently skipped.
        const made: TaskDecision[] = ignored
          ? [
              {
                taskId: `call-${call.id}`,
                templateId: call.id,
                stream: call.stream,
                priority: "critical",
                at: elapsed,
                latency: call.ringFor,
                optionId: "ignored",
                optionLabel: "Let it ring",
                quality: call.ignored.quality,
                capabilities: call.ignored.capabilities,
                expired: false,
                queueDepth: state.tasks.filter((entry) => entry.status === "pending").length,
              },
            ]
          : answers.map((answer, index) => ({
              taskId: `call-${call.id}-${answer.id}`,
              templateId: `${call.id}:${call.beats[index]?.id ?? index}`,
              stream: call.stream,
              priority: "critical" as const,
              at: elapsed,
              latency: 0,
              optionId: answer.id,
              optionLabel: answer.label,
              quality: answer.quality,
              capabilities: answer.capabilities,
              expired: false,
              queueDepth: state.tasks.filter((entry) => entry.status === "pending").length,
            }));

        const decisions = [...state.decisions, ...made];

        recordTelemetry("decide", call.id, elapsed, {
          meta: { call: call.id, ignored, answers: made.length },
        });

        /**
         * An outbound recall only brings somebody back if the conversation
         * actually landed. Refusing to trade anything, or hanging up partway,
         * leaves the gap on the floor exactly where it was — which is the
         * whole reason this is a call rather than a button.
         */
        const last = ignored ? null : (answers[answers.length - 1] ?? null);
        const agreed = last?.agrees === true;
        const world = cloneWorld(state.world);
        if (call.subjectId) {
          if (agreed) {
            applyEffects(world, [
              {
                kind: "worker-status",
                workerId: call.subjectId,
                status: "active",
                note: "Called in",
              },
            ]);
          } else {
            // Mark them as spoken to either way. Whatever the answer, nothing
            // should ring this person again — the floor was phoning somebody
            // sitting outside a hospital four hours away, every seventy
            // seconds, for the rest of the shift.
            const worker = world.workers.find((entry) => entry.id === call.subjectId);
            if (worker) worker.shiftNote = `${SPOKEN_TO} not coming in today`;
          }
        }

        const recallFailed = Boolean(call.subjectId) && !agreed;

        /**
         * The same person can be on the board as a card and on the phone at
         * once — the queue deals the recall, and the operator calls them from
         * the People panel instead. Once the call is over the card is about a
         * conversation that already happened, so it comes off the board.
         */
        const tasks = call.subjectId
          ? state.tasks.map((entry) =>
              entry.status === "pending" && entry.subjectId === call.subjectId
                ? {
                    ...entry,
                    status: "resolved" as const,
                    resolvedAt: elapsed,
                    resolvedOptionId: "handled-on-the-phone",
                  }
                : entry,
            )
          : state.tasks;

        const entry: TimelineEntry = {
          id: `call-${call.id}-${elapsed}`,
          at: elapsed,
          kind: "action",
          tone: ignored || recallFailed ? "warning" : "neutral",
          title: ignored
            ? `Missed a call from ${call.caller}`
            : call.subjectId
              ? agreed
                ? `${call.caller} is coming in`
                : `${call.caller} is not coming in`
              : `Call with ${call.caller}`,
          detail: ignored ? call.ignored.note : (made[made.length - 1]?.optionLabel ?? undefined),
          source: streamToSource(call.stream),
        };

        set({
          call: null,
          world,
          tasks,
          decisions,
          achievements: [
            ...state.achievements,
            ...evaluateAchievements({
              decisions,
              tasks,
              elapsed,
              earned: state.achievements,
            }),
          ],
          timeline: [entry, ...state.timeline].slice(0, TIMELINE_CAP),
        });
      },

      dispatch: (action) => {
        const state = get();
        if (!state.world || state.status !== "live") return;

        /**
         * Calling an absentee back is a conversation, not a toggle.
         *
         * The phone button on the People panel used to flip the worker
         * straight to active, which taught an operator that getting someone to
         * give up their morning costs one click. It opens the same negotiation
         * the queue card does, and whether they actually come in depends on
         * what gets offered.
         */
        if (action.type === "recall-worker") {
          if (state.call) return;
          const worker = state.world.workers.find(
            (candidate) => candidate.id === action.workerId,
          );
          if (!worker || worker.status === "active") return;
          recordTelemetry("control", action.type, state.world.elapsed);
          set({
            call: {
              call: recallNegotiation(worker.name, worker.id),
              ringFrom: state.world.elapsed,
              answered: true,
            },
          });
          return;
        }

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
        call: state.call,
        callsDone: state.callsDone,
      }),
    },
  ),
);

/** Convenience selectors — components should never reach for the whole store. */
export const selectWorld = (state: MissionState) => state.world;
export const selectStatus = (state: MissionState) => state.status;
export const selectElapsed = (state: MissionState) => state.world?.elapsed ?? 0;
