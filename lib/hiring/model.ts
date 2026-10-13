import { STANDBY_RIDERS, formFor } from "./forms";
import { BY_ID, PPI_TARGET, ROSTER, TEMP_IDS, isTemp } from "./roster";
import {
  STAGES,
  STATIONS,
  type HiringState,
  type Metrics,
  type SceneId,
  type Stage,
  type Station,
  type TaskKind,
} from "./types";

/**
 * How the store works.
 *
 * Every number a candidate sees comes out of this file, and all of it is
 * driven by where people are standing and whether their device is locked.
 * There is no scripted "nineteen orders waiting": nineteen are waiting because
 * the people picking cannot clear what is arriving, and it would have been
 * eleven with one more device open to orders.
 *
 * Three workflows, as on a real floor. Picking is the whole order — pick it,
 * pack it, stage it for a rider. Putaway takes the crates the mother
 * warehouse sent and gets them into bins. Auditing counts, and checks the
 * fresh lines before the morning rush. And the handheld decides more than
 * anybody admits: an associate on putaway or auditing whose device is
 * unlocked is sent orders the moment volume spikes, and stops doing what they
 * were doing. A locked device never is.
 *
 * The clock is in simulated seconds from 05:55:00. It moves when the manager
 * spends attention, which is the point: a manager who personally recounts a
 * cage has spent five minutes the store kept running without them.
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

export const PEAK_AT = 2100; // 06:30
/** The breakfast surge lands at 06:09, whether or not anybody is watching. */
export const SURGE_AT = 840;
/** Aisle C is blocked from 06:14 until somebody clears it. */
export const AISLE_AT = 1140;
/** Standby riders asked for at the start of the shift are logged in by 06:08, before the surge. */
export const STANDBY_AT = 780;
/** The agency's replacement picker walks in at 06:20. */
export const TEMP_AT = 1500;

export function aisleBlocked(state: HiringState, clock = state.clock): boolean {
  if (clock < AISLE_AT) return false;
  const cleared = state.shocks.aisleClearedAt;
  return cleared === null || clock < cleared;
}
export const END_AT = 3300; // 06:50
export const CTD_TARGET = 180;
/** Click-to-dispatch at which the app starts lengthening the promise. */
export const EXTEND_AT = 250;
/** And at which it stops taking orders the store cannot fulfil. */
export const SHED_AT = 320;
/** How much of a shelf shortfall turns into pickers standing at empty bins. */
const SHELF_DRAG = 0.65;
/** Somebody pulled off putaway to pick is not as quick as on their own job. */
const SWITCH = 0.9;
export const STEP = 30;

/** Worker-units each workflow needs at ordinary demand. */
const BASE_REQUIRED: Record<Station, number> = {
  picking: 6.5,
  putaway: 2.0,
  auditing: 1.0,
};
/** Riders needed on the road at ordinary demand. */
const RIDERS_REQUIRED = 6.2;

/** Orders a minute at ordinary demand. */
const ORDERS_PER_MINUTE = 5.2;

/**
 * The morning perishables check — milk, bread, eggs, fruit and vegetables,
 * for date and quality — in worker-seconds. One trained person does it in
 * about twelve minutes; two in six.
 */
const PERISHABLES_WORK = 700;

export function clockLabel(clock: number): string {
  const total = 5 * 3600 + 55 * 60 + Math.max(0, Math.round(clock));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Demand against a normal morning. Peaks at +38% from 06:30, then eases. */
export function demandAt(clock: number): number {
  if (clock <= 0) return 1;
  if (clock <= PEAK_AT) return 1 + 0.38 * (clock / PEAK_AT);
  if (clock <= PEAK_AT + 480) return 1.38;
  return Math.max(1.18, 1.38 - 0.2 * ((clock - PEAK_AT - 480) / 720));
}

/* ── People ───────────────────────────────────────────────────────────── */

export function isPresent(state: HiringState, id: string, clock = state.clock): boolean {
  if (isTemp(id)) {
    return TEMP_IDS.indexOf(id) < state.agency && state.tempArrivesAt !== null && clock >= state.tempArrivesAt;
  }
  if (id === "arjun" && state.arjun.outcome === "leaving" && clock >= PEAK_AT) return false;
  if (id === "riya" && state.riya.leftAt !== null && clock >= state.riya.leftAt) return false;
  return id in state.assign;
}

export function isFree(state: HiringState, id: string, clock = state.clock): boolean {
  const busy = state.busy[id];
  return isPresent(state, id, clock) && !(busy && busy.until > clock);
}

/** Is this device locked to its role? Somebody being shown the bins is, for as long as it lasts. */
export function isLocked(state: HiringState, id: string, clock = state.clock): boolean {
  if (id === "riya" && clock < state.riya.pairUntil) return true;
  return state.locks[id] === true;
}

/** Riya's putaway output, which is the one skill on the floor that moves. */
function riyaPutaway(state: HiringState, clock: number): number {
  const choices = state.riya.choices ?? [];
  let output = 0.55;
  if (choices.includes("pair")) {
    // Slower while she is being shown the bin codes, better for the rest of the shift.
    output = clock < state.riya.pairUntil ? 0.5 : 0.82;
  }
  // Somebody who has just been warned for being new gets more careful, not quicker.
  if (choices.includes("warn")) output *= 0.94;
  return output;
}

/**
 * What one person produces at one workflow, right now.
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
  if (id === "riya" && station === "putaway") output = riyaPutaway(state, clock);
  if (id === "riya" && station === "picking" && (state.riya.choices ?? []).includes("warn")) output *= 0.94;

  // Whoever is doing the showing is slower while they do it.
  if (id === state.riya.pairPartner && station === "putaway" && clock < state.riya.pairUntil) {
    output -= 0.2;
  }

  output *= 1 - 0.12 * employee.fatigue;

  const home = homeStation(id);
  if (station !== home) {
    // Arjun covers a second workflow as well as he was treated.
    if (id === "arjun") {
      const flex = { pending: 1, willing: 1, reluctant: 0.85, resentful: 0.72, leaving: 0.85 };
      output *= flex[state.arjun.outcome];
    }
    // A floor that does not trust the manager moves, and does not hurry.
    if (state.trust < 45) output *= 0.9;
  }

  return Math.max(0, output);
}

/** The workflow somebody is best at, which is where they would rather be. */
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

/** The devices the app can send orders to in a spike: on putaway or auditing, and not locked. */
export function unlockedDevices(state: HiringState, clock = state.clock): string[] {
  return Object.keys(state.assign).filter(
    (id) => state.assign[id] !== "picking" && isFree(state, id, clock) && !isLocked(state, id, clock),
  );
}

/* ── Capacity and coverage ────────────────────────────────────────────── */

/** A manager working a stage with their own hands is half a person there, and no manager anywhere. */
function benchAt(state: HiringState, stage: Stage, clock: number): boolean {
  return clock < state.shocks.managerOnBenchUntil && stage === formFor(state.form).constraint;
}

function requiredOf(state: HiringState, stage: Stage, clock: number, projected: boolean): number {
  const demand = demandAt(clock);
  const form = formFor(state.form);
  const surge = !projected && clock >= SURGE_AT && stage === form.constraint ? form.surgeFactor : 1;
  const eased = !projected && state.shocks.lanes.includes(stage);

  switch (stage) {
    case "picking":
      return BASE_REQUIRED.picking * demand * surge;
    case "putaway": {
      let required = BASE_REQUIRED.putaway * (1 + 0.5 * (demand - 1)) * surge;
      if (eased) required /= 1.12;
      if (!projected && state.shocks.inboundCleared) required *= 0.85;
      return required;
    }
    case "auditing":
      return BASE_REQUIRED.auditing * (eased ? 0.6 : 1);
    case "riders": {
      let required = RIDERS_REQUIRED * demand * surge;
      if (projected) return required;
      if (eased) required /= 1.12;
      if (state.shocks.riders === "sequenced") required *= 0.92;
      if (state.shocks.riders === "gap" && clock >= PEAK_AT) required *= 1.08;
      const desk = state.riders.desk;
      if (desk) required /= BY_ID[desk]?.auth.riders ? 1.08 : 1.03;
      if (benchAt(state, "riders", clock)) required /= 1.06;
      return required;
    }
  }
}

function dedicatedPicking(state: HiringState, clock: number): number {
  let total = staffAt(state, "picking", clock).reduce((sum, id) => sum + outputOf(state, id, "picking", clock), 0);
  if (benchAt(state, "picking", clock)) total += 0.5;
  return total;
}

function flexPicking(state: HiringState, clock: number): number {
  return unlockedDevices(state, clock).reduce(
    (sum, id) => sum + outputOf(state, id, "picking", clock) * SWITCH,
    0,
  );
}

/**
 * How much of their time the unlocked devices are spending on orders.
 *
 * The app looks at what is arriving and what the dedicated pickers can clear,
 * and pushes the difference to anybody whose device will take it. It does not
 * know why a picker is slow — a blocked aisle or an empty bin looks the same
 * to it as a quiet moment — so it works from the forecast, not the floor.
 */
export function pullOf(state: HiringState, clock = state.clock, projected = false): number {
  // Orders already waiting are pushed out as well as the ones arriving: the app
  // aims to clear a backlog in about three minutes, and stops when it has.
  const waiting = projected ? 0 : Math.max(0, state.flow.pickQ - 2) / (3 * ORDERS_PER_MINUTE * demandAt(clock));
  const need = requiredOf(state, "picking", clock, projected) * (1 + waiting) - dedicatedPicking(state, clock);
  if (need <= 0) return 0;
  const flex = flexPicking(state, clock);
  return flex > 0 ? Math.min(1, need / flex) : 0;
}

export function capacityOf(state: HiringState, station: Station, clock = state.clock, projected = false): number {
  const pull = pullOf(state, clock, projected);
  if (station === "picking") return dedicatedPicking(state, clock) + pull * flexPicking(state, clock);

  let total = staffAt(state, station, clock).reduce(
    (sum, id) => sum + outputOf(state, id, station, clock) * (isLocked(state, id, clock) ? 1 : 1 - pull),
    0,
  );
  if (benchAt(state, station, clock)) total += 0.5;
  return total;
}

/** Riders logged in and taking orders. */
export function ridersOn(state: HiringState, clock = state.clock, projected = false): number {
  const { on, standby, standbyAt } = state.riders;
  const arrived = standby && (projected || (standbyAt !== null && clock >= standbyAt));
  return on + (arrived ? STANDBY_RIDERS : 0);
}

/**
 * Coverage: capacity against what the stage is being asked for, where 1.0 is
 * exactly enough. `projected` is the board's forecast for 06:30 — it knows the
 * demand curve, and it knows which devices the app will send orders to. It
 * does not know about the surge that has not happened.
 */
export function coverageOf(
  state: HiringState,
  stage: Stage,
  clock = state.clock,
  projected = false,
): number {
  if (stage === "riders") return ridersOn(state, clock, projected) / requiredOf(state, stage, clock, projected);

  let capacity = capacityOf(state, stage, clock, projected);
  if (stage === "picking" && !projected) capacity *= aisleFactor(state, clock) * shelfFactor(state, clock);
  return capacity / requiredOf(state, stage, clock, projected);
}

function aisleFactor(state: HiringState, clock: number): number {
  return aisleBlocked(state, clock) ? 0.86 : 1;
}

/** Pickers standing at empty bins are not picking. */
function shelfFactor(state: HiringState, clock: number): number {
  const shelf = coverageOf(state, "putaway", clock, false);
  return 1 - SHELF_DRAG * Math.max(0, 1 - shelf);
}

const FORECAST_AT = PEAK_AT - 1;

/** The floor as it will stand at 06:30: nobody away on a task, and any agency staff booked already in. */
function forecastView(state: HiringState, includeArjun: boolean): HiringState {
  const assign =
    includeArjun || state.assign.arjun === undefined ? { ...state.assign } : withoutKey(state.assign, "arjun");
  if (state.tempArrivesAt !== null) {
    for (const id of TEMP_IDS.slice(0, state.agency)) assign[id] ??= "picking";
  }
  return { ...state, assign, busy: {} };
}

/** What the planning board shows for 06:30, given who is where and which devices are locked. */
export function projectedPeak(state: HiringState, includeArjun = true): Record<Stage, number> {
  const view = forecastView(state, includeArjun);
  return Object.fromEntries(
    STAGES.map((stage) => [stage, coverageOf(view, stage, FORECAST_AT, true)]),
  ) as Record<Stage, number>;
}

/**
 * How the forecast is made up, so the board can say why a number is what it
 * is. Moving three pickers to putaway does not drop picking by three pickers
 * if their devices are unlocked: the app sends them orders in the rush, and
 * what falls is the putaway they were moved to do. The percentages are right
 * and, without this, look wrong.
 */
export interface ForecastParts {
  /** Share of their time the unlocked devices spend on orders at 06:30. */
  pull: number;
  picking: { people: number; own: number };
  putaway: { people: number; unlocked: number; own: number };
  auditing: { people: number; unlocked: number };
}

export function forecastParts(state: HiringState, includeArjun = true): ForecastParts {
  const view = forecastView(state, includeArjun);
  const at = FORECAST_AT;
  const open = (station: Station) => staffAt(view, station, at).filter((id) => !isLocked(view, id, at)).length;
  const whole = (station: Station) => staffAt(view, station, at).reduce((sum, id) => sum + outputOf(view, id, station, at), 0);
  return {
    pull: pullOf(view, at, true),
    picking: {
      people: staffAt(view, "picking", at).length,
      own: dedicatedPicking(view, at) / requiredOf(view, "picking", at, true),
    },
    putaway: {
      people: staffAt(view, "putaway", at).length,
      unlocked: open("putaway"),
      own: whole("putaway") / requiredOf(view, "putaway", at, true),
    },
    auditing: { people: staffAt(view, "auditing", at).length, unlocked: open("auditing") },
  };
}

function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const rest = { ...record };
  delete rest[key];
  return rest;
}

/** Putaway is still running, thinly, at four-fifths of what it needs. */
const RESERVE_FLOOR = 0.8;

/**
 * The store's reserve: people the app can send orders to when the rush is
 * bigger than forecast. An unlocked device on its own is not a reserve — an
 * unlocked device whose own work can spare it is. Somebody on auditing can be
 * spared once the morning check is done. Somebody on putaway can only be
 * spared if the bins will still be filled without them.
 */
export function flexibleReserve(state: HiringState): string[] {
  const projected = projectedPeak(state);
  return ROSTER.filter((employee) => {
    const station = state.assign[employee.id];
    if (!station || station === "picking" || employee.id === "riya") return false;
    if (state.locks[employee.id] || employee.skills.picking < 0.8) return false;
    return station === "auditing" || projected.putaway >= RESERVE_FLOOR;
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
 * Where the store is actually stuck. An order passes through two hands — a
 * picker's and a rider's — and whichever has less capacity against what it is
 * being asked for is the one holding the rest up. Putaway is not a stage an
 * order passes through, but empty bins stop pickers: so when picking is the
 * slow stage and the bins are the reason, the answer is putaway.
 */
export function weakestStage(state: HiringState): Stage {
  const riders = coverageOf(state, "riders");
  if (riders < coverageOf(state, "picking")) return "riders";
  const putaway = coverageOf(state, "putaway");
  const hands = capacityOf(state, "picking") / requiredOf(state, "picking", state.clock, false);
  return putaway < 0.9 && putaway < hands ? "putaway" : "picking";
}

/** Both stages an order passes through are keeping up, and the bins are being filled. */
export function floorHolding(coverage: Record<Stage, number>): boolean {
  return Math.min(coverage.picking, coverage.riders) >= 0.97 && coverage.putaway >= 0.8;
}

/* ── The morning check ────────────────────────────────────────────────── */

export function perishablesDone(state: HiringState, clock = state.clock): boolean {
  return state.audit.doneAt !== null && state.audit.doneAt <= clock;
}

/** When the perishables check will finish with the people on it now, or null if nobody is. */
export function perishablesEta(state: HiringState): number | null {
  if (state.audit.doneAt !== null) return state.audit.doneAt;
  const capacity = capacityOf({ ...state, busy: {} }, "auditing", state.clock, true);
  if (capacity <= 0.05) return null;
  return state.clock + (PERISHABLES_WORK - state.audit.progress) / capacity;
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
    STAGES.map((stage) => [stage, coverageOf(state, stage)]),
  ) as Record<Stage, number>;

  const wait =
    state.flow.pickQ / (rate * Math.max(0.2, coverage.picking)) +
    state.flow.stageQ / (rate * Math.max(0.2, coverage.riders));

  // Seconds an item, across everybody picking: what the Floor Lead reads off the wall.
  const pull = pullOf(state);
  const heads = staffAt(state, "picking").length + pull * unlockedDevices(state).length;
  const working = coverage.picking * requiredOf(state, "picking", state.clock, false);
  const ppi = heads > 0 && working > 0 ? Math.min(60, (PPI_TARGET * heads) / working) : 0;

  return {
    ordersWaiting: Math.round(state.flow.pickQ + rate * 2.6),
    staged: Math.round(state.flow.stageQ + rate * 0.5),
    ctd: Math.round(154 + 18 * wait),
    ppi: Math.round(ppi * 10) / 10,
    pull,
    coverage,
  };
}

/** Move the store forward. Mutates the draft it is given. */
export function advanceTo(state: HiringState, target: number): void {
  while (state.clock < target) {
    const dt = Math.min(STEP, target - state.clock);
    const minutes = dt / 60;
    const rate = ORDERS_PER_MINUTE * demandAt(state.clock);

    if (state.tempArrivesAt !== null && state.clock >= state.tempArrivesAt) {
      for (const id of TEMP_IDS.slice(0, state.agency)) state.assign[id] ??= "picking";
    }

    const pick = rate * coverageOf(state, "picking") * minutes;
    const out = rate * coverageOf(state, "riders") * minutes;

    if (state.audit.doneAt === null) {
      state.audit.progress += capacityOf(state, "auditing") * dt;
      if (state.audit.progress >= PERISHABLES_WORK) state.audit.doneAt = state.clock + dt;
    }

    // Past a point the app lengthens the promise it shows, and fewer people order.
    const drowning = metricsOf(state).ctd > EXTEND_AT;
    if (drowning) state.shocks.extended += dt;
    state.flow.pickQ += arrivalsPerMinute(state, state.clock) * minutes * (drowning ? 0.6 : 1);
    const picked = Math.min(state.flow.pickQ, pick);
    state.flow.pickQ -= picked;

    state.flow.stageQ += picked;
    const sent = Math.min(state.flow.stageQ, out);
    state.flow.stageQ -= sent;

    const minuteBefore = Math.floor(state.clock / 60);
    state.clock += dt;

    // A store this far behind is switched off in the app until it catches up.
    const strained = metricsOf(state).ctd;
    if (strained > SHED_AT) {
      const keep = (SHED_AT - 154) / (strained - 154);
      const before = state.flow.pickQ + state.flow.stageQ;
      state.flow.pickQ *= keep;
      state.flow.stageQ *= keep;
      state.shocks.shed += before * (1 - keep);
    }

    for (const id of Object.keys(state.busy)) {
      if (state.busy[id]!.until <= state.clock) delete state.busy[id];
    }

    const now = metricsOf(state);
    if (now.ctd > state.maxCtd) state.maxCtd = now.ctd;
    if (now.ctd > CTD_TARGET && state.firstBreachAt === null) state.firstBreachAt = state.clock;
    if (Math.floor(state.clock / 60) > minuteBefore) {
      state.trace.push({
        t: state.clock,
        ctd: now.ctd,
        staged: now.staged,
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
 * person the riders answer to gets it counted, slowly, by somebody who was
 * needed elsewhere.
 */
export function taskFit(id: string, kind: TaskKind): { fit: number; seconds: number } {
  const employee = BY_ID[id];
  if (!employee || isTemp(id)) return { fit: 0.2, seconds: 600 };
  const { auth, skills: s } = employee;

  switch (kind) {
    case "count":
      if (auth.audit && auth.highValue) return { fit: 1, seconds: 240 };
      if (auth.audit) return { fit: 0.8, seconds: 300 };
      if (auth.highValue) return { fit: 0.7, seconds: 360 };
      return { fit: 0.5, seconds: 450 };
    case "records":
      return auth.audit ? { fit: 1, seconds: 180 } : { fit: 0.6, seconds: 300 };
    case "followUp":
      return auth.audit ? { fit: 1, seconds: 180 } : { fit: 0.5, seconds: 300 };
    case "audit":
      return auth.audit ? { fit: 1, seconds: 900 } : { fit: 0.4, seconds: 1200 };
    case "perishables":
      return s.auditing >= 0.9 ? { fit: 1, seconds: 360 } : { fit: 0.5, seconds: 600 };
    case "search":
    case "replenish":
    case "inbound":
      return auth.inwarding || s.putaway >= 0.9
        ? { fit: 1, seconds: 90 }
        : { fit: 0.6, seconds: 180 };
    case "aisle":
      return s.putaway >= 0.8 ? { fit: 1, seconds: 180 } : { fit: 0.7, seconds: 270 };
    case "repack":
      return s.picking >= 0.9 ? { fit: 1, seconds: 40 } : { fit: 0.5, seconds: 90 };
    case "riders":
    case "lateOrder":
      return auth.riders ? { fit: 1, seconds: 120 } : { fit: 0.4, seconds: 240 };
    case "coaching":
      return s.putaway >= 1 ? { fit: 0.9, seconds: 420 } : { fit: 0.4, seconds: 420 };
  }
}

/** Is there somebody free who is properly suited to this? */
export function suitedAndFree(state: HiringState, kind: TaskKind): boolean {
  return ROSTER.some(
    (employee) => isFree(state, employee.id) && taskFit(employee.id, kind).fit >= 0.9,
  );
}
