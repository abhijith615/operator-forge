import type {
  BatchId,
  BatchSpec,
  RecoveryAction,
  StorageId,
  VehicleId,
  VehicleSpec,
  ZoneId,
} from "./types";

/**
 * Day 4's store, loads and clock.
 *
 * Every threshold here is this fictional store's operating assumption — a
 * 70-position staging lane, a 30-carton aisle, a 15-minute chilled exposure
 * limit — not a universal standard.
 */

export const STORE = "Dark Store 114";

/** 10:18 AM, in minutes after midnight. */
const START = 10 * 60 + 18;

export function clockAt(t: number): string {
  const total = START + Math.round(t);
  const h24 = Math.floor(total / 60) % 24;
  const m = total % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h24 >= 12 ? "PM" : "AM"}`;
}

/** The pipeline opens at 10:27. */
export const PIPELINE_FROM = 9;
/** Recovery planning at 10:48. */
export const RECOVERY_AT = 30;
/** Lunch demand from 11:00. */
export const LUNCH_AT = 42;
/** "Run 3 minutes". */
export const RUN_STEP = 3;
/** Recovery is planned in three four-minute windows. */
export const WINDOW = 4;
export const WINDOWS = 3;
export const WINDOW_ACTIONS = 2;

/* ── Space ────────────────────────────────────────────────────────────── */

export const STAGING_CAPACITY = 80;
/** Carton positions inside the painted staging lanes. */
export const LANES_CAP = 70;
/** The floor is "full" — 100% congestion — at this many inbound cartons. */
export const FLOOR_CAP = 84;
export const AISLE_CAP = 30;
/** Of the cartons that overflow the lanes, this share ends up in Aisle C. */
export const AISLE_SHARE = 0.5;
export const SAFE_CAP = 24;

export const STORAGE_CAP: Record<StorageId, number> = {
  chilled: 30,
  frozen: 20,
  fastpick: 40,
  ambient: 120,
  deep: 80,
};

export const STORAGE_LABEL: Record<StorageId, string> = {
  chilled: "Chilled room",
  frozen: "Freezer",
  fastpick: "Fast-pick shelves",
  ambient: "Ambient racks",
  deep: "Deep storage",
};

/* ── Rates ────────────────────────────────────────────────────────────── */

/** Inbound people, in teams of two. A team either unloads a dock or puts away. */
export const TEAMS = 4;
/** Cartons one putaway team stores in a minute on a clear floor. */
export const PUTAWAY_RATE = 1.25;
/** Cartons one GRN slot scan-verifies in a minute. */
export const GRN_RATE = 6.7;
export const GRN_SLOTS = 2;
/** Minutes a temperature / shelf-life check takes at the QC gate. */
export const QC_MINUTES = 3;
export const RECHECK_MINUTES = 2;

/** Minutes a cold batch can sit on the ambient floor before it is a cold-chain problem. */
export const EXPOSURE_LIMIT: Record<"chilled" | "frozen", number> = { chilled: 25, frozen: 20 };

/* ── The loads ────────────────────────────────────────────────────────── */

export const VEHICLES: Record<VehicleId, VehicleSpec> = {
  dairy: {
    id: "dairy",
    name: "Dairy vehicle",
    load: "24 crates",
    temperature: "Chilled",
    batches: ["D1"],
    rate: 3.5,
    checks: ["Temperature", "Shelf life"],
    spaceDemand: "Medium",
    demand: "High",
  },
  frozen: {
    id: "frozen",
    name: "Frozen vehicle",
    load: "18 crates",
    temperature: "Frozen",
    batches: ["F1"],
    rate: 3,
    checks: ["Temperature"],
    spaceDemand: "Low / Medium",
    demand: "Medium",
    note: "Cold-chain sensitivity high. Cannot unload to storage until accepted.",
  },
  grocery: {
    id: "grocery",
    name: "Grocery vehicle",
    load: "96 cartons",
    temperature: "Ambient",
    batches: ["G1", "G2", "G3"],
    rate: 4.5,
    checks: ["Spot check at the door"],
    spaceDemand: "Very high",
    demand: "Mixed",
  },
};

export const VEHICLE_ORDER: VehicleId[] = ["dairy", "frozen", "grocery"];

export const BATCHES: Record<BatchId, BatchSpec> = {
  S1: {
    id: "S1",
    name: "Snacks & bread",
    detail: "Earlier delivery · scan-verified",
    cartons: 26,
    unit: "cartons",
    storage: "ambient",
    allowed: ["ambient", "fastpick"],
    demand: "high",
    cold: null,
    vehicle: null,
  },
  S2: {
    id: "S2",
    name: "Mixed grocery",
    detail: "Earlier delivery · awaiting scan",
    cartons: 34,
    unit: "cartons",
    storage: "ambient",
    allowed: ["ambient", "deep"],
    demand: "medium",
    cold: null,
    vehicle: null,
  },
  C1: {
    id: "C1",
    name: "Aisle C spill",
    detail: "Verified cartons parked in the picker route",
    cartons: 12,
    unit: "cartons",
    storage: "ambient",
    allowed: ["ambient", "deep"],
    demand: "medium",
    cold: null,
    vehicle: null,
  },
  D1: {
    id: "D1",
    name: "Milk & curd",
    detail: "Dairy vehicle",
    cartons: 24,
    unit: "crates",
    storage: "chilled",
    allowed: ["chilled"],
    demand: "high",
    cold: "chilled",
    vehicle: "dairy",
  },
  F1: {
    id: "F1",
    name: "Frozen foods",
    detail: "Frozen vehicle",
    cartons: 18,
    unit: "crates",
    storage: "frozen",
    allowed: ["frozen"],
    demand: "medium",
    cold: "frozen",
    vehicle: "frozen",
  },
  G1: {
    id: "G1",
    name: "Fast-moving beverages",
    detail: "Grocery vehicle · cold drinks",
    cartons: 28,
    unit: "cartons",
    storage: "fastpick",
    allowed: ["fastpick", "ambient"],
    demand: "high",
    cold: null,
    vehicle: "grocery",
  },
  G2: {
    id: "G2",
    name: "Mixed grocery",
    detail: "Grocery vehicle",
    cartons: 36,
    unit: "cartons",
    storage: "ambient",
    allowed: ["ambient", "deep", "fastpick"],
    demand: "medium",
    cold: null,
    vehicle: "grocery",
  },
  G3: {
    id: "G3",
    name: "Slow-moving grocery",
    detail: "Grocery vehicle",
    cartons: 32,
    unit: "cartons",
    storage: "deep",
    allowed: ["deep", "ambient", "fastpick"],
    demand: "low",
    cold: null,
    vehicle: "grocery",
  },
};

export const BATCH_ORDER: BatchId[] = ["S1", "S2", "C1", "D1", "F1", "G1", "G2", "G3"];

/** What lunch will ask for. Shown as an overlay; it is what the commercial score reads. */
export const LUNCH_FORECAST = ["Milk", "Curd", "Cold drinks", "Snacks", "Bread-related items"];

/** The stock lunch leans on, and how much each counts. */
export const PRIORITY_WEIGHT: Partial<Record<BatchId, number>> = { D1: 1, G1: 1, S1: 1, F1: 0.5 };

/* ── The QC interruption ──────────────────────────────────────────────── */

export const QC_CRATE = {
  id: "D1-07",
  issue: "Remaining shelf life 2 days against a 4-day minimum · outer crate cracked",
};

/* ── What the zones say when you look ─────────────────────────────────── */

/** How a zone reads inside a sentence. */
export const ZONE_IN_SENTENCE: Record<ZoneId, string> = {
  yard: "the yard",
  dock: "the dock",
  qc: "QC",
  staging: "GRN staging",
  aisleC: "Aisle C",
  putaway: "putaway",
  packing: "packing",
};

export const ZONE_LABEL: Record<ZoneId, string> = {
  yard: "Yard",
  dock: "Dock",
  qc: "QC / Receiving",
  staging: "GRN staging",
  aisleC: "Aisle C",
  putaway: "Putaway",
  packing: "Packing",
};

/** Zones the operator can mark as the bottleneck. */
export const MARKABLE: ZoneId[] = ["dock", "qc", "staging", "putaway", "aisleC", "packing"];

/* ── Recovery ─────────────────────────────────────────────────────────── */

export const RECOVERY_ACTIONS: { id: RecoveryAction; label: string; detail: string }[] = [
  { id: "clearAisle", label: "Clear Aisle C", detail: "Lift the spill out of the picker route" },
  { id: "putawayFast", label: "Complete fast-moving grocery putaway", detail: "Beverages to fast-pick" },
  { id: "putawayDairy", label: "Complete dairy putaway", detail: "Milk and curd into the chilled room" },
  { id: "putawayFrozen", label: "Complete frozen putaway", detail: "Frozen crates into the freezer" },
  { id: "finishScan", label: "Finish scan verification", detail: "Push every waiting batch through GRN" },
  { id: "slowGrocery", label: "Process slow-moving grocery", detail: "Unload and store the slow lines" },
  { id: "safeLane", label: "Open temp safe staging lane", detail: "24 positions out of every route" },
  { id: "continueUnload", label: "Continue grocery unloading", detail: "Keep the grocery vehicle coming off" },
  { id: "stopInbound", label: "Stop all inbound", detail: "Every dock stops unloading" },
  { id: "cartonsToAisle", label: "Move cartons into picking aisle", detail: "Empty the lanes into aisle B" },
  { id: "deepStore", label: "Deep-store low-demand stock", detail: "Low and medium lines to deep storage" },
];

export const OPENING_MESSAGES = {
  floorLead: "If we keep unloading, pickers won't be able to move.",
  cluster: ["Lunch demand starts building in 42 minutes.", "Clear the floor without breaking receiving controls."],
  recovery: ["Peak starts in 12.", "Give me the recovery sequence."],
};

/** Shown at the end of Day 3. */
export const DAY_FOUR_TEASER = {
  eyebrow: "Day 4 · Clear the Floor",
  headline: "Three vehicles have arrived. Peak starts in 42 minutes.",
  body: "A floor choking on inbound, an aisle the pickers can't use and a QC gate that won't be rushed. Find the real bottleneck and get the store ready before lunch.",
};
