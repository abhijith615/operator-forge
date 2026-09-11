"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Volume2, VolumeX } from "lucide-react";

import { DockSequencer } from "@/components/challenge/day-four/dock-sequencer";
import { RecoveryExecution } from "@/components/challenge/day-four/execution";
import { FloorMap } from "@/components/challenge/day-four/floor-map";
import { DayFourOpening } from "@/components/challenge/day-four/opening";
import { BatchTray, PipelinePanel, type Column, type RunDigest } from "@/components/challenge/day-four/pipeline";
import { RecoveryTimeline } from "@/components/challenge/day-four/recovery-timeline";
import { Day4Scorecard } from "@/components/challenge/day-four/scorecard";
import { FloorVoice, FlowMetrics, StageHeading } from "@/components/challenge/day-four/ui";
import { MarkPrompt, ZoneInspector } from "@/components/challenge/day-four/zone-inspector";
import { CountdownPill } from "@/components/challenge/day-two/ui";
import { Button } from "@/components/ui/button";
import { SHIFT_SECONDS, timeScale } from "@/lib/challenge/clock";
import * as E from "@/lib/challenge/day-four/engine";
import { buildDay4Result } from "@/lib/challenge/day-four/feedback";
import { layoutOf, metricsOf } from "@/lib/challenge/day-four/floor";
import {
  BATCHES,
  BATCH_ORDER,
  OPENING_MESSAGES,
  RUN_STEP,
  clockAt,
} from "@/lib/challenge/day-four/scenario";
import { tagsSoFar } from "@/lib/challenge/day-four/scoring";
import type {
  AisleAction,
  BatchId,
  Day4State,
  Lane,
  QcAction,
  RecoveryAction,
  StorageId,
  VehicleId,
  ZoneId,
} from "@/lib/challenge/day-four/types";
import { saveChallengeRun } from "@/lib/challenge/save-run";
import { logEvent, type ChallengeEventName } from "@/lib/challenge/telemetry";
import type { ChallengeResult } from "@/lib/challenge/types";
import { easing } from "@/lib/motion";
import { playNotificationSound, playScanBeep } from "@/lib/sound";
import { useShellStore } from "@/stores/shell-store";

function useCompact(): boolean {
  const [compact, setCompact] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return compact;
}

/**
 * Day 4 — Clear the Floor.
 *
 * Owns the morning's state and the fifteen-minute clock, and is the only
 * place telemetry is emitted. Every decision goes through `apply`, which
 * computes the next state before setting it, so an event fires exactly once
 * with the floor on either side of it.
 */
export function DayFourSimulation({ operatorName }: { operatorName: string }) {
  const [initial, setInitial] = React.useState<Day4State | null>(null);
  if (!initial) {
    return (
      <DayFourOpening
        onStart={() => {
          const started = E.startDay(E.createDay4(), Date.now());
          setInitial(started);
          logEvent("day4_started", { operator: operatorName, simulatedTime: "10:18 AM" }, 4);
        }}
      />
    );
  }
  return <Morning initial={initial} />;
}

function Morning({ initial }: { initial: Day4State }) {
  const [state, setState] = React.useState(initial);
  const [now, setNow] = React.useState(() => Date.now());
  const [elapsed, setElapsed] = React.useState(0);
  const [zone, setZone] = React.useState<ZoneId | null>(null);
  const [selected, setSelected] = React.useState<BatchId | null>(null);
  const [digest, setDigest] = React.useState<RunDigest | null>(null);
  const [execution, setExecution] = React.useState<{ start: Day4State; frames: Day4State[]; result: ChallengeResult } | null>(null);
  const [showScorecard, setShowScorecard] = React.useState(false);
  const compact = useCompact();
  const reduced = useReducedMotion();
  const soundEnabled = useShellStore((s) => s.soundEnabled);
  const setSoundEnabled = useShellStore((s) => s.setSoundEnabled);

  const stateRef = React.useRef(state);
  const apply = React.useCallback(
    (fn: (s: Day4State) => Day4State, after?: (prev: Day4State, next: Day4State) => void) => {
      const prev = stateRef.current;
      const next = fn(prev);
      if (next === prev) return;
      stateRef.current = next;
      setState(next);
      after?.(prev, next);
    },
    [],
  );

  const sound = React.useCallback((kind: "scan" | "alert" | "good" | "neutral") => {
    if (!useShellStore.getState().soundEnabled) return;
    if (kind === "scan") playScanBeep();
    else playNotificationSound(kind === "alert" ? "critical" : kind === "good" ? "positive" : "neutral");
  }, []);

  const log = React.useCallback((name: ChallengeEventName, prev: Day4State, next: Day4State, action: Record<string, unknown> = {}) => {
    const after = E.d4Snapshot(next);
    logEvent(
      name,
      {
        simulatedTime: clockAt(E.simMinute(next, Date.now())),
        action,
        stateBefore: E.d4Snapshot(prev),
        stateAfter: after,
        floorCongestion: after.floorCongestion,
        ctd: after.ctd,
        pickerRouteDelay: after.pickerRouteDelay,
        priorityInventoryReadiness: after.priorityInventoryReadiness,
        feedbackTags: tagsSoFar(next),
      },
      4,
    );
  }, []);

  /* ── The clock ── */
  const playing = state.phase !== "execute" && state.phase !== "done";
  React.useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
      setElapsed((value) => value + 1);
    }, 1000 / timeScale());
    return () => window.clearInterval(timer);
  }, [playing]);
  const remaining = Math.max(0, SHIFT_SECONDS - elapsed);

  const lock = React.useCallback(
    (by: "operator" | "clock") => {
      const at = Date.now();
      const prev = stateRef.current;
      const prepared = E.prepareLock(prev, at, by);
      if (prepared === prev && prev.phase !== "recovery") return;
      const frames = E.recoveryFrames(prepared);
      const executed = frames[frames.length - 1] ?? prepared;
      const finished = E.finishDay({ ...executed, phase: "execute" }, at);
      const result = buildDay4Result(finished);
      stateRef.current = { ...executed, phase: "execute" };
      setState(stateRef.current);
      setExecution({ start: prepared, frames, result });
      log("recovery_plan_locked", prev, prepared, { by, windows: prepared.recovery });
      log("recovery_executed", prepared, executed, { outcome: result.flow?.outcome.title });
      logEvent("day4_completed", { score: result.score, band: result.band, style: result.signature.name }, 4);
      void saveChallengeRun(
        result,
        [
          { scene: "bottleneck", action: prepared.bottleneck ?? "none" },
          ...(["dairy", "frozen", "grocery"] as VehicleId[]).map((id) => ({ scene: "dock", action: `${id}:${prepared.plan[id]}` })),
          { scene: "qc", action: prepared.qcIssue.status },
          { scene: "aisle", action: prepared.aisle.action ?? "none" },
          ...prepared.recovery.flatMap((slot, window) => slot.map((action) => ({ scene: `recovery-${window}`, action }))),
        ],
        4,
      );
      sound("neutral");
    },
    [log, sound],
  );

  React.useEffect(() => {
    if (remaining > 0 || !playing) return;
    lock("clock");
  }, [remaining, playing, lock]);

  /* ── Views that replace the floor ── */
  if (showScorecard && execution) return <Day4Scorecard result={execution.result} />;
  if (execution) {
    return (
      <RecoveryExecution
        start={execution.start}
        frames={execution.frames}
        result={execution.result}
        compact={compact}
        onDone={() => setShowScorecard(true)}
      />
    );
  }

  /* ── Derived ── */
  const layout = layoutOf(state);
  const metrics = metricsOf(state);
  const time = clockAt(E.simMinute(state, now));

  /* ── Handlers ── */
  const inspect = (target: ZoneId) => {
    if (state.marking) {
      apply(
        (s) => E.markBottleneck(s, target, Date.now()),
        (prev, next) => {
          log("bottleneck_marked", prev, next, { zone: target, correct: E.isCorrectBottleneck(target), inspected: prev.inspected });
          setZone(null);
          sound(E.isCorrectBottleneck(target) ? "good" : "neutral");
        },
      );
      return;
    }
    setZone(target);
    apply(
      (s) => E.inspectZone(s, target),
      (prev, next) => log("zone_inspected", prev, next, { zone: target }),
    );
  };

  const setLane = (vehicle: VehicleId, lane: Lane) =>
    apply(
      (s) => E.setLane(s, vehicle, lane),
      (prev, next) => {
        log("vehicle_sequence_changed", prev, next, { vehicle, lane });
        if (lane === "hold") log("vehicle_held", prev, next, { vehicle });
      },
    );

  const confirmDock = () =>
    apply(
      (s) => E.confirmDock(s, Date.now()),
      (prev, next) => {
        for (const id of ["dairy", "frozen", "grocery"] as VehicleId[]) {
          if (next.vehicles[id].dock) log("vehicle_unload_started", prev, next, { vehicle: id, dock: next.vehicles[id].dock });
        }
      },
    );

  const run = () =>
    apply(
      (s) => E.runMinutes(s, RUN_STEP, Date.now()),
      (prev, next) => {
        const fresh = next.history.slice(prev.history.length);
        const arrived = fresh.reduce((sum, snap) => sum + snap.inflow, 0);
        const storedDelta = BATCH_ORDER.reduce((sum, id) => sum + next.batches[id].stored - prev.batches[id].stored, 0);
        const ready = BATCH_ORDER.filter((id) => prev.batches[id].stage !== "ready" && next.batches[id].stage === "ready");
        const before = metricsOf(prev);
        const afterMetrics = metricsOf(next);
        const cleared = prev.aisle.clearedAt === null && next.aisle.clearedAt !== null;
        setDigest({
          from: prev.t,
          to: next.t,
          arrived,
          stored: storedDelta,
          congestionFrom: before.congestion,
          congestionTo: afterMetrics.congestion,
          ready,
          nilRiskFrom: before.nilPickRisk,
          nilRiskTo: afterMetrics.nilPickRisk,
          routeRestored: cleared ? { from: before.routeSeconds, to: afterMetrics.routeSeconds } : null,
        });
        for (const id of BATCH_ORDER) {
          const was = prev.batches[id].stage;
          const is = next.batches[id].stage;
          if (was === "qc" && is === "accepted") log("batch_qc_completed", prev, next, { batch: id });
          if (was === "grn" && is === "verified") log("batch_grn_completed", prev, next, { batch: id });
          if (is === "ready" && was !== "ready") log("batch_pick_ready", prev, next, { batch: id });
        }
        if (prev.qcIssue.status === "none" && next.qcIssue.status === "pending") {
          log("quality_issue_found", prev, next, { crate: "D1-07" });
          sound("alert");
        } else if (ready.length > 0) {
          sound("good");
        }
        if (cleared) log("aisle_cleared", prev, next, { at: next.aisle.clearedAt });
      },
    );

  const qc = (id: BatchId) =>
    apply(
      (s) => E.sendToQc(s, id),
      (prev, next) => {
        log("batch_qc_started", prev, next, { batch: id });
        sound("scan");
      },
    );

  const grn = (id: BatchId) =>
    apply(
      (s) => E.startGrn(s, id),
      (prev, next) => {
        log("batch_grn_completed", prev, next, { batch: id, started: true });
        sound("scan");
      },
    );

  const putaway = (id: BatchId, destination: StorageId) =>
    apply(
      (s) => E.startPutaway(s, id, destination),
      (prev, next) => log("batch_putaway_started", prev, next, { batch: id, destination }),
    );

  const prioritise = (id: BatchId) => apply((s) => E.prioritise(s, id), (prev, next) => log("batch_putaway_started", prev, next, { batch: id, prioritised: true }));

  const resolve = (action: QcAction) =>
    apply(
      (s) => E.resolveQc(s, action, Date.now()),
      (prev, next) => {
        log("quality_action_selected", prev, next, { action, crate: "D1-07" });
        sound(action === "quarantine" || action === "recheck" ? "good" : "alert");
      },
    );

  const aisle = (action: AisleAction) =>
    apply(
      (s) => E.aisleAct(s, action, Date.now()),
      (prev, next) => {
        log("aisle_clearance_started", prev, next, { action });
        if (prev.aisle.clearedAt === null && next.aisle.clearedAt !== null) {
          log("aisle_cleared", prev, next, { action });
          const before = metricsOf(prev);
          const afterMetrics = metricsOf(next);
          setDigest({
            from: prev.t,
            to: next.t,
            arrived: 0,
            stored: 0,
            congestionFrom: before.congestion,
            congestionTo: afterMetrics.congestion,
            ready: [],
            nilRiskFrom: before.nilPickRisk,
            nilRiskTo: afterMetrics.nilPickRisk,
            routeRestored: { from: before.routeSeconds, to: afterMetrics.routeSeconds },
          });
          sound("good");
        }
      },
    );

  const vehicle = (id: VehicleId, action: "pause" | "resume" | "dock" | "yard") =>
    apply(
      (s) =>
        action === "pause"
          ? E.pauseUnload(s, id)
          : action === "resume"
            ? E.resumeUnload(s, id)
            : action === "dock"
              ? E.bringToDock(s, id)
              : E.sendToYard(s, id),
      (prev, next) =>
        log(action === "pause" || action === "yard" ? "vehicle_held" : "vehicle_unload_started", prev, next, { vehicle: id, action }),
    );

  const dropBatch = (id: BatchId, column: Column) => {
    setSelected(id);
    if (column === "qc") qc(id);
    else if (column === "grn") grn(id);
    else if (column === "putaway") putaway(id, BATCHES[id].storage);
  };

  const assign = (window: number, action: RecoveryAction) =>
    apply(
      (s) => E.assignRecovery(s, window, action),
      (prev, next) => log("recovery_action_assigned", prev, next, { window, action }),
    );
  const remove = (window: number, action: RecoveryAction) => apply((s) => E.removeRecovery(s, window, action));

  /* ── Stage content ── */
  let panel: React.ReactNode = null;
  let map: React.ReactNode = null;
  let below: React.ReactNode = null;

  switch (state.phase) {
    case "inspect": {
      map = (
        <FloorMap
          state={state}
          layout={layout}
          metrics={metrics}
          interactive
          marking={state.marking}
          selected={zone}
          inspected={state.inspected}
          compact={compact}
          caption={state.marking ? "Tap the bottleneck" : "Tap a zone to inspect it"}
          onZone={inspect}
        />
      );
      panel = (
        <div className="space-y-3">
          <StageHeading
            time={time}
            eyebrow="Stage 1 · Find the bottleneck"
            title="Where is the store actually choking?"
            sub="Tap zones on the floor to see what's happening there. Each tells you one thing."
          />
          {zone && !compact ? <ZoneInspector state={state} zone={zone} compact={false} onClose={() => setZone(null)} /> : null}
          <MarkPrompt
            inspected={state.inspected.length}
            needed={E.MIN_INSPECTED}
            marking={state.marking}
            onStart={() => {
              setZone(null);
              apply((s) => E.beginMarking(s));
            }}
          />
        </div>
      );
      break;
    }
    case "dock": {
      const projection = E.projectPlan(state);
      map = (
        <FloorMap
          state={projection}
          layout={layoutOf(projection)}
          metrics={metricsOf(projection)}
          bottleneck={state.bottleneck}
          compact={compact}
          caption="Projected · 10:48 on this plan"
        />
      );
      panel = (
        <div className="space-y-3">
          <StageHeading
            time={time}
            eyebrow="Stage 2 · Control the inbound"
            title="Which vehicle comes off, and when?"
            sub="Drag vehicles between lanes, or use the buttons on each. The floor shows 10:48 if receiving runs on your plan."
          />
          {state.bottleneck && E.isCorrectBottleneck(state.bottleneck) ? (
            <div className="rounded-card border border-ion-500/45 bg-ion-500/[0.06] px-3.5 py-3" role="status">
              <p className="font-mono text-[10px] tracking-[0.16em] text-ion-400 uppercase">Constraint identified</p>
              <p className="mt-1 text-[13.5px] text-hi">Inbound is entering faster than stock is leaving staging.</p>
            </div>
          ) : null}
          <Button variant="primary" size="lg" className="w-full" onClick={confirmDock}>
            Start receiving on this plan
            <ArrowRight />
          </Button>
        </div>
      );
      below = <DockSequencer state={state} opening={metricsOf(E.createDay4())} projected={metricsOf(projection)} onLane={setLane} />;
      break;
    }
    case "pipeline": {
      map = <FloorMap state={state} layout={layout} metrics={metrics} bottleneck={state.bottleneck} compact={compact} caption={clockAt(state.t)} />;
      panel = (
        <div className="space-y-3">
          <StageHeading
            time={clockAt(state.t)}
            eyebrow="Stage 3 · Clear the pipeline"
            title="What moves first?"
            sub="One QC gate, two scan slots, and however many teams aren't stuck on a dock."
          />
          <PipelinePanel
            state={state}
            selected={selected}
            digest={digest}
            onQc={qc}
            onGrn={grn}
            onPutaway={putaway}
            onPrioritise={prioritise}
            onResolve={resolve}
            onAisle={aisle}
            onVehicle={vehicle}
            onRun={run}
          />
        </div>
      );
      below = <BatchTray state={state} selected={selected} onSelect={setSelected} onDrop={dropBatch} />;
      break;
    }
    case "recovery": {
      map = <FloorMap state={state} layout={layout} metrics={metrics} bottleneck={state.bottleneck} compact={compact} caption="10:48 AM" />;
      panel = (
        <div className="space-y-3">
          <StageHeading time="10:48 AM" eyebrow="Stage 4 · Final recovery" title="Lunch demand starts in 12 minutes." tone="alert" />
          <FloorVoice from="Cluster Manager" time="10:48 AM" lines={OPENING_MESSAGES.recovery} tone="alert" />
        </div>
      );
      below = <RecoveryTimeline state={state} onAssign={assign} onRemove={remove} onLock={() => lock("operator")} />;
      break;
    }
    default:
      break;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-obsidian">
      <header className="sticky top-0 z-30 border-b border-line bg-obsidian/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2">
          <span data-readout className="font-mono text-[14px] leading-none font-semibold text-hi tabular-nums">
            {time}
          </span>
          <CountdownPill remaining={remaining} label="remaining in the shift" />
          <span className="hidden text-[11.5px] text-faint md:inline">Clear the Floor · lunch at 11:00</span>
          <div className="order-last w-full sm:order-none sm:ml-auto sm:w-[440px]">
            <FlowMetrics metrics={metrics} compact />
          </div>
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            aria-pressed={!soundEnabled}
            aria-label={soundEnabled ? "Mute sounds" : "Turn sounds on"}
            className="ml-auto grid size-8 place-items-center rounded-full text-lo transition-colors hover:bg-white/[0.06] hover:text-hi focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none sm:ml-0"
          >
            {soundEnabled ? <Volume2 className="size-4" aria-hidden /> : <VolumeX className="size-4" aria-hidden />}
          </button>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-[1500px] flex-1 space-y-3 p-3 lg:p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* On a phone the floor stays at a readable scale and scrolls sideways
              inside its own box, rather than shrinking until nothing on it can be tapped. */}
          <div className="min-w-0 overflow-hidden rounded-card border border-line">
            <div className="overflow-x-auto">
              <div className="min-w-[620px] sm:min-w-0">{map}</div>
            </div>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.aside
              key={state.phase}
              initial={reduced ? false : { y: 8 }}
              animate={{ y: 0 }}
              exit={reduced ? undefined : { y: -4 }}
              transition={{ duration: 0.22, ease: easing.outExpo }}
              aria-label="Operations panel"
              className="min-w-0"
            >
              {panel}
            </motion.aside>
          </AnimatePresence>
        </div>
        {below}
      </main>

      {zone && compact && state.phase === "inspect" ? (
        <ZoneInspector state={state} zone={zone} compact onClose={() => setZone(null)} />
      ) : null}
    </div>
  );
}
