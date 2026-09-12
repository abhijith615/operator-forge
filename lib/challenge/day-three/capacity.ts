import {
  EVENING_END,
  OUTCOME_FROM,
  ORDERS_PER_RIDER_HOUR,
  PEAK_FROM,
  PEAK_TO,
  demandAt,
  riderNeedAt,
} from "./forecast";
import {
  ARJUN,
  AUDIT,
  FAISAL,
  FLEX,
  REGULARS,
  RIDER_SOURCES,
  RIYA,
  YOU,
  flexWindow,
  scheduledRidersAt,
} from "./workforce";
import type {
  Bottleneck,
  CoverLane,
  Day3State,
  FlexWorker,
  Station,
  Worker,
} from "./types";

/**
 * The capacity model.
 *
 * Simple, internally consistent, and never shown to the learner as a formula.
 * A person's contribution depends on the skill they bring to the station they
 * are on, their measured pace, when they are actually in the building, and
 * what else the evening has asked of them. The board only ever shows the
 * result: projected coverage.
 *
 * `World` says which of the evening's surprises have happened yet. The board
 * is drawn in the world the operator currently knows about; the peak is run in
 * the world as it actually turned out; and anticipation is measured in the
 * "planned" world — revised forecast, no surprises — so a disruption nobody
 * could have predicted never counts against planning.
 */

export interface World {
  revised: boolean;
  late: boolean;
  receiving: boolean;
  /** Arjun's overtime and Riya's review have happened. */
  people: boolean;
  faisalReal: boolean;
  audit: boolean;
}

export const PLANNED: World = {
  revised: true,
  late: false,
  receiving: false,
  people: false,
  faisalReal: false,
  audit: false,
};

export const ACTUAL: World = {
  revised: true,
  late: true,
  receiving: true,
  people: true,
  faisalReal: true,
  audit: true,
};

/* ── Rates ────────────────────────────────────────────────────────────── */

const PACK_RATE = [12, 30, 52, 70] as const;
const DISPATCH_RATE = [30, 80, 140, 185] as const;
/** Pace assumed where the store has not measured one. */
const NOVICE_PPI = [34, 24, 15.5, 11.5] as const;

/** What a station expects of a solid associate, so skills compare across stations. */
export const REFERENCE_RATE: Record<Station, number> = {
  picking: 45,
  packing: 60,
  dispatch: 150,
};

/** Orders an hour from a picking pace: four items a basket, thirty seconds to hand off. */
export function pickRate(ppi: number): number {
  return 3600 / (ppi * 4 + 30);
}

export function baseRate(worker: Worker, station: Station): number {
  const skill = worker.skills[station];
  if (station === "picking") return pickRate(worker.ppi ?? NOVICE_PPI[skill]);
  return station === "packing" ? PACK_RATE[skill] : DISPATCH_RATE[skill];
}

export function relativeSkill(worker: Worker, station: Station): number {
  return baseRate(worker, station) / REFERENCE_RATE[station];
}

const STATIONS: Station[] = ["picking", "packing", "dispatch"];

export function bestStation(worker: Worker): Station {
  return STATIONS.reduce((best, station) =>
    relativeSkill(worker, station) > relativeSkill(worker, best) ? station : best,
  );
}

/** Two stations at two stars or better. */
export function isCrossTrained(worker: Worker): boolean {
  return STATIONS.filter((station) => worker.skills[station] >= 2).length >= 2;
}

/* ── People ───────────────────────────────────────────────────────────── */

export const ALL_WORKERS: Worker[] = [...REGULARS, ...FLEX, YOU];

const BY_ID = new Map(ALL_WORKERS.map((worker) => [worker.id, worker]));

export function workerById(id: string): Worker | undefined {
  return BY_ID.get(id);
}

export function faisalPpi(state: Day3State, world: World, t: number): number {
  if (!world.faisalReal || t < FAISAL.alertAt) return FAISAL.cardPpi;
  const actions = state.faisal;
  if (actions.includes("zone") && actions.includes("pair")) return FAISAL.zonePair;
  if (actions.includes("zone")) return FAISAL.zone;
  if (actions.includes("pair")) return t < FAISAL.pairTo ? FAISAL.paired : FAISAL.afterPair;
  if (actions.includes("coach")) return FAISAL.today;
  return t >= PEAK_FROM ? FAISAL.peakIfIgnored : FAISAL.today;
}

/**
 * Arjun's last two hours. They are on the board from 4:30 because the floor
 * lead pencilled them in; they are only his once he has agreed to them.
 */
export function arjunOvertime(state: Day3State): "pending" | "accepted" | "declined" {
  const outcome = state.people.arjun.outcome;
  if (!outcome) return "pending";
  return outcome === "extended" ? "accepted" : "declined";
}

/**
 * Riya's pace. Her average is a mix of four zones, one of which is three
 * times the others; moving her out of it, or standing an expert beside her in
 * it, changes the average without touching her accuracy.
 */
export function riyaPpi(state: Day3State, world: World, t: number): number {
  const actions = world.people ? state.people.riya.interventions : [];
  if (!world.people || t < RIYA.applyAt || actions.length === 0) return RIYA.today;
  const pairing = t >= RIYA.pairFrom && t < RIYA.pairTo;
  const zone = actions.includes("zone");
  const pair = actions.includes("pair");
  if (zone && pair) return pairing ? RIYA.zonePair : RIYA.afterZonePair;
  if (zone) return RIYA.zone;
  if (pair) return pairing ? RIYA.paired : RIYA.afterPair;
  return RIYA.today;
}

/** When someone is actually in the building tonight, lateness included. */
export function windowOf(
  state: Day3State,
  world: World,
  worker: Worker,
): { start: number; end: number } | null {
  let start: number;
  let end: number;
  if (worker.kind === "flex") {
    const booking = state.flex[worker.id];
    if (!booking) return null;
    const window = flexWindow(worker as FlexWorker, booking.windowId);
    if (!window) return null;
    start = window.start;
    end = window.end;
  } else {
    start = worker.start;
    end = worker.end;
  }
  if (world.late && state.late?.workerId === worker.id) {
    start = Math.max(start, state.late.arrives);
  }
  if (worker.id === ARJUN.id && world.people && arjunOvertime(state) === "declined") {
    end = Math.min(end, ARJUN.rotaEnd);
  }
  return start < end ? { start, end } : null;
}

/** The role someone holds for the evening, before any time-bounded move. */
export function baseStation(state: Day3State, worker: Worker): Station | null {
  if (worker.kind === "flex") return state.flex[worker.id]?.station ?? null;
  if (worker.kind === "manager") return null;
  return state.assignments[worker.id] ?? null;
}

function transferApplies(world: World, reason: "receiving" | "backfill" | "late-cover"): boolean {
  return reason === "late-cover" ? world.late : world.receiving;
}

/** Where someone is at minute `t`: a station, the receiving bay, or nowhere. */
export function placeAt(
  state: Day3State,
  world: World,
  worker: Worker,
  t: number,
): Station | "receiving" | null {
  const window = windowOf(state, world, worker);
  if (!window || t < window.start || t >= window.end) return null;
  for (const transfer of state.transfers) {
    if (
      transfer.workerId === worker.id &&
      t >= transfer.start &&
      t < transfer.end &&
      transferApplies(world, transfer.reason)
    ) {
      return transfer.to;
    }
  }
  if (worker.id === FAISAL.id && world.faisalReal && t >= FAISAL.alertAt) {
    if (state.faisal.includes("remove")) return null;
    if (state.faisal.includes("packing")) return "packing";
  }
  if (worker.id === RIYA.id && world.people && t >= RIYA.applyAt) {
    const actions = state.people.riya.interventions;
    if (actions.includes("remove")) return null;
    if (actions.includes("packing")) return "packing";
  }
  return baseStation(state, worker);
}

/**
 * Who stands with Riya for her half hour: the fastest expert picker who is on
 * picking for the whole window — so the vehicle, the audit and a late arrival
 * all take people out of the running, exactly as they would on the floor.
 */
export function riyaExpert(state: Day3State, world: World): string | null {
  if (!world.people || !state.people.riya.interventions.includes("pair")) return null;
  const candidates = [...REGULARS, ...FLEX].filter((worker) => {
    if (worker.id === RIYA.id || worker.id === FAISAL.id || worker.skills.picking !== 3) return false;
    for (let t = RIYA.pairFrom; t < RIYA.pairTo; t += 1) {
      if (placeAt(state, world, worker, t) !== "picking") return false;
    }
    return true;
  });
  candidates.sort((a, b) => baseRate(b, "picking") - baseRate(a, "picking"));
  return candidates[0]?.id ?? null;
}

/** Who Faisal is paired with, if he is: the fastest expert picking at 6:30. */
export function pairingExpert(state: Day3State, world: World): string | null {
  if (!world.faisalReal || !state.faisal.includes("pair")) return null;
  const candidates = [...REGULARS, ...FLEX]
    .filter(
      (worker) =>
        worker.id !== FAISAL.id &&
        worker.skills.picking === 3 &&
        placeAt(state, world, worker, FAISAL.pairFrom) === "picking",
    )
    .sort((a, b) => baseRate(b, "picking") - baseRate(a, "picking"));
  return candidates[0]?.id ?? null;
}

/* ── Riders ───────────────────────────────────────────────────────────── */

export function riderHeadcount(state: Day3State, t: number): { count: number; effective: number } {
  let count = scheduledRidersAt(t);
  let effective = count;
  for (const source of RIDER_SOURCES) {
    const booked = state.riders[source.id];
    if (booked > 0 && t >= source.arrive && t < source.until) {
      count += booked;
      effective += booked * source.effectiveness;
    }
  }
  return { count, effective };
}

/* ── The evening, minute by minute ────────────────────────────────────── */

export interface Series {
  revised: boolean;
  demand: number[];
  picking: number[];
  packing: number[];
  dispatch: number[];
  /** Orders an hour the riders on the road can take. */
  riderCap: number[];
  riderCount: number[];
  riderNeed: number[];
  heads: Record<Station, number[]>;
}

export function evaluate(state: Day3State, world: World, until = EVENING_END): Series {
  const expert = pairingExpert(state, world);
  const riyaMate = riyaExpert(state, world);
  const managerActive = state.transfers.some((transfer) => transfer.workerId === YOU.id);
  const people = [
    ...REGULARS,
    ...FLEX.filter((worker) => state.flex[worker.id]),
    ...(managerActive ? [YOU] : []),
  ];
  const windows = new Map(people.map((worker) => [worker.id, windowOf(state, world, worker)]));

  const series: Series = {
    revised: world.revised,
    demand: [],
    picking: [],
    packing: [],
    dispatch: [],
    riderCap: [],
    riderCount: [],
    riderNeed: [],
    heads: { picking: [], packing: [], dispatch: [] },
  };

  for (let t = 0; t < until; t += 1) {
    const caps: Record<Station, number> = { picking: 0, packing: 0, dispatch: 0 };
    const heads: Record<Station, number> = { picking: 0, packing: 0, dispatch: 0 };
    const pickRates: number[] = [];
    let managerOnStation = false;

    for (const worker of people) {
      const place = placeAt(state, world, worker, t);
      if (place === null || place === "receiving") continue;

      let rate: number;
      if (worker.id === FAISAL.id && place === "picking") rate = pickRate(faisalPpi(state, world, t));
      else if (worker.id === RIYA.id && place === "picking") rate = pickRate(riyaPpi(state, world, t));
      else rate = baseRate(worker, place);

      if (worker.kind === "flex" && (worker as FlexWorker).newJoiner) {
        const window = windows.get(worker.id);
        if (window && t < window.start + 30) rate *= 0.7;
      }
      // Pairing costs the expert a quarter of their pace for half an hour.
      if (expert === worker.id && place === "picking" && t >= FAISAL.pairFrom && t < FAISAL.pairTo) {
        rate *= 0.75;
      }
      if (riyaMate === worker.id && place === "picking" && t >= RIYA.pairFrom && t < RIYA.pairTo) {
        rate *= 0.75;
      }
      if (worker.kind === "manager") managerOnStation = true;

      caps[place] += rate;
      heads[place] += 1;
      if (place === "picking") pickRates.push(rate);
    }

    // The audit takes two people off the picking floor while it runs.
    if (
      world.audit &&
      state.auditStart < EVENING_END &&
      t >= state.auditStart &&
      t < state.auditStart + AUDIT.duration &&
      pickRates.length > 0
    ) {
      const crew = Math.min(AUDIT.crew, pickRates.length);
      const mean = pickRates.reduce((sum, rate) => sum + rate, 0) / pickRates.length;
      caps.picking -= crew * mean;
      heads.picking -= crew;
    }

    // Nobody is running the floor while the manager is on a station.
    if (managerOnStation) {
      caps.picking *= 0.95;
      caps.packing *= 0.95;
      caps.dispatch *= 0.95;
    }

    const riders = riderHeadcount(state, t);
    series.demand.push(demandAt(t, world.revised));
    series.picking.push(Math.max(0, caps.picking));
    series.packing.push(caps.packing);
    series.dispatch.push(caps.dispatch);
    series.riderCap.push(riders.effective * ORDERS_PER_RIDER_HOUR);
    series.riderCount.push(riders.count);
    series.riderNeed.push(riderNeedAt(t, world.revised));
    series.heads.picking.push(Math.max(0, heads.picking));
    series.heads.packing.push(heads.packing);
    series.heads.dispatch.push(heads.dispatch);
  }

  return series;
}

export function laneSeries(series: Series, lane: CoverLane): number[] {
  return lane === "riders" ? series.riderCap : series[lane];
}

export function coverageAt(series: Series, lane: CoverLane, t: number): number {
  const demand = series.demand[t] ?? 1;
  return (laneSeries(series, lane)[t] ?? 0) / demand;
}

/** Mean coverage over a window, uncapped — 118% means 18% more than needed. */
export function coverageOver(series: Series, from: number, to: number): Record<CoverLane, number> {
  const end = Math.min(to, series.demand.length);
  const result: Record<CoverLane, number> = { picking: 0, packing: 0, dispatch: 0, riders: 0 };
  const span = Math.max(1, end - from);
  for (let t = from; t < end; t += 1) {
    result.picking += coverageAt(series, "picking", t);
    result.packing += coverageAt(series, "packing", t);
    result.dispatch += coverageAt(series, "dispatch", t);
    result.riders += coverageAt(series, "riders", t);
  }
  result.picking /= span;
  result.packing /= span;
  result.dispatch /= span;
  result.riders /= span;
  return result;
}

export function peakCoverage(series: Series): Record<CoverLane, number> {
  return coverageOver(series, PEAK_FROM, PEAK_TO);
}

export function minStation(coverage: Record<CoverLane, number>): number {
  return Math.min(coverage.picking, coverage.packing, coverage.dispatch);
}

/**
 * How far short the evening runs, in lane-minutes: a station at 80% for ten
 * minutes is two. Summed over the four lanes from 6 PM to 10 PM.
 */
export function deficitOf(series: Series, from = OUTCOME_FROM, to = EVENING_END): number {
  const end = Math.min(to, series.demand.length);
  let total = 0;
  for (let t = from; t < end; t += 1) {
    for (const lane of ["picking", "packing", "dispatch", "riders"] as CoverLane[]) {
      total += Math.max(0, 1 - coverageAt(series, lane, t));
    }
  }
  return total;
}

/* ── Flow ─────────────────────────────────────────────────────────────── */

export interface Flow {
  queues: Record<CoverLane, number[]>;
  delivered: number[];
}

/**
 * Orders move through four stages in order. Each stage clears what it can;
 * the rest waits. A picking team twice the size of packing only fills the
 * packing queue faster — which is the lesson Phase 1 is built on.
 */
export function simulateFlow(series: Series): Flow {
  const flow: Flow = {
    queues: { picking: [], packing: [], dispatch: [], riders: [] },
    delivered: [],
  };
  let pick = 0;
  let pack = 0;
  let dispatch = 0;
  let rider = 0;

  for (let t = 0; t < series.demand.length; t += 1) {
    pick += (series.demand[t] ?? 0) / 60;
    const picked = Math.min(pick, (series.picking[t] ?? 0) / 60);
    pick -= picked;

    pack += picked;
    const packed = Math.min(pack, (series.packing[t] ?? 0) / 60);
    pack -= packed;

    dispatch += packed;
    const handed = Math.min(dispatch, (series.dispatch[t] ?? 0) / 60);
    dispatch -= handed;

    rider += handed;
    const out = Math.min(rider, (series.riderCap[t] ?? 0) / 60);
    rider -= out;

    flow.queues.picking.push(pick);
    flow.queues.packing.push(pack);
    flow.queues.dispatch.push(dispatch);
    flow.queues.riders.push(rider);
    flow.delivered.push(out);
  }
  return flow;
}

/** The first queue to pass twenty orders, and when. */
export function firstBottleneck(
  flow: Flow,
  threshold = 20,
  lanes: CoverLane[] = ["picking", "packing", "dispatch", "riders"],
): Bottleneck | null {
  const length = flow.delivered.length;
  for (let t = 0; t < length; t += 1) {
    for (const lane of lanes) {
      if ((flow.queues[lane][t] ?? 0) > threshold) return { lane, at: t };
    }
  }
  return null;
}

export interface PeakStats {
  /** Orders forecast, 6–10 PM. */
  demand: number;
  handled: number;
  serviceRate: number;
  avgPackingQueue: number;
  riderShortageMinutes: number;
  /** A station with nobody on it for ten minutes or more. */
  abandoned: Station | null;
  /** Mean of min(100%, coverage) across the four lanes, 6–10 PM. */
  criticalCoverage: number;
  peak: Record<CoverLane, number>;
}

export function peakStats(series: Series, flow: Flow): PeakStats {
  const end = Math.min(EVENING_END, series.demand.length);
  let demand = 0;
  let handled = 0;
  let shortage = 0;
  let critical = 0;
  const run: Record<Station, number> = { picking: 0, packing: 0, dispatch: 0 };
  let abandoned: Station | null = null;

  for (let t = OUTCOME_FROM; t < end; t += 1) {
    demand += (series.demand[t] ?? 0) / 60;
    handled += flow.delivered[t] ?? 0;
    if ((series.riderCap[t] ?? 0) < (series.demand[t] ?? 0) * 0.95) shortage += 1;
    let lanes = 0;
    for (const lane of ["picking", "packing", "dispatch", "riders"] as CoverLane[]) {
      lanes += Math.min(1, coverageAt(series, lane, t));
    }
    critical += lanes / 4;
    for (const station of STATIONS) {
      run[station] = (series[station][t] ?? 0) <= 0 ? run[station] + 1 : 0;
      if (run[station] >= 10 && !abandoned) abandoned = station;
    }
  }

  let packQueue = 0;
  for (let t = PEAK_FROM; t < PEAK_TO; t += 1) packQueue += flow.queues.packing[t] ?? 0;

  const span = Math.max(1, end - OUTCOME_FROM);
  return {
    demand: Math.round(demand),
    handled: Math.round(handled),
    serviceRate: demand > 0 ? Math.min(1, handled / demand) : 1,
    avgPackingQueue: packQueue / (PEAK_TO - PEAK_FROM),
    riderShortageMinutes: shortage,
    abandoned,
    criticalCoverage: critical / span,
    peak: peakCoverage(series),
  };
}
