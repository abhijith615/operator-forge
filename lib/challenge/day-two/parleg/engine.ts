import { PARLEG_DIMENSIONS } from "../types";
import {
  CORRECTIVE_CARDS,
  FLOW_SLOTS,
  LANE_LIMIT,
  MIRROR_PAIR,
  NET_VALUE_IMPACT,
  RECORD_UNITS_AFFECTED,
  SKUS,
} from "./content";
import type {
  FlowNodeId,
  FlowSlotId,
  ParleGState,
  PgEvidence,
  PgLane,
  PgSignalDelta,
  PgSignals,
  PgSku,
  PgTag,
} from "./types";

/**
 * Every state transition for Case 02, as pure functions.
 *
 * Same contract as Case 01: nothing here touches React, and the components do
 * no arithmetic. Each function is a no-op when called out of sequence, so a
 * double click or a stale handler can never push the case into a state the
 * learner did not earn.
 */

export function emptyPgSignals(): PgSignals {
  return Object.fromEntries(PARLEG_DIMENSIONS.map((dimension) => [dimension, 0])) as PgSignals;
}

export function createParleG(): ParleGState {
  return {
    stage: "unopened",
    locationScanned: { sku30: false, sku40: false },
    countedRows: { sku30: [], sku40: [] },
    confirmed: { sku30: false, sku40: false },
    countsConfirmedAt: null,
    linkAttempts: 0,
    linked: false,
    evidenceOpened: [],
    scanFilterApplied: false,
    replayGuesses: [],
    mismatchFound: false,
    placements: { control: null, event: null, sku30Effect: null, sku40Effect: null },
    rejectedSlots: [],
    flowAttempts: 0,
    flowSolved: false,
    actions: { fixNow: [], preventRepeat: [], notNeeded: [] },
    reconciled: false,
    signals: emptyPgSignals(),
    tags: [],
    startedAt: null,
    completedAt: null,
  };
}

function applySignals(state: ParleGState, delta: PgSignalDelta): ParleGState {
  const signals = { ...state.signals };
  for (const [key, value] of Object.entries(delta)) {
    const dimension = key as keyof PgSignals;
    signals[dimension] = signals[dimension] + (value ?? 0);
  }
  return { ...state, signals };
}

function tag(state: ParleGState, ...added: PgTag[]): ParleGState {
  const next = added.filter((t) => !state.tags.includes(t));
  return next.length === 0 ? state : { ...state, tags: [...state.tags, ...next] };
}

/* ── Opening ──────────────────────────────────────────────────────────── */

/**
 * Which case the operator opened first is a prioritisation signal, and a
 * small one. The earbuds are ₹11,997 against ₹85 here — but this line also
 * carries 34 wrong records, so going here first is a weaker call, not a wrong
 * one.
 */
export function openParleG(state: ParleGState, earbudsSigned: boolean, now: number): ParleGState {
  if (state.stage !== "unopened") return state;
  const opened: ParleGState = { ...state, stage: "opening", startedAt: now };
  return earbudsSigned
    ? tag(applySignals(opened, { prioritisation: 1 }), "worked_highest_exposure_first")
    : tag(applySignals(opened, { prioritisation: -1 }), "worked_lower_exposure_first");
}

export function beginCount(state: ParleGState): ParleGState {
  return state.stage === "opening" ? { ...state, stage: "count" } : state;
}

/* ── Stage 1 · Spot the pattern ───────────────────────────────────────── */

export function scanLocation(state: ParleGState, sku: PgSku): ParleGState {
  if (state.stage !== "count" || state.locationScanned[sku]) return state;
  return { ...state, locationScanned: { ...state.locationScanned, [sku]: true } };
}

export function countRow(state: ParleGState, sku: PgSku, row: number): ParleGState {
  if (!state.locationScanned[sku] || state.confirmed[sku]) return state;
  if (row < 0 || row >= SKUS[sku].rows.length || state.countedRows[sku].includes(row)) return state;
  return { ...state, countedRows: { ...state.countedRows, [sku]: [...state.countedRows[sku], row] } };
}

export const shelfCounted = (state: ParleGState, sku: PgSku): boolean =>
  state.countedRows[sku].length === SKUS[sku].rows.length;

export const countedUnits = (state: ParleGState, sku: PgSku): number =>
  state.countedRows[sku].reduce((total, row) => total + (SKUS[sku].rows[row] ?? 0), 0);

export function confirmShelf(state: ParleGState, sku: PgSku, now: number): ParleGState {
  if (state.confirmed[sku] || !shelfCounted(state, sku)) return state;
  let next = applySignals(
    { ...state, confirmed: { ...state.confirmed, [sku]: true } },
    { inventoryReasoning: 1 },
  );
  // Both shelves verified before anything is concluded: the evidence
  // discipline this stage exists to read.
  if (next.confirmed.sku30 && next.confirmed.sku40) {
    next = tag(
      applySignals({ ...next, stage: "pattern", countsConfirmedAt: now }, { evidenceDiscipline: 2 }),
      "both_skus_verified",
    );
  }
  return next;
}

/** Linking two chips inside twenty seconds of the second count reads as "spotted". */
export const PATTERN_FAST_MS = 20_000;

export function linkVariances(state: ParleGState, a: string, b: string, now: number): ParleGState {
  if (state.stage !== "pattern" || state.linked) return state;
  const pair = new Set([a, b]);
  const mirrored = pair.size === 2 && MIRROR_PAIR.every((id) => pair.has(id));

  if (!mirrored) {
    const next = { ...state, linkAttempts: state.linkAttempts + 1 };
    // Penalised a little and then not at all — the aim is to notice a habit
    // of pairing unrelated numbers, not to punish exploration.
    return state.linkAttempts < 3 ? applySignals(next, { patternRecognition: -1 }) : next;
  }

  const fast =
    state.linkAttempts === 0 &&
    state.countsConfirmedAt !== null &&
    now - state.countsConfirmedAt <= PATTERN_FAST_MS;
  return tag(
    applySignals({ ...state, linked: true }, { patternRecognition: fast ? 3 : 2 }),
    "mirrored_variance_recognised",
  );
}

/**
 * The number-fixer's path: straight from the counts to correcting the stock.
 * It is always offered, because it is always tempting — and taking it is
 * exactly the behaviour this case is built to see.
 */
export function correctWithoutCause(state: ParleGState): ParleGState {
  if (state.stage !== "pattern" && state.stage !== "trace") return state;
  return tag(
    applySignals(
      { ...state, stage: "actions" },
      // Inventory reasoning too: correcting both records is right, but doing
      // it without reading how one pick moved two ledgers is not reasoning.
      { rootCause: -3, processDiscipline: -2, evidenceDiscipline: -1, inventoryReasoning: -3 },
    ),
    "corrected_without_cause",
  );
}

/* ── Stage 2 · Trace the pick ─────────────────────────────────────────── */

export function startTrace(state: ParleGState): ParleGState {
  return state.stage === "pattern" ? { ...state, stage: "trace" } : state;
}

export function openEvidence(state: ParleGState, kind: PgEvidence): ParleGState {
  if (state.stage !== "trace" || state.evidenceOpened.includes(kind)) return state;
  let next: ParleGState = { ...state, evidenceOpened: [...state.evidenceOpened, kind] };

  if (kind === "orders") {
    next = tag(applySignals(next, { rootCause: 1, evidenceDiscipline: 1 }), "order_history_checked");
  }
  if (kind === "replay") {
    next = tag(next, "pick_replay_checked");
    // Context before conclusion: the records first, the reconstruction second.
    if (state.evidenceOpened.length > 0) next = applySignals(next, { evidenceDiscipline: 1 });
  }
  return next;
}

/** Filtering the pick log to the picks with no product scan. */
export function applyScanFilter(state: ParleGState): ParleGState {
  if (state.scanFilterApplied || !state.evidenceOpened.includes("scans")) return state;
  return tag(
    applySignals({ ...state, scanFilterApplied: true }, { processDiscipline: 3, rootCause: 1 }),
    "scan_gap_identified",
  );
}

export function guessPick(state: ParleGState, sku: PgSku): ParleGState {
  if (state.mismatchFound || !state.evidenceOpened.includes("replay")) return state;
  const next: ParleGState = { ...state, replayGuesses: [...state.replayGuesses, sku] };

  if (sku === "sku40") {
    const first = state.replayGuesses.length === 0;
    return tag(
      applySignals({ ...next, mismatchFound: true }, { rootCause: 2, inventoryReasoning: first ? 1 : 0 }),
      "wrong_size_pick_identified",
    );
  }
  return state.replayGuesses.length < 2 ? applySignals(next, { inventoryReasoning: -1 }) : next;
}

export function startFlow(state: ParleGState): ParleGState {
  return state.stage === "trace" && state.mismatchFound ? { ...state, stage: "flow" } : state;
}

/* ── Stage 3 · Solve the drift ────────────────────────────────────────── */

const SLOT_IDS = FLOW_SLOTS.map((slot) => slot.id);

export function placeNode(state: ParleGState, node: FlowNodeId, slot: FlowSlotId): ParleGState {
  if (state.stage !== "flow" || state.flowSolved) return state;
  const placements = { ...state.placements };
  for (const id of SLOT_IDS) if (placements[id] === node) placements[id] = null;
  placements[slot] = node;

  const next: ParleGState = { ...state, placements, rejectedSlots: [] };
  return SLOT_IDS.every((id) => placements[id] !== null) ? evaluateFlow(next) : next;
}

export function clearSlot(state: ParleGState, slot: FlowSlotId): ParleGState {
  if (state.stage !== "flow" || state.flowSolved || state.placements[slot] === null) return state;
  return { ...state, placements: { ...state.placements, [slot]: null }, rejectedSlots: [] };
}

/**
 * Judged only when the board is full. Wrong pieces go back to the tray and
 * nothing says "incorrect" — the board simply does not hold. The first try is
 * what reads as understanding; getting there on a retry still solves the case
 * but earns less, which is the partial-understanding persona made measurable.
 */
function evaluateFlow(state: ParleGState): ParleGState {
  const wrong = FLOW_SLOTS.filter((slot) => state.placements[slot.id] !== slot.accepts).map(
    (slot) => slot.id,
  );

  if (wrong.length === 0) {
    const first = state.flowAttempts === 0;
    const solved = applySignals(
      { ...state, flowSolved: true },
      first
        ? { rootCause: 3, inventoryReasoning: 3, patternRecognition: 1 }
        : { rootCause: 1, inventoryReasoning: 1 },
    );
    return tag(solved, first ? "inventory_flow_understood" : "flow_needed_retries");
  }

  const placements = { ...state.placements };
  for (const id of wrong) placements[id] = null;
  const next: ParleGState = {
    ...state,
    placements,
    rejectedSlots: wrong,
    flowAttempts: state.flowAttempts + 1,
  };
  return state.flowAttempts < 2 ? applySignals(next, { inventoryReasoning: -2, rootCause: -1 }) : next;
}

export function startActions(state: ParleGState): ParleGState {
  return state.stage === "flow" && state.flowSolved ? { ...state, stage: "actions" } : state;
}

/* ── Stage 4 · Correct & prevent ──────────────────────────────────────── */

export function laneOf(state: ParleGState, cardId: string): PgLane | null {
  if (state.actions.fixNow.includes(cardId)) return "fixNow";
  if (state.actions.preventRepeat.includes(cardId)) return "preventRepeat";
  if (state.actions.notNeeded.includes(cardId)) return "notNeeded";
  return null;
}

export function laneFull(state: ParleGState, lane: PgLane): boolean {
  const limit = LANE_LIMIT[lane];
  return limit !== null && state.actions[lane].length >= limit;
}

export function unplacedCards(state: ParleGState) {
  return CORRECTIVE_CARDS.filter((card) => laneOf(state, card.id) === null);
}

export function placeCard(state: ParleGState, cardId: string, lane: PgLane | null): ParleGState {
  if (state.stage !== "actions") return state;
  const cleared: Record<PgLane, string[]> = {
    fixNow: state.actions.fixNow.filter((id) => id !== cardId),
    preventRepeat: state.actions.preventRepeat.filter((id) => id !== cardId),
    notNeeded: state.actions.notNeeded.filter((id) => id !== cardId),
  };
  if (lane === null) return { ...state, actions: cleared };
  const limit = LANE_LIMIT[lane];
  if (limit !== null && cleared[lane].length >= limit) return state;
  return { ...state, actions: { ...cleared, [lane]: [...cleared[lane], cardId] } };
}

function scorePlacedCards(state: ParleGState): ParleGState {
  let next = state;
  for (const lane of ["fixNow", "preventRepeat", "notNeeded"] as PgLane[]) {
    for (const cardId of state.actions[lane]) {
      const card = CORRECTIVE_CARDS.find((c) => c.id === cardId);
      if (!card) continue;
      const delta = card.score[lane];
      if (delta) next = applySignals(next, delta);
      const earned = card.tags?.[lane];
      if (earned) next = tag(next, ...earned);
    }
  }
  return next;
}

/**
 * Scored once, on commit. Two things are read from the board's shape rather
 * than from any single card: putting both record corrections first, and
 * aiming coaching at a picker the order history actually pointed at.
 */
export function commitActions(state: ParleGState): ParleGState {
  if (state.stage !== "actions") return state;
  let next = scorePlacedCards(state);
  const fix = state.actions.fixNow;

  if (fix.includes("correct-30") && fix.includes("correct-40")) {
    next = tag(applySignals(next, { prioritisation: 2, inventoryReasoning: 1 }), "record_impact_understood");
  }
  const coached = fix.includes("coach") || state.actions.preventRepeat.includes("coach");
  if (coached && state.tags.includes("order_history_checked")) {
    next = applySignals(next, { correctiveAction: 1 });
  }
  return { ...next, stage: "reconcile" };
}

export function reconcile(state: ParleGState, now: number): ParleGState {
  if (state.stage !== "reconcile" || state.reconciled) return state;
  return tag({ ...state, reconciled: true, completedAt: now }, "both_skus_reconciled");
}

/**
 * The case ends without being reconciled — the clock ran out, or the operator
 * finished the day with it still open. Cards already placed were real
 * decisions and are scored; nothing else is credited.
 */
export function closeParleG(
  state: ParleGState,
  reason: "timeout" | "abandoned",
  now: number,
): ParleGState {
  if (state.stage === "unopened" || state.stage === "done" || state.reconciled) return state;
  let next = state.stage === "actions" ? scorePlacedCards(state) : state;
  next = tag(
    applySignals(next, { prioritisation: -1 }),
    reason === "timeout" ? "case_timed_out" : "case_left_open",
  );
  return { ...next, stage: "done", completedAt: now };
}

/* ── Derived ──────────────────────────────────────────────────────────── */

export const pgReached = (state: ParleGState): boolean => state.stage !== "unopened";

export const pgClosed = (state: ParleGState): boolean =>
  state.reconciled || state.stage === "done";

/**
 * The ₹85 counts as explained only once the drift is both reconciled *and*
 * understood. A learner who corrected the records without finding the cause
 * has fixed the counts; they have not explained the loss, and the master
 * ledger keeps saying so.
 */
export const pgExplainedValue = (state: ParleGState): number =>
  state.reconciled && state.flowSolved ? NET_VALUE_IMPACT : 0;

/** Record units corrected — reported beside the money, never added to it. */
export const pgRecordUnitsCorrected = (state: ParleGState): number =>
  state.reconciled ? RECORD_UNITS_AFFECTED : 0;

export function pgPreventiveControls(state: ParleGState): string[] {
  return state.actions.preventRepeat
    .map((id) => CORRECTIVE_CARDS.find((card) => card.id === id)?.label)
    .filter((label): label is string => Boolean(label));
}

/** What telemetry records as "state before / after" — small, and enough to replay. */
export function pgSnapshot(state: ParleGState) {
  return {
    stage: state.stage,
    confirmed: state.confirmed,
    linked: state.linked,
    evidenceOpened: state.evidenceOpened,
    scanFilterApplied: state.scanFilterApplied,
    mismatchFound: state.mismatchFound,
    flowAttempts: state.flowAttempts,
    flowSolved: state.flowSolved,
    actions: state.actions,
    reconciled: state.reconciled,
  };
}
