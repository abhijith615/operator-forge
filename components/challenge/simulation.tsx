"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import {
  ConsequenceStep,
  DispatchScene,
  FloorScene,
  FlowScene,
  NilPickScene,
  PackingScene,
  RecoveryPlayback,
  RecoveryScene,
} from "@/components/challenge/scenes";
import { Scorecard } from "@/components/challenge/scorecard";
import { ShiftHeader, type Status } from "@/components/challenge/ui";
import { Button } from "@/components/ui/button";
import {
  DAY_ONE,
  INSPECT_TARGETS,
  PEAK_BUILD,
  PEAK_METRICS,
  type RecoveryAction,
} from "@/lib/challenge/day-one";
import {
  advance,
  commitChoice,
  commitDecision,
  readPacking,
  readRecovery,
  readStaffing,
} from "@/lib/challenge/engine";
import { buildResult } from "@/lib/challenge/feedback";
import { logDecision, logEvent, saveCompletion } from "@/lib/challenge/telemetry";
import { createState } from "@/lib/challenge/engine";
import type {
  ChallengeResult,
  Metrics,
  SceneChoice,
  SimulationState,
  StaffingPlan,
} from "@/lib/challenge/types";
import { easing } from "@/lib/motion";

/** Scene → the clock the store shows, and the label under it. */
const CLOCK: Record<string, { time: string; label: string }> = {
  opening: { time: "07:12 AM", label: "Breakfast peak" },
  floor: { time: "07:12 AM", label: "Operations control board" },
  flow: { time: "07:18 AM", label: "Live fulfillment flow" },
  "nil-pick": { time: "07:22 AM", label: "Picking aisle" },
  packing: { time: "07:25 AM", label: "Packing station" },
  dispatch: { time: "07:28 AM", label: "Dispatch bay" },
  recovery: { time: "07:31 AM", label: "Peak recovery" },
  complete: { time: "07:34 AM", label: "Shift complete" },
};

function mergeEffects(
  ...effects: Partial<Record<keyof Metrics, number>>[]
): Partial<Record<keyof Metrics, number>> {
  const merged: Partial<Record<keyof Metrics, number>> = {};
  for (const effect of effects) {
    for (const [key, value] of Object.entries(effect) as [keyof Metrics, number][]) {
      merged[key] = (merged[key] ?? 0) + value;
    }
  }
  return merged;
}

/** A pending consequence panel between a decision and the next scene. */
interface Pending {
  status: Status;
  headline: string;
  body: string;
  cta: string;
  next: keyof typeof CLOCK;
}

export function DayOneSimulation() {
  const reduced = useReducedMotion();
  const [state, setState] = React.useState<SimulationState>(() => createState());
  const [plan, setPlan] = React.useState<StaffingPlan>(() => createState().staffing);
  const [previous, setPrevious] = React.useState<Metrics | null>(null);
  const [pending, setPending] = React.useState<Pending | null>(null);
  const [playback, setPlayback] = React.useState<
    { label: string; metricsAfter: Metrics }[] | null
  >(null);
  const [result, setResult] = React.useState<ChallengeResult | null>(null);

  const scene = state.scene;
  const clock = CLOCK[scene] ?? CLOCK.opening!;

  /* ── Opening ── */
  function start() {
    logEvent("simulation_started");
    setState((s) => advance(s, "floor", CLOCK.floor!.time));
  }

  /* ── Scene 1 ── */
  function confirmFloor() {
    const read = readStaffing(plan);
    setPrevious(state.metrics);

    setState((s) => {
      const next = commitDecision({ ...s, staffing: plan }, {
        scene: "floor",
        decisionId: "floor-allocation",
        chosenAction: `picking:${read.picking}|packing:${read.packing}|dispatch:${read.dispatch}`,
        simulatedTime: CLOCK.floor!.time,
        signals: read.signals,
        tags: read.tags,
        // The peak arrives regardless. What the allocation changes is how much
        // of it lands on the board.
        metricEffect: mergeEffects(PEAK_BUILD, read.metricEffect),
      });
      const record = next.decisions[next.decisions.length - 1];
      if (record) logDecision(record, "floor_assignment_confirmed");
      return next;
    });

    setPending({
      status: "healthy",
      headline: "Floor deployed",
      body: `Breakfast peak started — ${read.summary}. ${read.picking} on picking, ${read.packing} on packing, ${read.dispatch} on dispatch. Volume is climbing either way; your floor decides how much of it shows.`,
      cta: "Watch the floor",
      next: "flow",
    });
  }

  /* ── Generic choice scenes ── */
  function choose(
    sceneId: "flow" | "nil-pick" | "dispatch",
    decisionId: string,
    choice: SceneChoice,
    eventName: Parameters<typeof logEvent>[0],
    next: keyof typeof CLOCK,
    cta: string,
  ) {
    setPrevious(state.metrics);
    setState((s) => {
      const updated = commitChoice(s, sceneId, CLOCK[sceneId]!.time, decisionId, choice);
      const record = updated.decisions[updated.decisions.length - 1];
      if (record) logDecision(record, eventName);
      return updated;
    });
    setPending({
      status: choice.outcome.tone,
      headline: choice.outcome.headline,
      body: choice.outcome.body,
      cta,
      next,
    });
  }

  /* ── Scene 3 inspection ── */
  function inspect(id: string) {
    const target = INSPECT_TARGETS.find((entry) => entry.id === id);
    logEvent("nil_pick_location_checked", { location: id, units: target?.units ?? 0 });
    setState((s) =>
      s.inspected.includes(id) ? s : { ...s, inspected: [...s.inspected, id] },
    );
  }

  /* ── Scene 4 ── */
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
        simulatedTime: CLOCK.packing!.time,
        signals: read.signals,
        tags: read.tags,
        metricEffect: read.metricEffect,
        sop: read.violation ?? undefined,
      });
      const record = next.decisions[next.decisions.length - 1];
      if (record) logDecision(record, "packing_configuration_submitted");
      return next;
    });

    setPending({
      status: read.tone,
      headline: read.headline,
      body: read.body,
      cta: "Go to dispatch",
      next: "dispatch",
    });
  }

  /* ── Scene 6 ── */
  function executeRecovery(actions: RecoveryAction[]) {
    // The peak overrides whatever the board was showing — this is the state
    // the Cluster Manager is reacting to.
    const read = readRecovery(actions, PEAK_METRICS);

    logEvent("recovery_plan_executed", {
      plan: actions.map((action) => action.id),
      recovered: read.recovered,
    });

    setState((s) => {
      let next: SimulationState = { ...s, metrics: PEAK_METRICS };
      next = commitDecision(next, {
        scene: "recovery",
        decisionId: "recovery-plan",
        chosenAction: actions.map((a) => a.id).join(">"),
        simulatedTime: CLOCK.recovery!.time,
        signals: read.signals,
        tags: read.tags,
        metricEffect: {},
      });
      // Violations from the plan are attached individually so each one is named.
      for (const violation of read.violations) {
        next = {
          ...next,
          sopViolations: [...next.sopViolations, { ...violation, scene: "recovery" }],
        };
      }
      return { ...next, metrics: read.finalMetrics };
    });

    setPrevious(PEAK_METRICS);
    setPlayback(read.steps.map((step) => ({ label: step.label, metricsAfter: step.metricsAfter })));
  }

  function finish() {
    setPlayback(null);
    setState((s) => {
      const completed: SimulationState = { ...s, completedAt: Date.now(), scene: "complete" };
      const built = buildResult(completed);
      setResult(built);
      logEvent("simulation_completed", { score: built.score, band: built.band });
      saveCompletion(completed, built);
      return completed;
    });
  }

  React.useEffect(() => {
    if (result) logEvent("scorecard_viewed", { score: result.score });
  }, [result]);

  /* ── Render ── */

  if (scene === "opening") {
    return <Opening onStart={start} reduced={Boolean(reduced)} />;
  }

  return (
    <div className="min-h-dvh bg-obsidian pb-10">
      <ShiftHeader simulatedTime={clock.time} scene={scene} label={clock.label} />

      <main className="mx-auto max-w-3xl px-4 py-5">
        <AnimatePresence mode="wait">
          <motion.div key={`${scene}-${pending ? "c" : "s"}-${playback ? "p" : ""}`}>
            {result ? (
              <Scorecard result={result} />
            ) : playback ? (
              <RecoveryPlayback steps={playback} onDone={finish} />
            ) : pending ? (
              <ConsequenceStep
                status={pending.status}
                headline={pending.headline}
                body={pending.body}
                metrics={state.metrics}
                previous={previous}
                cta={pending.cta}
                onContinue={() => {
                  const next = pending.next;
                  setPending(null);
                  setState((s) => advance(s, next as SimulationState["scene"], CLOCK[next]!.time));
                }}
              />
            ) : scene === "floor" ? (
              <FloorScene
                metrics={state.metrics}
                plan={plan}
                onChange={setPlan}
                onConfirm={confirmFloor}
              />
            ) : scene === "flow" ? (
              <FlowScene
                metrics={state.metrics}
                previous={previous}
                onChoose={(choice) =>
                  choose("flow", "packing-intervention", choice, "packing_intervention_selected", "nil-pick", "Continue the shift")
                }
              />
            ) : scene === "nil-pick" ? (
              <NilPickScene
                metrics={state.metrics}
                inspected={state.inspected}
                onInspect={inspect}
                onSop={() => {
                  logEvent("sop_viewed", { sop: "nil-pick" });
                  setState((s) =>
                    s.hintsUsed.includes("nil-pick-sop")
                      ? s
                      : { ...s, hintsUsed: [...s.hintsUsed, "nil-pick-sop"] },
                  );
                }}
                onChoose={(choice) =>
                  choose("nil-pick", "nil-pick-resolution", choice, "nil_pick_resolution_selected", "packing", "Go to packing")
                }
              />
            ) : scene === "packing" ? (
              <PackingScene onSubmit={submitPacking} />
            ) : scene === "dispatch" ? (
              <DispatchScene
                metrics={state.metrics}
                previous={previous}
                onChoose={(choice) =>
                  choose("dispatch", "dispatch-action", choice, "dispatch_action_selected", "recovery", "Back to the board")
                }
              />
            ) : scene === "recovery" ? (
              <RecoveryScene metrics={PEAK_METRICS} onExecute={executeRecovery} />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

/* ── Opening ──────────────────────────────────────────────────────────── */

function Opening({ onStart, reduced }: { onStart: () => void; reduced: boolean }) {
  const lines = [
    { at: 0.0, node: <span className="font-mono text-[13px] tracking-[0.2em] text-ember-500 uppercase">{DAY_ONE.openingTime} · Breakfast peak</span> },
    { at: 0.5, node: <span className="block text-[19px] leading-snug text-mid">Your Store Manager is unavailable.</span> },
    { at: 1.0, node: <span className="block text-[26px] leading-tight font-semibold tracking-[-0.03em] text-hi sm:text-[32px]">For the next 15 minutes, you are running the store.</span> },
  ];

  return (
    <div className="grid min-h-dvh place-items-center bg-void px-5 py-16">
      <div className="w-full max-w-lg space-y-6 text-center">
        {lines.map((line, index) => (
          <motion.div
            key={index}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: reduced ? 0 : line.at, ease: easing.outExpo }}
          >
            {line.node}
          </motion.div>
        ))}

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: reduced ? 0 : 1.6, ease: easing.outExpo }}
          className="rounded-card border border-line-strong bg-surface p-5"
        >
          <p className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">
            Store target · Click → Dispatch
          </p>
          <p data-readout className="mt-2 text-[38px] leading-none font-semibold tracking-[-0.04em] text-hi tabular-nums">
            &lt; {DAY_ONE.targetCtd}
            <span className="text-[18px] text-lo"> sec</span>
          </p>
          <p className="mt-3 border-t border-line pt-3 text-[12.5px] text-mid">
            Currently running at{" "}
            <span data-readout className="font-mono font-semibold text-ion-400">164 sec</span>
          </p>
        </motion.div>

        <motion.div
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: reduced ? 0 : 2.1 }}
        >
          <Button variant="primary" size="lg" className="w-full" onClick={onStart}>
            Take control
            <ArrowRight />
          </Button>
          <p className="mt-3 text-[11.5px] text-faint">
            No prep needed. The store will tell you what it needs.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
