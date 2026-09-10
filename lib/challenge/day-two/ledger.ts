import type { MasterLedger } from "./types";

/**
 * The night's variance report.
 *
 * Every line here is arithmetically true and the lines sum to the headline.
 * That sounds like a low bar until you consider what this day assesses: an
 * audit whose own totals do not reconcile teaches the opposite of the lesson.
 * If any of these numbers change, `DAY_TWO_TOTAL_VARIANCE` must be recomputed
 * from the rows rather than edited — which is what the export below does.
 */

export type CaseStatus = "open" | "investigating" | "escalated" | "closed";

export interface LossRow {
  id: string;
  product: string;
  /** Negative: physical is short of system. */
  qtyVariance: number;
  unitValue: number;
  group: string;
  /** Only the earbuds case is playable in this build. */
  playable: boolean;
  note: string;
}

export const LOSS_ROWS: LossRow[] = [
  {
    id: "earbuds",
    product: "Wireless Earbuds",
    qtyVariance: -3,
    unitValue: 3999,
    group: "Electronics · Secure cage",
    playable: true,
    note: "Secure cage count is short by 3 units.",
  },
  {
    id: "face-wash",
    product: "Face Wash 100ml",
    qtyVariance: -9,
    unitValue: 215,
    group: "Personal care",
    playable: false,
    note: "Shelf and system counts have drifted across similar pack sizes.",
  },
  {
    id: "eggs",
    product: "Eggs 12 Pack",
    qtyVariance: -18,
    unitValue: 92,
    group: "Fresh food",
    playable: false,
    note: "Damage and dump posting not reconciled against the shelf.",
  },
  {
    id: "milk",
    product: "Fresh Milk 1L",
    qtyVariance: -16,
    unitValue: 67,
    group: "Fresh food",
    playable: false,
    note: "Short-life stock with no recorded dump against expiry.",
  },
  {
    id: "cold-drink",
    product: "Cold Drink Can 300ml",
    qtyVariance: -24,
    unitValue: 40,
    group: "Beverages",
    playable: false,
    note: "High-velocity SKU with repeated single-unit picking errors.",
  },
  {
    id: "bread",
    product: "Bread Loaf",
    qtyVariance: -10,
    unitValue: 52,
    group: "Bakery",
    playable: false,
    note: "Returns and damage posted to the wrong location.",
  },
  {
    id: "oil",
    product: "Cooking Oil 1L",
    qtyVariance: -2,
    unitValue: 250,
    group: "Packaged food",
    playable: false,
    note: "Two units unaccounted for after an inbound receiving correction.",
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

/* ── Money ────────────────────────────────────────────────────────────── */

/**
 * Indian digit grouping — 18,640 not 18,640 by luck. `en-IN` puts the commas
 * in the places the store's own paperwork puts them, which matters on a screen
 * that is asking somebody to trust its arithmetic.
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
