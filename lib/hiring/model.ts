import { formFor } from "./forms";
import { BY_ID, ROSTER } from "./roster";
import {
  STATIONS,
  type HiringState,
  type Metrics,
  type SceneId,
  type Station,
  type TaskKind,
} from "./types";

/**
 * How the store works.
 *
 * Every number a candidate sees comes out of this file, and all of it is
 * driven by where people are standing. There is no scripted "packing queue is
 * now nine": the queue is nine because the people on packing cannot clear what
 * the people on picking are sending them, and it would have been five with one
 * more competent packer.
 *
 * The clock is in simulated seconds from 17:25:00. It moves when the manager
 * spends attention, which is the point: a manager who personally recounts a
 * shelf has spent five minutes the store kept running without them.
 */

/** When each part of the shift is due. A candidate who overruns arrives late. */
export const SCHEDULE: Record<SceneId, number> = {
  handover: 0,
  floor: 60,
  absence: 300,
  riya: 420,
  arjun: 540,
  case: 660,
  nilpick: 960,
  triage: 1140,
  bottleneck: 1380,
  customer: 1680,
  final: 1920,
  outcome: 2100,
  done: 3300,
};

export const PEAK_AT = 2100; // 18:00
/** The evening surge lands at 17:39, whether or not anybody is watching. */
export const SURGE_AT = 840;
/** Aisle C is blocked from 17:44 until somebody clears it. */
export const AISLE_AT = 1140;

export function aisleBlocked(state: HiringState, clock = state.clock): boolean {
  if (clock < AISLE_AT) return false;
  const cleared = state.shocks.aisleClearedAt;
  return cleared === null || clock < cleared;
}
export const END_AT = 3300; // 18:20
export const CTD_TARGET = 180;
/** Click-to-dispatch at which the app starts lengthening the promise. */
export const EXTEND_AT = 250;
/** And at which it stops taking orders the store cannot fulfil. */
export const SHED_AT = 320;
/** How much of a shelf shortfall turns into pickers standing at empty faces. */
const SHELF_DRAG = 0.65;
export const STEP = 30;

/** Worker-units each station needs at ordinary demand. */
const BASE_REQUIRED: Record<Station, number> = {
  picking: 4.0,
  packing: 2.3,
  dispatch: 1.6,
  replenishment: 1.2,
};

/** Orders a minute at ordinary demand. */
const ORDERS_PER_MINUTE = 5.2;

export function clockLabel(clock: number): string {
  const total = 17 * 3600 + 25 * 60 + Math.max(0, Math.round(clock));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Demand against a normal evening. Peaks at +38% from 18:00, then eases. */
export function demandAt(clock: number): number {
  if (clock <= 0) return 1;
  if (clock <= PEAK_AT) return 1 + 0.38 * (clock / PEAK_AT);
  if (clock <= PEAK_AT + 480) return 1.38;
  return Math.max(1.18, 1.38 - 0.2 * ((clock - PEAK_AT - 480) / 720));
}

/* ── People ───────────────────────────────────────────────────────────── */

export function isPresent(state: HiringState, id: string, clock = state.clock): boolean {
  if (id === "temp") return state.tempArrivesAt !== null && clock >= state.tempArrivesAt;
  if (id === "arjun" && state.arjun.outcome === "leaving" && clock >= PEAK_AT) return false;
  return id in state.assign;
}

export function isFree(state: HiringState, id: string, clock = state.clock): boolean {
  const busy = state.busy[id];
  return isPresent(state, id, clock) && !(busy && busy.until > clock);
}

/** Riya's picking output, which is the one skill on the floor that moves. */
function riyaPicking(state: HiringState, clock: number): number {
  const choices = state.riya.choices ?? [];
  const pairing = choices.includes("pair");
  const zones = choices.includes("moveAB");
  let output = 0.62;
  if (zones) output = 0.85;
  if (pairing) {
    // Slower while she is being shown, better for the rest of the night.
    output = clock < state.riya.pairUntil ? 0.72 : zones ? 0.92 : 0.88;
  }
  // Somebody who has just been warned for being careful gets more careful.
  if (choices.includes("warn")) output *= 0.94;
  return output;
}

/**
 * What one person produces at one station, right now.
 *
 * The modifiers are the consequences the earlier decisions left behind: how
 * Riya was handled, how Arjun was spoken to, and whether the floor trusts the
 * person asking them to move.
 */
export function outputOf(
  state: HiringState,
  id: string,
  station: Station,
  clock = state.clock,
): number {
  const employee = BY_ID[id];
  if (!employee) return 0;

  let output = employee.skills[station];
  if (id === "riya" && station === "picking") output = riyaPicking(state, clock);

  // The expert doing the showing is slower while they do it.
  if (
    id === state.riya.pairPartner &&
    station === "picking" &&
    clock < state.riya.pairUntil
  ) {
    output -= 0.2;
  }

  output *= 1 - 0.12 * employee.fatigue;

  const home = homeStation(id);
  if (station !== home) {
    // Arjun covers a second station as well as he was treated.
    if (id === "arjun") {
      const flex = { pending: 1, willing: 1, reluctant: 0.85, resentful: 0.72, leaving: 0.85 };
      output *= flex[state.arjun.outcome];
    }
    // A floor that does not trust the manager moves, and does not hurry.
    if (state.trust < 45) output *= 0.9;
  }

  return Math.max(0, output);
}

/** The station somebody is best at, which is where they would rather be. */
export function homeStation(id: string): Station {
  const employee = BY_ID[id];
  if (!employee) return "picking";
  return STATIONS.reduce(
    (best, station) => (employee.skills[station] > employee.skills[best] ? station : best),
    "picking" as Station,
  );
}

export function staffAt(state: HiringState, station: Station, clock = state.clock): string[] {
  return Object.keys(state.assign).filter(
    (id) => state.assign[id] === station && isFree(state, id, clock),
  );
}

/* ── Capacity and coverage ────────────────────────────────────────────── */

export function capacityOf(state: HiringState, station: Station, clock = state.clock): number {
  let total = staffAt(state, station, clock).reduce(
    (sum, id) => sum + outputOf(state, id, station, clock),
    0,
  );
  // A manager on the bench is half a packer and no manager at all.
  if (clock < state.shocks.managerOnBenchUntil && station === formFor(state.form).constraint) {
    total += 0.5;
  }
  return total;
}

function requiredOf(
  state: HiringState,
  station: Station,
  clock: number,
  projected: boolean,
): number {
  const demand = demandAt(clock);
  const multiplier = station === "replenishment" ? 1 + 0.5 * (demand - 1) : demand;
  let required = BASE_REQUIRED[station] * multiplier;

  if (!projected) {
    const form = formFor(state.form);
    if (clock >= SURGE_AT && station === form.constraint) required *= form.surgeFactor;
    if (state.shocks.lanes.includes(station)) required /= 1.12;
    if (state.shocks.inboundCleared && station === "replenishment") required *= 0.85;
    if (station === "dispatch") {
      if (state.shocks.riders === "sequenced") required *= 0.92;
      if (state.shocks.riders === "gap" && clock >= PEAK_AT) required *= 1.08;
    }
  }
  return required;
}

/**
 * Coverage: capacity against what the station is being asked for, where 1.0
 * is exactly enough. `projected` is the board's forecast for 18:00 — it knows
 * the demand curve and does not know about the surge that has not happened.
 */
export function coverageOf(
  state: HiringState,
  station: Station,
  clock = state.clock,
  projected = false,
): number {
  let capacity = capacityOf(state, station, clock);

  if (station === "picking" && !projected) {
    if (aisleBlocked(state, clock)) capacity *= 0.86;
    // Pickers standing at empty faces are not picking.
    const shelf = coverageOf(state, "replenishment", clock, false);
    capacity *= 1 - SHELF_DRAG * Math.max(0, 1 - shelf);
  }

  return capacity / requiredOf(state, station, clock, projected);
}

/** What the planning board shows for 18:00, given who is where now. */
export function projectedPeak(state: HiringState, includeArjun = true): Record<Station, number> {
  const at = PEAK_AT - 1;
  const view: HiringState =
    includeArjun || state.assign.arjun === undefined
      ? state
      : { ...state, assign: withoutKey(state.assign, "arjun") };
  // Nobody is counted as away on a task for a forecast.
  const settled: HiringState = { ...view, busy: {} };
  const withTemp: HiringState =
    state.tempArrivesAt !== null && !("temp" in settled.assign)
      ? { ...settled, assign: { ...settled.assign, temp: "picking" } }
      : settled;
  return Object.fromEntries(
    STATIONS.map((station) => [station, coverageOf(withTemp, station, at, true)]),
  ) as Record<Station, number>;
}

function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const rest = { ...record };
  delete rest[key];
  return rest;
}

/**
 * Who could be moved to cover a second station without breaking the one they
 * are on. Cross-training on its own is not a reserve; cross-training with
 * slack behind it is.
 */
/** A station is still running, thinly, at four-fifths of what it needs. */
const RESERVE_FLOOR = 0.8;

export function flexibleReserve(state: HiringState): string[] {
  const projected = projectedPeak(state);
  return ROSTER.filter((employee) => {
    const station = state.assign[employee.id];
    if (!station) return false;
    const second = STATIONS.some(
      (other) => other !== station && employee.skills[other] >= 0.8,
    );
    if (!second) return false;
    const share =
      outputOf({ ...state, busy: {} }, employee.id, station, PEAK_AT - 1) /
      (capacityOf({ ...state, busy: {} }, station, PEAK_AT - 1) || 1);
    return projected[station] * (1 - share) >= RESERVE_FLOOR;
  }).map((employee) => employee.id);
}

/** How well people are matched to where they have been put, 0–1. */
export function roleFit(state: HiringState): number {
  const scores = ROSTER.filter((employee) => state.assign[employee.id]).map((employee) => {
    const best = Math.max(...STATIONS.map((station) => employee.skills[station]));
    return employee.skills[state.assign[employee.id]!] / best;
  });
  return scores.reduce((sum, score) => sum + score, 0) / (scores.length || 1);
}

/**
 * Where the store is actually stuck: the stage orders pass through that has
 * the least capacity against what it is being asked for. Replenishment is not
 * a stage, but empty pick faces stop pickers — so when picking is the slowest
 * stage and the shelf is the reason, the answer is the shelf.
 */
export function weakestStation(state: HiringState): Station {
  const stages: Station[] = ["picking", "packing", "dispatch"];
  const worst = stages.reduce((a, b) => (coverageOf(state, b) < coverageOf(state, a) ? b : a));
  if (worst === "picking" && coverageOf(state, "replenishment") < 0.75) return "replenishment";
  return worst;
}

/** Every stage is keeping up with what it is being sent, near enough. */
export function floorHolding(coverage: Record<Station, number>): boolean {
  return Math.min(coverage.picking, coverage.packing, coverage.dispatch) >= 0.97 && coverage.replenishment >= 0.75;
}

/* ── Flow ─────────────────────────────────────────────────────────────── */

function arrivalsPerMinute(state: HiringState, clock: number): number {
  const throttle = clock < state.shocks.slowReleaseUntil ? 0.85 : 1;
  return ORDERS_PER_MINUTE * demandAt(clock) * throttle;
}

/** What the board shows. Queues plus the work legitimately in progress. */
export function metricsOf(state: HiringState): Metrics {
  const rate = ORDERS_PER_MINUTE * demandAt(state.clock);
  const coverage = Object.fromEntries(
    STATIONS.map((station) => [station, coverageOf(state, station)]),
  ) as Record<Station, number>;

  const wait =
    state.flow.pickQ / (rate * Math.max(0.2, coverage.picking)) +
    state.flow.packQ / (rate * Math.max(0.2, coverage.packing)) +
    state.flow.dispQ / (rate * Math.max(0.2, coverage.dispatch));

  return {
    ordersWaiting: Math.round(state.flow.pickQ + rate * 2.6),
    packingQueue: Math.round(state.flow.packQ + rate * 0.5),
    ctd: Math.round(154 + 18 * wait),
    coverage,
  };
}

/** Move the store forward. Mutates the draft it is given. */
export function advanceTo(state: HiringState, target: number): void {
  while (state.clock < target) {
    const dt = Math.min(STEP, target - state.clock);
    const minutes = dt / 60;
    const rate = ORDERS_PER_MINUTE * demandAt(state.clock);

    if (state.tempArrivesAt !== null && state.clock >= state.tempArrivesAt && !state.assign.temp) {
      state.assign.temp = "picking";
    }

    const pick = rate * coverageOf(state, "picking") * minutes;
    const pack = rate * coverageOf(state, "packing") * minutes;
    const disp = rate * coverageOf(state, "dispatch") * minutes;

    // Past a point the app lengthens the promise it shows, and fewer people order.
    const drowning = metricsOf(state).ctd > EXTEND_AT;
    if (drowning) state.shocks.extended += dt;
    state.flow.pickQ += arrivalsPerMinute(state, state.clock) * minutes * (drowning ? 0.6 : 1);
    const picked = Math.min(state.flow.pickQ, pick);
    state.flow.pickQ -= picked;

    state.flow.packQ += picked;
    const packed = Math.min(state.flow.packQ, pack);
    state.flow.packQ -= packed;

    state.flow.dispQ += packed;
    const sent = Math.min(state.flow.dispQ, disp);
    state.flow.dispQ -= sent;

    state.clock += dt;

    // A store this far behind is switched off in the app until it catches up.
    const strained = metricsOf(state).ctd;
    if (strained > SHED_AT) {
      const keep = (SHED_AT - 154) / (strained - 154);
      const before = state.flow.pickQ + state.flow.packQ + state.flow.dispQ;
      state.flow.pickQ *= keep;
      state.flow.packQ *= keep;
      state.flow.dispQ *= keep;
      state.shocks.shed += before * (1 - keep);
    }

    for (const id of Object.keys(state.busy)) {
      if (state.busy[id]!.until <= state.clock) delete state.busy[id];
    }

    const now = metricsOf(state);
    if (now.ctd > state.maxCtd) state.maxCtd = now.ctd;
    if (now.ctd > CTD_TARGET && state.firstBreachAt === null) state.firstBreachAt = state.clock;
    if (state.clock % 60 === 0) {
      state.trace.push({
        t: state.clock,
        ctd: now.ctd,
        packingQueue: now.packingQueue,
        ordersWaiting: now.ordersWaiting,
      });
    }
  }
}

/* ── Who suits which task ─────────────────────────────────────────────── */

/**
 * How well somebody suits a piece of work, 0–1, and how long it takes them.
 *
 * Delegation is not automatically good. Giving a high-value recount to the
 * dispatch lead gets it counted, slowly, by the person the riders are waiting
 * on.
 */
export function taskFit(id: string, kind: TaskKind): { fit: number; seconds: number } {
  const employee = BY_ID[id];
  if (!employee || id === "temp") return { fit: 0.2, seconds: 600 };
  const { auth, skills: s } = employee;

  switch (kind) {
    case "count":
      if (auth.inventoryCount) return { fit: 1, seconds: 240 };
      if (auth.highValue) return { fit: 0.7, seconds: 360 };
      return { fit: 0.5, seconds: 450 };
    case "records":
      return auth.inventoryCount ? { fit: 1, seconds: 180 } : { fit: 0.6, seconds: 300 };
    case "followUp":
      return auth.inventoryCount ? { fit: 1, seconds: 180 } : { fit: 0.5, seconds: 300 };
    case "audit":
      return auth.inventoryCount ? { fit: 1, seconds: 900 } : { fit: 0.4, seconds: 1200 };
    case "search":
    case "replenish":
    case "inbound":
      return auth.inwarding || s.replenishment >= 0.9
        ? { fit: 1, seconds: 90 }
        : { fit: 0.6, seconds: 180 };
    case "aisle":
      return s.replenishment >= 0.8 ? { fit: 1, seconds: 180 } : { fit: 0.7, seconds: 270 };
    case "repack":
      return s.packing >= 0.8 ? { fit: 1, seconds: 40 } : { fit: 0.5, seconds: 90 };
    case "riders":
    case "lateOrder":
      return auth.riders ? { fit: 1, seconds: 120 } : { fit: 0.4, seconds: 240 };
    case "coaching":
      return s.picking >= 1 ? { fit: 0.8, seconds: 420 } : { fit: 0.4, seconds: 420 };
  }
}

/** Is there somebody free who is properly suited to this? */
export function suitedAndFree(state: HiringState, kind: TaskKind): boolean {
  return ROSTER.some(
    (employee) => isFree(state, employee.id) && taskFit(employee.id, kind).fit >= 0.9,
  );
}
