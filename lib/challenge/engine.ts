import { EMPLOYEES, INITIAL_METRICS, countAt, defaultStaffing } from "./day-one";
import type {
  DecisionRecord,
  DecisionTag,
  MetricEffect,
  Metrics,
  SceneChoice,
  SceneId,
  SignalDelta,
  SimulationState,
  SopViolation,
  StaffingPlan,
} from "./types";
import { emptySignals } from "./types";

/**
 * State transitions. Pure: every function takes a state and returns a new one,
 * so a run can be replayed from its decision list and will land on the same
 * numbers. Nothing here renders anything.
 */

/** Where each person normally works, for spotting a genuine reallocation. */
const PRIMARY: Record<string, string> = Object.fromEntries(
  EMPLOYEES.map((employee) => [employee.id, employee.primary]),
);

const CLAMP: Record<keyof Metrics, [number, number]> = {
  ordersWaiting: [0, 60],
  ctd: [90, 320],
  packingQueue: [0, 20],
  nilPicks: [0, 8],
  ridersWaiting: [0, 24],
  pickingCapacity: [40, 120],
};

function clampMetric(key: keyof Metrics, value: number): number {
  const [min, max] = CLAMP[key];
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function applyMetrics(metrics: Metrics, effect: MetricEffect = {}): Metrics {
  const next = { ...metrics };
  for (const [key, delta] of Object.entries(effect) as [keyof Metrics, number][]) {
    next[key] = clampMetric(key, next[key] + delta);
  }
  return next;
}

export function createState(): SimulationState {
  return {
    scene: "opening",
    simulatedTime: "07:12 AM",
    startedAt: Date.now(),
    completedAt: null,
    metrics: { ...INITIAL_METRICS },
    staffing: defaultStaffing(),
    decisions: [],
    signals: emptySignals(),
    tags: [],
    sopViolations: [],
    hintsUsed: [],
    inspected: [],
  };
}

function mergeSignals(
  state: SimulationState,
  delta: SignalDelta,
): SimulationState["signals"] {
  const next = { ...state.signals };
  for (const [key, value] of Object.entries(delta) as [
    keyof SimulationState["signals"],
    number,
  ][]) {
    next[key] += value;
  }
  return next;
}

interface RecordInput {
  scene: SceneId;
  decisionId: string;
  chosenAction: string;
  simulatedTime: string;
  signals: SignalDelta;
  tags: DecisionTag[];
  metricEffect?: MetricEffect;
  sop?: Omit<SopViolation, "scene">;
}

/**
 * The one way a decision enters the record. Everything a scene does goes
 * through here, so telemetry, scoring and the metric board can never drift
 * apart from each other.
 */
export function commitDecision(
  state: SimulationState,
  input: RecordInput,
): SimulationState {
  const metricsBefore = state.metrics;
  const metricsAfter = applyMetrics(metricsBefore, input.metricEffect);

  const violation: SopViolation | null = input.sop
    ? { ...input.sop, scene: input.scene }
    : null;

  const record: DecisionRecord = {
    scene: input.scene,
    decisionId: input.decisionId,
    chosenAction: input.chosenAction,
    at: Date.now() - state.startedAt,
    simulatedTime: input.simulatedTime,
    metricsBefore,
    metricsAfter,
    signals: input.signals,
    tags: input.tags,
    sopImpact: violation?.label ?? null,
  };

  return {
    ...state,
    metrics: metricsAfter,
    decisions: [...state.decisions, record],
    signals: mergeSignals(state, input.signals),
    tags: [...state.tags, ...input.tags],
    sopViolations: violation
      ? [...state.sopViolations, violation]
      : state.sopViolations,
  };
}

export function commitChoice(
  state: SimulationState,
  scene: SceneId,
  simulatedTime: string,
  decisionId: string,
  choice: SceneChoice,
): SimulationState {
  return commitDecision(state, {
    scene,
    decisionId,
    chosenAction: choice.id,
    simulatedTime,
    signals: choice.signals,
    tags: choice.tags,
    metricEffect: choice.metricEffect,
    sop: choice.sop,
  });
}

export function advance(
  state: SimulationState,
  scene: SceneId,
  simulatedTime: string,
): SimulationState {
  return { ...state, scene, simulatedTime };
}

/* ── Scene 1: reading a staffing plan ─────────────────────────────────── */

export interface StaffingRead {
  picking: number;
  packing: number;
  dispatch: number;
  signals: SignalDelta;
  tags: DecisionTag[];
  /** What the store does next, in consequence of this shape. */
  metricEffect: MetricEffect;
  summary: string;
}

/**
 * There is no single correct allocation, so this reads the *shape* of the
 * plan rather than matching it against an answer key: is there enough picking
 * to feed the peak, is packing protected, is dispatch still staffed, and did
 * the operator use the people who are cross-trained.
 */
export function readStaffing(plan: StaffingPlan): StaffingRead {
  const picking = countAt(plan, "picking");
  const packing = countAt(plan, "packing");
  const dispatch = countAt(plan, "dispatch");

  const signals: SignalDelta = {};
  const tags: DecisionTag[] = [];
  const effect: MetricEffect = {};
  const notes: string[] = [];

  const add = (delta: SignalDelta) => {
    for (const [key, value] of Object.entries(delta) as [
      keyof SignalDelta,
      number,
    ][]) {
      signals[key] = (signals[key] ?? 0) + value;
    }
  };

  // Packing is the stage that will bottleneck at breakfast. Two is the floor.
  if (packing >= 3) {
    add({ team: 4, priority: 4, reasoning: 3 });
    tags.push("balanced_floor");
    notes.push("packing reinforced ahead of the peak");
    effect.packingQueue = -1;
    effect.ctd = -6;
  } else if (packing === 2) {
    add({ team: 2, priority: 1, reasoning: 1 });
    notes.push("packing left at its normal strength");
  } else {
    add({ team: -2, priority: -4, reasoning: -2 });
    tags.push("abandoned_packing");
    notes.push("packing left short");
    effect.packingQueue = 3;
    effect.ctd = 12;
  }

  if (picking >= 5) {
    if (packing <= 1) {
      tags.push("overstaffed_picking");
      add({ reasoning: -2 });
      notes.push("picking stacked at packing's expense");
    } else {
      add({ priority: 1 });
      notes.push("picking weighted for volume");
    }
    effect.pickingCapacity = 6;
  } else if (picking <= 2) {
    add({ priority: -3, reasoning: -2 });
    notes.push("picking too thin to feed the peak");
    effect.pickingCapacity = -14;
    effect.ordersWaiting = 4;
  }

  if (dispatch === 0) {
    add({ team: -3, customer: -2 });
    tags.push("left_dispatch_bare");
    notes.push("nobody on dispatch");
    effect.ridersWaiting = 3;
    effect.ctd = (effect.ctd ?? 0) + 8;
  }

  // Did they actually use the cross-trained people, or just leave everyone
  // where they were? Moving somebody off their primary is the signal.
  const moved = Object.entries(plan).filter(
    ([id, station]) => PRIMARY[id] !== undefined && PRIMARY[id] !== station,
  ).length;

  if (moved > 0) {
    add({ team: 2, reasoning: 1 });
    tags.push("used_cross_training");
  }

  return {
    picking,
    packing,
    dispatch,
    signals,
    tags,
    metricEffect: effect,
    summary: notes.join(", ") || "floor left as it stands",
  };
}

/* ── Scene 4: reading a packing configuration ─────────────────────────── */

export interface PackingRead {
  signals: SignalDelta;
  tags: DecisionTag[];
  metricEffect: MetricEffect;
  violation: Omit<SopViolation, "scene"> | null;
  headline: string;
  body: string;
  tone: "healthy" | "warning" | "critical";
}

export function readPacking(
  bags: Record<string, "bag-1" | "bag-2">,
  protection: Record<string, string>,
): PackingRead {
  const signals: SignalDelta = {};
  const tags: DecisionTag[] = [];
  const add = (delta: SignalDelta) => {
    for (const [key, value] of Object.entries(delta) as [
      keyof SignalDelta,
      number,
    ][]) {
      signals[key] = (signals[key] ?? 0) + value;
    }
  };

  const cleanerBag = bags["cleaner"];
  const foodBags = new Set(
    ["bread", "eggs", "curd"].map((id) => bags[id]).filter(Boolean),
  );
  const mixed = cleanerBag !== undefined && foodBags.has(cleanerBag);

  const eggsProtected = protection["eggs"] === "fragile";
  const curdProtected = protection["curd"] === "chilled";

  if (mixed) {
    add({ customer: -7, reasoning: -2 });
    tags.push("broke_food_segregation");
  } else {
    add({ customer: 5, reasoning: 2 });
    tags.push("maintained_food_segregation");
  }

  if (eggsProtected) {
    add({ customer: 3 });
    tags.push("protected_fragile_goods");
  }
  if (curdProtected) {
    add({ customer: 3 });
    tags.push("protected_cold_chain");
  }

  if (mixed) {
    return {
      signals,
      tags,
      metricEffect: { ctd: 28 },
      violation: {
        id: "packing-segregation",
        label: "Packed a household chemical with food",
        severity: 0.88,
      },
      tone: "critical",
      headline: "QC hold",
      body: "Food and household chemical detected in the same bag. Repacking required — 28 seconds added to click-to-dispatch.",
    };
  }

  const both = eggsProtected && curdProtected;
  return {
    signals,
    tags,
    metricEffect: { ctd: both ? -4 : 0 },
    violation: null,
    tone: both ? "healthy" : "warning",
    headline: "QC cleared",
    body: both
      ? "Order protected without breaking fulfillment flow. Eggs cushioned, curd in cold packaging, chemical separated."
      : "Segregation is right. Some handling was left standard — the order goes out, but not everything in it is protected.",
  };
}

/* ── Scene 6: reading a recovery plan ─────────────────────────────────── */

export interface RecoveryStep {
  actionId: string;
  label: string;
  metricsAfter: Metrics;
}

export interface RecoveryRead {
  steps: RecoveryStep[];
  signals: SignalDelta;
  tags: DecisionTag[];
  violations: Omit<SopViolation, "scene">[];
  finalMetrics: Metrics;
  recovered: boolean;
}

/**
 * Plans are read on two axes: whether the chosen actions address the real
 * bottleneck, and whether the order of execution makes sense. Ordering is
 * scored on a gradient — being roughly right is worth most of the credit,
 * because in a real recovery it usually is.
 */
export function readRecovery(
  chosen: import("./day-one").RecoveryAction[],
  start: Metrics,
): RecoveryRead {
  const signals: SignalDelta = {};
  const tags: DecisionTag[] = [];
  const violations: Omit<SopViolation, "scene">[] = [];
  const steps: RecoveryStep[] = [];

  const add = (delta: SignalDelta, scale = 1) => {
    for (const [key, value] of Object.entries(delta) as [
      keyof SignalDelta,
      number,
    ][]) {
      signals[key] = (signals[key] ?? 0) + value * scale;
    }
  };

  let metrics = start;

  chosen.forEach((action, index) => {
    // Later steps land softer: by the time the third move executes, the peak
    // has already moved on.
    const decay = [1, 0.8, 0.62][index] ?? 0.5;
    const effect: MetricEffect = {};
    for (const [key, value] of Object.entries(action.metricEffect) as [
      keyof Metrics,
      number,
    ][]) {
      effect[key] = value * decay;
    }
    metrics = applyMetrics(metrics, effect);

    add(action.signals, decay);
    tags.push(...action.tags);
    if (action.sop) violations.push(action.sop);

    steps.push({ actionId: action.id, label: action.label, metricsAfter: metrics });
  });

  // Prioritisation credit: did the highest-value actions get executed first?
  const ranked = chosen
    .map((action, index) => ({ ideal: action.idealRank, slot: index + 1 }))
    .filter((entry): entry is { ideal: number; slot: number } => entry.ideal !== null);

  if (ranked.length >= 2) {
    const inverted = ranked.some((a) =>
      ranked.some((b) => a.ideal < b.ideal && a.slot > b.slot),
    );
    add({ priority: inverted ? 1 : 4, reasoning: inverted ? 0 : 2 });
  }

  return {
    signals,
    tags,
    violations,
    steps,
    finalMetrics: metrics,
    recovered: metrics.ctd < 180,
  };
}
