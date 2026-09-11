import type {
  ActionCardSpec,
  Day2Tool,
  EvidenceItem,
  Finding,
} from "./types";

/**
 * Case 01 — Wireless Earbuds.
 *
 * The content is arranged so the answer is never on screen before the work
 * that earns it. Three units are short. One left the building legitimately and
 * was never scanned out, one is sitting in an exception tote nobody restowed,
 * and one is genuinely gone. Nothing in this file says that anywhere the
 * learner can read it before they have found it.
 *
 * The temptation when authoring a case like this is to have the records help —
 * to label the suspicious order "suspicious", to put "likely cause" next to the
 * access log. Every one of those labels does the learner's thinking for them
 * and hollows out the assessment. What the records do instead is what real
 * records do: state facts flatly, including the fact that is missing.
 */

export const EARBUDS = {
  sku: "ELEC-WEB-014",
  name: "Wireless Earbuds",
  variant: "True wireless · charging case",
  location: "Secure cage · Bay H1",
  /** The boxed unit as it sits in the cage — what the count cards show. */
  countPhoto: "/products/earbud-box.webp",
  systemStock: 12,
  unitValue: 3999,
  /** What is physically in the cage. The learner has to establish this. */
  actualPhysical: 9,
} as const;

/** The nine boxes in the cage. Ids only — the learner supplies the count. */
export const CAGE_UNITS = Array.from({ length: EARBUDS.actualPhysical }, (_, i) => ({
  id: `unit-${i + 1}`,
  serial: `WEB${String(4471 + i * 13).padStart(5, "0")}`,
}));

/* ── Stage 3 · Movement log ───────────────────────────────────────────── */

export interface MovementEntry {
  time: string;
  title: string;
  detail: string;
  balance: number | null;
  /** Marks the row the trail eventually turns on. Never shown as a hint. */
  pivot?: boolean;
  orderId?: string;
}

export const MOVEMENT_LOG: MovementEntry[] = [
  {
    time: "17:55",
    title: "Opening system balance",
    detail: "Secure cage count carried forward from the evening handover.",
    balance: 15,
  },
  {
    time: "18:12",
    title: "Order #6178 · high-value unit issued",
    detail: "Item scan verified at pick. Packed and dispatched.",
    balance: 14,
    orderId: "6178",
  },
  {
    time: "18:29",
    title: "Order #6196 · high-value unit issued",
    detail: "Item scan verified at pick. Packed and dispatched.",
    balance: 13,
    orderId: "6196",
  },
  {
    time: "18:42",
    title: "Order #6214 · high-value pick initiated",
    detail: "Pick raised against the secure cage.",
    balance: 12,
    orderId: "6214",
    pivot: true,
  },
  {
    time: "18:46",
    title: "Order #6214 · dispatched",
    detail: "Order left the store.",
    balance: 12,
    orderId: "6214",
  },
  {
    time: "01:47",
    title: "Audit system stock",
    detail: "Balance carried into tonight's variance report.",
    balance: 12,
  },
];

/* ── Stage 4 · Orders ─────────────────────────────────────────────────── */

export type TraceState = "ok" | "missing";

export interface TraceStep {
  label: string;
  state: TraceState;
  time?: string;
}

export interface OrderRecord {
  id: string;
  placed: string;
  value: number;
  status: string;
  /** Whether opening this trace teaches anything. Drives evidence efficiency. */
  material: boolean;
  steps: TraceStep[];
}

export const ORDERS: OrderRecord[] = [
  {
    id: "6178",
    placed: "18:12",
    value: 3999,
    status: "Delivered",
    material: false,
    steps: [
      { label: "Order created", state: "ok", time: "18:12" },
      { label: "Picker assigned", state: "ok", time: "18:13" },
      { label: "High-value item requested", state: "ok", time: "18:14" },
      { label: "Product item scan", state: "ok", time: "18:15" },
      { label: "Packing confirmation", state: "ok", time: "18:18" },
      { label: "Dispatch completed", state: "ok", time: "18:21" },
    ],
  },
  {
    id: "6196",
    placed: "18:29",
    value: 3999,
    status: "Delivered",
    material: false,
    steps: [
      { label: "Order created", state: "ok", time: "18:29" },
      { label: "Picker assigned", state: "ok", time: "18:30" },
      { label: "High-value item requested", state: "ok", time: "18:31" },
      { label: "Product item scan", state: "ok", time: "18:32" },
      { label: "Packing confirmation", state: "ok", time: "18:35" },
      { label: "Dispatch completed", state: "ok", time: "18:38" },
    ],
  },
  {
    id: "6214",
    placed: "18:42",
    value: 3999,
    status: "Delivered",
    material: true,
    steps: [
      { label: "Order created", state: "ok", time: "18:42" },
      { label: "Picker assigned", state: "ok", time: "18:42" },
      { label: "High-value item requested", state: "ok", time: "18:43" },
      { label: "Product item scan", state: "missing" },
      { label: "Packing confirmation", state: "ok", time: "18:44" },
      { label: "Dispatch completed", state: "ok", time: "18:46" },
    ],
  },
];

/* ── Stage 3b · Scan logs ─────────────────────────────────────────────── */

export interface ScanRow {
  time: string;
  device: string;
  sku: string;
  result: string;
  ok: boolean;
}

export const SCAN_LOG: ScanRow[] = [
  { time: "18:15", device: "HH-04 · Arjun", sku: "ELEC-WEB-014", result: "Item scan accepted · #6178", ok: true },
  { time: "18:32", device: "HH-04 · Arjun", sku: "ELEC-WEB-014", result: "Item scan accepted · #6196", ok: true },
  { time: "18:43", device: "HH-07 · P018", sku: "—", result: "Cage door event logged, no item scan followed", ok: false },
  { time: "18:44", device: "PACK-02", sku: "ELEC-WEB-014", result: "Packing confirmation · #6214", ok: true },
  { time: "19:02", device: "HH-04 · Arjun", sku: "GROC-BRD-002", result: "Item scan accepted · #6231", ok: true },
];

/* ── Stage 5 · Access log ─────────────────────────────────────────────── */

export interface AccessRow {
  time: string;
  who: string;
  event: string;
  /**
   * True for rows that only establish presence. The interface has to be able
   * to show a fact and refuse to let it become an accusation.
   */
  circumstantial: boolean;
}

export const ACCESS_LOG: AccessRow[] = [
  {
    time: "18:39",
    who: "Manager credential · M-114-02",
    event: "Secure storage opened.",
    circumstantial: false,
  },
  {
    time: "18:42",
    who: "Picker P018",
    event: "Present at the secure storage aisle.",
    circumstantial: true,
  },
  {
    time: "18:48",
    who: "Manager credential · M-114-02",
    event: "Secure storage closed.",
    circumstantial: false,
  },
];

/* ── Stage 6 · CCTV ───────────────────────────────────────────────────── */

export interface CctvMarker {
  time: string;
  /** Position on the 18:35–18:55 track, 0–1. */
  position: number;
  headline: string;
  detail: string;
  /** Empty stretches are real. A timeline with only hits is not a timeline. */
  material: boolean;
}

export const CCTV_WINDOW = { from: "18:35", to: "18:55" } as const;

export const CCTV_MARKERS: CctvMarker[] = [
  {
    time: "18:35",
    position: 0,
    headline: "Aisle quiet",
    detail: "No movement at the secure cage. Two pickers working the ambient aisles.",
    material: false,
  },
  {
    time: "18:39",
    position: 0.2,
    headline: "Manager approaches the cage",
    detail: "Cage opened on the manager credential. Nothing removed in frame yet.",
    material: true,
  },
  {
    time: "18:42",
    position: 0.35,
    headline: "Unit handed into the picking flow",
    detail:
      "One earbud box passes from the cage into a picker's tote. The handheld is not raised to the box.",
    material: true,
  },
  {
    time: "18:44",
    position: 0.45,
    headline: "Unit reaches the pack bench",
    detail: "The box is placed on the bench and boxed into an order bag.",
    material: true,
  },
  {
    time: "18:46",
    position: 0.55,
    headline: "Order leaves dispatch",
    detail: "Bag handed to a rider at the dispatch bay and scanned out as an order.",
    material: true,
  },
  {
    time: "18:52",
    position: 0.85,
    headline: "Aisle quiet",
    detail: "Cage closed. No further approaches in the window.",
    material: false,
  },
  {
    time: "18:55",
    position: 1,
    headline: "End of window",
    detail: "Recording continues past this point but the cage is not approached again.",
    material: false,
  },
];

/* ── Stage 7 · Exception area ─────────────────────────────────────────── */

export interface ToteRecord {
  tote: string;
  orderId: string;
  status: string;
  timeline: { time?: string; label: string; state: TraceState }[];
}

export const EXCEPTION_TOTE: ToteRecord = {
  tote: "EXC-03",
  orderId: "6188",
  status: "Customer cancelled after picking",
  timeline: [
    { time: "18:03", label: "Item picked", state: "ok" },
    { time: "18:05", label: "Order cancelled by customer", state: "ok" },
    { time: "18:07", label: "Item moved to exception tote", state: "ok" },
    { label: "Restow scan", state: "missing" },
  ],
};

/** What is visible in the exception bay before anything is inspected. */
export const EXCEPTION_BAY = [
  { id: "exc-01", tote: "EXC-01", contents: "Two ambient grocery items", holds: false },
  { id: "exc-02", tote: "EXC-02", contents: "Chilled item, dump pending", holds: false },
  { id: "exc-03", tote: "EXC-03", contents: "Sealed box, high-value tag visible", holds: true },
  { id: "exc-04", tote: "EXC-04", contents: "Empty", holds: false },
];

/* ── Evidence ─────────────────────────────────────────────────────────── */

/**
 * Every item a learner can put in the tray. Nothing is added automatically —
 * the tray is a record of what they decided was worth keeping.
 */
export const EVIDENCE: Record<string, EvidenceItem> = {
  "system-consumed": {
    id: "system-consumed",
    label: "Three units consumed through orders",
    detail:
      "System balance moved 15 → 12 across orders #6178, #6196 and #6214. The system believes twelve units remain.",
    source: "movement",
    weight: "material",
  },
  "missing-scan": {
    id: "missing-scan",
    label: "Order #6214 completed without the expected high-value item scan",
    detail:
      "Created, picked, packed and dispatched. The product item scan step has no record against it.",
    source: "orders",
    weight: "material",
  },
  "cage-event": {
    id: "cage-event",
    label: "Cage door event at 18:43 with no item scan following",
    detail: "Handheld HH-07 logged a cage event. No SKU scan is recorded in the next minute.",
    source: "scans",
    weight: "material",
  },
  proximity: {
    id: "proximity",
    label: "Picker P018 present near secure storage during the unscanned movement",
    detail:
      "Establishes presence and nothing more. Being in the aisle is not evidence of taking anything.",
    source: "access",
    weight: "circumstantial",
  },
  "cctv-issue": {
    id: "cctv-issue",
    label: "One unit physically issued into a live customer order at 18:42",
    detail:
      "Camera shows the box leaving the cage, reaching the bench and going out with order #6214. The handheld is never raised to it.",
    source: "cctv",
    weight: "material",
  },
  "tote-unit": {
    id: "tote-unit",
    label: "One unit sitting in exception tote EXC-03 against cancelled order #6188",
    detail:
      "Picked at 18:03, cancelled at 18:05, moved to the tote at 18:07, never restowed into the cage.",
    source: "exception",
    weight: "material",
  },
};

/* ── Findings ─────────────────────────────────────────────────────────── */

/**
 * `requires` is the whole assessment for evidence discipline. A finding
 * committed without the evidence beneath it is recorded as unsupported — the
 * learner is not stopped from making it, because being stopped teaches
 * nothing about the habit of reaching too early.
 */
export const FINDINGS: Finding[] = [
  {
    id: "unscanned_issue",
    label: "High-value unit issued without an item scan",
    requires: ["missing-scan", "cctv-issue"],
  },
  {
    id: "restow_failure",
    label: "Cancelled-order stock never restowed to the cage",
    requires: ["tote-unit"],
  },
  {
    id: "staff_theft",
    label: "Unit taken by a member of staff",
    // Nothing in this store proves this, which is the point. It can be
    // committed, and committing it is what gets measured.
    requires: ["__unavailable__"],
  },
  {
    id: "receiving_error",
    label: "Inbound receiving posted more stock than arrived",
    requires: ["__unavailable__"],
  },
  {
    id: "still_unexplained",
    label: "Remainder genuinely unaccounted for",
    requires: ["system-consumed"],
  },
];

/* ── Stage 9 · Action board ───────────────────────────────────────────── */

/**
 * Placement is scored per lane, not per card. "Interview relevant associates"
 * is reasonable as delegated follow-up and unreasonable as the first thing you
 * personally do at two in the morning on circumstantial evidence.
 */
export const ACTION_CARDS: ActionCardSpec[] = [
  {
    id: "restrict-access",
    label: "Restrict uncontrolled high-value access",
    detail: "Cage opens on a named credential with a witness until this closes.",
    score: {
      now: { lossPrevention: 3, prioritisation: 1 },
      delegate: { lossPrevention: 1 },
    },
    tagsWhenPlaced: ["high_value_access_protected"],
  },
  {
    id: "preserve-cctv",
    label: "Review remaining CCTV window",
    detail: "The hours either side of 18:35–18:55 have not been looked at.",
    score: {
      now: { evidenceDiscipline: 2, rootCause: 1 },
      delegate: { evidenceDiscipline: 2, delegation: 1 },
      followUp: { evidenceDiscipline: 1 },
    },
  },
  {
    id: "escalate-lp",
    label: "Inform Loss Prevention",
    detail: "One high-value unit remains unaccounted for after investigation.",
    score: {
      now: { lossPrevention: 3 },
      delegate: { lossPrevention: 2, delegation: 1 },
      followUp: { lossPrevention: 1 },
    },
    tagsWhenPlaced: ["loss_prevention_escalated"],
  },
  {
    id: "reconcile-cancelled",
    label: "Reconcile cancelled orders",
    detail: "Every cancelled-after-pick order tonight, checked against the totes.",
    score: {
      now: { rootCause: 1, inventoryReasoning: 1 },
      delegate: { rootCause: 2, delegation: 2, inventoryReasoning: 1 },
      followUp: { rootCause: 1, delegation: 1 },
    },
    tagsWhenPlaced: ["restow_failure_identified"],
  },
  {
    id: "audit-highvalue-orders",
    label: "Audit today's high-value orders",
    detail: "Every high-value line today, checked for the same missing scan step.",
    score: {
      now: { rootCause: 1 },
      delegate: { rootCause: 2, delegation: 2 },
      followUp: { rootCause: 2 },
    },
  },
  {
    id: "recount-secure",
    label: "Recount secure stock",
    detail: "A second count of the cage, by someone who did not do the first.",
    score: {
      now: { inventoryReasoning: 2 },
      delegate: { inventoryReasoning: 1, delegation: 1 },
      followUp: { inventoryReasoning: 1 },
    },
  },
  {
    id: "access-records",
    label: "Check remaining access records",
    detail: "Credential events on the cage across the rest of the shift.",
    score: {
      delegate: { evidenceDiscipline: 1, delegation: 1 },
      followUp: { evidenceDiscipline: 1 },
    },
  },
  {
    id: "receiving-records",
    label: "Check inbound receiving records",
    detail: "Whether the cage was ever short from the moment stock arrived.",
    score: {
      delegate: { rootCause: 1, delegation: 1 },
      followUp: { rootCause: 1 },
    },
  },
  {
    id: "interview",
    label: "Interview relevant associates",
    detail: "A conversation about the shift, not an accusation.",
    score: {
      // Reasonable as delegated follow-up under a process. Doing it yourself
      // at 02:00 on circumstantial evidence is not an investigation, it is a
      // confrontation.
      delegate: { lossPrevention: 1, delegation: 1 },
      followUp: { lossPrevention: 1, delegation: 1 },
      now: { evidenceDiscipline: -2 },
    },
  },
  {
    id: "writeoff",
    label: "Write off ₹3,999 immediately",
    detail: "Close the variance tonight and move on.",
    score: {
      now: { lossPrevention: -3, inventoryReasoning: -2 },
      delegate: { lossPrevention: -2 },
      followUp: { lossPrevention: -1 },
    },
    tagsWhenPlaced: ["premature_writeoff"],
  },
  {
    id: "stop-picking",
    label: "Stop all store picking",
    detail: "Halt fulfilment across every aisle until the count is settled.",
    score: {
      now: { prioritisation: -3, lossPrevention: -1 },
      delegate: { prioritisation: -2 },
      followUp: { prioritisation: -1 },
    },
    tagsWhenPlaced: ["unnecessary_store_shutdown"],
  },
  {
    id: "accuse",
    label: "Accuse Picker P018 of theft",
    detail: "Name the associate on the incident report tonight.",
    score: {
      now: { evidenceDiscipline: -4, lossPrevention: -2 },
      delegate: { evidenceDiscipline: -3, lossPrevention: -2 },
      followUp: { evidenceDiscipline: -3, lossPrevention: -1 },
    },
    tagsWhenPlaced: ["premature_theft_assumption"],
  },
  {
    id: "audit-all-skus",
    label: "Audit every grocery SKU",
    detail: "A full-store count of all lines, high and low value.",
    score: {
      now: { prioritisation: -2 },
      delegate: { prioritisation: -1 },
      followUp: { prioritisation: -1 },
    },
    tagsWhenPlaced: ["overinvestigated"],
  },
];

export const ACTION_LIMITS = { now: 3, delegate: 2, followUp: 2 } as const;

/* ── Opening message ──────────────────────────────────────────────────── */

export const MANAGER_BRIEF = [
  "Three units are missing from the high-value count.",
  "Don't assume theft.",
  "Account for the stock.",
] as const;

/* ── Tool metadata ────────────────────────────────────────────────────── */

export const TOOL_META: Record<Day2Tool, { label: string; hint: string }> = {
  movement: { label: "Movement log", hint: "Stock in and out of the cage" },
  orders: { label: "Orders", hint: "High-value lines tonight" },
  scans: { label: "Scan logs", hint: "Handheld and bench devices" },
  access: { label: "Access log", hint: "Who opened the cage" },
  cctv: { label: "CCTV", hint: "18:35 – 18:55 at Bay H1" },
  exception: { label: "Exception bay", hint: "Cancelled and returned stock" },
};
