import type { MasterLedger } from "./types";

/**
 * The night's variance report.
 *
 * Every line here is arithmetically true and the lines sum to the headline.
 * That sounds like a low bar until you consider what this day assesses: an
 * audit whose own totals do not reconcile teaches the opposite of the lesson.
 * `DAY_TWO_TOTAL_VARIANCE` is derived from the rows rather than typed, so the
 * two cannot drift apart when a line changes.
 */

export type CaseSeverity = "critical" | "medium";

export interface LossRow {
  id: string;
  product: string;
  /** Short name for the audit queue card. */
  caseTitle: string;
  /** Negative: physical is short of system. */
  qtyVariance: number;
  unitValue: number;
  group: string;
  /** Left-hand chip on the queue card. */
  category: string;
  severity: CaseSeverity;
  /** Square product photo in /public/products. */
  photo: string;
  /** Alt text. Describes the item, not the brand's marketing. */
  photoAlt: string;
  /** Only the earbuds case is built in this release. */
  playable: boolean;
  note: string;
  /** Shown on the case panel for the cases that are not built yet. */
  approach: string;
}

export const LOSS_ROWS: LossRow[] = [
  {
    id: "earbuds",
    product: "Wireless Earbuds",
    caseTitle: "Wireless Earbuds variance",
    qtyVariance: -3,
    unitValue: 3999,
    group: "Electronics",
    category: "High value",
    severity: "critical",
    photo: "/products/earbuds.webp",
    photoAlt: "A pair of wireless earbuds with their charging case",
    playable: true,
    note: "Secure cage count is short by 3 units.",
    approach:
      "Count the cage, rebuild the movement trail and find out how much of this is really loss.",
  },
  {
    id: "biscuits",
    product: "Parle-G 30g / 40g",
    caseTitle: "Parle-G 30g vs 40g mismatch",
    // A drift measured in hundreds of units is what SKU confusion looks like on
    // a fast-moving line: cheap per unit, expensive in aggregate.
    qtyVariance: -303,
    unitValue: 12,
    group: "Packaged food",
    category: "SKU drift",
    severity: "medium",
    photo: "/products/biscuits.webp",
    photoAlt: "A pack of Parle-G biscuits",
    playable: false,
    note: "System and physical counts are diverging across similar SKUs.",
    approach:
      "Two pack sizes that scan alike. The work is separating a picking error from a master-data error.",
  },
  {
    id: "face-wash",
    product: "Face Wash 100ml",
    caseTitle: "Face wash shelf variance",
    qtyVariance: -9,
    unitValue: 215,
    group: "Personal care",
    category: "Shrinkage",
    severity: "medium",
    photo: "/products/face-wash.webp",
    photoAlt: "A 100ml tube of neem face wash",
    playable: false,
    note: "Small, high-margin units missing from an open shelf.",
    approach:
      "Open-shelf units with no cage and no scan trail. Returns, damages and shelf recovery all have to be ruled out first.",
  },
  {
    id: "milk",
    product: "Fresh Milk 1L",
    caseTitle: "Fresh milk short-life loss",
    qtyVariance: -16,
    unitValue: 67,
    group: "Fresh food",
    category: "Perishables",
    severity: "medium",
    photo: "/products/fresh-milk.webp",
    photoAlt: "A one litre carton of fresh milk",
    playable: false,
    note: "Short-life stock with no recorded dump against expiry.",
    approach:
      "Perishable variance is usually a posting failure rather than a missing carton. The dump log is where this one starts.",
  },
];

export function lossValue(row: LossRow): number {
  return Math.abs(row.qtyVariance) * row.unitValue;
}

/** Derived, never typed by hand. The headline is the sum of the rows. */
export const DAY_TWO_TOTAL_VARIANCE = LOSS_ROWS.reduce(
  (total, row) => total + lossValue(row),
  0,
);

export const HIGH_VALUE_EXPOSURE = LOSS_ROWS.filter(
  (row) => row.unitValue >= 1000,
).reduce((total, row) => total + lossValue(row), 0);

export const EARBUDS_ROW = LOSS_ROWS.find((row) => row.id === "earbuds")!;

/** Share of the night's variance a line represents, for the contribution bars. */
export function lossShare(row: LossRow): number {
  return (lossValue(row) / DAY_TWO_TOTAL_VARIANCE) * 100;
}

/* ── Money ────────────────────────────────────────────────────────────── */

/**
 * Indian digit grouping. The commas land where the store's own paperwork puts
 * them, which matters on a screen asking somebody to trust its arithmetic.
 */
export function rupees(value: number): string {
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)}`;
}

/* ── Master ledger ────────────────────────────────────────────────────── */

export function emptyMaster(): MasterLedger {
  return {
    totalOriginalVariance: DAY_TWO_TOTAL_VARIANCE,
    explainedValue: 0,
    recoveredValue: 0,
    unresolvedValue: DAY_TWO_TOTAL_VARIANCE,
  };
}

/**
 * The master ledger is a projection of the case, never a second source of
 * truth kept in step by hand. Unresolved is what is left after the two kinds
 * of accounting, so the three can never sum to anything but the total.
 */
export function masterFrom(explainedValue: number, recoveredValue: number): MasterLedger {
  return {
    totalOriginalVariance: DAY_TWO_TOTAL_VARIANCE,
    explainedValue,
    recoveredValue,
    unresolvedValue: DAY_TWO_TOTAL_VARIANCE - explainedValue - recoveredValue,
  };
}

/* ── Scene framing ────────────────────────────────────────────────────── */

export const DAY_TWO_BRIEF = {
  day: 2,
  title: "₹18,640 is missing",
  subtitle: "The system says the stock exists. The store says otherwise.",
  clock: "01:47 AM",
  context: "Lean night operations · Inventory audit in progress",
  store: "Dark Store 114 · Indiranagar",
} as const;

/** Audit clock, counting up from 01:47. Nothing here is on a countdown. */
export function auditClock(elapsedSeconds: number): string {
  const total = 1 * 60 + 47 + Math.floor(elapsedSeconds / 60);
  const hours = Math.floor(total / 60) % 24;
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} AM`;
}
