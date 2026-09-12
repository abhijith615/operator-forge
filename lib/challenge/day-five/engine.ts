import { BAKING, CASE_CLOCK, CONTROL_FIT, FUND_STEP, FUND_TOTAL, PACKING } from "./scenario";
import {
  CASE_IDS,
  PHASES,
  type BagId,
  type BakingState,
  type BasketItemId,
  type BatchAction,
  type BatchState,
  type CaseId,
  type ContactOption,
  type ControlId,
  type CustomerId,
  type Day5State,
  type FinaleState,
  type IncidentId,
  type LoopState,
  type MilkBatchId,
  type MilkState,
  type PackExtra,
  type PackItemId,
  type PackingState,
  type Phase,
  type ResourceId,
  type ShelfSlot,
  type SubstituteId,
} from "./types";

/**
 * Day 5's state transitions.
 *
 * Every function is `(state) => state`, pure, and returns the same object when
 * nothing changed — so the component can tell a decision from a no-op and fire
 * telemetry exactly once. Nothing here decides whether a customer was
 * protected; that lives in `outcome.ts`, which reads the situation these
 * transitions produce.
 */

/* ── Phases ───────────────────────────────────────────────────────────── */

export function phaseIndex(phase: Phase): number {
  return PHASES.indexOf(phase);
}

export function reached(state: Day5State, phase: Phase): boolean {
  return phaseIndex(state.phase) >= phaseIndex(phase);
}

const NEXT: Record<Phase, Phase> = {
  opening: "milk",
  milk: "baking",
  baking: "packing",
  packing: "batch",
  batch: "finale",
  finale: "loop",
  loop: "done",
  done: "done",
};

/**
 * The store clock creeps while the operator works but never past the next
 * case, so the evening reads continuously without anything waiting on a timer.
 */
const SECONDS_PER_MINUTE = 9;

export function simMinute(state: Day5State, now: number): number {
  if (state.phase === "opening") return 0;
  if (state.phase === "done") return CASE_CLOCK.loop + 4;
  const base = state.phase === "loop" ? CASE_CLOCK.loop : CASE_CLOCK[state.phase];
  const next = state.phase === "loop" ? CASE_CLOCK.loop + 4 : CASE_CLOCK[NEXT[state.phase] as CaseId | "finale" | "loop"];
  const crept = Math.floor((now - state.phaseStartedAt) / 1000 / SECONDS_PER_MINUTE);
  return Math.min(Math.max(base, next - 1), base + Math.max(0, crept));
}

function enter(state: Day5State, phase: Phase, now: number): Day5State {
  return { ...state, phase, phaseStartedAt: now };
}

function mark(state: Day5State, key: CaseId | "finale" | "loop", now: number): Day5State {
  if (state.milestones[key]) return state;
  return {
    ...state,
    milestones: {
      ...state.milestones,
      [key]: { sim: simMinute(state, now), at: now - state.startedAt },
    },
  };
}

function note(state: Day5State, id: string): Day5State {
  return state.inspected.includes(id) ? state : { ...state, inspected: [...state.inspected, id] };
}

/* ── Opening ──────────────────────────────────────────────────────────── */

export function createDay5(): Day5State {
  return {
    phase: "opening",
    startedAt: 0,
    phaseStartedAt: 0,
    milk: {
      placed: { fresh36: "pickface", fresh72: "back" },
      inspected: [],
      useSignalSeen: false,
      policySeen: false,
      confirmed: false,
    },
    baking: {
      inspected: [],
      dependencySeen: false,
      stockChecked: false,
      substitutesChecked: false,
      held: false,
      offered: [],
      contacted: false,
      customerChose: null,
      resolution: null,
      confirmed: false,
    },
    packing: {
      bags: { cleaner: "bag1", coriander: "bag1", apples: "bag1", snacks: "bag1" },
      extras: [],
      inspected: [],
      confirmed: false,
      dispatchedUnsafe: false,
    },
    batch: { actions: [], evidenceSeen: false, inventorySeen: false, confirmed: false },
    finale: {
      assigned: {},
      spend: { iceCream: 0, breakfast: 0, elderly: 0 },
      inspected: [],
      confirmed: false,
    },
    loop: { links: {}, confirmed: false },
    inspected: [],
    milestones: {},
    lockedBy: null,
    completedAt: null,
  };
}

export function startRun(state: Day5State, now: number): Day5State {
  if (state.phase !== "opening") return state;
  return { ...state, phase: "milk", startedAt: now, phaseStartedAt: now };
}

/** Opening a panel anywhere. Information seeking is read, not required. */
export function inspect(state: Day5State, id: string): Day5State {
  return note(state, id);
}

/* ── Case 1 · milk ────────────────────────────────────────────────────── */

function withMilk(state: Day5State, patch: Partial<MilkState>): Day5State {
  return { ...state, milk: { ...state.milk, ...patch } };
}

export function moveBatch(state: Day5State, batch: MilkBatchId, slot: ShelfSlot): Day5State {
  if (state.phase !== "milk" || state.milk.confirmed) return state;
  if (state.milk.placed[batch] === slot) return state;
  return withMilk(state, { placed: { ...state.milk.placed, [batch]: slot } });
}

export function readMilkPanel(state: Day5State, id: "use" | "policy" | string): Day5State {
  if (state.phase !== "milk") return state;
  const milk = state.milk;
  const inspected = milk.inspected.includes(id) ? milk.inspected : [...milk.inspected, id];
  return note(
    withMilk(state, {
      inspected,
      useSignalSeen: milk.useSignalSeen || id === "use",
      policySeen: milk.policySeen || id === "policy",
    }),
    `milk:${id}`,
  );
}

export function confirmMilk(state: Day5State, now: number): Day5State {
  if (state.phase !== "milk" || state.milk.confirmed) return state;
  return enter(mark(withMilk(state, { confirmed: true }), "milk", now), "baking", now);
}

/* ── Case 2 · baking ──────────────────────────────────────────────────── */

function withBaking(state: Day5State, patch: Partial<BakingState>): Day5State {
  return { ...state, baking: { ...state.baking, ...patch } };
}

/** Tapping ingredients is how the basket stops being five rows and becomes a task. */
export function inspectItem(state: Day5State, item: BasketItemId): Day5State {
  if (state.phase !== "baking" || state.baking.confirmed) return state;
  const baking = state.baking;
  if (baking.inspected.includes(item)) return state;
  const inspected = [...baking.inspected, item];
  return note(
    withBaking(state, {
      inspected,
      dependencySeen: baking.dependencySeen || inspected.length >= BAKING.dependencyAt,
    }),
    `baking:${item}`,
  );
}

export function checkStock(state: Day5State): Day5State {
  if (state.phase !== "baking" || state.baking.stockChecked) return state;
  return note(withBaking(state, { stockChecked: true }), "baking:stock");
}

export function checkSubstitutes(state: Day5State): Day5State {
  if (state.phase !== "baking" || state.baking.substitutesChecked) return state;
  return note(withBaking(state, { substitutesChecked: true }), "baking:substitutes");
}

/** Holding the tote before packing is what keeps the order recoverable. */
export function holdOrder(state: Day5State): Day5State {
  if (state.phase !== "baking" || state.baking.confirmed || state.baking.held) return state;
  return withBaking(state, { held: true });
}

export function toggleOffer(state: Day5State, option: ContactOption): Day5State {
  if (state.phase !== "baking" || state.baking.contacted || state.baking.confirmed) return state;
  const offered = state.baking.offered.includes(option)
    ? state.baking.offered.filter((entry) => entry !== option)
    : [...state.baking.offered, option];
  return withBaking(state, { offered });
}

/**
 * What the customer says back. Deterministic: they take the closest thing to
 * the task they were trying to finish, and only cancel if that is all they
 * were given.
 */
export function customerReply(offered: ContactOption[]): ContactOption | null {
  if (offered.length === 0) return null;
  if (offered.includes("paste")) return "paste";
  if (offered.includes("essence")) return "essence";
  if (offered.includes("continue")) return "continue";
  return "cancel";
}

export function contactCustomer(state: Day5State, now: number): Day5State {
  if (state.phase !== "baking" || state.baking.contacted || state.baking.offered.length === 0) return state;
  const chose = customerReply(state.baking.offered);
  const resolution: BakingState["resolution"] =
    chose === "paste" || chose === "essence" ? "substituted" : chose === "cancel" ? "cancelled" : "continued";
  void now;
  return withBaking(state, { contacted: true, customerChose: chose, resolution });
}

/** Sending the four items and refunding the fifth, without asking. */
export function dispatchBaking(state: Day5State): Day5State {
  if (state.phase !== "baking" || state.baking.confirmed || state.baking.contacted) return state;
  return withBaking(state, { resolution: "refunded" });
}

export function cancelBaking(state: Day5State): Day5State {
  if (state.phase !== "baking" || state.baking.confirmed || state.baking.contacted) return state;
  return withBaking(state, { resolution: "cancelled" });
}

export function confirmBaking(state: Day5State, now: number): Day5State {
  if (state.phase !== "baking" || state.baking.confirmed) return state;
  if (!state.baking.resolution) return state;
  return enter(mark(withBaking(state, { confirmed: true }), "baking", now), "packing", now);
}

/* ── Case 3 · packing ─────────────────────────────────────────────────── */

function withPacking(state: Day5State, patch: Partial<PackingState>): Day5State {
  return { ...state, packing: { ...state.packing, ...patch } };
}

export function moveItem(state: Day5State, item: PackItemId, bag: BagId): Day5State {
  if (state.phase !== "packing" || state.packing.confirmed) return state;
  if (state.packing.bags[item] === bag) return state;
  return withPacking(state, { bags: { ...state.packing.bags, [item]: bag } });
}

export function toggleExtra(state: Day5State, extra: PackExtra): Day5State {
  if (state.phase !== "packing" || state.packing.confirmed) return state;
  const extras = state.packing.extras.includes(extra)
    ? state.packing.extras.filter((entry) => entry !== extra)
    : [...state.packing.extras, extra];
  return withPacking(state, { extras });
}

export function readPackingPanel(state: Day5State, id: string): Day5State {
  if (state.phase !== "packing") return state;
  const inspected = state.packing.inspected.includes(id)
    ? state.packing.inspected
    : [...state.packing.inspected, id];
  return note(withPacking(state, { inspected }), `packing:${id}`);
}

/** Seconds the current configuration adds to click-to-dispatch. */
export function packingSeconds(state: PackingState): number {
  const extras = state.extras.reduce((sum, extra) => sum + PACKING.extras[extra].seconds, 0);
  const moved = PACKING.items.some((item) => state.bags[item.id] === "bag2");
  return extras + (moved ? Math.max(0, PACKING.repackSeconds - extras) : 0);
}

export function confirmPacking(state: Day5State, now: number, unsafe: boolean): Day5State {
  if (state.phase !== "packing" || state.packing.confirmed) return state;
  return enter(
    mark(withPacking(state, { confirmed: true, dispatchedUnsafe: unsafe }), "packing", now),
    "batch",
    now,
  );
}

/* ── Case 4 · infant food ─────────────────────────────────────────────── */

function withBatch(state: Day5State, patch: Partial<BatchState>): Day5State {
  return { ...state, batch: { ...state.batch, ...patch } };
}

export function readBatchPanel(state: Day5State, id: "evidence" | "inventory"): Day5State {
  if (state.phase !== "batch") return state;
  return note(
    withBatch(state, {
      evidenceSeen: state.batch.evidenceSeen || id === "evidence",
      inventorySeen: state.batch.inventorySeen || id === "inventory",
    }),
    `batch:${id}`,
  );
}

/** Actions chain, and the order is kept: containing first is the judgement. */
export function takeBatchAction(state: Day5State, action: BatchAction): Day5State {
  if (state.phase !== "batch" || state.batch.confirmed) return state;
  if (state.batch.actions.includes(action)) return state;
  // Continuing to sell and waiting are terminal stances, not steps in a chain.
  const exclusive: BatchAction[] = ["continue", "wait"];
  const actions = exclusive.includes(action)
    ? [...state.batch.actions.filter((entry) => !exclusive.includes(entry)), action]
    : [...state.batch.actions.filter((entry) => !exclusive.includes(entry)), action];
  return withBatch(state, { actions });
}

export function confirmBatch(state: Day5State, now: number): Day5State {
  if (state.phase !== "batch" || state.batch.confirmed || state.batch.actions.length === 0) return state;
  return enter(mark(withBatch(state, { confirmed: true }), "batch", now), "finale", now);
}

/* ── The finale ───────────────────────────────────────────────────────── */

function withFinale(state: Day5State, patch: Partial<FinaleState>): Day5State {
  return { ...state, finale: { ...state.finale, ...patch } };
}

export function openCustomer(state: Day5State, customer: CustomerId): Day5State {
  if (state.phase !== "finale") return state;
  const inspected = state.finale.inspected.includes(customer)
    ? state.finale.inspected
    : [...state.finale.inspected, customer];
  return note(withFinale(state, { inspected }), `finale:${customer}`);
}

/** A resource sits with one customer at a time; assigning it moves it. */
export function assignResource(state: Day5State, resource: ResourceId, customer: CustomerId | null): Day5State {
  if (state.phase !== "finale" || state.finale.confirmed) return state;
  if (resource === "fund") return state;
  const current = state.finale.assigned[resource] ?? null;
  if (current === customer) return state;
  const assigned = { ...state.finale.assigned };
  if (customer === null) delete assigned[resource];
  else assigned[resource] = customer;
  return withFinale(state, { assigned });
}

export function spendFund(state: Day5State, customer: CustomerId, delta: number): Day5State {
  if (state.phase !== "finale" || state.finale.confirmed) return state;
  const spend = state.finale.spend;
  const used = spend.iceCream + spend.breakfast + spend.elderly;
  const next = Math.max(0, spend[customer] + delta * FUND_STEP);
  const remaining = FUND_TOTAL - (used - spend[customer]);
  const capped = Math.min(next, Math.max(0, remaining));
  if (capped === spend[customer]) return state;
  return withFinale(state, { spend: { ...spend, [customer]: capped } });
}

export function fundLeft(state: FinaleState): number {
  return FUND_TOTAL - (state.spend.iceCream + state.spend.breakfast + state.spend.elderly);
}

export function confirmFinale(state: Day5State, now: number): Day5State {
  if (state.phase !== "finale" || state.finale.confirmed) return state;
  return enter(mark(withFinale(state, { confirmed: true }), "finale", now), "loop", now);
}

/* ── Close the loop ───────────────────────────────────────────────────── */

export function linkControl(state: Day5State, incident: IncidentId, control: ControlId | null): Day5State {
  if (state.phase !== "loop" || state.loop.confirmed) return state;
  const links = { ...state.loop.links };
  if (control === null) delete links[incident];
  else links[incident] = control;
  return { ...state, loop: { ...state.loop, links } };
}

export function loopComplete(state: LoopState): boolean {
  return CASE_IDS.every((id) => state.links[id] !== undefined);
}

/** For the prevention payoff: which links actually answer their failure. */
export function linkFits(incident: IncidentId, control: ControlId | undefined): boolean {
  return control !== undefined && CONTROL_FIT[incident].includes(control);
}

export function confirmLoop(state: Day5State, now: number): Day5State {
  if (state.phase !== "loop" || state.loop.confirmed) return state;
  return enter(
    { ...mark({ ...state, loop: { ...state.loop, confirmed: true } }, "loop", now), lockedBy: state.lockedBy ?? "operator" },
    "done",
    now,
  );
}

/* ── Running out of time ──────────────────────────────────────────────── */

/**
 * The clock can end the run from anywhere. Whatever was still ahead happens
 * the way it would have without the operator: the automated workflow refunds
 * the missing line, the tote goes as packed, the batch keeps selling and the
 * rider marks the customer unavailable. No dead end — the scorecard still runs.
 */
export function lockRun(state: Day5State, now: number, by: "operator" | "clock"): Day5State {
  if (state.phase === "done") return state;
  let next: Day5State = { ...state, lockedBy: by };
  if (!next.baking.resolution) {
    next = { ...next, baking: { ...next.baking, resolution: "refunded" } };
  }
  return enter({ ...next, completedAt: now }, "done", now);
}

export function finishRun(state: Day5State, now: number): Day5State {
  if (state.phase !== "done" || state.completedAt !== null) return state;
  return { ...state, completedAt: now };
}

/* ── Telemetry snapshot ───────────────────────────────────────────────── */

export function d5Snapshot(state: Day5State) {
  return {
    phase: state.phase,
    milk: state.milk.placed,
    baking: {
      resolution: state.baking.resolution,
      contacted: state.baking.contacted,
      chose: state.baking.customerChose,
    },
    packing: { bags: state.packing.bags, extras: state.packing.extras },
    batch: state.batch.actions,
    finale: { assigned: state.finale.assigned, spend: state.finale.spend },
    loop: state.loop.links,
  };
}

export type { SubstituteId };
