/**
 * Day 5 — Protect the Promise.
 *
 * Day 1 ran a floor, Day 2 investigated one, Day 3 staffed one, Day 4 cleared
 * one. Day 5 asks the question none of them reach: the order left on time and
 * the system is satisfied — is the customer?
 *
 * Everything here is measured past dispatch. A promise is only protected if
 * the thing the customer actually came for survives the failure, so the state
 * model carries the customer's need alongside the operational one, and the
 * scoring reads the outcome rather than the button.
 *
 * Times are minutes after 6:42 PM.
 */

/* ── The journey ──────────────────────────────────────────────────────── */

/**
 * Six nodes. The last one is the point of the day: previous simulations stop
 * at handover, and most operational failures only become customer failures
 * after that.
 */
export type JourneyNode = "ordered" | "picking" | "packing" | "handover" | "delivery" | "use";

export const JOURNEY: JourneyNode[] = [
  "ordered",
  "picking",
  "packing",
  "handover",
  "delivery",
  "use",
];

export const JOURNEY_LABEL: Record<JourneyNode, string> = {
  ordered: "Ordered",
  picking: "Picking",
  packing: "Packing",
  handover: "Handover",
  delivery: "Delivery",
  use: "Customer use",
};

/** A node is clear, at risk, broken, or not reached yet. */
export type NodeState = "pending" | "clear" | "risk" | "broken";

/* ── The five promise dimensions ──────────────────────────────────────── */

/**
 * Never shown as one number during play. A single satisfaction percentage
 * invites optimising the meter; five separate readings force the operator to
 * decide which of them the situation is actually about.
 */
export const PROMISE_DIMENSIONS = ["usability", "quality", "safety", "effort", "trust"] as const;

export type PromiseDimension = (typeof PROMISE_DIMENSIONS)[number];

export const PROMISE_LABEL: Record<PromiseDimension, string> = {
  usability: "Usability",
  quality: "Quality",
  safety: "Safety",
  effort: "Effort",
  trust: "Trust",
};

/** 0–100 per dimension, per case. */
export type PromiseScore = Record<PromiseDimension, number>;

/* ── Cases ────────────────────────────────────────────────────────────── */

export type CaseId = "milk" | "baking" | "packing" | "batch";

export const CASE_IDS: CaseId[] = ["milk", "baking", "packing", "batch"];

export type Phase = "opening" | CaseId | "finale" | "loop" | "done";

export const PHASES: Phase[] = [
  "opening",
  "milk",
  "baking",
  "packing",
  "batch",
  "finale",
  "loop",
  "done",
];

/* ── Case 1 · near-expiry milk ────────────────────────────────────────── */

export type ShelfSlot = "pickface" | "markdown" | "hold" | "back";

export const SHELF_SLOTS: ShelfSlot[] = ["pickface", "markdown", "hold", "back"];

export type MilkBatchId = "fresh36" | "fresh72";

export interface MilkState {
  /** Where each batch sits now. */
  placed: Record<MilkBatchId, ShelfSlot>;
  /** Metadata panels the operator opened. */
  inspected: string[];
  /** The household-use signal has been read. */
  useSignalSeen: boolean;
  policySeen: boolean;
  confirmed: boolean;
}

/* ── Case 2 · the baking basket ───────────────────────────────────────── */

export type BasketItemId = "flour" | "butter" | "sugar" | "eggs" | "vanilla";

export type SubstituteId = "paste" | "essence";

/** What the operator offered the customer, in the app's own contact sheet. */
export type ContactOption = SubstituteId | "continue" | "cancel";

export type BakingResolution =
  | "substituted"
  | "continued"
  | "refunded"
  | "cancelled"
  | "held"
  | "dispatched";

export interface BakingState {
  /** Items tapped on the preparation surface. */
  inspected: BasketItemId[];
  /** Enough of the basket was read for the dependency to surface. */
  dependencySeen: boolean;
  stockChecked: boolean;
  substitutesChecked: boolean;
  held: boolean;
  /** Options put in front of the customer, in the order chosen. */
  offered: ContactOption[];
  contacted: boolean;
  /** What the customer picked back, once contacted. */
  customerChose: ContactOption | null;
  resolution: BakingResolution | null;
  confirmed: boolean;
}

/* ── Case 3 · chemical and food ───────────────────────────────────────── */

export type PackItemId = "cleaner" | "coriander" | "apples" | "snacks";

export type BagId = "bag1" | "bag2";

export type PackExtra = "liner" | "extraBag";

export interface PackingState {
  /** Which bag each item is in. */
  bags: Record<PackItemId, BagId>;
  extras: PackExtra[];
  /** Separator stock and transit note opened. */
  inspected: string[];
  /** Seconds added to click-to-dispatch by the current configuration. */
  confirmed: boolean;
  /** Dispatched knowing the tote was mixed. */
  dispatchedUnsafe: boolean;
}

/* ── Case 4 · infant food batch ───────────────────────────────────────── */

export type BatchAction =
  | "freeze"
  | "pausePicks"
  | "inspect"
  | "removeOne"
  | "escalate"
  | "continue"
  | "wait";

export interface BatchState {
  /** Actions taken, in order — the sequence is the judgement. */
  actions: BatchAction[];
  evidenceSeen: boolean;
  inventorySeen: boolean;
  confirmed: boolean;
}

/* ── The finale · three customers, shared resources ───────────────────── */

export type CustomerId = "iceCream" | "breakfast" | "elderly";

export const CUSTOMER_IDS: CustomerId[] = ["iceCream", "breakfast", "elderly"];

export type ResourceId =
  | "manager"
  | "associate"
  | "thermal"
  | "route"
  | "fund"
  | "rider";

export const RESOURCE_IDS: ResourceId[] = [
  "manager",
  "associate",
  "thermal",
  "route",
  "fund",
  "rider",
];

export interface FinaleState {
  /** Resource → the customer it was assigned to. */
  assigned: Partial<Record<ResourceId, CustomerId>>;
  /** Discretionary rupees placed on each customer. */
  spend: Record<CustomerId, number>;
  /** Customers whose detail panel was opened. */
  inspected: CustomerId[];
  confirmed: boolean;
}

/* ── Close the loop ───────────────────────────────────────────────────── */

export type IncidentId = CaseId;

export type ControlId =
  | "shelfLife"
  | "markdownPath"
  | "nilPickEscalation"
  | "contextSubstitution"
  | "segregation"
  | "packagingBackup"
  | "batchContainment"
  | "qualityEscalation"
  | "damageCheck"
  | "thermalStaging";

export interface LoopState {
  /** Incident → the control the operator connected to it. */
  links: Partial<Record<IncidentId, ControlId>>;
  confirmed: boolean;
}

/* ── The run ──────────────────────────────────────────────────────────── */

export type Milestone = CaseId | "finale" | "loop";

export interface Day5State {
  phase: Phase;
  startedAt: number;
  phaseStartedAt: number;
  milk: MilkState;
  baking: BakingState;
  packing: PackingState;
  batch: BatchState;
  finale: FinaleState;
  loop: LoopState;
  /** Every panel opened anywhere, for the information-seeking read. */
  inspected: string[];
  milestones: Partial<Record<Milestone, { sim: number; at: number }>>;
  lockedBy: "operator" | "clock" | null;
  completedAt: number | null;
}

/* ── Assessment ───────────────────────────────────────────────────────── */

export const DAY_FIVE_DIMENSIONS = [
  "needRecognition",
  "safetyQuality",
  "ownership",
  "customerEffort",
  "recoveryProportionality",
  "preventionMindset",
] as const;

export type Day5Dimension = (typeof DAY_FIVE_DIMENSIONS)[number];

export const DAY_FIVE_DIMENSION_LABEL: Record<Day5Dimension, string> = {
  needRecognition: "Customer Need Recognition",
  safetyQuality: "Safety & Quality Judgement",
  ownership: "Ownership",
  customerEffort: "Customer Effort Reduction",
  recoveryProportionality: "Recovery Proportionality",
  preventionMindset: "Prevention Mindset",
};

export const DAY_FIVE_DIMENSION_BLURB: Record<Day5Dimension, string> = {
  needRecognition:
    "Whether you read what the customer actually came for, rather than the list of SKUs they typed.",
  safetyQuality:
    "What you did when protecting the customer cost a metric, a bag or a minute.",
  ownership:
    "Whether the store finished the problem, or handed it back to the person waiting.",
  customerEffort:
    "How much work the customer had to do to get what they already paid for.",
  recoveryProportionality:
    "Whether the size of the fix matched the size of the failure — in money, people and stock.",
  preventionMindset:
    "Whether tonight's four failures became controls, or four separate recoveries.",
};

export type Day5Tag =
  /* Case 1 */
  | "milk_usage_window_considered"
  | "milk_technical_compliance_only"
  | "older_batch_controlled"
  | "fresh_batch_moved_forward"
  | "unnecessary_inventory_disposal"
  /* Case 2 */
  | "basket_context_recognised"
  | "baking_dependency_recognised"
  | "substitution_checked"
  | "customer_contact_used"
  | "order_dispatched_without_context"
  | "unnecessary_cancellation"
  /* Case 3 */
  | "chemical_food_segregated"
  | "extra_packaging_used"
  | "ctd_prioritised_over_safety"
  | "contamination_risk_created"
  /* Case 4 */
  | "infant_batch_frozen"
  | "active_picks_paused"
  | "future_customer_exposure_contained"
  | "waited_for_additional_complaints"
  | "quality_escalated"
  | "single_unit_removed_only"
  /* Finale */
  | "thermal_protection_selected"
  | "route_split_selected"
  | "damaged_items_repicked"
  | "damaged_order_dispatched"
  | "elderly_accessibility_supported"
  | "customer_marked_unavailable_too_early"
  | "manager_resource_used_well"
  | "manager_resource_wasted"
  | "floor_associate_delegated"
  | "recovery_budget_proportionate"
  | "recovery_budget_overspent"
  /* Close the loop */
  | "preventive_control_linked"
  | "prevention_incomplete"
  /* Cross-cutting */
  | "customer_effort_minimised"
  | "technical_process_followed_but_need_missed";
