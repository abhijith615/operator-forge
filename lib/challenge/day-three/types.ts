import type { Station } from "../types";

/**
 * Day 3 — Onam Eve. Build the shift.
 *
 * Day 1 read how an operator runs a floor and Day 2 how they investigate one.
 * Day 3 reads how they build and keep a team: people are the resource, the
 * evening is the constraint, and the plan never stays still for long.
 *
 * Every time on the board is minutes after 4:30 PM, so the timeline, the
 * capacity model, the peak simulation and the scoring share one axis.
 */

export type { Station };

/** The four things the board measures coverage for. */
export type CoverLane = Station | "riders";

export const COVER_LANES: CoverLane[] = ["picking", "packing", "dispatch", "riders"];

export const COVER_LABEL: Record<CoverLane, string> = {
  picking: "Picking",
  packing: "Packing",
  dispatch: "Dispatch",
  riders: "Riders",
};

export const COVER_SHORT: Record<CoverLane, string> = {
  picking: "Pick",
  packing: "Pack",
  dispatch: "Dispatch",
  riders: "Riders",
};

/* ── Assessment ───────────────────────────────────────────────────────── */

export const DAY_THREE_DIMENSIONS = [
  "workforcePlanning",
  "skillMatching",
  "adaptability",
  "peopleJudgement",
  "communicationTrust",
  "prioritisation",
  "resourceDiscipline",
] as const;

export type Day3Dimension = (typeof DAY_THREE_DIMENSIONS)[number];

export const DAY_THREE_DIMENSION_LABEL: Record<Day3Dimension, string> = {
  workforcePlanning: "Workforce Planning",
  skillMatching: "Skill-to-Role Matching",
  adaptability: "Adaptability",
  peopleJudgement: "People Judgement",
  communicationTrust: "Communication & Trust",
  prioritisation: "Prioritisation",
  resourceDiscipline: "Resource Discipline",
};

export const DAY_THREE_DIMENSION_BLURB: Record<Day3Dimension, string> = {
  workforcePlanning:
    "Whether the peak had enough of the right capacity, and whether you built it before the evening needed it.",
  skillMatching:
    "Whether the strongest skills sat where they were scarce — not whether experts were everywhere.",
  adaptability:
    "What you did when the forecast moved, a temp was late and a vehicle needed authorised hands.",
  peopleJudgement:
    "How you treated two slow but accurate pickers, and whose second shift you spent.",
  communicationTrust:
    "Whether you checked the facts before you answered Arjun, said what was true, and asked for overtime rather than demanding it.",
  prioritisation: "Whether the peak came first, and work that could wait was moved to where it could.",
  resourceDiscipline: "Whether the money bought capacity the store actually needed.",
};

/* ── People ───────────────────────────────────────────────────────────── */

export type Skill = 0 | 1 | 2 | 3;

export interface Worker {
  id: string;
  name: string;
  initials: string;
  /** One line under the name: "Expert Picker", "On-demand · 8 months". */
  level: string;
  kind: "regular" | "flex" | "manager";
  skills: Record<Station, Skill>;
  /** Picking per item, seconds — only where the store has measured it. */
  ppi: number | null;
  accuracy: number;
  accuracyLabel: string;
  attendance?: number;
  /** Authorised to receive and handle high-value stock. */
  highValue: boolean;
  /** Minutes after 4:30 PM. */
  start: number;
  end: number;
  tenure?: string;
  note?: string;
}

export interface FlexWindow {
  id: string;
  start: number;
  end: number;
}

export interface FlexWorker extends Worker {
  kind: "flex";
  /** ₹ per hour. */
  rate: number;
  rating: number | null;
  experience: string;
  windows: FlexWindow[];
  /** Ramps up over the first half hour of a booking. */
  newJoiner: boolean;
  /** Already paid for up to this minute — only hours beyond it cost anything. */
  prepaidUntil?: number;
}

export interface FlexBooking {
  windowId: string;
  station: Station;
}

export type RiderSourceId = "nearby" | "morning" | "local";

export interface RiderSource {
  id: RiderSourceId;
  name: string;
  detail: string;
  max: number;
  arrive: number;
  until: number;
  /** ₹ per rider for the evening. */
  costPerRider: number;
  /** Deliveries per rider relative to a fresh one. Below 1 means tired. */
  effectiveness: number;
  warning?: string;
}

/* ── The evening ──────────────────────────────────────────────────────── */

export type Phase =
  | "opening"
  | "core"
  | "forecast"
  | "adjust"
  | "flex"
  | "riders"
  | "late"
  | "arjun"
  | "riya"
  | "receiving"
  | "faisal"
  | "audit"
  | "review"
  | "peak"
  | "done";

export const PHASES: Phase[] = [
  "opening",
  "core",
  "forecast",
  "adjust",
  "flex",
  "riders",
  "late",
  "arjun",
  "riya",
  "receiving",
  "faisal",
  "audit",
  "review",
  "peak",
  "done",
];

export type FaisalAction = "pair" | "zone" | "coach" | "remove" | "keep" | "packing";

/**
 * A time-bounded move that overrides someone's evening role: covering
 * high-value receiving, backfilling the station they left, or the manager
 * covering a late arrival themselves.
 */
export interface Transfer {
  workerId: string;
  to: Station | "receiving";
  start: number;
  end: number;
  reason: "receiving" | "backfill" | "late-cover";
}

/** Coverage figures are for the late worker's station, over the minutes they miss. */
export interface LateEvent {
  workerId: string;
  station: Station | null;
  due: number;
  arrives: number;
  before: number;
  atAlert: number;
  /** After the operator's repair. Null until the repair is confirmed. */
  after: number | null;
}

/** Coverage figures are for the vacated station, over the receiving window. */
export interface ReceivingOutcome {
  workerId: string | null;
  authorised: boolean;
  vacated: Station | null;
  before: number;
  unfilled: number;
  after: number;
  backfillId: string | null;
  skipped: boolean;
  /** Nobody reached the alert before the clock ran out; the floor lead chose. */
  defaulted: boolean;
}

export interface Bottleneck {
  lane: CoverLane;
  at: number;
}

export interface CoreSnapshot {
  covInitial: Record<CoverLane, number>;
  covRevised: Record<CoverLane, number>;
  /** Predictable gap against the revised forecast, before any flex or riders. */
  deficit: number;
  bottleneck: Bottleneck | null;
}

export type Milestone =
  | "core"
  | "forecast"
  | "flex"
  | "riders"
  | "late"
  | "arjun"
  | "riya"
  | "receiving"
  | "faisal"
  | "audit"
  | "lock";

/* ── People management ────────────────────────────────────────────────── */

/** Where Arjun's complaint is heard: on the floor, or away from the team. */
export type ArjunLocation = "here" | "aside";

export type AcknowledgeId = "achievement" | "understand" | "takes-time" | "everyone";
export type ClarifyId = "approved-pending" | "tomorrow" | "cant-confirm" | "guarantee";
export type RequestId = "able-to" | "extend" | "must-stay" | "replace" | "no-ask";

export interface ArjunResponse {
  acknowledge: AcknowledgeId | null;
  clarify: ClarifyId | null;
  request: RequestId | null;
}

/**
 * What Arjun does with the rest of his evening. `unaddressed` is the clock
 * running out before anyone spoke to him.
 */
export type ArjunOutcome = "extended" | "held" | "refused" | "not-asked" | "unaddressed";

export interface ArjunState {
  opened: boolean;
  location: ArjunLocation | null;
  incentiveChecked: boolean;
  performanceChecked: boolean;
  /** The response builder is open; the manager tools have closed. */
  responding: boolean;
  /** Went to the response before checking the incentive status. */
  actedBeforeVerifying: boolean;
  response: ArjunResponse;
  outcome: ArjunOutcome | null;
  checkedSim: number | null;
  answeredSim: number | null;
}

export type RiyaAction = "zone" | "pair" | "coach" | "keep" | "remove" | "packing" | "warn";

export interface RiyaState {
  opened: boolean;
  trendViewed: boolean;
  zonesViewed: boolean;
  /** Opened Zone C and heard why she is slow there. */
  zoneCFound: boolean;
  zoneOpen: string | null;
  interventions: RiyaAction[];
  applied: boolean;
  /** The clock ran out and the floor lead pulled her himself. */
  defaulted: boolean;
  foundSim: number | null;
}

export interface PeopleState {
  arjun: ArjunState;
  riya: RiyaState;
}

export interface Day3State {
  phase: Phase;
  /** Real milliseconds at "Build the shift". */
  startedAt: number;
  phaseStartedAt: number;
  /** The 7–9 PM forecast has been revised up. */
  revised: boolean;
  /** Regular associates' evening role. */
  assignments: Record<string, Station | null>;
  flex: Record<string, FlexBooking>;
  riders: Record<RiderSourceId, number>;
  transfers: Transfer[];
  late: LateEvent | null;
  receiving: ReceivingOutcome | null;
  receivingSkipped: boolean;
  faisal: FaisalAction[];
  people: PeopleState;
  auditStart: number;
  core: CoreSnapshot | null;
  forecastResponse: "kept" | "adjusted" | null;
  afterForecast: Record<CoverLane, number> | null;
  /** Predictable gap when planning ended (riders confirmed). */
  planningDeficit: number | null;
  planningCoverage: Record<CoverLane, number> | null;
  lockDeficit: number | null;
  lateRepairMs: number | null;
  inspected: string[];
  faisalOpened: boolean;
  managerCovered: boolean;
  milestones: Partial<Record<Milestone, { sim: number; at: number }>>;
  lockedBy: "operator" | "clock" | null;
  completedAt: number | null;
}

export type Day3Tag =
  | "balanced_core_staffing"
  | "overstaffed_picking"
  | "understaffed_packing"
  | "dispatch_uncovered"
  | "used_cross_training"
  | "forecast_plan_adjusted"
  | "forecast_change_ignored"
  | "flex_worker_skill_matched"
  | "overspent_flex_budget"
  | "undercovered_peak"
  | "rider_gap_solved_early"
  | "borrowed_nearby_riders"
  | "excessive_morning_rider_recall"
  | "fatigue_risk_created"
  | "high_value_task_covered"
  | "high_value_control_ignored"
  | "expert_picker_backfilled"
  | "expert_picker_not_backfilled"
  | "faisal_coached"
  | "faisal_role_adjusted"
  | "faisal_removed_unnecessarily"
  | "untrained_reassignment"
  | "audit_moved_to_lean_shift"
  | "audit_left_during_peak"
  | "adapted_to_late_worker"
  | "failed_to_replace_late_worker"
  | "strong_delegation"
  | "manager_overinvolved"
  | "used_temporary_transfer"
  | "shift_locked_by_clock"
  /* ── People management ── */
  | "arjun_issue_opened"
  | "arjun_conversation_private"
  | "arjun_issue_handled_publicly"
  | "arjun_status_checked"
  | "arjun_performance_checked"
  | "acted_before_verifying"
  | "arjun_achievement_acknowledged"
  | "arjun_payment_status_explained"
  | "arjun_unverified_promise"
  | "arjun_overtime_requested_respectfully"
  | "arjun_overtime_pressured"
  | "arjun_overtime_extended"
  | "arjun_overtime_declined"
  | "arjun_overtime_not_requested"
  | "arjun_issue_unaddressed"
  | "riya_profile_opened"
  | "riya_trend_reviewed"
  | "riya_zone_data_checked"
  | "riya_zone_c_pattern_found"
  | "riya_accuracy_considered"
  | "riya_moved_to_familiar_zone"
  | "riya_paired_with_expert"
  | "riya_coaching_scheduled"
  | "riya_removed_unnecessarily"
  | "riya_warned_without_diagnosis"
  | "riya_untrained_role_assigned"
  | "riya_left_unchanged";
