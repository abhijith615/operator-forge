/**
 * The 7-Day Dark Store Operations Challenge.
 *
 * One day is a short, continuous simulation: the operator watches a store,
 * decides, and the store answers. Nothing here knows about React — scenario
 * content, state transitions, scoring and feedback are separate layers so
 * Days 2–6 can reuse the whole engine and only supply new content.
 */

/**
 * Streams and priorities are shared with the 30-minute mission so a task reads
 * the same wherever it appears.
 */
export type { TaskPriority, TaskStream } from "@/types/tasks";

/* ── Assessment dimensions ────────────────────────────────────────────── */

export const DIMENSIONS = [
  "priority",
  "reasoning",
  "inventory",
  "team",
  "customer",
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

export const DIMENSION_LABEL: Record<Dimension, string> = {
  priority: "Time & Priority Management",
  reasoning: "Critical & Logical Thinking",
  inventory: "Inventory Management",
  team: "Team Management",
  customer: "Customer-First Judgement",
};

/** What each dimension is actually reading, for the scorecard. */
export const DIMENSION_BLURB: Record<Dimension, string> = {
  priority: "Whether you moved before the metric turned, and in what order.",
  reasoning: "Whether you found the real cause rather than the visible symptom.",
  inventory: "Whether you treated stock as a system rather than a shelf.",
  team: "How you used the people you had, and what you delegated.",
  customer: "Whether the person waiting stayed real to you under pressure.",
};

export type SignalDelta = Partial<Record<Dimension, number>>;

export type Signals = Record<Dimension, number>;

export function emptySignals(): Signals {
  return { priority: 0, reasoning: 0, inventory: 0, team: 0, customer: 0 };
}

/* ── Behavioural tags ─────────────────────────────────────────────────── */

/**
 * Tags are how feedback stays specific. Every option attaches the ones it
 * earns, and the feedback engine reads combinations rather than scores — so a
 * sentence can name what somebody actually did instead of describing a number.
 */
export type DecisionTag =
  | "balanced_floor"
  | "overstaffed_picking"
  | "abandoned_packing"
  | "left_dispatch_bare"
  | "used_cross_training"
  | "anticipated_bottleneck"
  | "reacted_late"
  | "froze_the_line"
  | "investigated_nil_pick"
  | "cancelled_without_investigation"
  | "replenished_pickface"
  | "took_single_unit"
  | "substituted_item"
  | "read_sop"
  | "maintained_food_segregation"
  | "broke_food_segregation"
  | "protected_fragile_goods"
  | "protected_cold_chain"
  | "maintained_dispatch_verification"
  | "bypassed_dispatch_verification"
  | "kept_dispatch_moving"
  | "stalled_dispatch"
  | "delegated_effectively"
  | "manager_overinvolved"
  | "maintained_scan_discipline"
  | "skipped_scan_discipline"
  | "solved_true_bottleneck"
  | "coordinated_riders";

/** SOP breaches are tracked separately: they can outweigh a fast shift. */
export interface SopViolation {
  id: string;
  scene: SceneId;
  label: string;
  /** Multiplier applied to the final score. Below 1. */
  severity: number;
}

/* ── The store ────────────────────────────────────────────────────────── */

export interface Metrics {
  ordersWaiting: number;
  /** Click-to-dispatch, in seconds. The store's headline number. */
  ctd: number;
  packingQueue: number;
  nilPicks: number;
  ridersWaiting: number;
  /** Percentage, 0–100. */
  pickingCapacity: number;
}

export type MetricEffect = Partial<Record<keyof Metrics, number>>;

export type Station = "picking" | "packing" | "dispatch";

export const STATIONS: Station[] = ["picking", "packing", "dispatch"];

export const STATION_LABEL: Record<Station, string> = {
  picking: "Picking",
  packing: "Packing",
  dispatch: "Dispatch",
};

export interface Employee {
  id: string;
  name: string;
  primary: Station;
  secondary: Station | null;
  /** Picking Per Item, seconds. Store-level benchmark, not an industry one. */
  ppi?: number;
  accuracy: number;
  accuracyLabel: string;
}

export type StaffingPlan = Record<string, Station>;

/* ── Scenes ───────────────────────────────────────────────────────────── */

export type SceneId =
  | "opening"
  | "floor"
  | "flow"
  | "nil-pick"
  | "packing"
  | "dispatch"
  | "recovery"
  | "complete";

/** Ordered, and used for the shift-progress dots. */
export const PLAYABLE_SCENES: SceneId[] = [
  "floor",
  "flow",
  "nil-pick",
  "packing",
  "dispatch",
  "recovery",
];

export interface SceneChoice {
  id: string;
  label: string;
  /** One line of detail under the label. Never reveals whether it is good. */
  detail?: string;
  signals: SignalDelta;
  tags: DecisionTag[];
  metricEffect?: MetricEffect;
  /** Shown after the choice, in the store's voice. */
  outcome: {
    tone: "healthy" | "warning" | "critical" | "neutral";
    headline: string;
    body: string;
  };
  sop?: Omit<SopViolation, "scene">;
}

/* ── The record of a run ──────────────────────────────────────────────── */

export interface DecisionRecord {
  scene: SceneId;
  decisionId: string;
  chosenAction: string;
  /** Milliseconds since the simulation started. */
  at: number;
  simulatedTime: string;
  metricsBefore: Metrics;
  metricsAfter: Metrics;
  signals: SignalDelta;
  tags: DecisionTag[];
  sopImpact: string | null;
}

export interface SimulationState {
  scene: SceneId;
  simulatedTime: string;
  startedAt: number;
  completedAt: number | null;
  metrics: Metrics;
  staffing: StaffingPlan;
  decisions: DecisionRecord[];
  signals: Signals;
  tags: DecisionTag[];
  sopViolations: SopViolation[];
  hintsUsed: string[];
  /** Locations opened during the nil-pick investigation. */
  inspected: string[];
}

/* ── Result ───────────────────────────────────────────────────────────── */

/**
 * `dimension` is a plain string rather than the Day 1 union because each day
 * assesses its own set: Day 1 reads five operating dimensions, Day 2 reads six
 * investigative ones. The label travels with the score so a stored result can
 * be rendered years later without the reader knowing which day produced it.
 */
export interface CompetencyScore {
  dimension: string;
  label: string;
  score: number;
  blurb: string;
}

export type Band =
  | "Needs Foundation"
  | "Developing Operator"
  | "Operationally Promising"
  | "Strong Operator"
  | "Exceptional Day 1 Performance";

export interface FeedbackItem {
  title: string;
  body: string;
}

/**
 * What a finished day produces, whichever day it was.
 *
 * `band` is a string and `finalMetrics` is optional so days with different
 * shapes can share one stored result, one leaderboard row and one save path.
 * `day` says which set of rules produced the numbers, so a renderer never has
 * to guess.
 */
export interface ChallengeResult {
  day: number;
  score: number;
  band: string;
  bandRange: string;
  competencies: CompetencyScore[];
  signature: { name: string; blurb: string };
  strengths: FeedbackItem[];
  gaps: FeedbackItem[];
  replay: string[];
  learned: FeedbackItem[];
  sopViolations: SopViolation[];
  decisionCount: number;
  /** Day 1 only — the store's board at the end of the shift. */
  finalMetrics?: Metrics;
  /** Day 2 only — the value reconciliation and investigation quality. */
  forensics?: ForensicSummary;
  /** Day 3 only — the peak plan, what it did, and how it was built. */
  workforce?: WorkforceSummary;
  /** Day 4 only — the floor before and after, and how it was cleared. */
  flow?: FlowSummary;
  /** Day 5 only — what each customer ended up holding. */
  promise?: PromiseSummary;
  durationMs: number;
}

/** The Day 5 numbers a scorecard needs, flattened for storage. */
export interface PromiseSummary {
  outcome: {
    title: "PROMISES PROTECTED" | "PROMISES PARTLY HELD" | "PROMISES BROKEN";
    /** Out of five journeys — four cases and the three-customer finale. */
    promiseProtection: number;
    customerEffort: "Low" | "Moderate" | "High";
    customerEffortScore: number;
    metricCourage: number;
    needVsTransaction: number;
    /** Seconds of click-to-dispatch spent protecting customers. */
    ctdCost: number;
    /** Rupees of packaging, markdown, substitution and recovery. */
    spend: number;
    wasteUnits: number;
  };
  /** Usability, quality, safety, effort and trust, averaged across the evening. */
  promise: { usability: number; quality: number; safety: number; effort: number; trust: number };
  journeys: {
    id: string;
    label: string;
    customer: string;
    /** Whether the final customer-use node lit up. */
    state: "clear" | "risk" | "broken";
    headline: string;
    detail: string;
  }[];
  prevention: { incident: string; control: string | null; fits: boolean }[];
  timeline: { time: string; tone: "good" | "warn"; text: string }[];
  bestCall: FeedbackItem | null;
  developmentArea: { area: string; body: string };
  /** One deterministic paragraph about how this operator decides. */
  insight: string;
  operatorCompetencies: Record<string, number>;
  lockedByClock: boolean;
}

/** The Day 4 numbers a scorecard needs, flattened for storage. */
export interface FlowSummary {
  outcome: {
    title: "FLOOR CLEARED" | "FLOOR STABILISED" | "FLOOR UNDER PRESSURE";
    peakReady: boolean;
    congestion: { from: number; to: number };
    routeDelay: { from: number; to: number };
    pickReady: { from: number; to: number };
    ctd: { from: number; to: number };
    priorityReadiness: number;
    qcFlags: number;
    quarantined: number;
  };
  metrics: {
    flowEfficiency: number;
    bottleneckAccuracy: "Strong" | "Moderate" | "Weak";
    congestionMinutes: number;
    congestionShare: number;
    priorityReadiness: number;
    sopIntegrity: number;
  };
  timeline: { time: string; tone: "good" | "warn"; text: string }[];
  bestCall: FeedbackItem | null;
  developmentArea: { area: string; body: string };
  operatorCompetencies: Record<string, number>;
  lockedByClock: boolean;
}

/** The Day 3 numbers a scorecard needs, flattened for storage. */
export interface WorkforceSummary {
  outcome: {
    title: "PEAK CLEARED" | "PEAK SURVIVED";
    ordersHandled: number;
    ordersForecast: number;
    peakCoverage: number;
    avgPackingQueue: number;
    riderCoverage: number;
    riderShortageMinutes: number;
    tempSpend: number;
    riderSpend: number;
    abandonedStation: string | null;
  };
  metrics: {
    capacityAnticipation: number;
    skillUtilisation: number;
    peakCoverage: number;
    /** Share of booked flex hours that landed where a station was short. Null with no flex. */
    flexEfficiency: number | null;
    flexUsefulHours: number;
    flexHours: number;
    flexBudget: number;
  };
  risks: {
    fatigue: "Low" | "Moderate" | "High";
    untrainedAssignments: number;
    expertDependency: boolean;
    unnecessaryRemoval: boolean;
  };
  plan: {
    picking: number;
    packing: number;
    dispatch: number;
    flex: number;
    riders: number;
    receiving: string;
    audit: string;
    flexCost: number;
    riderCost: number;
  };
  timeline: { time: string; tone: "good" | "warn"; text: string }[];
  bestCall: FeedbackItem | null;
  developmentArea: { area: string; body: string };
  /** The two people moments. Optional: runs saved before the module lack it. */
  people?: {
    arjun: {
      outcome: string;
      label: string;
      checked: boolean;
      inPrivate: boolean;
      extended: boolean;
    };
    riya: {
      interventions: string[];
      diagnosed: boolean;
      development: "High" | "Medium" | "Low";
      ppiFrom: number;
      ppiTo: number | null;
    };
    balance: { trust: number; standards: number; label: string; name: string; body: string };
  };
  bestPeopleCall?: FeedbackItem | null;
  /** Day 3 mapped onto the five competencies every day reports into. */
  operatorCompetencies: Record<string, number>;
  lockedByClock: boolean;
}

/** The Day 2 numbers a scorecard needs, flattened for storage. */
export interface ForensicSummary {
  originalVariance: number;
  explainedValue: number;
  recoveredValue: number;
  unresolvedValue: number;
  caseExposure: number;
  caseExplainedUnits: number;
  caseRecoveredUnits: number;
  caseUnresolvedUnits: number;
  evidenceEfficiency: number;
  usefulActions: number;
  totalActions: number;
  unsupportedFindings: number;
  /** The fifteen minutes ran out before the audit entry was signed. */
  timedOut?: boolean;
  /** Case 02, if it was opened. Record units are reported, never added to money. */
  parleg?: {
    reconciled: boolean;
    rootCauseEstablished: boolean;
    recordUnitsCorrected: number;
    recordUnitsAffected: number;
    netValueImpact: number;
    affectedTransactions: number;
    preventiveControls: string[];
    timedOut: boolean;
  };
  /** Dimensions no reached case could read — shown as "not reached", not as zero. */
  dimensionsNotReached?: string[];
}
