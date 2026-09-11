import {
  AISLE_CAP,
  AISLE_SHARE,
  BATCH_ORDER,
  FLOOR_CAP,
  LANES_CAP,
  PRIORITY_WEIGHT,
  SAFE_CAP,
  STORAGE_CAP,
} from "./scenario";
import type { BatchId, Day4State, StorageId } from "./types";

/**
 * Floor physics.
 *
 * Inbound cartons fill the painted staging lanes first. Past seventy, they
 * spill — half into Aisle C, which is the nearest open floor, half onto the
 * dock apron, which chokes Dock 2. A safe lane, if opened, takes the spill
 * before either. Everything the operator sees on the map is derived from
 * this one function, so the map and the numbers cannot disagree.
 */

export interface FloorLayout {
  total: number;
  lanes: number;
  aisle: number;
  apron: number;
  safe: number;
  unsafe: number;
  aisleBlocked: number;
  congestion: number;
  dockOccupancy: number;
  /** Unloading speed at Dock 2, 0–1. */
  dock2Factor: number;
}

export function layoutOf(state: Day4State): FloorLayout {
  let total = 0;
  let aislePinned = 0;
  let safePinned = 0;
  for (const id of BATCH_ORDER) {
    const run = state.batches[id];
    total += run.onFloor;
    if (run.location === "aisle") aislePinned += run.onFloor;
    if (run.location === "safe") safePinned += run.onFloor;
  }
  const unsafe = Math.min(state.unsafeAisle, total);
  const movable = Math.max(0, total - aislePinned - safePinned - unsafe);
  const lanes = Math.min(LANES_CAP, movable);
  let overflow = movable - lanes;
  const safeRoom = state.safeOpen ? Math.max(0, SAFE_CAP - safePinned) : 0;
  const toSafe = Math.min(safeRoom, overflow);
  overflow -= toSafe;
  const aisle = aislePinned + overflow * AISLE_SHARE;
  const apron = overflow * (1 - AISLE_SHARE);
  const dock2Factor = apron > 2 ? Math.max(0.35, 0.7 - apron / 40) : lanes >= 56 ? 0.7 : 1;
  const dock1InUse = Object.values(state.vehicles).some((vehicle) => vehicle.dock === 1);
  const dockOccupancy =
    (dock1InUse ? 50 : 0) + 50 * Math.min(1, Math.max(0, (lanes - 40) / 24 + apron / 20));

  return {
    total,
    lanes,
    aisle,
    apron,
    safe: safePinned + toSafe,
    unsafe,
    aisleBlocked: Math.min(1, aisle / AISLE_CAP),
    congestion: total / FLOOR_CAP,
    dockOccupancy: Math.min(100, dockOccupancy),
    dock2Factor,
  };
}

/* ── Metrics ──────────────────────────────────────────────────────────── */

/** Seconds added to an aisle-C pick. Normal route is 38 seconds; at 40% blocked it is 61. */
export function routeDelay(aisleBlocked: number, unsafe: number, congestion: number): number {
  const blockage = Math.min(1, aisleBlocked + (unsafe / AISLE_CAP) * 0.8);
  const aisle = blockage <= 0 ? 0 : 21 * Math.pow(blockage / 0.4, 0.55);
  return 2 + aisle + 6 * Math.max(0, congestion - 1);
}

export const NORMAL_ROUTE = 38;

/** A trip through Aisle C: 38 seconds on an empty floor, 61 with this morning's spill. */
export function routeSeconds(delay: number): number {
  return Math.round(NORMAL_ROUTE + delay);
}

/** Click-to-dispatch on the floor as it stands. */
export function liveCtd(delay: number): number {
  return Math.round(151 + 1.08 * delay);
}

/** Click-to-dispatch once lunch arrives: route time plus whatever lunch can't find on a shelf. */
export function lunchCtd(delay: number, readiness: number): number {
  return Math.round(168 + 1.1 * delay + 25 * (1 - readiness));
}

function destinationQuality(id: BatchId, destination: StorageId | null): number {
  if (!destination) return 0;
  if (id === "G1") return destination === "fastpick" ? 1 : 0.7;
  return 1;
}

/** High-demand stock on its shelf, weighted by what lunch leans on. */
export function priorityReadiness(state: Day4State): number {
  let have = 0;
  let need = 0;
  for (const [id, weight] of Object.entries(PRIORITY_WEIGHT) as [BatchId, number][]) {
    const run = state.batches[id];
    have += weight * run.stored * destinationQuality(id, run.destination);
    need += weight * run.cartons;
  }
  return need > 0 ? have / need : 0;
}

/** Of the stock that has come into the building, how much a picker can reach. */
export function pickReadyInbound(state: Day4State): number {
  let stored = 0;
  let floor = 0;
  for (const id of BATCH_ORDER) {
    stored += state.batches[id].stored;
    floor += state.batches[id].onFloor;
  }
  return stored + floor > 0 ? stored / (stored + floor) : 0;
}

export function storageRoom(state: Day4State, storage: StorageId): number {
  let used = 0;
  for (const id of BATCH_ORDER) {
    const run = state.batches[id];
    if (run.destination === storage) used += run.stored;
  }
  // Stock already living there before this morning.
  const existing = storage === "ambient" ? 40 : storage === "deep" ? 30 : 0;
  return Math.max(0, STORAGE_CAP[storage] - existing - used);
}

export function storageUsed(state: Day4State, storage: StorageId): number {
  let used = storage === "ambient" ? 40 : storage === "deep" ? 30 : 0;
  for (const id of BATCH_ORDER) {
    const run = state.batches[id];
    if (run.destination === storage) used += run.stored;
  }
  return used;
}

export interface FloorMetrics {
  floorCartons: number;
  congestion: number;
  aisleBlocked: number;
  delay: number;
  routeSeconds: number;
  ctd: number;
  readiness: number;
  pickReadyInbound: number;
  nilPickRisk: number;
  pendingBatches: number;
  dockOccupancy: number;
}

export function metricsOf(state: Day4State): FloorMetrics {
  const layout = layoutOf(state);
  const delay = routeDelay(layout.aisleBlocked, layout.unsafe, layout.congestion);
  const readiness = priorityReadiness(state);
  const pending = BATCH_ORDER.filter((id) => state.batches[id].stage !== "ready").length;
  return {
    floorCartons: layout.total,
    congestion: layout.congestion,
    aisleBlocked: layout.aisleBlocked,
    delay,
    routeSeconds: routeSeconds(delay),
    ctd: liveCtd(delay),
    readiness,
    pickReadyInbound: pickReadyInbound(state),
    nilPickRisk: 0.32 * (1 - readiness),
    pendingBatches: pending,
    dockOccupancy: layout.dockOccupancy,
  };
}
