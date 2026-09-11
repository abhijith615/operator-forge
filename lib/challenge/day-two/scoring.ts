import { day2Metrics, efficiencyTags } from "./engine";
import { pgReached } from "./parleg/engine";
import { OVERREACH_TAGS, pgBreaches, scoreParleG } from "./parleg/scoring";
import type { ParleGState, PgTag } from "./parleg/types";
import {
  DAY_TWO_DIMENSIONS,
  DAY_TWO_DIMENSION_BLURB,
  DAY_TWO_DIMENSION_LABEL,
  EARBUDS_DIMENSIONS,
  type CaseState,
  type Day2Dimension,
  type Day2Signals,
  type Day2Tag,
  type EarbudsDimension,
  type ParlegDimension,
} from "./types";
import type { CompetencyScore } from "../types";

/**
 * Day 2 assessment configuration.
 *
 * Same discipline as Day 1: every number that shapes a score is in this file
 * or in the case's own scoring file, and no component knows a weight. Day 2
 * now reads two cases. Each scores the dimensions it can actually observe;
 * where both read the same dimension, the day's score is their average, and a
 * dimension only one case reads is left out entirely if that case was never
 * reached — an operator is not scored on work they did not get to.
 */

export const DAY_TWO_WEIGHTS: Record<Day2Dimension, number> = {
  rootCause: 0.18,
  evidenceDiscipline: 0.16,
  inventoryReasoning: 0.16,
  patternRecognition: 0.1,
  processDiscipline: 0.1,
  correctiveAction: 0.08,
  lossPrevention: 0.08,
  prioritisation: 0.08,
  delegation: 0.06,
};

/**
 * Case 01's reachable signal ranges, derived by walking every path in
 * earbuds.ts and engine.ts rather than guessed. `ceiling` is what a thorough,
 * disciplined run actually accumulates — not a theoretical maximum nobody can
 * hit, which is how a scale ends up unable to award a 90 to an excellent run.
 */
const BOUNDS: Record<EarbudsDimension, { floor: number; ceiling: number }> = {
  inventoryReasoning: { floor: 1, ceiling: 15 },
  rootCause: { floor: -5, ceiling: 20 },
  evidenceDiscipline: { floor: -18, ceiling: 24 },
  prioritisation: { floor: -7, ceiling: 7 },
  lossPrevention: { floor: -6, ceiling: 10 },
  delegation: { floor: -3, ceiling: 10 },
};

const SOFT_FLOOR = 35;
const SOFT_FLOOR_TOTAL = 35;

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Prioritisation is the one dimension almost nothing in Case 01's interaction
 * model emits directly — you cannot click "I was targeted". It is derived at
 * scoring time from how the investigation was actually shaped: how much of
 * what the learner opened was worth opening, and how wide they cast the net.
 */
function derivedSignals(state: CaseState): Partial<Day2Signals> {
  const metrics = day2Metrics(state);
  let prioritisation = 0;
  let inventoryReasoning = 0;

  // Counting the shelf is half of inventory reasoning; the other half is
  // asking what the system believed. A learner who settles units without ever
  // opening the movement log has found stock without ever establishing what
  // the variance was made of — which is exactly the process-blind failure.
  if (state.tags.includes("physical_count_completed") &&
      !state.tags.includes("movement_log_checked")) {
    inventoryReasoning -= 3;
  }

  if (metrics.totalActions >= 4) {
    if (metrics.evidenceEfficiency >= 0.75) prioritisation += 4;
    else if (metrics.evidenceEfficiency >= 0.6) prioritisation += 2;
    else if (metrics.evidenceEfficiency < 0.5) prioritisation -= 2;
  }

  // A narrow investigation that still found the answers. Only credited when
  // the learner actually settled units — being brief and wrong is not focus.
  if (metrics.totalActions <= 12 && state.settled.length >= 2) prioritisation += 2;

  return { prioritisation, inventoryReasoning };
}

function totalSignals(state: CaseState): Day2Signals {
  const derived = derivedSignals(state);
  return {
    ...state.signals,
    prioritisation: state.signals.prioritisation + (derived.prioritisation ?? 0),
    inventoryReasoning:
      state.signals.inventoryReasoning + (derived.inventoryReasoning ?? 0),
  };
}

/* ── Judgement breaches ───────────────────────────────────────────────── */

/**
 * Day 2's answer to Day 1's SOP violations. These are the moves that a
 * competent investigator does not make, and they multiply rather than subtract
 * so that a run which found both explainable units cannot buy its way past
 * having named an employee on no evidence.
 */
interface Breach {
  tag: Day2Tag;
  label: string;
  severity: number;
}

const BREACHES: Breach[] = [
  {
    tag: "premature_theft_assumption",
    label: "Named a member of staff before the movement trail was complete",
    severity: 0.8,
  },
  {
    tag: "premature_writeoff",
    label: "Moved to write the value off before the investigation closed",
    severity: 0.88,
  },
  {
    tag: "unnecessary_store_shutdown",
    label: "Halted store-wide fulfilment for a single-SKU variance",
    severity: 0.92,
  },
];

export function breachesIn(state: CaseState): Breach[] {
  return BREACHES.filter((breach) => state.tags.includes(breach.tag));
}

/* ── Case 01 competencies ─────────────────────────────────────────────── */

export function scoreDay2Competencies(state: CaseState): CompetencyScore[] {
  const signals = totalSignals(state);
  const severe = breachesIn(state).length >= 2;

  return EARBUDS_DIMENSIONS.map((dimension) => {
    const { floor, ceiling } = BOUNDS[dimension];
    const normalised = clamp(
      Math.round(((signals[dimension] - floor) / (ceiling - floor)) * 100),
    );
    return {
      dimension,
      label: DAY_TWO_DIMENSION_LABEL[dimension],
      score: severe ? normalised : Math.max(normalised, SOFT_FLOOR),
      blurb: DAY_TWO_DIMENSION_BLURB[dimension],
    };
  });
}

/* ── The day, across both cases ───────────────────────────────────────── */

export interface Day2Score {
  competencies: CompetencyScore[];
  score: number;
  breaches: { label: string; severity: number }[];
  /** Labels of dimensions no reached case could read. */
  notReached: string[];
}

export function scoreDay2(earbuds: CaseState, parleg: ParleGState | null): Day2Score {
  const fromEarbuds = new Map(scoreDay2Competencies(earbuds).map((c) => [c.dimension, c.score]));
  const fromParleg = parleg ? scoreParleG(parleg) : null;

  const competencies: CompetencyScore[] = [];
  const notReached: string[] = [];

  for (const dimension of DAY_TWO_DIMENSIONS) {
    const readings: number[] = [];
    const e = fromEarbuds.get(dimension);
    if (e !== undefined) readings.push(e);
    const p = fromParleg?.[dimension as ParlegDimension];
    if (p !== undefined) readings.push(p);

    if (readings.length === 0) {
      notReached.push(DAY_TWO_DIMENSION_LABEL[dimension]);
      continue;
    }
    competencies.push({
      dimension,
      label: DAY_TWO_DIMENSION_LABEL[dimension],
      score: Math.round(readings.reduce((sum, value) => sum + value, 0) / readings.length),
      blurb: DAY_TWO_DIMENSION_BLURB[dimension],
    });
  }

  // Weights renormalised over the dimensions actually read.
  const totalWeight = competencies.reduce(
    (sum, entry) => sum + DAY_TWO_WEIGHTS[entry.dimension as Day2Dimension],
    0,
  );
  const weighted =
    competencies.reduce(
      (sum, entry) => sum + entry.score * DAY_TWO_WEIGHTS[entry.dimension as Day2Dimension],
      0,
    ) / (totalWeight || 1);

  // Diminishing, exactly as Day 1: two breaches is already a clear verdict and
  // multiplying them raw produces a number that stops carrying information.
  const breaches = [
    ...breachesIn(earbuds).map(({ label, severity }) => ({ label, severity })),
    ...(parleg ? pgBreaches(parleg).map(({ label, severity }) => ({ label, severity })) : []),
  ];
  const integrity = [...breaches]
    .sort((a, b) => a.severity - b.severity)
    .reduce(
      (multiplier, breach, index) =>
        multiplier * (1 - (1 - breach.severity) * Math.pow(0.55, index)),
      1,
    );

  const scored = weighted * integrity;
  const floored = breaches.length >= 2 ? scored : Math.max(scored, SOFT_FLOOR_TOTAL);

  return { competencies, score: clamp(Math.round(floored)), breaches, notReached };
}

/* ── Bands ────────────────────────────────────────────────────────────── */

export type Day2Band =
  | "Needs Foundation"
  | "Developing Investigator"
  | "Methodical Investigator"
  | "Strong Investigator"
  | "Exceptional Day 2 Performance";

export function day2Band(score: number): Day2Band {
  if (score < 50) return "Needs Foundation";
  if (score < 65) return "Developing Investigator";
  if (score < 80) return "Methodical Investigator";
  if (score < 90) return "Strong Investigator";
  return "Exceptional Day 2 Performance";
}

export const DAY_TWO_BAND_RANGE: Record<Day2Band, string> = {
  "Needs Foundation": "Below 50",
  "Developing Investigator": "50–64",
  "Methodical Investigator": "65–79",
  "Strong Investigator": "80–89",
  "Exceptional Day 2 Performance": "90–100",
};

/* ── Investigator signature ───────────────────────────────────────────── */

interface SignatureRule {
  name: string;
  blurb: string;
  test: (ctx: SignatureContext) => boolean;
}

interface SignatureContext {
  has: (tag: Day2Tag) => boolean;
  pg: (tag: PgTag) => boolean;
  pgReached: boolean;
  pgFlowSolved: boolean;
  pgOverreach: boolean;
  score: (dimension: Day2Dimension) => number;
  breaches: number;
  settled: number;
  efficiency: number;
  actions: number;
  unsupported: number;
}

/**
 * Checked in order, most specific first, so an unusual run gets a name that
 * describes it rather than falling through to the safe middle.
 */
const SIGNATURES: SignatureRule[] = [
  {
    name: "Jumped to the Person",
    blurb:
      "You had a name before you had a trail. Every variance has a story, and the one the access log suggests is almost never the one the movement log tells.",
    test: (c) => c.has("premature_theft_assumption"),
  },
  {
    name: "Closer · Books Before Answers",
    blurb:
      "You wanted the number settled tonight. Writing a high-value gap off before it is understood turns a solvable process problem into an accepted cost.",
    test: (c) => c.has("premature_writeoff") || c.pg("blind_writeoff"),
  },
  {
    name: "Fixed the Numbers, Not the Cause",
    blurb:
      "You brought the Parle-G records back into line without finding out why they drifted. They are right tonight; the pick process that bent them is unchanged.",
    test: (c) => c.pg("corrected_without_cause"),
  },
  {
    name: "Out of Time · Trail Unfinished",
    blurb:
      "The clock closed the audit before you did. The records that explained what you had not reached were already on the screen — the gap was pace through the trail, not the ability to read it.",
    test: (c) => (c.has("audit_timed_out") && c.settled < 2) || c.pg("case_timed_out"),
  },
  {
    name: "Found It · Overcorrected",
    blurb:
      "You worked the drift out and then reached for controls far wider than a two-SKU picking error. Those controls cost the store every shift after tonight.",
    test: (c) => c.pgOverreach && c.pgFlowSolved,
  },
  {
    name: "Counted, Not Investigated",
    blurb:
      "You established the physical count and stopped there. A count tells you how big the hole is; only the movement trail tells you what made it.",
    test: (c) => c.settled === 0 && c.has("physical_count_completed"),
  },
  {
    name: "Thorough · Wide Net",
    blurb:
      "You got there, and you opened a great deal to do it. At two in the morning with one shift's worth of records that works; across a cluster of stores it does not scale.",
    test: (c) => c.settled >= 2 && c.efficiency < 0.55,
  },
  {
    name: "Systems Thinker · Cause Before Correction",
    blurb:
      "In both cases you found the mechanism before touching the numbers — a scan step that was skipped, in two different ways — and you put the control back rather than only fixing its output.",
    test: (c) =>
      c.settled >= 2 &&
      c.unsupported === 0 &&
      c.pg("inventory_flow_understood") &&
      c.pg("scan_control_selected") &&
      !c.pgOverreach,
  },
  {
    name: "Trail Reader · Held the Line",
    blurb:
      "You rebuilt the movement of every unit, separated what left legitimately from what was still in the building, and escalated the one you could not close rather than dressing it up.",
    test: (c) =>
      c.settled >= 2 &&
      c.unsupported === 0 &&
      c.score("evidenceDiscipline") >= 70 &&
      c.has("loss_prevention_escalated"),
  },
  {
    name: "Evidence-Led Investigator",
    blurb:
      "Conclusions arrived after the records that support them. That ordering is the whole job — it is also the habit that survives contact with a case where somebody actually did take something.",
    test: (c) => c.settled >= 2 && c.unsupported === 0,
  },
  {
    name: "Found the Stock · Missed the Cause",
    blurb:
      "You accounted for units without separating the record failure from the location failure. Both units came back on paper; only one of them came back on a shelf.",
    test: (c) => c.settled >= 1 && c.score("rootCause") < 55,
  },
  {
    name: "Cautious Auditor",
    blurb:
      "You worked carefully and did not overreach. The gap to close is finishing the trail — most of what was missing was accountable with the records already in front of you.",
    test: () => true,
  },
];

export function day2Signature(
  state: CaseState,
  competencies: CompetencyScore[],
  parleg: ParleGState | null = null,
): { name: string; blurb: string } {
  const byDimension = new Map(competencies.map((c) => [c.dimension, c.score]));
  const metrics = day2Metrics(state);
  const tags = new Set<Day2Tag>([...state.tags, ...efficiencyTags(state)]);
  const pgTags = new Set<PgTag>(parleg?.tags ?? []);

  const context: SignatureContext = {
    has: (t) => tags.has(t),
    pg: (t) => pgTags.has(t),
    pgReached: parleg ? pgReached(parleg) : false,
    pgFlowSolved: parleg?.flowSolved ?? false,
    pgOverreach: OVERREACH_TAGS.some((t) => pgTags.has(t)),
    score: (dimension) => byDimension.get(dimension) ?? 50,
    breaches: breachesIn(state).length,
    settled: state.settled.length,
    efficiency: metrics.evidenceEfficiency,
    actions: metrics.totalActions,
    unsupported: metrics.unsupportedFindings,
  };

  const match = SIGNATURES.find((rule) => rule.test(context));
  return match
    ? { name: match.name, blurb: match.blurb }
    : { name: "Cautious Auditor", blurb: "" };
}
