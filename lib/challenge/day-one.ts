import type {
  Employee,
  Metrics,
  SceneChoice,
  StaffingPlan,
  Station,
} from "./types";

/**
 * Day 1 — The 180-Second Shift.
 *
 * Content only. No React, no scoring maths, no state transitions. Days 2–6
 * supply their own file shaped like this one and the engine does not change.
 */

export const DAY_ONE = {
  day: 1,
  title: "The 180-Second Shift",
  subtitle: "Your first 15 minutes as a Dark Store Manager.",
  openingTime: "07:12 AM",
  targetCtd: 180,
} as const;

export const STORE_BENCHMARK = {
  /** For this store. Not an industry standard, and the UI says so. */
  ppiHealthyMin: 10,
  ppiHealthyMax: 15,
  zones: ["A", "B", "C", "D"],
} as const;

export const INITIAL_METRICS: Metrics = {
  ordersWaiting: 11,
  ctd: 164,
  packingQueue: 4,
  nilPicks: 0,
  ridersWaiting: 6,
  pickingCapacity: 100,
};

/* ── The floor ────────────────────────────────────────────────────────── */

export const EMPLOYEES: Employee[] = [
  {
    id: "arjun",
    name: "Arjun",
    primary: "picking",
    secondary: "packing",
    ppi: 10.4,
    accuracy: 99.4,
    accuracyLabel: "Pick accuracy",
  },
  {
    id: "nikhil",
    name: "Nikhil",
    primary: "picking",
    secondary: "packing",
    ppi: 13.1,
    accuracy: 99.1,
    accuracyLabel: "Pick accuracy",
  },
  {
    id: "faisal",
    name: "Faisal",
    primary: "picking",
    secondary: null,
    ppi: 18.2,
    accuracy: 99.6,
    accuracyLabel: "Pick accuracy",
  },
  {
    id: "akhil",
    name: "Akhil",
    primary: "picking",
    secondary: "dispatch",
    ppi: 11.6,
    accuracy: 98.8,
    accuracyLabel: "Pick accuracy",
  },
  {
    id: "sneha",
    name: "Sneha",
    primary: "packing",
    secondary: "picking",
    accuracy: 99.7,
    accuracyLabel: "Packing accuracy",
  },
  {
    id: "manu",
    name: "Manu",
    primary: "packing",
    secondary: "dispatch",
    accuracy: 99.2,
    accuracyLabel: "Packing accuracy",
  },
  {
    id: "rahul",
    name: "Rahul",
    primary: "dispatch",
    secondary: "picking",
    accuracy: 99.8,
    accuracyLabel: "Handover accuracy",
  },
];

/** Everyone starts where they normally work. Rakesh has not reported. */
export function defaultStaffing(): StaffingPlan {
  return Object.fromEntries(
    EMPLOYEES.map((employee) => [employee.id, employee.primary]),
  ) as StaffingPlan;
}

export function countAt(plan: StaffingPlan, station: Station): number {
  return Object.values(plan).filter((value) => value === station).length;
}

/**
 * What the peak does on its own between 07:12 and 07:18.
 *
 * Applied whatever the operator did with the floor, so their allocation is
 * read as how much of the wave they absorbed rather than as the only thing
 * moving the numbers. Without this a good staffing call made the store quieter
 * and the packing warning contradicted the board.
 */
export const PEAK_BUILD = {
  ordersWaiting: 8,
  ctd: 14,
  packingQueue: 3,
  ridersWaiting: 2,
} as const;

/* ── Scene 2 — the queue is moving ────────────────────────────────────── */

export const FLOW_CHOICES: SceneChoice[] = [
  {
    id: "picker-to-packing",
    label: "Move a cross-trained picker to packing",
    detail: "Arjun or Nikhil can pack. Picking drops one head.",
    signals: { priority: 5, team: 3, reasoning: 4 },
    tags: ["anticipated_bottleneck", "used_cross_training"],
    metricEffect: { packingQueue: -3, ctd: -17, pickingCapacity: -8 },
    outcome: {
      tone: "healthy",
      headline: "Bottleneck easing",
      body: "Packing is clearing faster than it is filling. Picking slows slightly and the queue stops growing.",
    },
  },
  {
    id: "packer-to-picking",
    label: "Move a packer into picking",
    detail: "More orders reach packing, sooner.",
    signals: { priority: -3, reasoning: -3, team: -1 },
    tags: ["reacted_late"],
    metricEffect: { packingQueue: 3, ctd: 18, pickingCapacity: 6 },
    outcome: {
      tone: "critical",
      headline: "Pressure building at packing",
      body: "Picking speeds up and packing falls further behind. The stage that was already slowest just lost a person.",
    },
  },
  {
    id: "hold",
    label: "Hold current staffing and keep watching",
    detail: "No change for now.",
    signals: { priority: -3, reasoning: -2 },
    tags: ["reacted_late"],
    metricEffect: { packingQueue: 2, ctd: 12, ordersWaiting: 3 },
    outcome: {
      tone: "warning",
      headline: "Queue still climbing",
      body: "Nothing changed on the floor, so nothing changed in the numbers. Packing is now the slowest active stage.",
    },
  },
  {
    id: "pause-picking",
    label: "Pause new picking until packing clears",
    detail: "Stops the inflow at source.",
    signals: { priority: -1, reasoning: 1, customer: -2 },
    tags: ["froze_the_line"],
    metricEffect: { packingQueue: -2, ctd: 9, ordersWaiting: 6 },
    outcome: {
      tone: "warning",
      headline: "Packing clears, orders stack up",
      body: "The queue at packing drops. Orders waiting climbs faster, because nothing is entering the pipeline at all.",
    },
  },
];

/* ── Scene 3 — nil pick ───────────────────────────────────────────────── */

export const NIL_PICK_ORDER = {
  order: "#4857",
  product: "Fresh Milk 1 L",
  location: "C-04-03",
  systemStock: 28,
  found: 16,
} as const;

export interface InspectTarget {
  id: string;
  label: string;
  detail: string;
  units: number;
  reveal: string;
}

export const INSPECT_TARGETS: InspectTarget[] = [
  {
    id: "assigned-bin",
    label: "Assigned bin",
    detail: "C-04-03 — where the system sent the picker",
    units: 0,
    reveal: "Empty. The picker was right about the pick face.",
  },
  {
    id: "adjacent-bin",
    label: "Adjacent bins",
    detail: "C-04-02 and C-04-04",
    units: 0,
    reveal: "Nothing misplaced next door either.",
  },
  {
    id: "overstock",
    label: "Overstock rack",
    detail: "Zone C upper levels",
    units: 0,
    reveal: "Overstock for zone C is clear of milk.",
  },
  {
    id: "replenishment",
    label: "Replenishment pallet",
    detail: "Goods-in, not yet put away",
    units: 16,
    reveal: "16 units of Fresh Milk 1 L, still shrink-wrapped on the pallet.",
  },
];

export const NIL_PICK_CHOICES: SceneChoice[] = [
  {
    id: "replenish",
    label: "Replenish the pick face and complete the order",
    detail: "Put the whole pallet away, then pick.",
    signals: { inventory: 5, priority: 2, customer: 3, reasoning: 2 },
    tags: ["replenished_pickface"],
    metricEffect: { nilPicks: -1, ctd: -6 },
    outcome: {
      tone: "healthy",
      headline: "Order #4857 recovered",
      body: "16 units restored to the pick face. Every other milk order this hour now picks first time.",
    },
  },
  {
    id: "single-unit",
    label: "Take one unit for this order, leave the rest",
    detail: "Fastest route to closing #4857.",
    signals: { inventory: 1, customer: 1, priority: -1 },
    tags: ["took_single_unit"],
    metricEffect: { nilPicks: 0, ctd: -2 },
    outcome: {
      tone: "warning",
      headline: "Order #4857 completed",
      body: "This customer is served. The pick face is empty again, so the next milk order raises the same alert.",
    },
  },
  {
    id: "confirm-nil",
    label: "Confirm the Nil Pick",
    detail: "Mark the item unavailable and move on.",
    signals: { inventory: -4, reasoning: -4, customer: -2 },
    tags: ["cancelled_without_investigation"],
    metricEffect: { nilPicks: 1, ctd: -3 },
    outcome: {
      tone: "critical",
      headline: "Item marked unavailable",
      body: "The customer loses their milk. 16 units are sitting on a pallet twenty feet away.",
    },
  },
  {
    id: "substitute",
    label: "Offer a substitute milk",
    detail: "Different brand, same size.",
    signals: { inventory: 0, customer: 1, reasoning: -1 },
    tags: ["substituted_item"],
    metricEffect: { nilPicks: 0, ctd: -1 },
    outcome: {
      tone: "warning",
      headline: "Substitute sent for approval",
      body: "It may be accepted. The original stock is still on the pallet and the pick face is still empty.",
    },
  },
];

export const NIL_PICK_SOP =
  "An empty pick face does not automatically mean the store has no stock. Check alternate inventory locations — overstock, replenishment, nearby drop locations — before confirming an Item Not Found.";

/* ── Scene 4 — packing ────────────────────────────────────────────────── */

export interface PackItem {
  id: string;
  name: string;
  qty: string;
  /** Drives what correct handling looks like. */
  kind: "ambient" | "fragile" | "chilled" | "chemical";
  hint: string;
}

export const PACK_ORDER = "#4871";

export const PACK_ITEMS: PackItem[] = [
  { id: "bread", name: "Bread", qty: "× 1", kind: "ambient", hint: "Crushes easily" },
  { id: "eggs", name: "Eggs", qty: "× 12", kind: "fragile", hint: "Fragile" },
  { id: "curd", name: "Curd", qty: "× 1", kind: "chilled", hint: "Chilled" },
  {
    id: "cleaner",
    name: "Floor Cleaner",
    qty: "× 1",
    kind: "chemical",
    hint: "Household chemical",
  },
];

export type Protection = "standard" | "fragile" | "chilled";

/* ── Scene 5 — dispatch ───────────────────────────────────────────────── */

export const DISPATCH_BAYS = [
  { bay: "Bay 04", order: "#4871", state: "Verified · ready" },
  { bay: "Bay 07", order: "#4864", state: "Verified · ready" },
  { bay: "Bay 09", order: "#4869", state: "Awaiting scan" },
] as const;

export const DISPATCH_CHOICES: SceneChoice[] = [
  {
    id: "reroute",
    label: "Give Rider 218 a different verified order, fix the scanner behind it",
    detail: "Bay 07 is scanned and ready now.",
    signals: { priority: 4, customer: 3, reasoning: 4, team: 2 },
    tags: [
      "maintained_dispatch_verification",
      "kept_dispatch_moving",
      "delegated_effectively",
    ],
    metricEffect: { ridersWaiting: -2, ctd: -5 },
    outcome: {
      tone: "healthy",
      headline: "Handover flow protected",
      body: "Rider 218 leaves with a verified parcel in 82 seconds. The scanner gets fixed without stopping the bay.",
    },
  },
  {
    id: "hold-all",
    label: "Hold this handover until verification is resolved",
    detail: "Rider 218 waits at the bay.",
    signals: { priority: -2, customer: -1, reasoning: 1 },
    tags: ["maintained_dispatch_verification", "stalled_dispatch"],
    metricEffect: { ridersWaiting: 2, ctd: 11 },
    outcome: {
      tone: "warning",
      headline: "Verification held, bay stalled",
      body: "Nothing goes out unverified — correct. But three riders are now idle behind a problem that only affected one parcel.",
    },
  },
  {
    id: "release-unscanned",
    label: "Release the bag without the scan",
    detail: "He is already late.",
    signals: { priority: 1, customer: -5, reasoning: -4 },
    tags: ["bypassed_dispatch_verification", "skipped_scan_discipline"],
    metricEffect: { ctd: -8 },
    outcome: {
      tone: "critical",
      headline: "Process risk created",
      body: "Eight seconds saved. The parcel left with no record that it matched the rider or the order.",
    },
    sop: {
      id: "dispatch-unverified",
      label: "Released a parcel without verification",
      severity: 0.86,
    },
  },
  {
    id: "eyeball",
    label: "Check the order number by eye and release",
    detail: "Read the label, hand it over.",
    signals: { priority: 1, customer: -3, reasoning: -2 },
    tags: ["bypassed_dispatch_verification"],
    metricEffect: { ctd: -5 },
    outcome: {
      tone: "critical",
      headline: "Partial verification only",
      body: "The number matched what you could see. Nothing confirmed the contents or that this was Rider 218's run.",
    },
    sop: {
      id: "dispatch-eyeball",
      label: "Substituted a visual check for verification",
      severity: 0.93,
    },
  },
];

/* ── Scene 6 — recovery ───────────────────────────────────────────────── */

export const PEAK_METRICS: Metrics = {
  ordersWaiting: 27,
  ctd: 204,
  packingQueue: 8,
  nilPicks: 2,
  ridersWaiting: 11,
  pickingCapacity: 86,
};

export interface RecoveryAction {
  id: string;
  label: string;
  detail: string;
  signals: import("./types").SignalDelta;
  tags: import("./types").DecisionTag[];
  /** Metric movement when placed first. Later slots apply a decay. */
  metricEffect: import("./types").MetricEffect;
  sop?: Omit<import("./types").SopViolation, "scene">;
  /** Ranked highest when executed early. Used for prioritisation scoring. */
  idealRank: number | null;
}

export const RECOVERY_ACTIONS: RecoveryAction[] = [
  {
    id: "staff-to-packing",
    label: "Move cross-trained floor staff to packing",
    detail: "Packing is the slowest active stage.",
    signals: { priority: 5, team: 3, reasoning: 3 },
    tags: ["solved_true_bottleneck", "used_cross_training"],
    metricEffect: { packingQueue: -5, ctd: -17 },
    idealRank: 1,
  },
  {
    id: "delegate-nil-picks",
    label: "Ask the Floor Lead to clear both Nil Pick escalations",
    detail: "Two orders are stuck behind them.",
    signals: { team: 5, inventory: 3, reasoning: 3 },
    tags: ["delegated_effectively"],
    metricEffect: { nilPicks: -2, ordersWaiting: -3, ctd: -10 },
    idealRank: 2,
  },
  {
    id: "rider-capacity",
    label: "Coordinate extra rider capacity with the Fleet Lead",
    detail: "Eleven riders waiting, more orders coming.",
    signals: { priority: 2, customer: 2, team: 2 },
    tags: ["coordinated_riders"],
    metricEffect: { ridersWaiting: -4, ctd: -9 },
    idealRank: 3,
  },
  {
    id: "pause-picking",
    label: "Pause all picking until packing clears",
    detail: "Stop everything entering the pipeline.",
    signals: { priority: -3, reasoning: -1, customer: -2 },
    tags: ["froze_the_line"],
    metricEffect: { packingQueue: -3, ordersWaiting: 8, ctd: 10 },
    idealRank: null,
  },
  {
    id: "skip-scans",
    label: "Tell pickers to skip barcode scans for now",
    detail: "Saves seconds per item.",
    signals: { priority: 1, reasoning: -4, customer: -4, inventory: -4 },
    tags: ["skipped_scan_discipline"],
    metricEffect: { ctd: -12, pickingCapacity: 8 },
    sop: {
      id: "recovery-skip-scans",
      label: "Suspended barcode verification during peak",
      severity: 0.8,
    },
    idealRank: null,
  },
  {
    id: "manager-searches",
    label: "Go and search the shelves for the missing products yourself",
    detail: "Fastest pair of hands you can control.",
    signals: { team: -3, priority: -4, reasoning: -2 },
    tags: ["manager_overinvolved"],
    metricEffect: { nilPicks: -1, ordersWaiting: 4, ctd: 6 },
    idealRank: null,
  },
];

export const DAY_TWO_TEASER = {
  amount: "₹18,640",
  headline: "of inventory has disappeared.",
  body: "System says it exists. The shelf says it doesn't.",
  hook: "Tomorrow, you're responsible for finding out why.",
} as const;
