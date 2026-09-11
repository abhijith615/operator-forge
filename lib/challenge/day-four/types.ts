/**
 * Day 4 — Clear the Floor.
 *
 * Day 1 ran a floor, Day 2 investigated one, Day 3 staffed one. Day 4 is the
 * floor itself: a spatial flow puzzle where cartons occupy space, pickers walk
 * around them, and the lesson is that making one step faster can make the
 * whole store slower.
 *
 * Time is minutes after 10:18 AM. The engine advances a minute at a time and
 * only ever when the operator moves it — no passive timers.
 */

export type VehicleId = "dairy" | "frozen" | "grocery";

export type BatchId = "S1" | "S2" | "C1" | "D1" | "F1" | "G1" | "G2" | "G3";

export type StorageId = "chilled" | "frozen" | "fastpick" | "ambient" | "deep";

export type ZoneId = "yard" | "dock" | "qc" | "staging" | "aisleC" | "putaway" | "packing";

/** Where a batch is in receiving. Cold loads are checked before they come off the vehicle. */
export type Stage =
  | "vehicle"
  | "qc"
  | "accepted"
  | "unloading"
  | "received"
  | "grn"
  | "verified"
  | "putaway"
  | "ready";

export type Lane = "now" | "next" | "hold";

export type QcAction = "accept" | "quarantine" | "recheck" | "shelf";

export type AisleAction = "staging" | "putaway" | "safe" | "leave";

export type RecoveryAction =
  | "clearAisle"
  | "putawayFast"
  | "putawayDairy"
  | "putawayFrozen"
  | "finishScan"
  | "slowGrocery"
  | "safeLane"
  | "continueUnload"
  | "stopInbound"
  | "cartonsToAisle"
  | "deepStore";

export type Phase = "opening" | "inspect" | "dock" | "pipeline" | "recovery" | "execute" | "done";

export const PHASES: Phase[] = ["opening", "inspect", "dock", "pipeline", "recovery", "execute", "done"];

export interface VehicleSpec {
  id: VehicleId;
  name: string;
  load: string;
  temperature: "Chilled" | "Frozen" | "Ambient";
  batches: BatchId[];
  /** Cartons or crates off the vehicle per minute at a clear dock. */
  rate: number;
  checks: string[];
  spaceDemand: string;
  demand: string;
  note?: string;
}

export interface BatchSpec {
  id: BatchId;
  name: string;
  detail: string;
  cartons: number;
  unit: "crates" | "cartons";
  /** The home location that makes it properly pick-ready. */
  storage: StorageId;
  allowed: StorageId[];
  demand: "high" | "medium" | "low";
  cold: "chilled" | "frozen" | null;
  vehicle: VehicleId | null;
}

export interface BatchRun {
  stage: Stage;
  /** Effective size — a quarantined crate leaves the batch. */
  cartons: number;
  onTruck: number;
  onFloor: number;
  scanned: number;
  stored: number;
  destination: StorageId | null;
  location: "lanes" | "aisle" | "safe";
  /** Minutes a cold batch has spent on the ambient floor. */
  exposure: number;
  readyAt: number | null;
}

export interface VehicleRun {
  lane: Lane;
  dock: 1 | 2 | null;
  paused: boolean;
  done: boolean;
}

export interface QcIssue {
  status: "none" | "pending" | QcAction;
  raisedAt: number | null;
  resolvedAt: number | null;
}

/** One minute of the floor, kept for exposure, scoring and the playback. */
export interface MinuteSnap {
  t: number;
  floor: number;
  congestion: number;
  aisleBlocked: number;
  delay: number;
  ctd: number;
  readiness: number;
  pickReadyInbound: number;
  inflow: number;
  putawayCap: number;
  groceryUnloading: boolean;
  teams: number;
}

export type Milestone = "inspect" | "mark" | "dock" | "qc" | "aisle" | "pipeline" | "lock" | "execute";

export interface Day4State {
  phase: Phase;
  startedAt: number;
  phaseStartedAt: number;
  /** Engine minute, after 10:18 AM. */
  t: number;
  inspected: ZoneId[];
  marking: boolean;
  bottleneck: ZoneId | null;
  /** What had been looked at when the bottleneck was marked. */
  evidence: ZoneId[];
  plan: Record<VehicleId, Lane>;
  /** Order vehicles take free docks in, within "next". */
  planOrder: VehicleId[];
  /** "Stage next" vehicles only take a dock once one has been freed. */
  docksReleased: boolean;
  vehicles: Record<VehicleId, VehicleRun>;
  batches: Record<BatchId, BatchRun>;
  qcSlot: BatchId | null;
  qcTimer: number;
  /** A recheck keeps the QC gate busy until this minute. */
  qcBusyUntil: number;
  qcIssue: QcIssue;
  qcStarted: Partial<Record<BatchId, number>>;
  grnStarted: Partial<Record<BatchId, number>>;
  quarantine: number;
  /** Crates sent straight to the shelf past QC and GRN. */
  bypassed: number;
  grn: BatchId[];
  queue: BatchId[];
  safeOpen: boolean;
  /** Cartons pushed into picking aisle B. */
  unsafeAisle: number;
  aisle: { action: AisleAction | null; actedAt: number | null; clearedAt: number | null };
  groceryPausedAt: number | null;
  history: MinuteSnap[];
  recovery: RecoveryAction[][];
  /** Recovery actions that could not do anything when their window came. */
  wasted: RecoveryAction[];
  /** The floor at 10:48, before recovery ran. */
  preRecovery: MinuteSnap | null;
  milestones: Partial<Record<Milestone, { sim: number; at: number }>>;
  lockedBy: "operator" | "clock" | null;
  completedAt: number | null;
}

export type Day4Tag =
  | "bottleneck_identified_correctly"
  | "bottleneck_misdiagnosed"
  | "staging_constraint_recognised"
  | "putaway_constraint_recognised"
  | "grocery_unload_paused"
  | "grocery_unloaded_into_congestion"
  | "cold_chain_verified"
  | "cold_chain_bypassed"
  | "quality_issue_quarantined"
  | "quality_issue_accepted"
  | "aisle_c_cleared_early"
  | "aisle_c_left_blocked"
  | "fast_moving_inventory_prioritised"
  | "slow_moving_inventory_prioritised"
  | "high_demand_stock_pick_ready"
  | "grn_control_maintained"
  | "verification_bypassed"
  | "safe_staging_used"
  | "unsafe_aisle_storage_used"
  | "all_inbound_stopped_unnecessarily"
  | "recovery_sequence_strong"
  | "recovery_sequence_reactive"
  | "floor_congestion_reduced"
  | "flow_restored_before_peak"
  | "recovery_locked_by_clock";

export const DAY_FOUR_DIMENSIONS = [
  "bottleneckDiagnosis",
  "processSequencing",
  "timePriority",
  "flowSpace",
  "sopQuality",
  "commercial",
] as const;

export type Day4Dimension = (typeof DAY_FOUR_DIMENSIONS)[number];

export const DAY_FOUR_DIMENSION_LABEL: Record<Day4Dimension, string> = {
  bottleneckDiagnosis: "Bottleneck Diagnosis",
  processSequencing: "Process Sequencing",
  timePriority: "Time & Priority Management",
  flowSpace: "Flow & Space Management",
  sopQuality: "SOP & Quality Discipline",
  commercial: "Commercial Awareness",
};

export const DAY_FOUR_DIMENSION_BLURB: Record<Day4Dimension, string> = {
  bottleneckDiagnosis: "Whether you found the real constraint — and then relieved it.",
  processSequencing: "Whether work moved through receiving in an order the floor could absorb.",
  timePriority: "Whether the stock lunch needs was pick-ready before lunch arrived.",
  flowSpace: "How long the floor spent choked, and whether the picker routes came back.",
  sopQuality: "Cold chain, QC, scan verification and safe staging — kept while moving fast.",
  commercial: "Whether the floor you cleared was the floor that sells.",
};
