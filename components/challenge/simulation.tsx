"use client";

import * as React from "react";

import { ControlRoom, type OpenTask } from "@/components/challenge/control-room";
import { DayOneBrief } from "@/components/challenge/day-one-brief";
import { Scorecard } from "@/components/challenge/scorecard";
import { PEAK_METRICS, type RecoveryAction } from "@/lib/challenge/day-one";
import {
  advance,
  applyMetrics,
  commitChoice,
  commitDecision,
  createState,
  readPacking,
  readRecovery,
  readStaffing,
} from "@/lib/challenge/engine";
import { dealChoices, shuffle } from "@/lib/challenge/deal";
import { buildResult } from "@/lib/challenge/feedback";
import { ROUTINE_TASKS } from "@/lib/challenge/routine";
import {
  MAX_PENDING,
  MIN_PENDING,
  SCHEDULE,
  SHIFT_SECONDS,
  driftFor,
  routineGap,
  storeClock,
  timeScale,
} from "@/lib/challenge/schedule";
import { saveChallengeRun } from "@/lib/challenge/save-run";
import { logDecision, logEvent, saveCompletion } from "@/lib/challenge/telemetry";
import type {
  ChallengeResult,
  Metrics,
  SceneChoice,
  SimulationState,
  StaffingPlan,
} from "@/lib/challenge/types";

type Flash = { headline: string; body: string; tone: "healthy" | "warning" | "critical" };

/**
 * Day 1, as a live shift.
 *
 * One clock runs from 15:00 to zero. Tasks arrive on it, the board drifts
 * between decisions, and the operator chooses what to open. The engine,
 * scoring and feedback underneath are the same ones the scene version used —
 * only the delivery changed.
 */
export function DayOneSimulation({ operatorName }: { operatorName: string }) {
  // The brief sits outside the shift so the fifteen minutes start when the
  // operator says so, not when the page happens to finish loading.
  const [started, setStarted] = React.useState(false);
  if (!started) return <DayOneBrief onStart={() => setStarted(true)} />;
  return <Shift operatorName={operatorName} />;
}

function Shift({ operatorName }: { operatorName: string }) {
  const [state, setState] = React.useState<SimulationState>(() => createState());
  const [plan, setPlan] = React.useState<StaffingPlan>(() => createState().staffing);
  const [elapsed, setElapsed] = React.useState(0);
  const [released, setReleased] = React.useState<OpenTask[]>([]);
  const [resolved, setResolved] = React.useState<string[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [previous, setPrevious] = React.useState<Metrics | null>(null);
  const [flash, setFlash] = React.useState<Flash | null>(null);
  const [result, setResult] = React.useState<ChallengeResult | null>(null);
  /**
   * The routine pool, shuffled once for this shift.
   *
   * It used to be taken in array order, which made the filler identical on
   * every run: the same delivery, the same break request, in the same places.
   * Replay the day and you are not being measured any more, you are
   * remembering. Shuffled per shift, and the index only moves forward, so
   * nothing repeats until the pool is genuinely spent.
   */
  const routinePool = React.useRef<typeof ROUTINE_TASKS>(shuffle(ROUTINE_TASKS));
  const routineAt = React.useRef(0);
  const lastArrival = React.useRef(0);

  const finished = result !== null;
  const remaining = Math.max(0, SHIFT_SECONDS - elapsed);

  React.useEffect(() => {
    logEvent("simulation_started", { operator: operatorName });
  }, [operatorName]);

  /* ── The clock ── */
  React.useEffect(() => {
    if (finished) return;
    const timer = window.setInterval(
      () => setElapsed((value) => value + 1),
      1000 / timeScale(),
    );
    return () => window.clearInterval(timer);
  }, [finished]);

  /* ── Task release and ambient drift ── */
  const openCount = released.length;
  React.useEffect(() => {
    if (finished) return;

    // Dedupe inside the updater. Reading `released` from the closure and
    // filtering out there races with setState: this effect can run twice in
    // the same second, and the second run still sees the old array.
    setReleased((prev) => {
      const due = SCHEDULE.filter(
        (task) =>
          task.releaseAt <= elapsed &&
          !resolved.includes(task.id) &&
          !prev.some((open) => open.id === task.id),
      );
      if (due.length === 0) return prev;
      lastArrival.current = elapsed;
      return [
        ...prev,
        ...due.map((task) => ({
          ...task,
          choices: task.choices ? dealChoices(task.choices) : undefined,
          landedAt: elapsed,
        })),
      ];
    });

    // Fill the gap. The scored spine above arrives on its own timetable; this
    // keeps the board from emptying between beats, which is what made the
    // first version feel like a quiz with pauses rather than a shift.
    setReleased((prev) => {
      if (prev.length >= MIN_PENDING || prev.length >= MAX_PENDING) return prev;
      if (elapsed - lastArrival.current < routineGap(prev.length)) return prev;
      // Nothing new in the last ninety seconds of the shift: let the recovery
      // plan be the last thing on the board.
      if (elapsed > SHIFT_SECONDS - 90) return prev;

      // Walk the shuffled pool. A store does not stop having deliveries and
      // break requests, so when it is genuinely spent it is reshuffled rather
      // than allowed to empty — but the reshuffle keeps whatever is still on
      // the board out of the next deal, so nothing arrives twice at once.
      if (routineAt.current >= routinePool.current.length) {
        const open = new Set(prev.map((task) => task.id));
        routinePool.current = shuffle(
          ROUTINE_TASKS.filter((task) => !open.has(task.id)),
        );
        routineAt.current = 0;
      }

      const next = routinePool.current[routineAt.current];
      if (!next) return prev;
      routineAt.current += 1;
      if (prev.some((open) => open.id === next.id)) return prev;

      lastArrival.current = elapsed;
      return [
        ...prev,
        {
          ...next,
          kind: "choice" as const,
          // Dealt here rather than read from the catalogue, so the right
          // answer is not always the first button.
          choices: dealChoices(next.choices),
          releaseAt: elapsed,
          landedAt: elapsed,
        },
      ];
    });

    // The store keeps moving between decisions, so the board is never a
    // frozen screenshot waiting for input.
    const drift = driftFor(elapsed, openCount);
    if (Object.values(drift).some((value) => value !== 0)) {
      setState((s) => ({ ...s, metrics: applyMetrics(s.metrics, drift) }));
    }
  }, [elapsed, finished, resolved, openCount]);

  /* ── Expiry ── */
  React.useEffect(() => {
    if (finished) return;
    const expired = released.filter(
      (task) => task.ttl !== null && task.landedAt + task.ttl <= elapsed,
    );
    if (expired.length === 0) return;

    setReleased((prev) => prev.filter((task) => !expired.some((e) => e.id === task.id)));
    setResolved((prev) => [...prev, ...expired.map((task) => task.id)]);
    setActiveId((current) =>
      expired.some((task) => task.id === current) ? null : current,
    );

    for (const task of expired) {
      // Routine work timing out during a peak is triage, not failure — a
      // first-timer who reads slowly would otherwise accumulate a dozen
      // penalties for behaving exactly as the shift intends. It still costs
      // the store; it just does not read as a verdict on their judgement.
      const routine = task.id.startsWith("r-");
      logEvent("recovery_action_selected", { expired: task.id, routine });
      setState((s) =>
        commitDecision(s, {
          scene: "flow",
          decisionId: task.id,
          chosenAction: "expired",
          simulatedTime: storeClock(elapsed),
          signals: routine ? {} : { priority: -2 },
          tags: routine ? [] : ["reacted_late"],
          metricEffect: routine
            ? { ordersWaiting: 1 }
            : { ctd: 8, ordersWaiting: 3 },
        }),
      );
    }
    const worst = expired.find((task) => !task.id.startsWith("r-")) ?? expired[0]!;
    setFlash({
      tone: worst.id.startsWith("r-") ? "warning" : "critical",
      headline: "Nobody got to it",
      body: `${worst.title} timed out. The store absorbed it, and the board shows where.`,
    });
  }, [elapsed, released, finished]);

  /* ── End of shift ── */
  const finish = React.useCallback(() => {
    setState((current) => {
      const completed: SimulationState = {
        ...current,
        completedAt: Date.now(),
        scene: "complete",
      };
      const built = buildResult(completed);
      setResult(built);
      logEvent("simulation_completed", { score: built.score, band: built.band });
      saveCompletion(completed, built);
      // Server action: the operator id comes from the session, never the client.
      void saveChallengeRun(
        built,
        completed.decisions.map((d) => ({ scene: d.scene, action: d.chosenAction })),
      );
      return completed;
    });
  }, []);

  React.useEffect(() => {
    if (finished) return;
    // Only the scored spine decides when the shift is done — routine work is
    // endless by design and must never hold the shift open.
    const spineDone = SCHEDULE.every((task) => resolved.includes(task.id));
    const allDone = spineDone && released.length === 0;
    if (remaining === 0 || allDone) finish();
  }, [remaining, resolved, released.length, finished, finish]);

  /* ── Resolution helpers ── */
  function close(taskId: string, next: Flash) {
    setReleased((prev) => prev.filter((task) => task.id !== taskId));
    setResolved((prev) => [...prev, taskId]);
    setActiveId(null);
    setFlash(next);
  }

  function confirmFloor() {
    const read = readStaffing(plan);
    setPrevious(state.metrics);
    setState((s) => {
      const next = commitDecision({ ...s, staffing: plan }, {
        scene: "floor",
        decisionId: "floor-allocation",
        chosenAction: `picking:${read.picking}|packing:${read.packing}|dispatch:${read.dispatch}`,
        simulatedTime: storeClock(elapsed),
        signals: read.signals,
        tags: read.tags,
        metricEffect: read.metricEffect,
      });
      const record = next.decisions[next.decisions.length - 1];
      if (record) logDecision(record, "floor_assignment_confirmed");
      return next;
    });
    close("floor-allocation", {
      tone: "healthy",
      headline: "Floor deployed",
      body: `${read.picking} picking · ${read.packing} packing · ${read.dispatch} dispatch — ${read.summary}.`,
    });
  }

  function choose(task: OpenTask, choice: SceneChoice) {
    setPrevious(state.metrics);
    setState((s) => {
      const next = commitChoice(
        s,
        task.id === "dispatch-action" ? "dispatch" : "flow",
        storeClock(elapsed),
        task.id,
        choice,
      );
      const record = next.decisions[next.decisions.length - 1];
      if (record) {
        logDecision(
          record,
          task.id === "dispatch-action"
            ? "dispatch_action_selected"
            : "packing_intervention_selected",
        );
      }
      return next;
    });
    close(task.id, {
      tone: choice.outcome.tone === "neutral" ? "warning" : choice.outcome.tone,
      headline: choice.outcome.headline,
      body: choice.outcome.body,
    });
  }

  function chooseNilPick(task: OpenTask, choice: SceneChoice) {
    setPrevious(state.metrics);
    setState((s) => {
      const next = commitChoice(s, "nil-pick", storeClock(elapsed), task.id, choice);
      const record = next.decisions[next.decisions.length - 1];
      if (record) logDecision(record, "nil_pick_resolution_selected");
      return next;
    });
    close(task.id, {
      tone: choice.outcome.tone === "neutral" ? "warning" : choice.outcome.tone,
      headline: choice.outcome.headline,
      body: choice.outcome.body,
    });
  }

  function submitPacking(
    bags: Record<string, "bag-1" | "bag-2">,
    protection: Record<string, string>,
  ) {
    const read = readPacking(bags, protection);
    setPrevious(state.metrics);
    setState((s) => {
      const next = commitDecision(s, {
        scene: "packing",
        decisionId: "packing-configuration",
        chosenAction: JSON.stringify({ bags, protection }),
        simulatedTime: storeClock(elapsed),
        signals: read.signals,
        tags: read.tags,
        metricEffect: read.metricEffect,
        sop: read.violation ?? undefined,
      });
      const record = next.decisions[next.decisions.length - 1];
      if (record) logDecision(record, "packing_configuration_submitted");
      return next;
    });
    close("packing-configuration", {
      tone: read.tone,
      headline: read.headline,
      body: read.body,
    });
  }

  function executeRecovery(actions: RecoveryAction[]) {
    const read = readRecovery(actions, PEAK_METRICS);
    logEvent("recovery_plan_executed", {
      plan: actions.map((action) => action.id),
      recovered: read.recovered,
    });

    setPrevious(PEAK_METRICS);
    setState((s) => {
      let next: SimulationState = { ...s, metrics: PEAK_METRICS };
      next = commitDecision(next, {
        scene: "recovery",
        decisionId: "recovery-plan",
        chosenAction: actions.map((a) => a.id).join(">"),
        simulatedTime: storeClock(elapsed),
        signals: read.signals,
        tags: read.tags,
        metricEffect: {},
      });
      for (const violation of read.violations) {
        next = {
          ...next,
          sopViolations: [...next.sopViolations, { ...violation, scene: "recovery" }],
        };
      }
      return advance({ ...next, metrics: read.finalMetrics }, "recovery", storeClock(elapsed));
    });

    close("recovery-plan", {
      tone: read.recovered ? "healthy" : "warning",
      headline: read.recovered ? "Store recovered" : "Peak still under pressure",
      body: read.recovered
        ? `Click-to-dispatch back under target at ${read.finalMetrics.ctd} seconds.`
        : `Click-to-dispatch is ${read.finalMetrics.ctd} seconds. The shift still completes.`,
    });
  }

  if (result) {
    return (
      <div className="min-h-dvh bg-obsidian">
        <main className="mx-auto max-w-3xl px-4 py-10">
          <Scorecard result={result} />
        </main>
      </div>
    );
  }

  return (
    <ControlRoom
      remaining={remaining}
      elapsed={elapsed}
      metrics={state.metrics}
      previous={previous}
      tasks={released}
      resolvedCount={resolved.length}
      activeId={activeId}
      onOpen={setActiveId}
      plan={plan}
      onPlan={setPlan}
      onStaffing={confirmFloor}
      onChoice={(task, choice) =>
        task.kind === "nil-pick" ? chooseNilPick(task, choice) : choose(task, choice)
      }
      inspected={state.inspected}
      onInspect={(id) => {
        logEvent("nil_pick_location_checked", { location: id });
        setState((s) =>
          s.inspected.includes(id) ? s : { ...s, inspected: [...s.inspected, id] },
        );
      }}
      onPacking={submitPacking}
      onRecovery={executeRecovery}
      flash={flash}
    />
  );
}
