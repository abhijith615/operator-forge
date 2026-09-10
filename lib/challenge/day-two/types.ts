/**
 * Day 2 — Inventory forensics.
 *
 * Day 1 asked "can you run the floor while it moves?". Day 2 asks something
 * structurally different: "can you find out what actually happened?" So the
 * state here is not a store that drifts — it is a case file that fills up.
 *
 * The one idea the whole day is built to teach lives in `Disposition` below:
 * a unit that is *explained* is not a unit that is *recovered*, and neither is
 * a unit that is *unresolved*. Collapsing those three into "loss" is the
 * mistake this simulation exists to catch.
 */

/* ── Assessment dimensions ────────────────────────────────────────────── */

export const DAY_TWO_DIMENSIONS = [
  "inventoryReasoning",
  "rootCause",
  "evidenceDiscipline",
  "prioritisation",
  "lossPrevention",
  "delegation",
] as const;

export type Day2Dimension = (typeof DAY_TWO_DIMENSIONS)[number];

export const DAY_TWO_DIMENSION_LABEL: Record<Day2Dimension, string> = {
  inventoryReasoning: "Inventory Reasoning",
  rootCause: "Root-Cause Thinking",
  evidenceDiscipline: "Evidence Discipline",
  prioritisation: "Prioritisation",
  lossPrevention: "Loss Prevention Judgement",
  delegation: "Delegation",
};

export const DAY_TWO_DIMENSION_BLURB: Record<Day2Dimension, string> = {
  inventoryReasoning:
    "Whether you established a physical count before reasoning about the gap, and kept explained, recovered and unresolved apart.",
  rootCause:
    "Whether you rebuilt the movement trail rather than stopping at the symptom the report showed you.",
  evidenceDiscipline:
    "Whether your conclusions arrived after the evidence that supports them, and whether you could tell proximity from proof.",
  prioritisation:
    "Whether you went at the money first and investigated narrowly rather than everywhere.",
  lossPrevention:
    "Whether you tightened the control that failed, escalated what you could not close, and left the store trading.",
  delegation:
    "Whether the follow-up work went to the people who should own it instead of onto your own list.",
};

export type Day2SignalDelta = Partial<Record<Day2Dimension, number>>;
export type Day2Signals = Record<Day2Dimension, number>;

export function emptyDay2Signals(): Day2Signals {
  return {
    inventoryReasoning: 0,
    rootCause: 0,
    evidenceDiscipline: 0,
    prioritisation: 0,
    lossPrevention: 0,
    delegation: 0,
  };
}

/* ── Behavioural tags ─────────────────────────────────────────────────── */

export type Day2Tag =
  | "physical_count_completed"
  | "movement_log_checked"
  | "order_trace_checked"
  | "missing_scan_identified"
  | "scan_log_checked"
  | "access_log_checked"
  | "cctv_checked"
  | "circumstantial_evidence_recognised"
  | "premature_theft_assumption"
  | "process_variance_identified"
  | "cancelled_order_found"
  | "restow_failure_identified"
  | "physical_stock_recovered"
  | "high_value_access_protected"
  | "loss_prevention_escalated"
  | "unnecessary_store_shutdown"
  | "premature_writeoff"
  | "overinvestigated"
  | "efficient_evidence_path"
  | "strong_delegation"
  | "manager_overinvolved"
  | "evidence_before_conclusion"
  | "concluded_without_evidence"
  | "unresolved_left_open";

/* ── Investigation surface ────────────────────────────────────────────── */

export type Day2Tool =
  | "movement"
  | "orders"
  | "scans"
  | "access"
  | "cctv"
  | "exception";

export const DAY_TWO_TOOLS: Day2Tool[] = [
  "movement",
  "orders",
  "scans",
  "access",
  "cctv",
  "exception",
];

/**
 * How much a finding is actually worth as proof.
 *
 * `circumstantial` exists so the interface can hold a fact and a caveat at the
 * same time. Someone standing near a cage is a true observation and not an
 * accusation, and the tray has to be able to say both.
 */
export type EvidenceWeight = "material" | "circumstantial";

export interface EvidenceItem {
  id: string;
  label: string;
  detail: string;
  source: Day2Tool;
  weight: EvidenceWeight;
}

/* ── Findings the learner commits to ──────────────────────────────────── */

export type FindingId =
  | "unscanned_issue"
  | "restow_failure"
  | "staff_theft"
  | "receiving_error"
  | "still_unexplained";

export interface Finding {
  id: FindingId;
  label: string;
  /** Evidence ids that make this finding a reading rather than a guess. */
  requires: string[];
}

export interface LoggedFinding {
  id: FindingId;
  /** Seconds into the audit when it was committed. */
  at: number;
  supported: boolean;
}

/* ── Units and their disposition ──────────────────────────────────────── */

/**
 * The three-way split, kept as data rather than as three separate counters, so
 * nothing can drift out of agreement with anything else.
 */
export type Disposition = "explained" | "recovered" | "unresolved";

export const DISPOSITION_LABEL: Record<Disposition, string> = {
  explained: "Explained",
  recovered: "Recovered",
  unresolved: "Unresolved",
};

export const DISPOSITION_NOTE: Record<Disposition, string> = {
  explained:
    "The stock genuinely left. The record of it leaving did not. Nothing comes back on the shelf.",
  recovered: "The stock was inside the store. It is now back in the count.",
  unresolved: "Not accounted for. Stays open and escalated.",
};

/* ── Action board ─────────────────────────────────────────────────────── */

export type ActionLane = "now" | "delegate" | "followUp";

export const ACTION_LANE_LABEL: Record<ActionLane, string> = {
  now: "Do now",
  delegate: "Delegate",
  followUp: "Follow up",
};

export interface ActionCardSpec {
  id: string;
  label: string;
  detail: string;
  /** Signal per lane. Absent lane means the placement earns nothing. */
  score: Partial<Record<ActionLane, Day2SignalDelta>>;
  /** Applied wherever the card is placed. */
  tagsWhenPlaced?: Day2Tag[];
}

/* ── Case state ───────────────────────────────────────────────────────── */

export type Day2Stage =
  | "brief"
  | "count"
  | "investigate"
  | "actions"
  | "reconcile"
  | "complete";

export interface CaseState {
  stage: Day2Stage;

  /* Counting */
  systemStock: number;
  unitValue: number;
  scannedUnits: string[];
  physicalCount: number | null;

  /* Disposition of the missing units, in the order they were settled. */
  settled: Disposition[];

  /* Investigation */
  toolOpens: Day2Tool[];
  orderTracesOpened: string[];
  cctvMarkersViewed: string[];
  toteInspected: boolean;
  evidence: EvidenceItem[];
  findings: LoggedFinding[];

  /* Judgement */
  actions: Record<ActionLane, string[]>;

  /* Assessment */
  signals: Day2Signals;
  tags: Day2Tag[];

  startedAt: number;
  completedAt: number | null;
}

/* ── Derived accounting ───────────────────────────────────────────────── */

export interface CaseLedger {
  varianceUnits: number;
  exposure: number;
  explainedUnits: number;
  explainedValue: number;
  recoveredUnits: number;
  recoveredValue: number;
  unresolvedUnits: number;
  unresolvedValue: number;
}

export interface MasterLedger {
  totalOriginalVariance: number;
  explainedValue: number;
  recoveredValue: number;
  unresolvedValue: number;
}

/* ── Result ───────────────────────────────────────────────────────────── */

export interface Day2Metrics {
  /** Useful investigative actions over total investigative actions, 0–1. */
  evidenceEfficiency: number;
  usefulActions: number;
  totalActions: number;
  /** Conclusions committed without their supporting evidence. */
  unsupportedFindings: number;
  ledger: CaseLedger;
  master: MasterLedger;
}
