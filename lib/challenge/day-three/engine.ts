import {
  PLANNED,
  baseStation,
  coverageOver,
  deficitOf,
  evaluate,
  firstBottleneck,
  peakCoverage,
  simulateFlow,
  windowOf,
  workerById,
  type World,
} from "./capacity";
import {
  AUDIT,
  FLEX,
  LATE_ARRIVAL,
  RECEIVING,
  REGULARS,
  RIDER_SOURCES,
  YOU,
  flexWindow,
  windowCost,
} from "./workforce";
import {
  PHASES,
  type CoreSnapshot,
  type Day3State,
  type FaisalAction,
  type LateEvent,
  type Milestone,
  type Phase,
  type ReceivingOutcome,
  type RiderSourceId,
  type Station,
  type Worker,
} from "./types";

/**
 * Day 3's state transitions.
 *
 * Every function is `(state) => state` and pure: it never touches the clock
 * except through the `now` it is handed, and it returns the same object when
 * nothing changed so a caller can tell a no-op from a decision. The component
 * computes the next state before setting it, which is what lets telemetry fire
 * exactly once per decision.
 */

/* ── Phases ───────────────────────────────────────────────────────────── */

export function phaseIndex(phase: Phase): number {
  return PHASES.indexOf(phase);
}

export function reached(state: Day3State, phase: Phase): boolean {
  return phaseIndex(state.phase) >= phaseIndex(phase);
}

/** The board is live in every planning phase; only the forecast prompt and the peak freeze it. */
const EDITABLE: Phase[] = [
  "core",
  "adjust",
  "flex",
  "riders",
  "late",
  "receiving",
  "faisal",
  "audit",
  "review",
];

export function canEditTeam(state: Day3State): boolean {
  return EDITABLE.includes(state.phase);
}

export function canBookFlex(state: Day3State): boolean {
  return canEditTeam(state) && reached(state, "flex");
}

export function canSourceRiders(state: Day3State): boolean {
  return canEditTeam(state) && reached(state, "riders");
}

/** The evening as the operator currently knows it. */
export function worldOf(state: Day3State): World {
  return {
    revised: state.revised,
    late: reached(state, "late"),
    receiving: reached(state, "receiving"),
    faisalReal: reached(state, "faisal"),
    audit: reached(state, "audit"),
  };
}

const LATE_WORLD: World = { ...PLANNED, late: true };
const RECEIVING_WORLD: World = { ...PLANNED, late: true, receiving: true };

/* ── The store clock ──────────────────────────────────────────────────── */

/**
 * Each phase opens at its own time — 5:42 PM for the late temp, 6:05 for the
 * vehicle — and the clock creeps forward while the operator works, but never
 * past the next moment. Nothing waits on it: the operator moves the evening on.
 */
export const PHASE_CLOCK: Record<Phase, number> = {
  opening: 0,
  core: 0,
  forecast: 20,
  adjust: 20,
  flex: 22,
  riders: 35,
  late: 72,
  receiving: 95,
  faisal: 115,
  audit: 135,
  review: 142,
  peak: 150,
  done: 150,
};

const NEXT_CLOCK: Record<Phase, number> = {
  opening: 0,
  core: 20,
  forecast: 22,
  adjust: 22,
  flex: 35,
  riders: 72,
  late: 95,
  receiving: 115,
  faisal: 135,
  audit: 142,
  review: 150,
  peak: 150,
  done: 150,
};

const SECONDS_PER_STORE_MINUTE = 8;

export function simMinute(state: Day3State, now: number): number {
  const base = PHASE_CLOCK[state.phase];
  if (state.phase === "opening" || state.phase === "peak" || state.phase === "done") return base;
  const cap = Math.max(base, NEXT_CLOCK[state.phase] - 1);
  const crept = Math.floor((now - state.phaseStartedAt) / 1000 / SECONDS_PER_STORE_MINUTE);
  return Math.min(cap, base + Math.max(0, crept));
}

function enter(state: Day3State, phase: Phase, now: number): Day3State {
  return { ...state, phase, phaseStartedAt: now };
}

function mark(state: Day3State, key: Milestone, now: number): Day3State {
  return {
    ...state,
    milestones: {
      ...state.milestones,
      [key]: { sim: simMinute(state, now), at: now - state.startedAt },
    },
  };
}

/* ── Opening ──────────────────────────────────────────────────────────── */

export function createDay3(): Day3State {
  return {
    phase: "opening",
    startedAt: 0,
    phaseStartedAt: 0,
    revised: false,
    assignments: Object.fromEntries(REGULARS.map((worker) => [worker.id, null])),
    flex: {},
    riders: { nearby: 0, morning: 0, local: 0 },
    transfers: [],
    late: null,
    receiving: null,
    receivingSkipped: false,
    faisal: [],
    auditStart: AUDIT.planned,
    core: null,
    forecastResponse: null,
    afterForecast: null,
    planningDeficit: null,
    planningCoverage: null,
    lockDeficit: null,
    lateRepairMs: null,
    inspected: [],
    faisalOpened: false,
    managerCovered: false,
    milestones: {},
    lockedBy: null,
    completedAt: null,
  };
}

export function startShift(state: Day3State, now: number): Day3State {
  if (state.phase !== "opening") return state;
  return { ...state, phase: "core", startedAt: now, phaseStartedAt: now };
}

export function inspect(state: Day3State, id: string): Day3State {
  return state.inspected.includes(id) ? state : { ...state, inspected: [...state.inspected, id] };
}

/* ── Phase 1 · the core team ──────────────────────────────────────────── */

export function assign(state: Day3State, workerId: string, station: Station | null): Day3State {
  if (!canEditTeam(state) || !(workerId in state.assignments)) return state;
  if ((state.assignments[workerId] ?? null) === station) return state;
  return { ...state, assignments: { ...state.assignments, [workerId]: station } };
}

export function confirmCore(state: Day3State, now: number): Day3State {
  if (state.phase !== "core") return state;
  const initial = evaluate(state, { ...PLANNED, revised: false });
  const revised = evaluate(state, PLANNED);
  const core: CoreSnapshot = {
    covInitial: peakCoverage(initial),
    covRevised: peakCoverage(revised),
    deficit: deficitOf(revised),
    // Riders are not this phase's lever, so the bottleneck read here is the floor's.
    bottleneck: firstBottleneck(simulateFlow(initial), 20, ["picking", "packing", "dispatch"]),
  };
  // The forecast moves the moment the first plan exists.
  return enter({ ...mark(state, "core", now), revised: true, core }, "forecast", now);
}

export function keepPlan(state: Day3State, now: number): Day3State {
  if (state.phase !== "forecast") return state;
  return enter(
    {
      ...mark(state, "forecast", now),
      forecastResponse: "kept",
      afterForecast: peakCoverage(evaluate(state, PLANNED)),
    },
    "flex",
    now,
  );
}

export function adjustPlan(state: Day3State, now: number): Day3State {
  return state.phase === "forecast" ? enter(state, "adjust", now) : state;
}

export function finishAdjusting(state: Day3State, now: number): Day3State {
  if (state.phase !== "adjust") return state;
  return enter(
    {
      ...mark(state, "forecast", now),
      forecastResponse: "adjusted",
      afterForecast: peakCoverage(evaluate(state, PLANNED)),
    },
    "flex",
    now,
  );
}

/* ── Phase 2 · flex and riders ────────────────────────────────────────── */

function omit<T>(record: Record<string, T>, key: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([id]) => id !== key));
}

export function bookFlex(
  state: Day3State,
  flexId: string,
  windowId: string,
  station: Station,
): Day3State {
  if (!canBookFlex(state)) return state;
  const worker = FLEX.find((candidate) => candidate.id === flexId);
  if (!worker || !flexWindow(worker, windowId)) return state;
  const current = state.flex[flexId];
  if (current && current.windowId === windowId && current.station === station) return state;
  return { ...state, flex: { ...state.flex, [flexId]: { windowId, station } } };
}

export function cancelFlex(state: Day3State, flexId: string): Day3State {
  if (!canBookFlex(state) || !state.flex[flexId]) return state;
  return {
    ...state,
    flex: omit(state.flex, flexId),
    transfers: state.transfers.filter((transfer) => transfer.workerId !== flexId),
  };
}

export function confirmFlex(state: Day3State, now: number): Day3State {
  return state.phase === "flex" ? enter(mark(state, "flex", now), "riders", now) : state;
}

export function setRiders(state: Day3State, source: RiderSourceId, count: number): Day3State {
  if (!canSourceRiders(state)) return state;
  const spec = RIDER_SOURCES.find((candidate) => candidate.id === source);
  if (!spec) return state;
  const next = Math.max(0, Math.min(spec.max, Math.round(count)));
  if (next === state.riders[source]) return state;
  return { ...state, riders: { ...state.riders, [source]: next } };
}

export function confirmRiders(state: Day3State, now: number): Day3State {
  if (state.phase !== "riders") return state;
  const planned = evaluate(state, PLANNED);
  const next: Day3State = {
    ...mark(state, "riders", now),
    planningDeficit: deficitOf(planned),
    planningCoverage: peakCoverage(planned),
  };
  return enter(openLate(next), "late", now);
}

/* ── Phase 3 · the plan breaks ────────────────────────────────────────── */

/**
 * Who is late. Manoj, if he was booked — he is the one the evening is
 * written around. Otherwise whichever temp was due before 7:15, and failing
 * that Joseph, the regular who starts at 5:30. The evening always breaks
 * somewhere; it breaks where this operator's plan is.
 */
function lateCandidate(state: Day3State): Worker {
  const manoj = FLEX.find((worker) => worker.id === "manoj");
  if (manoj && state.flex.manoj) return manoj;
  const booked = FLEX.find((worker) => {
    const booking = state.flex[worker.id];
    const window = booking ? flexWindow(worker, booking.windowId) : undefined;
    return Boolean(window && window.start < LATE_ARRIVAL);
  });
  if (booked) return booked;
  return REGULARS.find((worker) => worker.id === "joseph") ?? REGULARS[0]!;
}

export function openLate(state: Day3State): Day3State {
  const worker = lateCandidate(state);
  const station = baseStation(state, worker);
  const window = windowOf(state, PLANNED, worker);
  const due = window ? window.start : worker.start;
  const draft: LateEvent = {
    workerId: worker.id,
    station,
    due,
    arrives: LATE_ARRIVAL,
    before: 1,
    atAlert: 1,
    after: null,
  };
  const withLate: Day3State = { ...state, late: draft };
  if (!station || due >= LATE_ARRIVAL) return withLate;
  const before = coverageOver(evaluate(withLate, PLANNED), due, LATE_ARRIVAL)[station];
  const atAlert = coverageOver(evaluate(withLate, LATE_WORLD), due, LATE_ARRIVAL)[station];
  return { ...state, late: { ...draft, before, atAlert } };
}

/** Coverage of the late worker's station over the minutes they miss, as the board stands. */
export function lateCoverage(state: Day3State): number {
  const late = state.late;
  if (!late?.station || late.due >= late.arrives) return 1;
  return coverageOver(evaluate(state, LATE_WORLD), late.due, late.arrives)[late.station];
}

export function lateCover(state: Day3State) {
  return state.transfers.find((transfer) => transfer.reason === "late-cover") ?? null;
}

/**
 * Someone covers the late worker's station until they arrive — a temporary
 * transfer, not a new role for the evening. Any regular in the building for
 * the whole gap can do it. So can the manager, at the cost of nobody running
 * the floor while they do.
 */
export function assignLateCover(state: Day3State, workerId: string | null): Day3State {
  if (state.phase !== "late" || !state.late?.station) return state;
  const rest = state.transfers.filter((transfer) => transfer.reason !== "late-cover");
  if (workerId === null) return lateCover(state) ? { ...state, transfers: rest } : state;
  const worker = workerById(workerId);
  const { station, due, arrives, workerId: lateId } = state.late;
  const start = Math.min(due, arrives);
  if (!worker || worker.id === lateId || lateCover(state)?.workerId === workerId) return state;
  if (worker.kind !== "manager") {
    const window = windowOf(state, LATE_WORLD, worker);
    if (!window || window.start > start || window.end < arrives) return state;
    if (baseStation(state, worker) === station) return state;
  }
  return {
    ...state,
    transfers: [...rest, { workerId, to: station, start, end: arrives, reason: "late-cover" }],
  };
}

function coveredByManager(state: Day3State): boolean {
  return state.transfers.some(
    (transfer) => transfer.reason === "late-cover" && transfer.workerId === YOU.id,
  );
}

export function confirmLateRepair(state: Day3State, now: number): Day3State {
  if (state.phase !== "late" || !state.late) return state;
  return enter(
    {
      ...mark(state, "late", now),
      late: { ...state.late, after: lateCoverage(state) },
      lateRepairMs: now - state.phaseStartedAt,
      managerCovered: coveredByManager(state),
    },
    "receiving",
    now,
  );
}

/* ── Phase 3 · high-value receiving ───────────────────────────────────── */

export function receivingTransfer(state: Day3State) {
  return state.transfers.find((transfer) => transfer.reason === "receiving") ?? null;
}

export function backfillTransfer(state: Day3State) {
  return state.transfers.find((transfer) => transfer.reason === "backfill") ?? null;
}

/** In the building for the whole of 6:05–6:25. The manager never counts. */
export function availableForReceiving(state: Day3State, worker: Worker): boolean {
  if (worker.kind === "manager") return false;
  const window = windowOf(state, RECEIVING_WORLD, worker);
  return Boolean(window && window.start <= RECEIVING.start && window.end >= RECEIVING.end);
}

export function vacatedStation(state: Day3State): Station | null {
  const transfer = receivingTransfer(state);
  const worker = transfer ? workerById(transfer.workerId) : undefined;
  return worker ? baseStation(state, worker) : null;
}

export function assignReceiving(state: Day3State, workerId: string): Day3State {
  if (state.phase !== "receiving") return state;
  const worker = workerById(workerId);
  if (!worker || !availableForReceiving(state, worker)) return state;
  if (receivingTransfer(state)?.workerId === workerId) return state;
  // A new receiver vacates a different station, so any earlier backfill goes.
  const transfers = state.transfers.filter(
    (transfer) => transfer.reason !== "receiving" && transfer.reason !== "backfill",
  );
  return {
    ...state,
    receivingSkipped: false,
    transfers: [
      ...transfers,
      { workerId, to: "receiving", start: RECEIVING.start, end: RECEIVING.end, reason: "receiving" },
    ],
  };
}

export function clearReceiving(state: Day3State): Day3State {
  if (state.phase !== "receiving") return state;
  return {
    ...state,
    transfers: state.transfers.filter(
      (transfer) => transfer.reason !== "receiving" && transfer.reason !== "backfill",
    ),
  };
}

export function skipReceiving(state: Day3State): Day3State {
  if (state.phase !== "receiving") return state;
  return { ...clearReceiving(state), receivingSkipped: true };
}

export function assignBackfill(state: Day3State, workerId: string): Day3State {
  if (state.phase !== "receiving") return state;
  const receiving = receivingTransfer(state);
  const vacated = vacatedStation(state);
  if (!receiving || !vacated || workerId === receiving.workerId) return state;
  const worker = workerById(workerId);
  if (!worker) return state;
  if (worker.kind !== "manager" && !availableForReceiving(state, worker)) return state;
  // Somebody already on the vacated station adds nothing by being "moved" there.
  if (worker.kind !== "manager" && baseStation(state, worker) === vacated) return state;
  if (backfillTransfer(state)?.workerId === workerId) return state;
  return {
    ...state,
    transfers: [
      ...state.transfers.filter((transfer) => transfer.reason !== "backfill"),
      { workerId, to: vacated, start: RECEIVING.start, end: RECEIVING.end, reason: "backfill" },
    ],
  };
}

export function clearBackfill(state: Day3State): Day3State {
  if (state.phase !== "receiving") return state;
  return { ...state, transfers: state.transfers.filter((transfer) => transfer.reason !== "backfill") };
}

/** The vacated station's coverage over 6:05–6:25: untouched, with the gap, and as it stands. */
export function receivingOutcome(state: Day3State, defaulted = false): ReceivingOutcome {
  const receiving = receivingTransfer(state);
  if (!receiving) {
    return {
      workerId: null,
      authorised: false,
      vacated: null,
      before: 1,
      unfilled: 1,
      after: 1,
      backfillId: null,
      skipped: true,
      defaulted,
    };
  }
  const worker = workerById(receiving.workerId);
  const vacated = vacatedStation(state);
  const backfill = backfillTransfer(state);
  let before = 1;
  let unfilled = 1;
  let after = 1;
  if (vacated) {
    const cover = (candidate: Day3State) =>
      coverageOver(evaluate(candidate, RECEIVING_WORLD), RECEIVING.start, RECEIVING.end)[vacated];
    before = cover({
      ...state,
      transfers: state.transfers.filter(
        (transfer) => transfer.reason !== "receiving" && transfer.reason !== "backfill",
      ),
    });
    unfilled = cover({
      ...state,
      transfers: state.transfers.filter((transfer) => transfer.reason !== "backfill"),
    });
    after = cover(state);
  }
  return {
    workerId: receiving.workerId,
    authorised: worker?.highValue ?? false,
    vacated,
    before,
    unfilled,
    after,
    backfillId: backfill?.workerId ?? null,
    skipped: false,
    defaulted,
  };
}

export function confirmReceiving(state: Day3State, now: number): Day3State {
  if (state.phase !== "receiving") return state;
  if (!receivingTransfer(state) && !state.receivingSkipped) return state;
  return enter(
    { ...mark(state, "receiving", now), receiving: receivingOutcome(state) },
    "faisal",
    now,
  );
}

/* ── Phase 4 · Faisal ─────────────────────────────────────────────────── */

export function openFaisal(state: Day3State): Day3State {
  return state.faisalOpened ? state : { ...state, faisalOpened: true };
}

/** What each action rules out. Coaching after peak combines with anything. */
const EXCLUDES: Record<FaisalAction, FaisalAction[]> = {
  remove: ["pair", "zone", "keep", "packing"],
  keep: ["pair", "zone", "remove", "packing"],
  packing: ["pair", "zone", "remove", "keep"],
  zone: ["remove", "keep", "packing"],
  pair: ["remove", "keep", "packing"],
  coach: [],
};

export function toggleFaisal(state: Day3State, action: FaisalAction): Day3State {
  if (state.phase !== "faisal") return state;
  if (state.faisal.includes(action)) {
    return { ...state, faisal: state.faisal.filter((current) => current !== action) };
  }
  return {
    ...state,
    faisal: [...state.faisal.filter((current) => !EXCLUDES[action].includes(current)), action],
  };
}

export function applyFaisal(state: Day3State, now: number): Day3State {
  if (state.phase !== "faisal" || state.faisal.length === 0) return state;
  return enter(mark(state, "faisal", now), "audit", now);
}

/* ── Phase 5 · the audit ──────────────────────────────────────────────── */

export function moveAudit(state: Day3State, start: number): Day3State {
  if (state.phase !== "audit" && state.phase !== "review") return state;
  const snapped = Math.round(start / AUDIT.step) * AUDIT.step;
  const clamped = Math.min(AUDIT.latest, Math.max(AUDIT.earliest, snapped));
  return clamped === state.auditStart ? state : { ...state, auditStart: clamped };
}

export function confirmAudit(state: Day3State, now: number): Day3State {
  return state.phase === "audit" ? enter(mark(state, "audit", now), "review", now) : state;
}

/* ── Lock-in ──────────────────────────────────────────────────────────── */

/**
 * Locks the plan and fills in anything the evening never reached.
 *
 * The operator locks from the review. The clock can lock from anywhere, and
 * then whatever was still ahead happens the way it would have without them:
 * the temp is late, the floor lead sends Arjun to the vehicle, the audit stays
 * where it was scheduled. No dead end — the peak still runs.
 */
export function lockPlan(state: Day3State, now: number, by: "operator" | "clock"): Day3State {
  if (!canEditTeam(state) && state.phase !== "forecast") return state;
  if (by === "operator" && state.phase !== "review") return state;

  let next: Day3State = { ...state, revised: true };

  if (next.planningDeficit === null) {
    const planned = evaluate(next, PLANNED);
    next = { ...next, planningDeficit: deficitOf(planned), planningCoverage: peakCoverage(planned) };
  }
  if (!next.late) next = openLate(next);
  if (next.late && next.late.after === null) {
    next = { ...next, late: { ...next.late, after: lateCoverage(next) } };
  }
  if (!next.receiving) {
    let defaulted = false;
    if (!receivingTransfer(next) && !next.receivingSkipped) {
      const fallback =
        REGULARS.find((worker) => worker.highValue && availableForReceiving(next, worker)) ??
        REGULARS[0]!;
      next = {
        ...next,
        transfers: [
          ...next.transfers.filter(
            (transfer) => transfer.reason !== "receiving" && transfer.reason !== "backfill",
          ),
          {
            workerId: fallback.id,
            to: "receiving",
            start: RECEIVING.start,
            end: RECEIVING.end,
            reason: "receiving",
          },
        ],
      };
      defaulted = true;
    }
    next = { ...next, receiving: receivingOutcome(next, defaulted) };
  }

  next = {
    ...next,
    lockDeficit: deficitOf(evaluate(next, PLANNED)),
    lockedBy: by,
    managerCovered: next.managerCovered || coveredByManager(next),
  };
  return enter(mark(next, "lock", now), "peak", now);
}

export function finishPeak(state: Day3State, now: number): Day3State {
  return state.phase === "peak" ? { ...state, phase: "done", completedAt: now } : state;
}

/* ── Money ────────────────────────────────────────────────────────────── */

export function flexCost(state: Day3State): number {
  return FLEX.reduce((sum, worker) => {
    const booking = state.flex[worker.id];
    const window = booking ? flexWindow(worker, booking.windowId) : undefined;
    return window ? sum + windowCost(worker, window) : sum;
  }, 0);
}

export function flexHours(state: Day3State): number {
  return FLEX.reduce((sum, worker) => {
    const booking = state.flex[worker.id];
    const window = booking ? flexWindow(worker, booking.windowId) : undefined;
    return window ? sum + (window.end - window.start) / 60 : sum;
  }, 0);
}

export function riderCost(state: Day3State): number {
  return RIDER_SOURCES.reduce((sum, source) => sum + state.riders[source.id] * source.costPerRider, 0);
}

export function ridersSourced(state: Day3State): number {
  return state.riders.nearby + state.riders.morning + state.riders.local;
}

/** What telemetry records on either side of a decision. */
export function d3Snapshot(state: Day3State) {
  const coverage = peakCoverage(evaluate(state, worldOf(state)));
  return {
    phase: state.phase,
    coverage: {
      picking: Math.round(coverage.picking * 100),
      packing: Math.round(coverage.packing * 100),
      dispatch: Math.round(coverage.dispatch * 100),
      riders: Math.round(coverage.riders * 100),
    },
    flexCost: flexCost(state),
    riderCost: riderCost(state),
  };
}
