import { layoutOf, metricsOf, storageRoom } from "./floor";
import {
  BATCHES,
  BATCH_ORDER,
  FLOOR_CAP,
  GRN_RATE,
  GRN_SLOTS,
  LANES_CAP,
  PIPELINE_FROM,
  PUTAWAY_RATE,
  QC_MINUTES,
  RECHECK_MINUTES,
  RECOVERY_AT,
  TEAMS,
  VEHICLES,
  VEHICLE_ORDER,
  WINDOW,
  WINDOWS,
  WINDOW_ACTIONS,
} from "./scenario";
import {
  PHASES,
  type AisleAction,
  type BatchId,
  type BatchRun,
  type Day4State,
  type Lane,
  type Milestone,
  type MinuteSnap,
  type Phase,
  type QcAction,
  type RecoveryAction,
  type StorageId,
  type VehicleId,
  type ZoneId,
} from "./types";

/**
 * Day 4's flow engine.
 *
 * Every transition is `(state) => state` and pure, and returns the same object
 * when nothing changed. The floor moves a minute at a time, and only when the
 * operator moves it: "Run 3 minutes" in the pipeline, the three recovery
 * windows at the end. One team of people either unloads or puts away — every
 * dock that is unloading is a putaway team the floor does not have. That one
 * rule is the whole of Day 4's lesson, and it falls out of the arithmetic.
 */

/* ── Phases and the clock ─────────────────────────────────────────────── */

export function phaseIndex(phase: Phase): number {
  return PHASES.indexOf(phase);
}

export function reached(state: Day4State, phase: Phase): boolean {
  return phaseIndex(state.phase) >= phaseIndex(phase);
}

const PHASE_CLOCK: Record<Phase, number> = {
  opening: 0,
  inspect: 0,
  dock: 5,
  pipeline: PIPELINE_FROM,
  recovery: RECOVERY_AT,
  execute: RECOVERY_AT,
  done: 42,
};

const CREEP_CAP: Partial<Record<Phase, number>> = { inspect: 4, dock: 8 };
const SECONDS_PER_STORE_MINUTE = 10;

/** The store clock. It creeps while the operator plans; in the pipeline it is the engine's. */
export function simMinute(state: Day4State, now: number): number {
  const cap = CREEP_CAP[state.phase];
  if (cap === undefined) return Math.max(state.t, PHASE_CLOCK[state.phase]);
  const crept = Math.floor((now - state.phaseStartedAt) / 1000 / SECONDS_PER_STORE_MINUTE);
  return Math.min(cap, PHASE_CLOCK[state.phase] + Math.max(0, crept));
}

function enter(state: Day4State, phase: Phase, now: number): Day4State {
  return { ...state, phase, phaseStartedAt: now };
}

function mark(state: Day4State, key: Milestone, now: number): Day4State {
  return {
    ...state,
    milestones: {
      ...state.milestones,
      [key]: { sim: simMinute(state, now), at: now - state.startedAt },
    },
  };
}

/* ── Setup ────────────────────────────────────────────────────────────── */

function run(
  stage: BatchRun["stage"],
  cartons: number,
  extra: Partial<BatchRun> = {},
): BatchRun {
  return {
    stage,
    cartons,
    onTruck: 0,
    onFloor: 0,
    scanned: 0,
    stored: 0,
    destination: null,
    location: "lanes",
    exposure: 0,
    readyAt: null,
    ...extra,
  };
}

export function createDay4(): Day4State {
  return {
    phase: "opening",
    startedAt: 0,
    phaseStartedAt: 0,
    t: 0,
    inspected: [],
    marking: false,
    bottleneck: null,
    evidence: [],
    plan: { dairy: "now", frozen: "next", grocery: "next" },
    planOrder: ["frozen", "grocery"],
    docksReleased: false,
    vehicles: {
      dairy: { lane: "now", dock: 1, paused: false, done: false },
      frozen: { lane: "next", dock: null, paused: false, done: false },
      grocery: { lane: "next", dock: null, paused: false, done: false },
    },
    batches: {
      // The putaway teams are already working through the verified backlog.
      S1: run("putaway", 26, { onFloor: 26, scanned: 26, destination: "ambient" }),
      S2: run("received", 34, { onFloor: 34 }),
      C1: run("verified", 12, { onFloor: 12, scanned: 12, location: "aisle" }),
      D1: run("vehicle", 24, { onTruck: 24 }),
      F1: run("vehicle", 18, { onTruck: 18 }),
      G1: run("vehicle", 28, { onTruck: 28 }),
      G2: run("vehicle", 36, { onTruck: 36 }),
      G3: run("vehicle", 32, { onTruck: 32 }),
    },
    qcSlot: null,
    qcTimer: 0,
    qcBusyUntil: 0,
    qcIssue: { status: "none", raisedAt: null, resolvedAt: null },
    qcStarted: {},
    grnStarted: {},
    quarantine: 0,
    bypassed: 0,
    grn: [],
    queue: ["S1"],
    safeOpen: false,
    unsafeAisle: 0,
    aisle: { action: null, actedAt: null, clearedAt: null },
    groceryPausedAt: null,
    history: [],
    recovery: [[], [], []],
    wasted: [],
    preRecovery: null,
    milestones: {},
    lockedBy: null,
    completedAt: null,
  };
}

export function startDay(state: Day4State, now: number): Day4State {
  if (state.phase !== "opening") return state;
  return { ...state, phase: "inspect", startedAt: now, phaseStartedAt: now };
}

function clone(state: Day4State): Day4State {
  const batches = {} as Record<BatchId, BatchRun>;
  for (const id of BATCH_ORDER) batches[id] = { ...state.batches[id] };
  return {
    ...state,
    batches,
    vehicles: {
      dairy: { ...state.vehicles.dairy },
      frozen: { ...state.vehicles.frozen },
      grocery: { ...state.vehicles.grocery },
    },
    grn: [...state.grn],
    queue: [...state.queue],
    qcIssue: { ...state.qcIssue },
    qcStarted: { ...state.qcStarted },
    grnStarted: { ...state.grnStarted },
    aisle: { ...state.aisle },
    recovery: state.recovery.map((window) => [...window]),
  };
}

/* ── Stage 1 · find the bottleneck ────────────────────────────────────── */

export function inspectZone(state: Day4State, zone: ZoneId): Day4State {
  if (state.phase !== "inspect" || state.inspected.includes(zone)) return state;
  return { ...state, inspected: [...state.inspected, zone] };
}

export const MIN_INSPECTED = 2;

export function beginMarking(state: Day4State): Day4State {
  if (state.phase !== "inspect" || state.inspected.length < MIN_INSPECTED || state.marking) return state;
  return { ...state, marking: true };
}

export function markBottleneck(state: Day4State, zone: ZoneId, now: number): Day4State {
  if (state.phase !== "inspect" || !state.marking) return state;
  return enter(
    { ...mark(state, "mark", now), bottleneck: zone, evidence: [...state.inspected], marking: false },
    "dock",
    now,
  );
}

export function isCorrectBottleneck(zone: ZoneId | null): boolean {
  return zone === "staging" || zone === "putaway";
}

/* ── Stage 2 · the dock sequencer ─────────────────────────────────────── */

export function nowCount(plan: Record<VehicleId, Lane>, except?: VehicleId): number {
  return VEHICLE_ORDER.filter((id) => id !== except && plan[id] === "now").length;
}

export function setLane(state: Day4State, vehicle: VehicleId, lane: Lane): Day4State {
  if (state.phase !== "dock" || state.plan[vehicle] === lane) return state;
  // Two docks.
  if (lane === "now" && nowCount(state.plan, vehicle) >= 2) return state;
  const planOrder = state.planOrder.filter((id) => id !== vehicle);
  if (lane === "next") planOrder.push(vehicle);
  return { ...state, plan: { ...state.plan, [vehicle]: lane }, planOrder };
}

/** Puts the vehicles where the plan says. Dairy is already on Dock 1. */
function applyPlan(state: Day4State): Day4State {
  const next = clone(state);
  const free: (1 | 2)[] = [1, 2];
  for (const id of VEHICLE_ORDER) {
    next.vehicles[id] = { lane: next.plan[id], dock: null, paused: false, done: false };
  }
  const nowIds = VEHICLE_ORDER.filter((id) => next.plan[id] === "now");
  for (const id of nowIds) {
    const dock = id === "dairy" && free.includes(1) ? 1 : free[0];
    if (dock === undefined) break;
    next.vehicles[id].dock = dock;
    free.splice(free.indexOf(dock), 1);
  }
  return next;
}

/** "Stage next" vehicles take docks as they free up — never one that was simply empty. */
function assignDocks(state: Day4State): void {
  if (!state.docksReleased) return;
  const taken = new Set(VEHICLE_ORDER.map((id) => state.vehicles[id].dock).filter(Boolean));
  for (const id of state.planOrder) {
    const vehicle = state.vehicles[id];
    if (vehicle.lane !== "next" || vehicle.dock || vehicle.done) continue;
    const dock = ([1, 2] as const).find((candidate) => !taken.has(candidate));
    if (!dock) return;
    vehicle.dock = dock;
    vehicle.lane = "now";
    taken.add(dock);
  }
}

export function confirmDock(state: Day4State, now: number): Day4State {
  if (state.phase !== "dock") return state;
  const placed = applyPlan({ ...mark(state, "dock", now), t: PIPELINE_FROM });
  return enter({ ...placed, history: [snapshot(placed, 0, 0, false, TEAMS)] }, "pipeline", now);
}

/* ── Stage 3 · the pipeline ───────────────────────────────────────────── */

function vehicleOf(id: BatchId): VehicleId | null {
  return BATCHES[id].vehicle;
}

/** Why a batch can't go to QC right now, or null if it can. */
export function whyNotQc(state: Day4State, id: BatchId): string | null {
  const spec = BATCHES[id];
  const batch = state.batches[id];
  if (!spec.cold) return "Ambient loads are spot-checked at the door";
  if (batch.stage !== "vehicle") return "Already checked";
  const vehicle = vehicleOf(id);
  if (!vehicle || !state.vehicles[vehicle].dock) return "The vehicle has to be on a dock first";
  if (state.qcSlot) return `QC is checking ${state.qcSlot}`;
  if (state.t < state.qcBusyUntil) return "QC is rechecking a crate";
  return null;
}

export function sendToQc(state: Day4State, id: BatchId): Day4State {
  if (state.phase !== "pipeline" || whyNotQc(state, id)) return state;
  const next = clone(state);
  next.qcSlot = id;
  next.qcTimer = 0;
  next.batches[id].stage = "qc";
  next.qcStarted[id] = state.t;
  return next;
}

export function resolveQc(state: Day4State, action: QcAction, now: number): Day4State {
  if (state.qcIssue.status !== "pending" || state.qcSlot !== "D1") return state;
  const next = clone(mark(state, "qc", now));
  const dairy = next.batches.D1;
  next.qcIssue = { ...next.qcIssue, status: action, resolvedAt: state.t };
  if (action !== "accept") {
    dairy.cartons = 23;
    dairy.onTruck = 23;
  }
  if (action === "quarantine") next.quarantine += 1;
  if (action === "recheck") {
    next.quarantine += 1;
    next.qcBusyUntil = state.t + RECHECK_MINUTES;
  }
  if (action === "shelf") {
    // Onto the shelf without a check or a scan: fast, and a breach.
    next.bypassed += 1;
    dairy.cartons = 24;
    dairy.stored = 1;
    dairy.destination = "chilled";
  }
  dairy.stage = "accepted";
  next.qcSlot = null;
  next.qcTimer = 0;
  return next;
}

export function whyNotGrn(state: Day4State, id: BatchId): string | null {
  const batch = state.batches[id];
  if (batch.stage === "unloading") return "Still coming off the vehicle";
  if (batch.stage !== "received") return batch.stage === "grn" ? "Already scanning" : "Nothing to scan";
  if (state.grn.length >= GRN_SLOTS) return "Both scan slots are busy";
  return null;
}

export function startGrn(state: Day4State, id: BatchId): Day4State {
  if ((state.phase !== "pipeline" && state.phase !== "recovery") || whyNotGrn(state, id)) return state;
  const next = clone(state);
  next.batches[id].stage = "grn";
  next.grn.push(id);
  next.grnStarted[id] = state.t;
  return next;
}

export function whyNotPutaway(state: Day4State, id: BatchId, destination: StorageId): string | null {
  const batch = state.batches[id];
  const spec = BATCHES[id];
  if (batch.stage === "putaway") return "Already being put away";
  if (batch.stage === "ready") return "Already pick-ready";
  if (batch.stage !== "verified") {
    return batch.stage === "received" || batch.stage === "grn"
      ? "Not scan-verified yet — it can't be sellable before GRN"
      : "Not received yet";
  }
  if (!spec.allowed.includes(destination)) {
    return spec.cold === "frozen"
      ? "Frozen stock goes to the freezer"
      : spec.cold === "chilled"
        ? "Dairy goes to the chilled room"
        : "That location doesn't take this stock";
  }
  if (storageRoom(state, destination) <= 0) return "That location is full";
  return null;
}

export function startPutaway(state: Day4State, id: BatchId, destination: StorageId): Day4State {
  if (whyNotPutaway(state, id, destination)) return state;
  const next = clone(state);
  next.batches[id].stage = "putaway";
  next.batches[id].destination = destination;
  next.queue.push(id);
  return next;
}

export function prioritise(state: Day4State, id: BatchId): Day4State {
  if (!state.queue.includes(id) || state.queue[0] === id) return state;
  return { ...state, queue: [id, ...state.queue.filter((queued) => queued !== id)] };
}

/* ── Vehicles ─────────────────────────────────────────────────────────── */

export function pauseUnload(state: Day4State, vehicle: VehicleId): Day4State {
  const current = state.vehicles[vehicle];
  if (!current.dock || current.paused || current.done) return state;
  const next = clone(state);
  next.vehicles[vehicle].paused = true;
  if (vehicle === "grocery" && next.groceryPausedAt === null) next.groceryPausedAt = state.t;
  return next;
}

export function resumeUnload(state: Day4State, vehicle: VehicleId): Day4State {
  if (!state.vehicles[vehicle].paused) return state;
  const next = clone(state);
  next.vehicles[vehicle].paused = false;
  return next;
}

export function freeDock(state: Day4State): 1 | 2 | null {
  const taken = new Set(VEHICLE_ORDER.map((id) => state.vehicles[id].dock));
  return ([1, 2] as const).find((dock) => !taken.has(dock)) ?? null;
}

export function bringToDock(state: Day4State, vehicle: VehicleId): Day4State {
  const current = state.vehicles[vehicle];
  const dock = freeDock(state);
  if (current.dock || current.done || !dock) return state;
  const next = clone(state);
  next.vehicles[vehicle] = { ...current, dock, lane: "now", paused: false };
  return next;
}

export function sendToYard(state: Day4State, vehicle: VehicleId): Day4State {
  const current = state.vehicles[vehicle];
  if (!current.dock || current.done) return state;
  if (VEHICLES[vehicle].batches.some((id) => state.batches[id].stage === "qc")) return state;
  const next = clone(state);
  next.vehicles[vehicle] = { ...current, dock: null, lane: "hold", paused: false };
  next.docksReleased = true;
  return next;
}

/**
 * A vehicle on a dock keeps a team there — unloading it, or waiting for its
 * QC check so it can. Paused or gone, the team is back on putaway.
 */
export function teamsOnPutaway(state: Day4State): number {
  const tied = VEHICLE_ORDER.filter((id) => {
    const vehicle = state.vehicles[id];
    return vehicle.dock !== null && !vehicle.paused && !vehicle.done;
  }).length;
  return Math.max(1, TEAMS - tied);
}

/* ── Aisle C ──────────────────────────────────────────────────────────── */

export function whyNotAisle(state: Day4State, action: AisleAction): string | null {
  const spill = state.batches.C1;
  if (spill.location !== "aisle" || spill.onFloor <= 0) return "Aisle C is already clear";
  if (action === "staging" && LANES_CAP - layoutOf(state).lanes < spill.onFloor) {
    return "The staging lanes are full";
  }
  return null;
}

export function aisleAct(state: Day4State, action: AisleAction, now: number): Day4State {
  if (state.phase !== "pipeline" || whyNotAisle(state, action)) return state;
  let next = clone(mark(state, "aisle", now));
  next.aisle = { ...next.aisle, action, actedAt: state.t };
  const spill = next.batches.C1;
  if (action === "staging") spill.location = "lanes";
  if (action === "safe") {
    next.safeOpen = true;
    spill.location = "safe";
  }
  if (action === "putaway" && spill.stage === "verified") {
    next = startPutaway(next, "C1", "ambient");
    next = prioritise(next, "C1");
  }
  if (next.batches.C1.location !== "aisle") next.aisle.clearedAt = state.t;
  return next;
}

/* ── The minute ───────────────────────────────────────────────────────── */

interface Policy {
  scanBoost: boolean;
  autoQueue: boolean;
  /** The projection's stand-in operator: checks, scans and stores in order. */
  autoOps: boolean;
}

const HANDS_OFF: Policy = { scanBoost: false, autoQueue: false, autoOps: false };

function snapshot(
  state: Day4State,
  inflow: number,
  putawayCap: number,
  groceryUnloading: boolean,
  teams: number,
): MinuteSnap {
  const metrics = metricsOf(state);
  return {
    t: state.t,
    floor: metrics.floorCartons,
    congestion: metrics.congestion,
    aisleBlocked: metrics.aisleBlocked,
    delay: metrics.delay,
    ctd: metrics.ctd,
    readiness: metrics.readiness,
    pickReadyInbound: metrics.pickReadyInbound,
    inflow,
    putawayCap,
    groceryUnloading,
    teams,
  };
}

function autoOperate(state: Day4State): void {
  if (!state.qcSlot && state.t >= state.qcBusyUntil) {
    const cold = (["D1", "F1"] as BatchId[]).find((id) => !whyNotQc(state, id));
    if (cold) {
      state.qcSlot = cold;
      state.qcTimer = 0;
      state.batches[cold].stage = "qc";
    }
  }
  for (const id of BATCH_ORDER) {
    if (state.grn.length >= GRN_SLOTS) break;
    if (state.batches[id].stage === "received") {
      state.batches[id].stage = "grn";
      state.grn.push(id);
    }
  }
  for (const id of BATCH_ORDER) {
    const batch = state.batches[id];
    if (batch.stage === "verified" && storageRoom(state, BATCHES[id].storage) > 0) {
      batch.stage = "putaway";
      batch.destination = BATCHES[id].storage;
      state.queue.push(id);
    }
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function step(state: Day4State, policy: Policy): Day4State {
  const next = clone(state);
  const layout = layoutOf(next);
  assignDocks(next);
  // Every busy dock is a team that is not putting away.
  const teams = teamsOnPutaway(next);

  let inflow = 0;
  let groceryUnloading = false;
  for (const id of VEHICLE_ORDER) {
    const vehicle = next.vehicles[id];
    if (!vehicle.dock || vehicle.paused || vehicle.done) continue;
    const batchId = VEHICLES[id].batches.find((candidate) => next.batches[candidate].onTruck > 0.001);
    if (!batchId) {
      vehicle.done = true;
      vehicle.dock = null;
      next.docksReleased = true;
      continue;
    }
    const batch = next.batches[batchId];
    if (BATCHES[batchId].cold && batch.stage !== "accepted" && batch.stage !== "unloading") continue;
    const rate = VEHICLES[id].rate * (vehicle.dock === 2 ? layout.dock2Factor : 1);
    const take = Math.min(batch.onTruck, rate);
    batch.onTruck -= take;
    batch.onFloor += take;
    if (batch.onTruck <= 0.001) {
      batch.onTruck = 0;
      batch.stage = "received";
    } else {
      batch.stage = "unloading";
    }
    inflow += take;
    if (id === "grocery") groceryUnloading = true;
    if (VEHICLES[id].batches.every((candidate) => next.batches[candidate].onTruck <= 0.001)) {
      vehicle.done = true;
      vehicle.dock = null;
      next.docksReleased = true;
    }
  }

  if (policy.autoOps) {
    autoOperate(next);
    if (next.qcIssue.status === "pending") {
      const resolved = resolveQc(next, "quarantine", 0);
      Object.assign(next, resolved);
    }
  }

  // QC: one gate, three minutes a check. D1's check turns up a crate.
  if (next.qcSlot && next.t >= next.qcBusyUntil) {
    const id = next.qcSlot;
    if (!(id === "D1" && next.qcIssue.status === "pending")) {
      next.qcTimer += 1;
      if (next.qcTimer >= QC_MINUTES) {
        if (id === "D1" && next.qcIssue.status === "none") {
          next.qcIssue = { status: "pending", raisedAt: next.t + 1, resolvedAt: null };
        } else {
          next.batches[id].stage = "accepted";
          next.qcSlot = null;
          next.qcTimer = 0;
        }
      }
    }
  }

  // GRN scan verification.
  if (policy.scanBoost) {
    for (const id of BATCH_ORDER) {
      if (next.batches[id].stage === "received") {
        next.batches[id].stage = "grn";
        if (!next.grn.includes(id)) next.grn.push(id);
      }
    }
  }
  for (const id of [...next.grn]) {
    const batch = next.batches[id];
    batch.scanned = Math.min(batch.cartons, batch.scanned + GRN_RATE * (policy.scanBoost ? 1.5 : 1));
    if (batch.scanned >= batch.cartons - 0.001) {
      batch.stage = "verified";
      next.grn = next.grn.filter((candidate) => candidate !== id);
      if (policy.autoQueue && storageRoom(next, BATCHES[id].storage) > 0) {
        batch.stage = "putaway";
        batch.destination = BATCHES[id].storage;
        next.queue.push(id);
      }
    }
  }

  // Putaway. Teams, slowed by a blocked aisle and a floor they have to walk around.
  const congestionFactor = 1 - 0.3 * clamp01((layout.total - FLOOR_CAP) / 60);
  let capacity = teams * PUTAWAY_RATE * (1 - 0.3 * layout.aisleBlocked) * congestionFactor;
  const putawayCap = capacity;
  for (const id of [...next.queue]) {
    if (capacity <= 0.001) break;
    const batch = next.batches[id];
    if (batch.stage !== "putaway" || !batch.destination) continue;
    const take = Math.min(capacity, batch.onFloor, storageRoom(next, batch.destination));
    batch.onFloor -= take;
    batch.stored += take;
    capacity -= take;
    if (batch.onFloor <= 0.001) {
      batch.onFloor = 0;
      batch.stage = "ready";
      batch.readyAt = next.t + 1;
      next.queue = next.queue.filter((candidate) => candidate !== id);
    }
  }

  for (const id of ["D1", "F1"] as BatchId[]) {
    if (next.batches[id].onFloor > 0.001) next.batches[id].exposure += 1;
  }
  const spill = next.batches.C1;
  if (next.aisle.clearedAt === null && (spill.location !== "aisle" || spill.onFloor <= 0.001)) {
    next.aisle.clearedAt = next.t + 1;
  }

  next.t += 1;
  next.history = [...next.history, snapshot(next, inflow, putawayCap, groceryUnloading, teams)];
  return next;
}

/** Runs the floor forward. In the pipeline, stopping at 10:48 opens recovery. */
export function runMinutes(state: Day4State, minutes: number, now: number): Day4State {
  if (state.phase !== "pipeline") return state;
  let next = state;
  for (let m = 0; m < minutes && next.t < RECOVERY_AT; m += 1) next = step(next, HANDS_OFF);
  if (next.t >= RECOVERY_AT) {
    const pre = next.history[next.history.length - 1] ?? null;
    next = enter({ ...mark(next, "pipeline", now), preRecovery: pre }, "recovery", now);
  }
  return next;
}

/**
 * The dock plan's consequence, shown while the operator is still deciding:
 * the floor at 10:48 if receiving ran on this plan with nobody pausing it.
 */
export function projectPlan(state: Day4State): Day4State {
  let next = applyPlan({ ...state, t: PIPELINE_FROM, phase: "pipeline" });
  next = { ...next, history: [] };
  while (next.t < RECOVERY_AT) next = step(next, { scanBoost: false, autoQueue: false, autoOps: true });
  return next;
}

/* ── Stage 4 · recovery ───────────────────────────────────────────────── */

export function assignRecovery(state: Day4State, window: number, action: RecoveryAction): Day4State {
  if (state.phase !== "recovery" || window < 0 || window >= WINDOWS) return state;
  const current = state.recovery[window] ?? [];
  if (current.includes(action) || current.length >= WINDOW_ACTIONS) return state;
  const recovery = state.recovery.map((slot, index) =>
    index === window ? [...slot, action] : slot.filter((existing) => existing !== action),
  );
  return { ...state, recovery };
}

export function removeRecovery(state: Day4State, window: number, action: RecoveryAction): Day4State {
  if (state.phase !== "recovery" || !state.recovery[window]?.includes(action)) return state;
  return {
    ...state,
    recovery: state.recovery.map((slot, index) =>
      index === window ? slot.filter((existing) => existing !== action) : slot,
    ),
  };
}

const TARGET: Partial<Record<RecoveryAction, BatchId>> = {
  putawayFast: "G1",
  putawayDairy: "D1",
  putawayFrozen: "F1",
};

/** What a scheduled action will run into, given what has been scheduled before it. */
export function recoveryWarning(state: Day4State, window: number, action: RecoveryAction): string | null {
  const target = TARGET[action];
  if (target) {
    const stage = state.batches[target].stage;
    if (stage === "ready") return "Already pick-ready";
    const scanFirst = state.recovery.slice(0, window + 1).some((slot) => slot.includes("finishScan"));
    if ((stage === "received" || stage === "grn") && !scanFirst) return "Needs scan verification first";
    if (stage === "vehicle" || stage === "qc" || stage === "accepted" || stage === "unloading") {
      return "Not off the vehicle yet";
    }
  }
  if (action === "clearAisle" && state.batches.C1.location !== "aisle") return "Aisle C is already clear";
  if (action === "safeLane" && state.safeOpen) return "Already open";
  return null;
}

function applyWindow(state: Day4State, actions: RecoveryAction[]): Day4State {
  let next = clone(state);
  const waste = (action: RecoveryAction) => {
    next.wasted = [...next.wasted, action];
  };

  if (actions.includes("safeLane")) {
    if (next.safeOpen) waste("safeLane");
    next.safeOpen = true;
  }
  for (const action of actions) {
    switch (action) {
      case "clearAisle": {
        const spill = next.batches.C1;
        if (spill.location !== "aisle" || spill.onFloor <= 0.001) {
          waste(action);
        } else if (next.safeOpen) {
          spill.location = "safe";
        } else if (LANES_CAP - layoutOf(next).lanes >= spill.onFloor) {
          spill.location = "lanes";
        } else {
          if (spill.stage === "verified") next = startPutaway(next, "C1", "ambient");
          next = prioritise(next, "C1");
        }
        break;
      }
      case "putawayFast":
      case "putawayDairy":
      case "putawayFrozen": {
        const id = TARGET[action]!;
        const stage = next.batches[id].stage;
        if (stage === "verified") {
          next = prioritise(startPutaway(next, id, BATCHES[id].storage), id);
        } else if (stage === "putaway") {
          next = prioritise(next, id);
        } else if (stage === "received" || stage === "grn") {
          // Scanned this window if a scan push is running; stored as soon as it is.
          if (!actions.includes("finishScan")) waste(action);
        } else {
          waste(action);
        }
        break;
      }
      case "finishScan":
        if (!BATCH_ORDER.some((id) => ["received", "grn"].includes(next.batches[id].stage))) waste(action);
        break;
      case "slowGrocery":
      case "continueUnload": {
        const grocery = next.vehicles.grocery;
        if (grocery.done) {
          waste(action);
          break;
        }
        grocery.paused = false;
        if (!grocery.dock) {
          const dock = freeDock(next);
          if (dock) next.vehicles.grocery = { ...grocery, dock, lane: "now", paused: false };
        }
        if (action === "slowGrocery" && next.batches.G3.stage === "verified") {
          next = prioritise(startPutaway(next, "G3", "deep"), "G3");
        }
        break;
      }
      case "stopInbound":
        for (const id of VEHICLE_ORDER) {
          if (next.vehicles[id].dock) next.vehicles[id].paused = true;
        }
        break;
      case "cartonsToAisle":
        next.unsafeAisle += Math.min(20, layoutOf(next).lanes);
        break;
      case "deepStore":
        for (const id of ["G3", "G2", "S2", "C1"] as BatchId[]) {
          if (next.batches[id].stage === "verified") next = prioritise(startPutaway(next, id, "deep"), id);
        }
        break;
      default:
        break;
    }
  }
  // After a scan push, the batches it scanned go straight to the front if asked for.
  return next;
}

function prioritiseTargets(state: Day4State, actions: RecoveryAction[]): Day4State {
  let next = state;
  for (const action of actions) {
    const id = TARGET[action];
    if (id && next.batches[id].stage === "putaway") next = prioritise(next, id);
  }
  return next;
}

/** Every minute of the last twelve, for the payoff to replay. */
export function recoveryFrames(state: Day4State): Day4State[] {
  const frames: Day4State[] = [];
  let next = state;
  for (let window = 0; window < WINDOWS; window += 1) {
    const actions = next.recovery[window] ?? [];
    next = applyWindow(next, actions);
    for (let minute = 0; minute < WINDOW; minute += 1) {
      next = step(next, { scanBoost: actions.includes("finishScan"), autoQueue: true, autoOps: false });
      next = prioritiseTargets(next, actions);
      frames.push(next);
    }
  }
  return frames;
}

/**
 * The floor at 10:48 as the recovery will start from. The operator locks from
 * the recovery board; the clock can lock from anywhere, and then the floor
 * simply runs on as it was left — unpaused vehicles keep unloading.
 */
export function prepareLock(state: Day4State, now: number, by: "operator" | "clock"): Day4State {
  if (by === "operator" && state.phase !== "recovery") return state;
  if (state.phase === "opening" || state.phase === "execute" || state.phase === "done") return state;
  let next = state;
  if (next.phase === "inspect") next = { ...next, phase: "dock" };
  if (next.phase === "dock") next = confirmDock(next, now);
  if (next.phase === "pipeline") {
    while (next.t < RECOVERY_AT) next = step(next, HANDS_OFF);
    next = { ...next, preRecovery: next.history[next.history.length - 1] ?? null, phase: "recovery" };
  }
  return mark({ ...next, lockedBy: by }, "lock", now);
}

/** Locks the plan and runs the last twelve minutes. */
export function lockRecovery(state: Day4State, now: number, by: "operator" | "clock"): Day4State {
  const prepared = prepareLock(state, now, by);
  if (prepared === state && prepared.phase !== "recovery") return state;
  const frames = recoveryFrames(prepared);
  const executed = frames[frames.length - 1] ?? prepared;
  return enter(mark(executed, "execute", now), "execute", now);
}

export function finishDay(state: Day4State, now: number): Day4State {
  return state.phase === "execute" ? { ...state, phase: "done", completedAt: now } : state;
}

/* ── Telemetry ────────────────────────────────────────────────────────── */

export function d4Snapshot(state: Day4State) {
  const metrics = metricsOf(state);
  return {
    phase: state.phase,
    t: state.t,
    floorCongestion: Math.round(metrics.congestion * 100),
    ctd: metrics.ctd,
    pickerRouteDelay: Math.round(metrics.delay),
    priorityInventoryReadiness: Math.round(metrics.readiness * 100),
    floorCartons: Math.round(metrics.floorCartons),
  };
}
