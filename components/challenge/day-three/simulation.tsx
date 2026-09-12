"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";

import { FlexMarket } from "@/components/challenge/day-three/flex-market";
import {
  AdjustMoment,
  AuditMoment,
  CoreMoment,
  ForecastMoment,
  GapHeading,
  LateMoment,
  ReceivingMoment,
  ReviewMoment,
  type PlanView,
} from "@/components/challenge/day-three/moments";
import { DayThreeOpening } from "@/components/challenge/day-three/opening";
import {
  ArjunAlert,
  ArjunIssuePanel,
  PeopleDrawer,
  RiyaAlert,
  RiyaReviewPanel,
} from "@/components/challenge/day-three/people";
import { PeakSimulation } from "@/components/challenge/day-three/peak-simulation";
import { EmployeeSheet, PeoplePool, type SheetAction } from "@/components/challenge/day-three/people-pool";
import { FaisalReview } from "@/components/challenge/day-three/performance";
import { RiderBoard } from "@/components/challenge/day-three/rider-board";
import { Day3Scorecard } from "@/components/challenge/day-three/scorecard";
import { ShiftBoard } from "@/components/challenge/day-three/shift-board";
import { CoverageMeter } from "@/components/challenge/day-three/ui";
import { CountdownPill } from "@/components/challenge/day-two/ui";
import { Button } from "@/components/ui/button";
import { SHIFT_SECONDS, timeScale } from "@/lib/challenge/clock";
import {
  baseStation,
  coverageOver,
  evaluate,
  firstBottleneck,
  peakCoverage,
  placeAt,
  riderHeadcount,
  simulateFlow,
  windowOf,
  workerById,
  PLANNED,
} from "@/lib/challenge/day-three/capacity";
import * as E from "@/lib/challenge/day-three/engine";
import { buildDay3Result } from "@/lib/challenge/day-three/feedback";
import { tagsSoFar } from "@/lib/challenge/day-three/scoring";
import { AUDIT, REGULARS } from "@/lib/challenge/day-three/workforce";
import { EVENING_END, PEAK_FROM, PEAK_TO, clockLabel } from "@/lib/challenge/day-three/forecast";
import {
  COVER_LABEL,
  type ArjunLocation,
  type CoverLane,
  type Day3State,
  type FaisalAction,
  type RiderSourceId,
  type RiyaAction,
  type Station,
  type Worker,
} from "@/lib/challenge/day-three/types";
import { saveChallengeRun } from "@/lib/challenge/save-run";
import { logEvent, type ChallengeEventName } from "@/lib/challenge/telemetry";
import type { ChallengeResult } from "@/lib/challenge/types";
import { easing } from "@/lib/motion";
import { playNotificationSound } from "@/lib/sound";
import { useShellStore } from "@/stores/shell-store";

const LANES: CoverLane[] = ["picking", "packing", "dispatch", "riders"];

/** Day 3 runs three minutes longer than the other days: it has two more people in it. */
const DAY_THREE_SECONDS = SHIFT_SECONDS + 3 * 60;

const PHASE_LABEL: Partial<Record<Day3State["phase"], string>> = {
  core: "Build the core team",
  forecast: "Forecast update",
  adjust: "Adjust the floor",
  flex: "Fill the gap",
  riders: "Rider gap",
  late: "The plan breaks",
  arjun: "People · Arjun",
  riya: "People · Riya",
  receiving: "High-value arrival",
  faisal: "Performance",
  audit: "Move the work",
  review: "Lock-in",
};

/**
 * Day 3 — Onam Eve. Build the shift.
 *
 * This component owns the evening's state and the eighteen-minute clock, and is
 * the only place telemetry is emitted. Every decision goes through `apply`,
 * which computes the next state before setting it — the engine is pure, so the
 * event fires exactly once with the state on either side of it.
 */
export function DayThreeSimulation({ operatorName }: { operatorName: string }) {
  const [started, setStarted] = React.useState(false);
  const [initial, setInitial] = React.useState<Day3State | null>(null);

  if (!started || !initial) {
    return (
      <DayThreeOpening
        onStart={() => {
          const now = Date.now();
          setInitial(E.startShift(E.createDay3(), now));
          setStarted(true);
          logEvent("day3_started", { operator: operatorName, simulatedTime: "4:30 PM" }, 3);
        }}
      />
    );
  }
  return <Evening initial={initial} />;
}

function Evening({ initial }: { initial: Day3State }) {
  const [state, setState] = React.useState<Day3State>(initial);
  const [now, setNow] = React.useState(() => Date.now());
  const [elapsed, setElapsed] = React.useState(0);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [marketOpen, setMarketOpen] = React.useState(false);
  const [peopleOpen, setPeopleOpen] = React.useState(false);
  const [result, setResult] = React.useState<ChallengeResult | null>(null);
  const [showScorecard, setShowScorecard] = React.useState(false);
  const soundEnabled = useShellStore((s) => s.soundEnabled);
  const setSoundEnabled = useShellStore((s) => s.setSoundEnabled);
  const reduced = useReducedMotion();

  const stateRef = React.useRef(state);
  const apply = React.useCallback(
    (fn: (s: Day3State) => Day3State, after?: (prev: Day3State, next: Day3State) => void) => {
      const prev = stateRef.current;
      const next = fn(prev);
      if (next === prev) return;
      stateRef.current = next;
      setState(next);
      after?.(prev, next);
    },
    [],
  );

  const chime = React.useCallback((tone: "critical" | "warning" | "info" | "positive" | "neutral") => {
    if (useShellStore.getState().soundEnabled) playNotificationSound(tone);
  }, []);

  /** Every event carries the time on the store clock, both sides of the decision, and what it did. */
  const log = React.useCallback(
    (name: ChallengeEventName, prev: Day3State, next: Day3State, decision: Record<string, unknown> = {}) => {
      const before = E.d3Snapshot(prev);
      const afterSnap = E.d3Snapshot(next);
      logEvent(
        name,
        {
          simulatedTime: clockLabel(E.simMinute(prev, Date.now())),
          decision,
          stateBefore: before,
          stateAfter: afterSnap,
          capacityImpact: {
            picking: afterSnap.coverage.picking - before.coverage.picking,
            packing: afterSnap.coverage.packing - before.coverage.packing,
            dispatch: afterSnap.coverage.dispatch - before.coverage.dispatch,
            riders: afterSnap.coverage.riders - before.coverage.riders,
          },
          costImpact: {
            flex: afterSnap.flexCost - before.flexCost,
            riders: afterSnap.riderCost - before.riderCost,
          },
          tags: tagsSoFar(next),
        },
        3,
      );
    },
    [],
  );

  /* ── The clock ── */
  const playing = state.phase !== "peak" && state.phase !== "done";
  React.useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
      setElapsed((value) => value + 1);
    }, 1000 / timeScale());
    return () => window.clearInterval(timer);
  }, [playing]);
  const remaining = Math.max(0, DAY_THREE_SECONDS - elapsed);

  /* ── Lock: by the operator, or by the clock ── */
  const lock = React.useCallback(
    (by: "operator" | "clock") => {
      const at = Date.now();
      apply(
        (s) => E.lockPlan(s, at, by),
        (prev, next) => {
          log("shift_plan_locked", prev, next, { by });
          const finished = E.finishPeak(next, at);
          const built = buildDay3Result(finished);
          setResult(built);
          logEvent("peak_simulation_started", { outcome: built.workforce?.outcome.title }, 3);
          logEvent("day3_completed", { score: built.score, band: built.band, style: built.signature.name }, 3);
          const decisions = [
            ...REGULARS.map((worker) => ({ scene: "core", action: `${worker.id}:${next.assignments[worker.id] ?? "none"}` })),
            ...Object.entries(next.flex).map(([id, booking]) => ({ scene: "flex", action: `${id}:${booking.windowId}:${booking.station}` })),
            ...Object.entries(next.riders).map(([id, count]) => ({ scene: "riders", action: `${id}:${count}` })),
            {
              scene: "arjun",
              action: `${next.people.arjun.outcome ?? "unaddressed"}:${next.people.arjun.incentiveChecked ? "checked" : "unchecked"}:${next.people.arjun.location ?? "unspoken"}`,
            },
            { scene: "riya", action: next.people.riya.interventions.join("+") || "none" },
            { scene: "receiving", action: next.receiving?.workerId ?? "skipped" },
            { scene: "faisal", action: next.faisal.join("+") || "none" },
            { scene: "audit", action: String(next.auditStart) },
          ];
          void saveChallengeRun(built, decisions, 3);
          chime("neutral");
        },
      );
    },
    [apply, log, chime],
  );

  React.useEffect(() => {
    if (remaining > 0 || !playing) return;
    lock("clock");
  }, [remaining, playing, lock]);

  /* ── Derived ── */
  const world = E.worldOf(state);
  const series = React.useMemo(() => evaluate(state, E.worldOf(state)), [state]);
  const coverage = peakCoverage(series);
  const sim = E.simMinute(state, now);
  const time = clockLabel(sim);

  if (showScorecard && result) return <Day3Scorecard result={result} />;
  if ((state.phase === "peak" || state.phase === "done") && result) {
    return <PeakSimulation state={state} result={result} onDone={() => setShowScorecard(true)} />;
  }

  /* ── Handlers ── */
  const assign = (workerId: string, station: Station | null) =>
    apply(
      (s) => E.assign(s, workerId, station),
      (prev, next) => {
        const was = prev.assignments[workerId] ?? null;
        log(was ? "employee_reassigned" : "employee_assigned", prev, next, { workerId, from: was, to: station });
      },
    );

  const book = (flexId: string, windowId: string, station: Station) =>
    apply(
      (s) => E.bookFlex(s, flexId, windowId, station),
      (prev, next) =>
        log(prev.flex[flexId] ? "flex_worker_hours_changed" : "flex_worker_booked", prev, next, { flexId, windowId, station }),
    );

  const cancel = (flexId: string) =>
    apply(
      (s) => E.cancelFlex(s, flexId),
      (prev, next) => log("flex_worker_hours_changed", prev, next, { flexId, cancelled: true }),
    );

  const setRiders = (source: RiderSourceId, count: number) =>
    apply(
      (s) => E.setRiders(s, source, count),
      (prev, next) => log("rider_source_selected", prev, next, { source, count }),
    );

  const open = (workerId: string) => {
    setOpenId(workerId);
    apply(
      (s) => E.inspect(s, workerId),
      (prev, next) => log("employee_inspected", prev, next, { workerId }),
    );
  };

  const confirmCore = () =>
    apply(
      (s) => E.confirmCore(s, Date.now()),
      (prev, next) => {
        log("core_plan_created", prev, next);
        log("forecast_update_seen", prev, next, { revisedTo: "+42%" });
        chime("warning");
      },
    );

  const keepPlan = () =>
    apply(
      (s) => E.keepPlan(s, Date.now()),
      (prev, next) => {
        log("forecast_plan_changed", prev, next, { response: "kept" });
        log("flex_market_opened", prev, next);
      },
    );

  const adjust = () => apply((s) => E.adjustPlan(s, Date.now()));

  const doneAdjusting = () =>
    apply(
      (s) => E.finishAdjusting(s, Date.now()),
      (prev, next) => {
        log("forecast_plan_changed", prev, next, { response: "adjusted" });
        log("flex_market_opened", prev, next);
      },
    );

  const confirmFlex = () => apply((s) => E.confirmFlex(s, Date.now()));

  const confirmRiders = () =>
    apply(
      (s) => E.confirmRiders(s, Date.now()),
      (prev, next) => {
        log("rider_plan_confirmed", prev, next);
        log("late_worker_alert_received", prev, next, { workerId: next.late?.workerId });
        chime("critical");
      },
    );

  const cover = (workerId: string | null) =>
    apply(
      (s) => E.assignLateCover(s, workerId),
      (prev, next) => log("late_worker_replaced", prev, next, { cover: workerId }),
    );

  const confirmLate = () =>
    apply(
      (s) => E.confirmLateRepair(s, Date.now()),
      (prev, next) => {
        log("late_worker_replaced", prev, next, { confirmed: true, after: next.late?.after });
        log("people_issue_triggered", prev, next, { employeeId: "arjun", issue: "incentive_overtime" });
        setMarketOpen(false);
        chime("warning");
      },
    );

  /* ── The two people ── */
  const openArjun = () => {
    setPeopleOpen(true);
    apply(
      (s) => E.openArjun(s),
      (prev, next) => log("arjun_issue_opened", prev, next, { employeeId: "arjun" }),
    );
  };

  const arjunLocation = (location: ArjunLocation) =>
    apply(
      (s) => E.setArjunLocation(s, location),
      (prev, next) => log("arjun_conversation_moved_private", prev, next, { employeeId: "arjun", location }),
    );

  const checkIncentive = () =>
    apply(
      (s) => E.checkArjunIncentive(s, Date.now()),
      (prev, next) => log("arjun_incentive_checked", prev, next, { employeeId: "arjun", status: "approved · pending" }),
    );

  const checkArjunPerformance = () =>
    apply(
      (s) => E.checkArjunPerformance(s),
      (prev, next) => log("arjun_performance_checked", prev, next, { employeeId: "arjun" }),
    );

  const respondToArjun = () =>
    apply(
      (s) => E.respondToArjun(s),
      (prev, next) =>
        log("arjun_response_selected", prev, next, {
          employeeId: "arjun",
          step: "opened",
          verified: next.people.arjun.incentiveChecked,
        }),
    );

  const selectArjunLine = (slot: "acknowledge" | "clarify" | "request", id: string) =>
    apply(
      (s) => E.selectArjunLine(s, { slot, id } as unknown as E.ArjunLine),
      (prev, next) => log("arjun_response_selected", prev, next, { employeeId: "arjun", slot, id }),
    );

  const answerArjun = () =>
    apply(
      (s) => E.answerArjun(s, Date.now()),
      (prev, next) => {
        const arjun = next.people.arjun;
        log("arjun_overtime_requested", prev, next, {
          employeeId: "arjun",
          request: arjun.response.request,
          verified: arjun.incentiveChecked,
        });
        log("arjun_overtime_result", prev, next, { employeeId: "arjun", outcome: arjun.outcome });
        chime(arjun.outcome === "extended" ? "positive" : "warning");
      },
    );

  const finishArjun = () =>
    apply(
      (s) => E.finishArjun(s, Date.now()),
      (prev, next) => {
        setPeopleOpen(false);
        log("people_issue_triggered", prev, next, { employeeId: "riya", issue: "pace" });
        chime("warning");
      },
    );

  const openRiya = () => {
    setPeopleOpen(true);
    apply(
      (s) => E.openRiya(s),
      (prev, next) => log("riya_issue_opened", prev, next, { employeeId: "riya" }),
    );
  };

  const viewRiyaTrend = () =>
    apply(
      (s) => E.viewRiyaTrend(s),
      (prev, next) => log("riya_trend_viewed", prev, next, { employeeId: "riya" }),
    );

  const viewRiyaZones = () =>
    apply(
      (s) => E.viewRiyaZones(s),
      (prev, next) => log("riya_zone_performance_viewed", prev, next, { employeeId: "riya" }),
    );

  const openRiyaZone = (zoneId: string) =>
    apply(
      (s) => E.openRiyaZone(s, zoneId, Date.now()),
      (prev, next) =>
        log("riya_zone_performance_viewed", prev, next, {
          employeeId: "riya",
          zone: zoneId,
          patternFound: next.people.riya.zoneCFound,
        }),
    );

  const toggleRiya = (action: RiyaAction) =>
    apply(
      (s) => E.toggleRiya(s, action),
      (prev, next) => {
        log("riya_intervention_selected", prev, next, {
          employeeId: "riya",
          action,
          selected: next.people.riya.interventions,
        });
        log("riya_projection_updated", prev, next, { employeeId: "riya" });
      },
    );

  const applyRiya = () =>
    apply(
      (s) => E.applyRiya(s, Date.now()),
      (prev, next) => {
        setPeopleOpen(false);
        log("people_module_completed", prev, next, {
          arjun: next.people.arjun.outcome,
          riya: next.people.riya.interventions,
        });
        chime("warning");
      },
    );

  const receive = (workerId: string) =>
    apply(
      (s) => E.assignReceiving(s, workerId),
      (prev, next) => log("high_value_task_assigned", prev, next, { workerId }),
    );

  const backfill = (workerId: string | null) =>
    apply(
      (s) => (workerId ? E.assignBackfill(s, workerId) : E.clearBackfill(s)),
      (prev, next) => log("employee_reassigned", prev, next, { backfill: workerId }),
    );

  const skipReceiving = () =>
    apply(
      (s) => (s.receivingSkipped ? { ...s, receivingSkipped: false } : E.skipReceiving(s)),
      (prev, next) => log("high_value_task_assigned", prev, next, { skipped: next.receivingSkipped }),
    );

  const confirmReceiving = () =>
    apply(
      (s) => E.confirmReceiving(s, Date.now()),
      (prev, next) => {
        log("faisal_profile_opened", prev, next);
        chime("warning");
      },
    );

  const toggleFaisal = (action: FaisalAction) =>
    apply(
      (s) => E.toggleFaisal(E.openFaisal(s), action),
      (prev, next) => log("performance_intervention_selected", prev, next, { action, selected: next.faisal }),
    );

  const applyFaisal = () =>
    apply(
      (s) => E.applyFaisal(s, Date.now()),
      (prev, next) => log("performance_intervention_selected", prev, next, { applied: prev.faisal }),
    );

  const moveAudit = (start: number) =>
    apply(
      (s) => E.moveAudit(s, start),
      (prev, next) => log("audit_rescheduled", prev, next, { from: prev.auditStart, to: next.auditStart }),
    );

  const confirmAudit = () => apply((s) => E.confirmAudit(s, Date.now()));

  /* ── What each moment needs ── */
  const editable = E.canEditTeam(state);
  const stationName = (id: string) => {
    const worker = workerById(id);
    const station = worker ? baseStation(state, worker) : null;
    return station ? COVER_LABEL[station].toLowerCase() : "no station";
  };

  const late = state.late;
  const lateWorker = late ? workerById(late.workerId) : undefined;
  const lateCandidates: Worker[] =
    late?.station
      ? REGULARS.filter((worker) => {
          const window = windowOf(state, world, worker);
          return (
            worker.id !== late.workerId &&
            window !== null &&
            window.start <= Math.min(late.due, late.arrives) &&
            window.end >= late.arrives &&
            baseStation(state, worker) !== late.station &&
            worker.skills[late.station!] >= 1
          );
        })
          .sort((a, b) => b.skills[late.station!] - a.skills[late.station!])
          .slice(0, 5)
      : [];

  const preview = E.receivingOutcome(state);
  const vacated = E.vacatedStation(state);
  const authorised = REGULARS.filter((worker) => worker.highValue && E.availableForReceiving(state, worker));
  const others = REGULARS.filter((worker) => !worker.highValue && E.availableForReceiving(state, worker));
  const backfillCandidates: Worker[] = vacated
    ? REGULARS.filter(
        (worker) =>
          worker.id !== preview.workerId &&
          E.availableForReceiving(state, worker) &&
          baseStation(state, worker) !== vacated &&
          worker.skills[vacated] >= 1,
      ).sort((a, b) => b.skills[vacated] - a.skills[vacated])
    : [];

  const plannedAudit = coverageOver(evaluate(state, { ...world, audit: false }), AUDIT.planned, AUDIT.planned + AUDIT.duration).picking;
  const withAudit = coverageOver(series, AUDIT.planned, AUDIT.planned + AUDIT.duration).picking;

  const plan: PlanView = (() => {
    const t = 180;
    const count: Record<Station, number> = { picking: 0, packing: 0, dispatch: 0 };
    for (const worker of REGULARS) {
      const place = placeAt(state, world, worker, t);
      if (place && place !== "receiving") count[place] += 1;
    }
    const receiver = E.receivingTransfer(state);
    const receiverWorker = receiver ? workerById(receiver.workerId) : undefined;
    return {
      ...count,
      flex: Object.keys(state.flex).length,
      riders: riderHeadcount(state, t).count,
      receiving: receiverWorker ? `Covered · ${receiverWorker.name}` : "Not received",
      receivingOk: Boolean(receiverWorker?.highValue),
      audit: state.auditStart >= EVENING_END ? `${clockLabel(state.auditStart)} · lean` : clockLabel(state.auditStart),
      auditOk: state.auditStart >= PEAK_TO,
      flexCost: E.flexCost(state),
      riderCost: E.riderCost(state),
    };
  })();

  const issues: string[] = [];
  for (const lane of LANES) {
    if (coverage[lane] < 0.9) issues.push(`${COVER_LABEL[lane]} is at ${Math.round(coverage[lane] * 100)}% for the 7–9 PM peak.`);
  }
  if (state.auditStart < PEAK_TO && state.auditStart + AUDIT.duration > PEAK_FROM) issues.push("The inventory audit still runs inside the peak.");
  if (E.flexCost(state) > 1200) issues.push("Temp labour is over the ₹1,200 budget.");

  const coreBottleneck = firstBottleneck(simulateFlow(series), 20, ["picking", "packing", "dispatch"]);

  /* ── Sheet actions ── */
  const openWorker = openId ? workerById(openId) ?? null : null;
  const sheetActions: SheetAction[] = [];
  if (openWorker && editable && openWorker.kind === "regular") {
    const current = state.assignments[openWorker.id] ?? null;
    for (const station of ["picking", "packing", "dispatch"] as Station[]) {
      if (station === current) continue;
      sheetActions.push({
        label: `Assign to ${COVER_LABEL[station]}`,
        detail: openWorker.skills[station] === 0 ? "Not trained on this station" : undefined,
        tone: openWorker.skills[station] === 0 ? "secondary" : "primary",
        onClick: () => assign(openWorker.id, station),
      });
    }
    if (current) sheetActions.push({ label: "Take off the floor", tone: "secondary", onClick: () => assign(openWorker.id, null) });
    if (state.phase === "late" && lateCandidates.some((worker) => worker.id === openWorker.id)) {
      sheetActions.unshift({ label: `Cover until 7:15`, tone: "primary", onClick: () => cover(openWorker.id) });
    }
    if (state.phase === "receiving" && E.availableForReceiving(state, openWorker)) {
      sheetActions.unshift({
        label: "Send to high-value receiving",
        detail: openWorker.highValue ? undefined : "Not authorised for high-value stock",
        tone: openWorker.highValue ? "primary" : "danger",
        onClick: () => receive(openWorker.id),
      });
      if (backfillCandidates.some((worker) => worker.id === openWorker.id)) {
        sheetActions.splice(1, 0, { label: "Backfill 6:05–6:25", tone: "secondary", onClick: () => backfill(openWorker.id) });
      }
    }
  }

  const highlight =
    state.phase === "receiving"
      ? preview.workerId
        ? backfillCandidates.map((worker) => worker.id)
        : authorised.map((worker) => worker.id)
      : state.phase === "late"
        ? lateCandidates.map((worker) => worker.id)
        : state.phase === "faisal"
          ? ["faisal"]
          : state.phase === "arjun"
            ? ["arjun"]
            : [];

  const focus =
    state.phase === "riders"
      ? "riders"
      : state.phase === "receiving" || state.phase === "audit"
        ? "special"
        : state.phase === "late"
          ? late?.station ?? null
          : state.phase === "riya"
            ? "picking"
            : null;

  const market = (
    <FlexMarket state={state} editable={E.canBookFlex(state)} lateId={late?.workerId ?? null} onBook={book} onCancel={cancel} />
  );

  /* ── The moment ── */
  let moment: React.ReactNode = null;
  switch (state.phase) {
    case "core":
      moment = (
        <CoreMoment
          time={time}
          coverage={peakCoverage(evaluate(state, { ...PLANNED, revised: false }))}
          bottleneck={coreBottleneck}
          unassigned={REGULARS.filter((worker) => !state.assignments[worker.id]).length}
          onConfirm={confirmCore}
        />
      );
      break;
    case "forecast":
      moment = (
        <ForecastMoment
          time={time}
          before={state.core?.covInitial ?? coverage}
          after={coverage}
          onKeep={keepPlan}
          onAdjust={adjust}
        />
      );
      break;
    case "adjust":
      moment = <AdjustMoment time={time} coverage={coverage} onDone={doneAdjusting} />;
      break;
    case "flex":
      moment = (
        <div className="space-y-3">
          <GapHeading
            time={time}
            eyebrow="Fill the gap"
            title="7–9 PM coverage gap"
            sub="Even with everyone placed, the thirteen can't clear the revised peak. Book flex pickers into it — watch the gap, not the headcount."
            coverage={coverage}
            lanes={["picking", "packing", "dispatch"]}
          />
          {market}
          <Button variant="primary" size="lg" onClick={confirmFlex}>
            Riders next
          </Button>
        </div>
      );
      break;
    case "riders":
      moment = (
        <div className="space-y-3">
          <GapHeading
            time={time}
            eyebrow="Rider coverage"
            title="7–9 PM · need 26, scheduled 18"
            sub="Mix sources. Coverage is only one of the numbers that moves."
            coverage={coverage}
            lanes={[]}
          />
          <RiderBoard state={state} series={series} editable={E.canSourceRiders(state)} onSet={setRiders} />
          <Button variant="primary" size="lg" onClick={confirmRiders}>
            Confirm rider plan
          </Button>
        </div>
      );
      break;
    case "late":
      moment =
        late && lateWorker ? (
          <LateMoment
            time={time}
            late={late}
            worker={lateWorker}
            current={E.lateCoverage(state)}
            candidates={lateCandidates}
            coverId={E.lateCover(state)?.workerId ?? null}
            marketOpen={marketOpen}
            onCover={cover}
            onToggleMarket={() => setMarketOpen((value) => !value)}
            onConfirm={confirmLate}
            market={market}
          />
        ) : null;
      break;
    case "arjun":
      moment = <ArjunAlert state={state} time={time} onOpen={openArjun} />;
      break;
    case "riya":
      moment = <RiyaAlert state={state} time={time} onOpen={openRiya} />;
      break;
    case "receiving":
      moment = (
        <ReceivingMoment
          time={time}
          preview={preview}
          authorised={authorised}
          others={others}
          backfillCandidates={backfillCandidates}
          fromOf={stationName}
          onAssign={receive}
          onBackfill={backfill}
          onSkip={skipReceiving}
          onConfirm={confirmReceiving}
          skipped={state.receivingSkipped}
        />
      );
      break;
    case "faisal":
      moment = <FaisalReview state={state} world={world} time={time} onToggle={toggleFaisal} onApply={applyFaisal} />;
      break;
    case "audit":
      moment = (
        <AuditMoment
          time={time}
          start={state.auditStart}
          withoutAudit={plannedAudit}
          withAudit={withAudit}
          onMove={moveAudit}
          onConfirm={confirmAudit}
        />
      );
      break;
    case "review":
      moment = <ReviewMoment time={time} plan={plan} coverage={coverage} issues={issues} onLock={() => lock("operator")} />;
      break;
    default:
      moment = null;
  }

  /* ── Resources, once they exist: reopen them from anywhere ── */
  const laterPhase = E.reached(state, "late");

  return (
    <div className="flex min-h-dvh flex-col bg-obsidian">
      <header className="sticky top-0 z-30 border-b border-line bg-obsidian/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2">
          <span data-readout className="font-mono text-[14px] leading-none font-semibold text-hi tabular-nums">
            {time}
          </span>
          <CountdownPill remaining={remaining} label="remaining in the shift" />
          <span className="hidden text-[11.5px] text-faint md:inline">
            Onam Eve · {PHASE_LABEL[state.phase] ?? ""}
          </span>
          <div className="order-last grid w-full grid-cols-4 gap-3 sm:order-none sm:ml-auto sm:w-[360px]">
            {LANES.map((lane) => (
              <CoverageMeter key={lane} lane={lane} value={coverage[lane]} compact />
            ))}
          </div>
          <span className="ml-auto hidden text-right sm:ml-0 sm:block">
            <span className="block font-mono text-[9px] tracking-[0.12em] text-faint uppercase">Temp spend</span>
            <span data-readout className="font-mono text-[12.5px] font-semibold text-hi tabular-nums">
              ₹{(E.flexCost(state) + E.riderCost(state)).toLocaleString("en-IN")}
            </span>
          </span>
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

      <div className="mx-auto grid w-full max-w-[1500px] flex-1 gap-3 p-3 lg:grid-cols-[290px_minmax(0,1fr)] lg:p-4">
        <aside
          aria-label="Your team"
          className="order-3 self-start rounded-card border border-line bg-surface lg:order-none lg:sticky lg:top-[72px] lg:flex lg:max-h-[calc(100dvh-88px)] lg:flex-col"
        >
          <PeoplePool state={state} editable={editable} onAssign={assign} onOpen={open} highlight={highlight} />
        </aside>

        <main id="main" className="order-1 min-w-0 space-y-3 lg:order-none">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={state.phase}
              initial={reduced ? false : { y: 8 }}
              animate={{ y: 0 }}
              exit={reduced ? undefined : { y: -4 }}
              transition={{ duration: 0.22, ease: easing.outExpo }}
              className="rounded-card border border-line bg-surface/60 p-4"
            >
              {moment}
            </motion.div>
          </AnimatePresence>

          <ShiftBoard
            state={state}
            world={world}
            series={series}
            now={sim}
            editable={editable}
            showReceiving={E.reached(state, "receiving")}
            showAudit={E.reached(state, "audit")}
            auditMovable={state.phase === "audit" || state.phase === "review"}
            focus={focus}
            onAssign={(id, station) => assign(id, station)}
            onReceivingDrop={(id) => {
              if (state.phase === "receiving") receive(id);
            }}
            onMoveAudit={moveAudit}
            onSelectWorker={open}
          />

          {laterPhase && state.phase !== "late" && editable ? (
            <details className="rounded-card border border-line bg-surface p-3.5">
              <summary className="cursor-pointer text-[13px] font-medium text-mid">Flex market and riders</summary>
              <div className="mt-3 space-y-4">
                {market}
                <RiderBoard state={state} series={series} editable={E.canSourceRiders(state)} onSet={setRiders} />
              </div>
            </details>
          ) : null}
        </main>
      </div>

      <PeopleDrawer
        open={peopleOpen && (state.phase === "arjun" || state.phase === "riya")}
        label={state.phase === "arjun" ? "Arjun's overtime" : "Riya's performance review"}
        onClose={() => setPeopleOpen(false)}
      >
        {state.phase === "arjun" ? (
          <ArjunIssuePanel
            state={state}
            world={world}
            time={time}
            onLocation={arjunLocation}
            onCheckIncentive={checkIncentive}
            onCheckPerformance={checkArjunPerformance}
            onRespond={respondToArjun}
            onSelect={selectArjunLine}
            onAnswer={answerArjun}
            onFinish={finishArjun}
          />
        ) : (
          <RiyaReviewPanel
            state={state}
            world={world}
            time={time}
            onViewTrend={viewRiyaTrend}
            onViewZones={viewRiyaZones}
            onOpenZone={openRiyaZone}
            onToggle={toggleRiya}
            onApply={applyRiya}
          />
        )}
      </PeopleDrawer>

      <EmployeeSheet
        worker={openWorker}
        station={openWorker ? baseStation(state, openWorker) : null}
        actions={sheetActions}
        onClose={() => setOpenId(null)}
      />
    </div>
  );
}
