import {
  DIMENSIONS,
  DIMENSION_BLURB,
  DIMENSION_LABEL,
  type Band,
  type CompetencyScore,
  type Dimension,
  type SimulationState,
} from "./types";

/**
 * Assessment configuration and scoring.
 *
 * Every number that shapes a score lives in this file. Nothing in the UI knows
 * a weight, and no scoring constant is scattered through a component — which
 * is what makes the result reproducible and reviewable.
 */

/** Day 1 weights. Days 2–6 will re-weight the same five dimensions. */
export const DAY_ONE_WEIGHTS: Record<Dimension, number> = {
  priority: 0.25,
  reasoning: 0.2,
  inventory: 0.2,
  team: 0.2,
  customer: 0.15,
};

/**
 * The raw signal range each dimension can reach across a full run, used to map
 * accumulated signal onto 0–100. Derived by walking every path in day-one.ts:
 * `floor` is what a consistently poor run accumulates, `ceiling` what a strong
 * one does. Not a theoretical maximum — hitting the ceiling should be possible.
 */
const BOUNDS: Record<Dimension, { floor: number; ceiling: number }> = {
  priority: { floor: -16, ceiling: 24 },
  reasoning: { floor: -22, ceiling: 22 },
  // Only two decision points feed inventory on Day 1, so the scale is kept
  // deliberately wide: a 95 off two signals would be more confidence than the
  // evidence supports.
  inventory: { floor: -10, ceiling: 11 },
  team: { floor: -12, ceiling: 19 },
  customer: { floor: -22, ceiling: 20 },
};

/**
 * A first-time student who engages honestly should not be told they scored 12.
 * Floors are applied per dimension and to the total — but they lift only when
 * the run is free of repeated process breaches, so the floor cannot be used to
 * launder a shift that skipped scans and mixed chemicals with food.
 */
const SOFT_FLOOR = 35;
const SOFT_FLOOR_TOTAL = 35;

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function normalise(raw: number, dimension: Dimension): number {
  const { floor, ceiling } = BOUNDS[dimension];
  const span = ceiling - floor;
  return clamp(Math.round(((raw - floor) / span) * 100));
}

export function scoreCompetencies(state: SimulationState): CompetencyScore[] {
  const severe = state.sopViolations.length >= 2;

  return DIMENSIONS.map((dimension) => {
    const normalised = normalise(state.signals[dimension], dimension);
    const score = severe ? normalised : Math.max(normalised, SOFT_FLOOR);
    return {
      dimension,
      label: DIMENSION_LABEL[dimension],
      score,
      blurb: DIMENSION_BLURB[dimension],
    };
  });
}

/**
 * The headline number.
 *
 * SOP violations multiply rather than subtract, so a fast shift built on
 * skipped verification cannot out-score a slower one that kept the process —
 * which is the whole point of tracking them separately from the dimensions.
 */
export function scoreOverall(
  competencies: CompetencyScore[],
  state: SimulationState,
): number {
  const weighted = competencies.reduce(
    (sum, entry) => sum + entry.score * DAY_ONE_WEIGHTS[entry.dimension],
    0,
  );

  // Each further breach costs less than the one before. Three violations is
  // already a clear verdict; multiplying them raw drives the score to a number
  // that stops carrying information and just reads as punishment.
  const integrity = [...state.sopViolations]
    .sort((a, b) => a.severity - b.severity)
    .reduce(
      (multiplier, violation, index) =>
        multiplier * (1 - (1 - violation.severity) * Math.pow(0.55, index)),
      1,
    );

  const scored = weighted * integrity;
  const floored =
    state.sopViolations.length >= 2 ? scored : Math.max(scored, SOFT_FLOOR_TOTAL);

  return clamp(Math.round(floored));
}

export function bandFor(score: number): Band {
  if (score < 50) return "Needs Foundation";
  if (score < 65) return "Developing Operator";
  if (score < 80) return "Operationally Promising";
  if (score < 90) return "Strong Operator";
  return "Exceptional Day 1 Performance";
}

export const BAND_RANGE: Record<Band, string> = {
  "Needs Foundation": "Below 50",
  "Developing Operator": "50–64",
  "Operationally Promising": "65–79",
  "Strong Operator": "80–89",
  "Exceptional Day 1 Performance": "90–100",
};

/* ── Decision signature ───────────────────────────────────────────────── */

interface SignatureRule {
  name: string;
  blurb: string;
  /** Every predicate must hold. First match in order wins. */
  test: (ctx: SignatureContext) => boolean;
}

interface SignatureContext {
  has: (tag: string) => boolean;
  score: (dimension: Dimension) => number;
  violations: number;
  medianDecisionMs: number;
  /** Share of decisions that were timeouts rather than choices. */
  expiredRatio: number;
}

/**
 * Eight deterministic archetypes, checked in order. Specific combinations sit
 * above general ones so an unusual run gets a name that actually describes it
 * rather than falling through to the safe middle.
 */
const SIGNATURES: SignatureRule[] = [
  {
    name: "Watcher · Slow to Commit",
    blurb:
      "Most of the board timed out rather than being decided. The store does not wait for certainty — an imperfect call made in time beats a good one made after the queue has moved.",
    // Checked before everything else: a run that barely engaged should not be
    // handed a name that describes an operating style it never demonstrated.
    test: (c) => c.expiredRatio >= 0.5,
  },
  {
    name: "High-Speed Executor · Process Risk",
    blurb:
      "You move quickly and you get orders out. Twice, the thing you moved past was the check that protects the customer.",
    test: (c) => c.violations >= 2,
  },
  {
    name: "Speed First · Verification Second",
    blurb:
      "Good instincts for flow. The shortcut you took would have cost more downstream than it saved at the bay.",
    test: (c) => c.violations >= 1 && c.score("priority") >= 60,
  },
  {
    name: "Customer Protector · Needs Capacity Awareness",
    blurb:
      "You defended the person waiting at the other end. What you did not watch was where the queue would form next.",
    test: (c) => c.score("customer") >= 72 && c.score("priority") < 58,
  },
  {
    name: "Analytical Operator · Slow to Escalate",
    blurb:
      "You reason your way to the right answer. You reach for other people later than the floor needs you to.",
    test: (c) =>
      c.score("reasoning") >= 68 && c.score("team") < 58 && !c.has("delegated_effectively"),
  },
  {
    name: "Calm Prioritiser · Process Strong",
    blurb:
      "You held the sequence together without breaking anything to do it. Nothing left the store unverified.",
    test: (c) =>
      c.violations === 0 &&
      !c.has("reacted_late") &&
      c.score("priority") >= 70 &&
      c.score("customer") >= 62,
  },
  {
    name: "Inventory Detective · Reactive on Flow",
    blurb:
      "You do not accept an empty shelf at face value. The fulfillment queue moves without you noticing it move.",
    test: (c) =>
      c.has("replenished_pickface") &&
      c.score("inventory") >= 70 &&
      c.has("reacted_late"),
  },
  {
    name: "Fast Responder · Slightly Reactive",
    blurb:
      "You act decisively once a number turns. The gap to close is seeing it turn before it does.",
    test: (c) => c.has("reacted_late") && c.score("priority") >= 50,
  },
  {
    name: "Balanced Floor Leader",
    blurb:
      "No single spike, no single hole. You kept four stages moving at once, which is most of this job.",
    test: () => true,
  },
];

export function decisionSignature(
  state: SimulationState,
  competencies: CompetencyScore[],
): { name: string; blurb: string } {
  const byDimension = new Map(competencies.map((c) => [c.dimension, c.score]));
  const tagSet = new Set(state.tags);

  const latencies = state.decisions
    .map((decision, index, all) =>
      index === 0 ? decision.at : decision.at - (all[index - 1]?.at ?? 0),
    )
    .sort((a, b) => a - b);

  const expired = state.decisions.filter(
    (decision) => decision.chosenAction === "expired",
  ).length;

  const context: SignatureContext = {
    has: (tag) => tagSet.has(tag as never),
    score: (dimension) => byDimension.get(dimension) ?? 50,
    expiredRatio:
      state.decisions.length > 0 ? expired / state.decisions.length : 0,
    violations: state.sopViolations.length,
    medianDecisionMs: latencies[Math.floor(latencies.length / 2)] ?? 0,
  };

  const match = SIGNATURES.find((rule) => rule.test(context));
  return match
    ? { name: match.name, blurb: match.blurb }
    : { name: "Balanced Floor Leader", blurb: "" };
}
