import { isCorrectBottleneck, reached } from "./engine";
import { lunchCtd, metricsOf } from "./floor";
import { EXPOSURE_LIMIT, RECOVERY_AT } from "./scenario";
import {
  DAY_FOUR_DIMENSIONS,
  DAY_FOUR_DIMENSION_BLURB,
  DAY_FOUR_DIMENSION_LABEL,
  type Day4Dimension,
  type Day4State,
  type Day4Tag,
  type Phase,
  type ZoneId,
} from "./types";
import type { CompetencyScore } from "../types";

/**
 * Day 4 assessment.
 *
 * Read from what the floor did, minute by minute, and from the decisions that
 * made it do that — not from a list of right answers. A plan that holds the
 * grocery vehicle and a plan that unloads only the beverages and then pauses
 * can both score in the nineties; a plan that empties every vehicle
 * immediately cannot, because the floor it produces is the one pickers can't
 * walk through.
 */

export const DAY_FOUR_WEIGHTS: Record<Day4Dimension, number> = {
  bottleneckDiagnosis: 0.25,
  processSequencing: 0.2,
  timePriority: 0.2,
  flowSpace: 0.15,
  sopQuality: 0.1,
  commercial: 0.1,
};

export type Day4Band =
  | "Needs Foundation"
  | "Developing Operator"
  | "Capable Flow Manager"
  | "Strong Flow Operator"
  | "Exceptional Day 4 Performance";

export function day4Band(score: number): Day4Band {
  if (score < 50) return "Needs Foundation";
  if (score < 65) return "Developing Operator";
  if (score < 80) return "Capable Flow Manager";
  if (score < 90) return "Strong Flow Operator";
  return "Exceptional Day 4 Performance";
}

export const DAY_FOUR_BAND_RANGE: Record<Day4Band, string> = {
  "Needs Foundation": "Below 50",
  "Developing Operator": "50–64",
  "Capable Flow Manager": "65–79",
  "Strong Flow Operator": "80–89",
  "Exceptional Day 4 Performance": "90–100",
};

const SOFT_FLOOR = 35;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lin(value: number, zero: number, full: number): number {
  return Math.round(clamp01((value - zero) / (full - zero)) * 100);
}

const MARK_SCORE: Record<ZoneId, number> = {
  staging: 100,
  putaway: 100,
  aisleC: 50,
  dock: 30,
  qc: 20,
  packing: 10,
  yard: 10,
};

export interface Day4Assessment {
  dims: Record<Day4Dimension, number>;
  competencies: CompetencyScore[];
  score: number;
  band: Day4Band;
  tags: Day4Tag[];
  style: { name: string; blurb: string };
  stats: {
    minutes: number;
    fedSaturated: number;
    groceryIntoCongestion: number;
    congestionMinutes: number;
    flowEfficiency: number;
    peakCongestion: number;
    finalCongestion: number;
    finalDelay: number;
    finalReadiness: number;
    finalPickReady: number;
    lunchCtd: number;
    recoveryScore: number;
    coldExposureBreach: boolean;
    unnecessaryStop: boolean;
    heldCartons: number;
  };
  bottleneckAccuracy: "Strong" | "Moderate" | "Weak";
}

export function assessDay4(state: Day4State): Day4Assessment {
  const history = state.history.filter((snap) => snap.t > 9);
  const minutes = Math.max(1, history.length);
  const final = metricsOf(state);
  // Dairy and frozen have to come in; what the operator controls is the grocery.
  const fedSaturated = history.filter(
    (snap) => snap.groceryUnloading && snap.inflow > snap.putawayCap + 0.01 && snap.congestion >= 0.9,
  ).length;
  const groceryIntoCongestion = history.filter((snap) => snap.groceryUnloading && snap.congestion > 1).length;
  const congestionMinutes = history.filter((snap) => snap.congestion > 1 || snap.aisleBlocked > 0.5).length;
  const flowEfficiency = 1 - fedSaturated / minutes;
  const peakCongestion = history.reduce((max, snap) => Math.max(max, snap.congestion), 0);
  const ctdAtLunch = lunchCtd(final.delay, final.readiness);

  // Cartons the operator kept off a saturated floor by not unloading grocery.
  const heldCartons = history
    .filter((snap) => !snap.groceryUnloading && snap.congestion >= 0.8 && !state.vehicles.grocery.done)
    .reduce((sum) => sum + 3.1, 0);

  /* ── Bottleneck diagnosis ── */
  const markScore = state.bottleneck ? MARK_SCORE[state.bottleneck] : 0;
  const evidence = ["staging", "putaway"].filter((zone) => state.evidence.includes(zone as ZoneId)).length;
  const evidenceScore = [40, 75, 100][evidence] ?? 40;
  const relief = lin(flowEfficiency, 0.6, 0.95);
  const bottleneckDiagnosis = Math.round(0.55 * markScore + 0.15 * evidenceScore + 0.3 * relief);

  /* ── Process sequencing ── */
  let dockPlan = 100;
  if (state.plan.grocery === "now") dockPlan -= 45;
  if (state.plan.dairy !== "now") dockPlan -= 30;
  if (state.plan.frozen === "now" && state.plan.grocery === "now") dockPlan -= 10;
  const dairyQc = state.qcStarted.D1;
  const frozenQc = state.qcStarted.F1;
  let pipelineOrder = 60;
  if (dairyQc !== undefined && (frozenQc === undefined || dairyQc <= frozenQc)) pipelineOrder += 20;
  if (dairyQc !== undefined && dairyQc <= 12) pipelineOrder += 10;
  const s2Scan = state.grnStarted.S2;
  if (s2Scan !== undefined && s2Scan <= 18) pipelineOrder += 10;

  const all = state.recovery.flat();
  const blockedAtLock = state.preRecovery ? state.preRecovery.aisleBlocked > 0.2 : false;
  let recovery = 60;
  const firstWindow = state.recovery[0] ?? [];
  if (!blockedAtLock || firstWindow.includes("clearAisle") || firstWindow.includes("safeLane")) recovery += 15;
  if (final.readiness >= 0.85) recovery += 10;
  if (all.includes("continueUnload")) recovery -= 20;
  if (all.includes("cartonsToAisle")) recovery -= 20;
  recovery -= Math.min(30, state.wasted.length * 12);
  // Stopping everything is only a shutdown too far if something lunch needs was still on a vehicle.
  const coldPendingAtStop = (() => {
    const at = state.recovery.findIndex((slot) => slot.includes("stopInbound"));
    if (at < 0) return false;
    return state.batches.D1.onTruck > 0 || state.batches.F1.onTruck > 0 || state.batches.G1.onTruck > 0;
  })();
  if (coldPendingAtStop) recovery -= 15;
  const lowFirst = state.recovery.findIndex((slot) => slot.includes("slowGrocery") || slot.includes("deepStore"));
  const highFirst = state.recovery.findIndex((slot) => slot.some((a) => a === "putawayFast" || a === "putawayDairy"));
  if (lowFirst >= 0 && (highFirst < 0 || lowFirst < highFirst) && final.readiness < 0.85) recovery -= 12;
  if (all.length === 0) recovery -= 25;
  const recoveryScore = Math.max(0, Math.min(100, recovery));
  const processSequencing = Math.round(0.35 * dockPlan + 0.25 * pipelineOrder + 0.4 * recoveryScore);

  /* ── Time and priority ── */
  const ready = (id: "D1" | "G1" | "G2" | "G3") => state.batches[id].readyAt;
  let order = 70;
  const lowReady = Math.min(ready("G2") ?? 99, ready("G3") ?? 99);
  const highReady = Math.max(ready("D1") ?? 99, ready("G1") ?? 99);
  if (lowReady < 99 && lowReady < highReady) order = 30;
  else if (highReady < 99) order = 100;
  const cleared = state.aisle.clearedAt;
  const aisleEarly = cleared === null ? 0 : cleared <= 18 ? 100 : cleared <= RECOVERY_AT ? 70 : 40;
  const timePriority = Math.round(0.55 * lin(final.readiness, 0.3, 0.92) + 0.25 * order + 0.2 * aisleEarly);

  /* ── Flow and space ── */
  const exposureScore = lin(congestionMinutes / minutes, 0.8, 0.1);
  // A floor kept clear by never unloading anything is not flow: the beverages
  // lunch needs are still on the vehicle.
  const groceryReceived = (["G1", "G2", "G3"] as const).reduce(
    (sum, id) => sum + (state.batches[id].cartons - state.batches[id].onTruck),
    0,
  );
  const flowSpace = Math.max(
    0,
    Math.round(
      0.3 * exposureScore +
        0.3 * lin(final.congestion, 0.9, 0.25) +
        0.25 * lin(final.delay, 20, 4) +
        0.15 * lin(groceryReceived, 0, 28) -
        (state.unsafeAisle > 0 ? 25 : 0),
    ),
  );

  /* ── SOP and quality ── */
  const qc = state.qcIssue.status;
  const qcScore =
    qc === "quarantine" || qc === "recheck" ? 100 : qc === "accept" ? 30 : qc === "shelf" ? 0 : 60;
  const dairyOver = Math.max(0, state.batches.D1.exposure - EXPOSURE_LIMIT.chilled);
  const frozenOver = Math.max(0, state.batches.F1.exposure - EXPOSURE_LIMIT.frozen);
  const coldExposureBreach = dairyOver > 0 || frozenOver > 0;
  const coldScore = Math.max(0, 100 - dairyOver * 6 - frozenOver * 9);
  const sopQuality = Math.max(
    0,
    Math.round(
      0.45 * qcScore + 0.4 * coldScore + 15 - (state.bypassed > 0 ? 35 : 0) - (state.unsafeAisle > 0 ? 20 : 0),
    ),
  );

  /* ── Commercial ── */
  const g1 = state.batches.G1;
  const g3 = state.batches.G3;
  let shelf = g1.destination === "fastpick" ? 100 : g1.destination === "ambient" ? 60 : 30;
  if (g3.destination === "fastpick") shelf -= 30;
  const commercial = Math.max(
    0,
    Math.round(0.5 * lin(final.readiness, 0.3, 0.92) + 0.3 * lin(ctdAtLunch, 200, 170) + 0.2 * shelf),
  );

  const dims: Record<Day4Dimension, number> = {
    bottleneckDiagnosis,
    processSequencing,
    timePriority,
    flowSpace,
    sopQuality: Math.min(100, sopQuality),
    commercial,
  };

  const weighted = DAY_FOUR_DIMENSIONS.reduce(
    (sum, dimension) => sum + dims[dimension] * DAY_FOUR_WEIGHTS[dimension],
    0,
  );
  const integrity = state.bypassed > 0 ? 0.92 : 1;
  const score = Math.max(0, Math.min(100, Math.round(Math.max(SOFT_FLOOR, weighted * integrity))));

  const competencies: CompetencyScore[] = DAY_FOUR_DIMENSIONS.map((dimension) => ({
    dimension,
    label: DAY_FOUR_DIMENSION_LABEL[dimension],
    score: Math.max(SOFT_FLOOR, dims[dimension]),
    blurb: DAY_FOUR_DIMENSION_BLURB[dimension],
  }));

  const bottleneckAccuracy: Day4Assessment["bottleneckAccuracy"] =
    markScore === 100 && relief >= 55 ? "Strong" : markScore >= 50 ? "Moderate" : "Weak";

  const a: Day4Assessment = {
    dims,
    competencies,
    score,
    band: day4Band(score),
    tags: [],
    style: { name: "", blurb: "" },
    stats: {
      minutes,
      fedSaturated,
      groceryIntoCongestion,
      congestionMinutes,
      flowEfficiency,
      peakCongestion,
      finalCongestion: final.congestion,
      finalDelay: final.delay,
      finalReadiness: final.readiness,
      finalPickReady: final.pickReadyInbound,
      lunchCtd: ctdAtLunch,
      recoveryScore,
      coldExposureBreach,
      unnecessaryStop: coldPendingAtStop,
      heldCartons: Math.round(heldCartons),
    },
    bottleneckAccuracy,
  };
  a.tags = deriveTags(state, a);
  a.style = operatingStyle(state, a);
  return a;
}

/* ── Tags ─────────────────────────────────────────────────────────────── */

function deriveTags(state: Day4State, a: Day4Assessment): Day4Tag[] {
  const tags: Day4Tag[] = [];
  const add = (tag: Day4Tag, when: boolean) => {
    if (when) tags.push(tag);
  };
  const s = a.stats;
  const correct = isCorrectBottleneck(state.bottleneck);

  add("bottleneck_identified_correctly", correct);
  add("bottleneck_misdiagnosed", state.bottleneck !== null && !correct);
  add("staging_constraint_recognised", state.bottleneck === "staging");
  add("putaway_constraint_recognised", state.bottleneck === "putaway");
  add("grocery_unload_paused", state.plan.grocery !== "now" || state.groceryPausedAt !== null);
  add("grocery_unloaded_into_congestion", s.groceryIntoCongestion >= 6);
  add("cold_chain_verified", !s.coldExposureBreach && state.bypassed === 0);
  add("cold_chain_bypassed", s.coldExposureBreach);
  add("quality_issue_quarantined", state.qcIssue.status === "quarantine" || state.qcIssue.status === "recheck");
  add("quality_issue_accepted", state.qcIssue.status === "accept" || state.qcIssue.status === "shelf");
  add("aisle_c_cleared_early", state.aisle.clearedAt !== null && state.aisle.clearedAt <= 18);
  add("aisle_c_left_blocked", state.aisle.clearedAt === null || state.aisle.clearedAt > RECOVERY_AT);
  const d1 = state.batches.D1.readyAt ?? 99;
  const g1 = state.batches.G1.readyAt ?? 99;
  const g3 = state.batches.G3.readyAt ?? 99;
  const g2 = state.batches.G2.readyAt ?? 99;
  add("fast_moving_inventory_prioritised", g1 < 99 && g1 <= Math.min(g2, g3));
  add("slow_moving_inventory_prioritised", Math.min(g2, g3) < 99 && Math.min(g2, g3) < Math.max(d1, g1));
  add("high_demand_stock_pick_ready", s.finalReadiness >= 0.85);
  add("grn_control_maintained", state.bypassed === 0);
  add("verification_bypassed", state.bypassed > 0);
  add("safe_staging_used", state.safeOpen);
  add("unsafe_aisle_storage_used", state.unsafeAisle > 0);
  add("all_inbound_stopped_unnecessarily", s.unnecessaryStop);
  add("recovery_sequence_strong", s.recoveryScore >= 80);
  add("recovery_sequence_reactive", s.recoveryScore < 55);
  add("floor_congestion_reduced", s.finalCongestion < 0.6);
  add("flow_restored_before_peak", s.finalCongestion <= 0.4 && s.finalDelay <= 6);
  add("recovery_locked_by_clock", state.lockedBy === "clock");
  return tags;
}

/** When each tag becomes true of the morning, for mid-run telemetry. */
const TAG_PHASE: Partial<Record<Day4Tag, Phase>> = {
  bottleneck_identified_correctly: "dock",
  bottleneck_misdiagnosed: "dock",
  staging_constraint_recognised: "dock",
  putaway_constraint_recognised: "dock",
  cold_chain_verified: "done",
  cold_chain_bypassed: "recovery",
  aisle_c_left_blocked: "execute",
  fast_moving_inventory_prioritised: "execute",
  slow_moving_inventory_prioritised: "execute",
  high_demand_stock_pick_ready: "execute",
  grn_control_maintained: "done",
  recovery_sequence_strong: "execute",
  recovery_sequence_reactive: "execute",
  floor_congestion_reduced: "execute",
  flow_restored_before_peak: "execute",
  recovery_locked_by_clock: "execute",
  all_inbound_stopped_unnecessarily: "execute",
};

export function tagsSoFar(state: Day4State): Day4Tag[] {
  return assessDay4(state).tags.filter((tag) => {
    const phase = TAG_PHASE[tag];
    return !phase || reached(state, phase);
  });
}

/* ── Operating style ──────────────────────────────────────────────────── */

interface StyleRule {
  name: string;
  blurb: string;
  test: (state: Day4State, a: Day4Assessment) => boolean;
}

const STYLES: StyleRule[] = [
  {
    name: "Out of Time · Recovery Unplanned",
    blurb:
      "The clock ran the last twelve minutes for you. The floor carried on exactly as you left it — which is what happens to a plan nobody finishes.",
    test: (state) => state.lockedBy === "clock",
  },
  {
    name: "Throughput-Obsessed",
    blurb:
      "Everything moved, and quickly. Some of what moved went past the checks that exist to stop it, and most of it went onto a floor that was already full.",
    test: (state, a) =>
      a.stats.fedSaturated >= 10 &&
      (state.qcIssue.status === "accept" || state.qcIssue.status === "shelf" || state.unsafeAisle > 0),
  },
  {
    name: "Reactive Flow Controller",
    blurb:
      "You didn't control the inflow until the floor was already choking. The recovery you built at the end was good — the anticipation before it wasn't.",
    test: (_state, a) => a.stats.groceryIntoCongestion >= 12 && a.stats.recoveryScore >= 70,
  },
  {
    name: "Commercial Flow Thinker",
    blurb:
      "You knew what lunch would sell and got it onto the shelves. You let the floor get more crowded than it needed to on the way.",
    test: (_state, a) =>
      a.stats.finalReadiness >= 0.85 && (a.stats.groceryIntoCongestion >= 6 || a.dims.flowSpace < 70),
  },
  {
    name: "Fast Unloader · Weak Downstream Thinker",
    blurb:
      "You treated a full vehicle as the problem. The problem was a full floor — every carton you unloaded had nowhere to go, and the pickers walked around it.",
    test: (_state, a) => a.stats.groceryIntoCongestion >= 8 || a.stats.fedSaturated >= 10,
  },
  {
    name: "Floor-Clearance Specialist",
    blurb:
      "The floor came clear. What cleared first was whatever was in the way, not what lunch needed on a shelf.",
    test: (state, a) => {
      // Cleared by volume: the mixed backlog was on its shelves before the lunch lines were.
      const medium = state.batches.S2.readyAt ?? 99;
      const high = Math.min(state.batches.S1.readyAt ?? 99, state.batches.D1.readyAt ?? 99);
      return a.stats.finalCongestion <= 0.35 && a.stats.finalReadiness < 0.7 && medium < high;
    },
  },
  {
    name: "Process-Safe but Slow",
    blurb:
      "Every control held — cold chain, QC, scans. The pace didn't: the stock lunch needed was still in the building but not on a shelf.",
    test: (_state, a) => a.dims.sopQuality >= 90 && a.stats.finalReadiness < 0.7,
  },
  {
    name: "Flow-Led Operator",
    blurb:
      "You saw that the constraint was not vehicle arrival but the rate stock left staging. You controlled inflow, restored picker movement and had lunch on the shelves before lunch.",
    test: (_state, a) =>
      a.dims.bottleneckDiagnosis >= 85 &&
      a.dims.flowSpace >= 75 &&
      a.stats.finalReadiness >= 0.8 &&
      a.dims.sopQuality >= 80,
  },
  {
    name: "Bottleneck Solver",
    blurb:
      "You found the real constraint and relieved it. The next step is making sure the stock that flows first is the stock that sells first.",
    test: (_state, a) => a.dims.bottleneckDiagnosis >= 85 && a.stats.flowEfficiency >= 0.85,
  },
  {
    name: "Quality-First Operator",
    blurb:
      "Nothing unsafe reached a shelf. The commercial picture — what lunch would find — came second to that, and it showed.",
    test: (_state, a) => a.dims.sopQuality >= 95 && a.dims.commercial < 75,
  },
  {
    name: "Strong Prioritiser",
    blurb: "You knew what mattered at 11:00 and put it first, every time the choice came up.",
    test: (_state, a) => a.dims.timePriority >= 85,
  },
  {
    name: "Steady Floor Operator",
    blurb: "No collapse and no breakthrough. The floor held; the next edge is seeing the constraint sooner.",
    test: () => true,
  },
];

function operatingStyle(state: Day4State, a: Day4Assessment): { name: string; blurb: string } {
  const rule = STYLES.find((candidate) => candidate.test(state, a));
  return rule ? { name: rule.name, blurb: rule.blurb } : { name: "Steady Floor Operator", blurb: "" };
}

/** Day 4 read against the five competencies every day reports into. */
export function operatorCompetencies(a: Day4Assessment): Record<string, number> {
  const mean = (...values: number[]) => Math.round(values.reduce((s, v) => s + v, 0) / values.length);
  return {
    priority: mean(a.dims.timePriority, a.dims.processSequencing),
    reasoning: a.dims.bottleneckDiagnosis,
    inventory: mean(a.dims.sopQuality, a.dims.flowSpace),
    team: a.dims.processSequencing,
    customer: a.dims.commercial,
  };
}
