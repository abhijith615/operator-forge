import type {
  FlowNodeId,
  FlowSlotId,
  PgActionCard,
  PgLane,
  PgSku,
} from "./types";

/**
 * Case 02 content. No React, no scoring.
 *
 * The answer to this case is one sentence: customers ordered 30 g, a 40 g pack
 * was physically picked seventeen times, and the system deducted 30 g each
 * time because nobody scanned the product. Nothing a learner can read before
 * doing the work says that. The records here state facts flatly — including
 * the fact that is missing — and the learner assembles the sentence.
 *
 * Every derived number (variance, net value, record units, pre-drift stock)
 * is computed from the two SKU specs, so the story cannot contradict itself.
 */

export interface SkuSpec {
  id: PgSku;
  name: string;
  weight: string;
  bin: string;
  /** Invented codes — these are not real product barcodes. */
  barcode: string;
  system: number;
  physical: number;
  unitValue: number;
  /** Facings on the shelf, row by row. Must sum to `physical`. */
  rows: number[];
}

export const SKU_30: SkuSpec = {
  id: "sku30",
  name: "Parle-G 30 g",
  weight: "30 g",
  bin: "B-12-03",
  barcode: "8 90412 00303 6",
  system: 21,
  physical: 38,
  unitValue: 5,
  rows: [10, 10, 10, 8],
};

export const SKU_40: SkuSpec = {
  id: "sku40",
  name: "Parle-G 40 g",
  weight: "40 g",
  bin: "B-12-04",
  barcode: "8 90412 00404 1",
  system: 34,
  physical: 17,
  unitValue: 10,
  rows: [10, 7],
};

export const SKUS: Record<PgSku, SkuSpec> = { sku30: SKU_30, sku40: SKU_40 };

/** How many picks went wrong. Every other number on this case follows from it. */
export const AFFECTED_PICKS = 17;

// A declaration, not an arrow const: the production minifier inlined the
// arrow into the module-level totals below and left its parameter unbound
// ("sku is not defined" at build time).
export function varianceOf(spec: SkuSpec): number {
  return spec.physical - spec.system;
}

/**
 * Net value the store is short, at unit value. Positive is a loss.
 * 30 g is +17 × ₹5 = +₹85 over; 40 g is −17 × ₹10 = −₹170 short; net −₹85.
 */
export const NET_VALUE_IMPACT = -(
  varianceOf(SKU_30) * SKU_30.unitValue +
  varianceOf(SKU_40) * SKU_40.unitValue
);

/** Record units that disagree with the shelf, across both SKUs. */
export const RECORD_UNITS_AFFECTED =
  Math.abs(varianceOf(SKU_30)) + Math.abs(varianceOf(SKU_40));

export const VALUE_GAP_PER_PICK = SKU_40.unitValue - SKU_30.unitValue;

/**
 * Where both SKUs stood before the drift began: matched. The seventeen picks
 * took the 30 g *record* down and the 40 g *shelf* down, and nothing else.
 */
export const PRE_DRIFT: Record<PgSku, number> = {
  sku30: SKU_30.system + AFFECTED_PICKS,
  sku40: SKU_40.physical + AFFECTED_PICKS,
};

/* ── Stage 1 · the audit's other lines, for the linking task ───────────── */

export interface VarianceChip {
  id: "earbuds" | "faceWash" | "milk" | PgSku;
  label: string;
  value: number;
}

/** The pair that explains each other. Everything else is tonight's noise. */
export const MIRROR_PAIR: [PgSku, PgSku] = ["sku30", "sku40"];

/* ── Stage 2 · orders and the pick log ──────────────────────────────────── */

export interface PickRecord {
  order: string;
  /** Minutes after 18:00, so the log sorts correctly across midnight. */
  at: number;
  picker: string;
  ordered: string;
  systemPick: string;
  bin: string;
  productScanned: boolean;
}

/**
 * Picker per affected pick, in time order. P014 carries eleven of seventeen —
 * the evidence that makes coaching targeted rather than a broadcast.
 */
const AFFECTED_PICKERS = [
  "P014", "P021", "P014", "P014", "P009", "P014", "P021", "P014", "P014",
  "P021", "P014", "P009", "P014", "P014", "P021", "P014", "P014",
] as const;

const CLEAN_PICKERS = ["P032", "P021", "P014", "P032", "P009", "P021", "P032", "P014", "P021"] as const;

const AFFECTED: PickRecord[] = AFFECTED_PICKERS.map((picker, i) => ({
  order: String(7021 + i * 17),
  at: 52 + i * 21,
  picker,
  ordered: SKU_30.weight,
  systemPick: SKU_30.weight,
  bin: SKU_30.bin,
  productScanned: false,
}));

const CLEAN: PickRecord[] = CLEAN_PICKERS.map((picker, i) => ({
  // Numbered on the same clock as the affected orders, so order numbers
  // rise with time across the whole log. None of them lands on an affected
  // order's number.
  order: String(7021 + Math.round(((11 + i * 39) * 17) / 21)),
  at: 63 + i * 39,
  picker,
  ordered: SKU_30.weight,
  systemPick: SKU_30.weight,
  bin: SKU_30.bin,
  productScanned: true,
}));

/** Every 30 g pick tonight. Seventeen of them skipped the product scan. */
export const PICK_LOG: PickRecord[] = [...AFFECTED, ...CLEAN].sort((a, b) => a.at - b.at);

export const AFFECTED_ORDERS = AFFECTED;

export function pickerBreakdown(): { picker: string; picks: number }[] {
  const counts = new Map<string, number>();
  for (const pick of AFFECTED) counts.set(pick.picker, (counts.get(pick.picker) ?? 0) + 1);
  return [...counts.entries()]
    .map(([picker, picks]) => ({ picker, picks }))
    .sort((a, b) => b.picks - a.picks);
}

export function clockAt(minutesAfterSix: number): string {
  const total = 18 * 60 + minutesAfterSix;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** The one transaction the replay reconstructs. */
export const REPLAY_PICK = AFFECTED[2]!;

/* ── Stage 3 · the flow board ────────────────────────────────────────────── */

export interface FlowNode {
  id: FlowNodeId;
  label: string;
}

export const FLOW_NODES: FlowNode[] = [
  { id: "wrongPick", label: `${AFFECTED_PICKS} × 40 g physically picked` },
  { id: "sysDeduct", label: "30 g inventory deducted by system" },
  { id: "gap", label: `${AFFECTED_PICKS} incomplete barcode verifications` },
  { id: "physLeave", label: "40 g physical inventory leaves store" },
];

export interface FlowSlot {
  id: FlowSlotId;
  label: string;
  hint: string;
  accepts: FlowNodeId;
}

/**
 * Slots are labelled by what they must explain, not by what goes in them.
 * The two effect slots name the variance they have to account for — the
 * learner has to reason which consequence produces +17 and which −17.
 */
export const FLOW_SLOTS: FlowSlot[] = [
  { id: "control", label: "What let it happen", hint: "The control that did not hold", accepts: "gap" },
  { id: "event", label: "What happened on the floor", hint: "The physical act", accepts: "wrongPick" },
  { id: "sku30Effect", label: "Explains 30 g · +17", hint: "Physical above system", accepts: "sysDeduct" },
  { id: "sku40Effect", label: "Explains 40 g · −17", hint: "Physical below system", accepts: "physLeave" },
];

/* ── Stage 4 · corrective actions ───────────────────────────────────────── */

export const LANE_LABEL: Record<PgLane, string> = {
  fixNow: "Fix now",
  preventRepeat: "Prevent repeat",
  notNeeded: "Not needed",
};

/** Capped so the board is a prioritisation, not a checklist. */
export const LANE_LIMIT: Record<PgLane, number | null> = {
  fixNow: 3,
  preventRepeat: 3,
  notNeeded: null,
};

export const CORRECTIVE_CARDS: PgActionCard[] = [
  {
    id: "correct-30",
    label: "Correct 30 g system inventory",
    detail: "Align the record to the 38 on the shelf.",
    score: {
      fixNow: { inventoryReasoning: 2 },
      notNeeded: { inventoryReasoning: -3 },
    },
  },
  {
    id: "stop-picking",
    label: "Stop all picking",
    detail: "Halt fulfilment until the counts are settled.",
    score: {
      fixNow: { prioritisation: -4 },
      preventRepeat: { prioritisation: -4 },
      notNeeded: { prioritisation: 1 },
    },
    tags: { fixNow: ["unnecessary_store_shutdown"], preventRepeat: ["unnecessary_store_shutdown"] },
  },
  {
    id: "scan-mandatory",
    label: "Reinforce mandatory product barcode scanning",
    detail: "No pick confirms without the product itself scanned.",
    score: {
      fixNow: { processDiscipline: 3 },
      preventRepeat: { processDiscipline: 4 },
      notNeeded: { processDiscipline: -3 },
    },
    tags: { fixNow: ["scan_control_selected"], preventRepeat: ["scan_control_selected"] },
  },
  {
    id: "review-17",
    label: "Review the 17 affected transactions",
    detail: "Check every one for customer impact and the same pattern.",
    score: {
      fixNow: { rootCause: 2 },
      preventRepeat: { rootCause: 1 },
      notNeeded: { rootCause: -1 },
    },
  },
  {
    id: "writeoff",
    label: "Write off both SKUs",
    detail: "Take the variance on both lines to shrinkage.",
    score: {
      fixNow: { rootCause: -3, inventoryReasoning: -3 },
      preventRepeat: { rootCause: -3, inventoryReasoning: -3 },
      notNeeded: { inventoryReasoning: 1 },
    },
    tags: {
      fixNow: ["blind_writeoff"],
      preventRepeat: ["blind_writeoff"],
      notNeeded: ["financial_impact_understood"],
    },
  },
  {
    id: "separate-shelf",
    label: "Separate 30 g and 40 g physically on shelf",
    detail: "Stop the two sizes sharing a reach.",
    score: {
      fixNow: { correctiveAction: 2 },
      preventRepeat: { correctiveAction: 3 },
      notNeeded: { correctiveAction: -1 },
    },
    tags: { fixNow: ["shelf_separation_selected"], preventRepeat: ["shelf_separation_selected"] },
  },
  {
    id: "correct-40",
    label: "Correct 40 g system inventory",
    detail: "Align the record to the 17 on the shelf.",
    score: {
      fixNow: { inventoryReasoning: 2 },
      notNeeded: { inventoryReasoning: -3 },
    },
  },
  {
    id: "recount-store",
    label: "Recount entire store",
    detail: "A full count of every line tonight.",
    score: {
      fixNow: { prioritisation: -2 },
      preventRepeat: { prioritisation: -2 },
      notNeeded: { prioritisation: 1 },
    },
    tags: {
      fixNow: ["whole_store_recount_overreaction"],
      preventRepeat: ["whole_store_recount_overreaction"],
    },
  },
  {
    id: "coach",
    label: "Coach picker(s) with repeated SKU errors",
    detail: "A targeted conversation, not a broadcast to the floor.",
    score: {
      fixNow: { correctiveAction: 1 },
      preventRepeat: { correctiveAction: 1, processDiscipline: 1 },
    },
    tags: { fixNow: ["targeted_coaching_selected"], preventRepeat: ["targeted_coaching_selected"] },
  },
  {
    id: "remove-sku",
    label: "Remove Parle-G from catalogue",
    detail: "Delist both sizes until this is resolved.",
    score: {
      fixNow: { prioritisation: -3, correctiveAction: -2 },
      preventRepeat: { prioritisation: -3, correctiveAction: -2 },
      notNeeded: { prioritisation: 1 },
    },
    tags: {
      fixNow: ["unnecessary_catalogue_removal"],
      preventRepeat: ["unnecessary_catalogue_removal"],
    },
  },
  {
    id: "bin-labels",
    label: "Improve shelf/bin differentiation",
    detail: "Labels and bin markers a picker cannot misread at speed.",
    score: {
      fixNow: { correctiveAction: 1 },
      preventRepeat: { correctiveAction: 2 },
    },
  },
];
