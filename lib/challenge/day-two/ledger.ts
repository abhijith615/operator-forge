import { RECORD_UNITS_AFFECTED, SKU_30, SKU_40, varianceOf } from "./parleg/content";
import type { MasterLedger } from "./types";

/**
 * The night's variance report.
 *
 * Every line here is arithmetically true and the lines sum to the headline.
 * That sounds like a low bar until you consider what this day assesses: an
 * audit whose own totals do not reconcile teaches the opposite of the lesson.
 * `DAY_TWO_TOTAL_VARIANCE` is derived from the rows rather than typed, so the
 * two cannot drift apart when a line changes — and the Parle-G line takes its
 * numbers straight from the case content, so the ledger and the case can never
 * disagree about them either.
 */

/** `clear` is a line that was counted and agreed with the system. */
export type CaseSeverity = "critical" | "medium" | "clear";

/** One SKU inside a ledger line. Most lines are one SKU; a drift line is two. */
export interface SkuLine {
  label: string;
  /** Physical minus system. Negative: short. Positive: over. */
  qtyVariance: number;
  unitValue: number;
  systemStock: number;
}

export interface LossRow {
  id: string;
  product: string;
  /** Short name for the audit queue card. */
  caseTitle: string;
  /**
   * Net unit variance. A two-SKU drift can net to zero units and still lose
   * value — which is exactly why lines with `skus` are valued per SKU.
   */
  qtyVariance: number;
  unitValue: number;
  /** Known where the line was counted tonight; absent where it was not. */
  systemStock?: number;
  /** Set when the line spans more than one SKU. */
  skus?: SkuLine[];
  group: string;
  /** Left-hand chip on the queue card. */
  category: string;
  severity: CaseSeverity;
  /** Square product photo in /public/products. */
  photo: string;
  /** Alt text. Describes the item, not the brand's marketing. */
  photoAlt: string;
  playable: boolean;
  note: string;
  /** What the case panel says the work will be. */
  approach: string;
}

export const LOSS_ROWS: LossRow[] = [
  {
    id: "earbuds",
    product: "Wireless Earbuds",
    caseTitle: "Wireless Earbuds variance",
    qtyVariance: -3,
    unitValue: 3999,
    systemStock: 12,
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
    product: "Parle-G 30 g / 40 g",
    caseTitle: "Parle-G SKU drift",
    qtyVariance: varianceOf(SKU_30) + varianceOf(SKU_40),
    unitValue: SKU_40.unitValue,
    skus: [
      {
        label: SKU_30.weight,
        qtyVariance: varianceOf(SKU_30),
        unitValue: SKU_30.unitValue,
        systemStock: SKU_30.system,
      },
      {
        label: SKU_40.weight,
        qtyVariance: varianceOf(SKU_40),
        unitValue: SKU_40.unitValue,
        systemStock: SKU_40.system,
      },
    ],
    group: "Packaged food",
    category: "SKU drift",
    severity: "medium",
    photo: "/products/biscuits.webp",
    photoAlt: "A pack of Parle-G biscuits",
    playable: true,
    note: `Potential anomaly: ${RECORD_UNITS_AFFECTED} units across two SKUs.`,
    approach:
      "Two pack sizes in adjacent bins, and a count that looks wrong on both. Verify the shelves before deciding what the numbers mean.",
  },
  {
    id: "face-wash",
    product: "Face Wash 100ml",
    caseTitle: "Face wash shelf count",
    // Counted clean. A variance report that only ever lists problems teaches
    // that every line is one; a matched line is a result too.
    qtyVariance: 0,
    unitValue: 215,
    systemStock: 24,
    group: "Personal care",
    category: "Matched",
    severity: "clear",
    photo: "/products/face-wash.webp",
    photoAlt: "A 100ml tube of neem face wash",
    playable: false,
    note: "Counted. Physical stock matches the system.",
    approach:
      "24 on the shelf, 24 in the system. Nothing to investigate — and knowing which lines are clean is how you know where to spend the night.",
  },
  {
    id: "milk",
    product: "Fresh Milk 1L",
    caseTitle: "Fresh milk chiller count",
    qtyVariance: 0,
    unitValue: 67,
    systemStock: 40,
    group: "Fresh food",
    category: "Matched",
    severity: "clear",
    photo: "/products/fresh-milk.webp",
    photoAlt: "A one litre carton of fresh milk",
    playable: false,
    note: "Counted. Physical stock matches the system.",
    approach:
      "40 cartons in the chiller, 40 in the system, and tonight's dump postings agree. Nothing to investigate.",
  },
];

export function skuLines(row: LossRow): SkuLine[] {
  return (
    row.skus ?? [
      {
        label: row.product,
        qtyVariance: row.qtyVariance,
        unitValue: row.unitValue,
        systemStock: row.systemStock ?? 0,
      },
    ]
  );
}

/**
 * Value the store is short on a line, at unit value. A gain on one SKU offsets
 * a loss on another — the Parle-G line is +₹85 on 30 g against −₹170 on 40 g,
 * which is ₹85 net, not ₹255.
 */
export function lossValue(row: LossRow): number {
  const net = skuLines(row).reduce((total, line) => total + line.qtyVariance * line.unitValue, 0);
  return Math.max(0, -net);
}

/** Record units that disagree with the shelf. A count of records, not money. */
export function recordUnits(row: LossRow): number {
  return skuLines(row).reduce((total, line) => total + Math.abs(line.qtyVariance), 0);
}

export function isMatched(row: LossRow): boolean {
  return recordUnits(row) === 0;
}

export function formatQty(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return "0";
}

/** Lines that actually carry a variance — the ones that are cases. */
export const VARIANCE_ROWS = LOSS_ROWS.filter((row) => !isMatched(row));

/** Derived, never typed by hand. The headline is the sum of the rows. */
export const DAY_TWO_TOTAL_VARIANCE = LOSS_ROWS.reduce(
  (total, row) => total + lossValue(row),
  0,
);

export const HIGH_VALUE_EXPOSURE = LOSS_ROWS.filter((row) =>
  skuLines(row).some((line) => line.unitValue >= 1000),
).reduce((total, row) => total + lossValue(row), 0);

export const EARBUDS_ROW = LOSS_ROWS.find((row) => row.id === "earbuds")!;
export const PARLEG_ROW = LOSS_ROWS.find((row) => row.id === "biscuits")!;

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
 * The master ledger is a projection of the cases, never a second source of
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
  title: `${rupees(DAY_TWO_TOTAL_VARIANCE)} is missing`,
  subtitle: "The system says the stock exists. The store says otherwise.",
  clock: "01:47 AM",
  context: "Lean night operations · Inventory audit in progress",
  store: "Dark Store 114 · Indiranagar",
} as const;

/**
 * The in-world clock, counting up from 01:47. The fifteen-minute countdown is
 * the challenge's; this is the store's, the same split Day 1 makes.
 */
export function auditClock(elapsedSeconds: number): string {
  const total = 1 * 60 + 47 + Math.floor(elapsedSeconds / 60);
  const hours = Math.floor(total / 60) % 24;
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} AM`;
}
