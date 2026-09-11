import {
  ACTION_CARDS,
  CAGE_UNITS,
  CCTV_MARKERS,
  EARBUDS,
  EVIDENCE,
  FINDINGS,
  ORDERS,
} from "./earbuds";
import { masterFrom } from "./ledger";
import { pgExplainedValue } from "./parleg/engine";
import type { ParleGState } from "./parleg/types";
import {
  emptyDay2Signals,
  type ActionLane,
  type CaseLedger,
  type CaseState,
  type Day2Metrics,
  type Day2SignalDelta,
  type Day2Tag,
  type Day2Tool,
  type Disposition,
  type FindingId,
} from "./types";

/**
 * Every state transition for Day 2, as pure functions.
 *
 * Nothing here touches React, and nothing in the components does arithmetic.
 * That split is what makes the ledger checkable: the numbers a learner sees
 * come from `caseLedger` and only from `caseLedger`, so a display bug cannot
 * quietly disagree with the assessment.
 */

export function createCase(): CaseState {
  return {
    stage: "brief",
    systemStock: EARBUDS.systemStock,
    unitValue: EARBUDS.unitValue,
    scannedUnits: [],
    physicalCount: null,
    settled: [],
    toolOpens: [],
    orderTracesOpened: [],
    cctvMarkersViewed: [],
    toteInspected: false,
    evidence: [],
    findings: [],
    actions: { now: [], delegate: [], followUp: [] },
    signals: emptyDay2Signals(),
    tags: [],
    startedAt: Date.now(),
    completedAt: null,
  };
}

/* ── Accounting ───────────────────────────────────────────────────────── */

/**
 * The single source of truth for money on Day 2.
 *
 * Units are settled one at a time into one of three buckets, and the value of
 * each bucket is a count times a unit price. Unresolved is the remainder, so
 * the three can never fail to sum to the original exposure no matter what
 * order the learner discovers things in.
 */
export function caseLedger(state: CaseState): CaseLedger {
  const varianceUnits =
    state.physicalCount === null ? 0 : state.systemStock - state.physicalCount;
  const explainedUnits = state.settled.filter((d) => d === "explained").length;
  const recoveredUnits = state.settled.filter((d) => d === "recovered").length;
  const unresolvedUnits = Math.max(0, varianceUnits - explainedUnits - recoveredUnits);

  return {
    varianceUnits,
    exposure: varianceUnits * state.unitValue,
    explainedUnits,
    explainedValue: explainedUnits * state.unitValue,
    recoveredUnits,
    recoveredValue: recoveredUnits * state.unitValue,
    unresolvedUnits,
    unresolvedValue: unresolvedUnits * state.unitValue,
  };
}

export function masterLedger(state: CaseState) {
  const ledger = caseLedger(state);
  return masterFrom(ledger.explainedValue, ledger.recoveredValue);
}

/**
 * The day's ledger, across both cases. Case 02 contributes to "explained" and
 * never to "recovered": the forty-gram packs genuinely left the store, so its
 * ₹85 is a record that did not follow the stock — the same category as Case
 * 01's unscanned unit. Its 34 corrected record units are reported separately
 * and never enter this arithmetic.
 */
export function dayMaster(state: CaseState, parleg: ParleGState | null) {
  const ledger = caseLedger(state);
  return masterFrom(
    ledger.explainedValue + (parleg ? pgExplainedValue(parleg) : 0),
    ledger.recoveredValue,
  );
}

/* ── Signal plumbing ──────────────────────────────────────────────────── */

function applySignals(state: CaseState, delta: Day2SignalDelta): CaseState {
  const signals = { ...state.signals };
  for (const [key, value] of Object.entries(delta)) {
    const dimension = key as keyof typeof signals;
    signals[dimension] = signals[dimension] + (value ?? 0);
  }
  return { ...state, signals };
}

function tag(state: CaseState, ...added: Day2Tag[]): CaseState {
  const next = added.filter((t) => !state.tags.includes(t));
  return next.length === 0 ? state : { ...state, tags: [...state.tags, ...next] };
}

/* ── Stage 1 · Counting ───────────────────────────────────────────────── */

export function scanUnit(state: CaseState, unitId: string): CaseState {
  if (state.scannedUnits.includes(unitId)) return state;
  return { ...state, scannedUnits: [...state.scannedUnits, unitId] };
}

export function scanAllUnits(state: CaseState): CaseState {
  return { ...state, scannedUnits: CAGE_UNITS.map((unit) => unit.id) };
}

export const countComplete = (state: CaseState): boolean =>
  state.scannedUnits.length === CAGE_UNITS.length;

/**
 * The count can only be confirmed once every visible unit has been scanned.
 *
 * That is a deliberate constraint rather than a convenience. A learner who
 * confirms nine as seven has not made an interesting mistake, they have broken
 * the arithmetic the rest of the case rests on — and a variance report built on
 * a count nobody finished is not a lesson about anything.
 */
export function confirmCount(state: CaseState): CaseState {
  if (!countComplete(state)) return state;
  // Deliberately stays on the count stage. The variance and the exposure are
  // the first real finding of the day and they need a surface to land on —
  // advancing here would unmount the reveal in the same frame that earns it.
  const counted = applySignals(
    { ...state, physicalCount: state.scannedUnits.length },
    { inventoryReasoning: 4 },
  );
  return tag(counted, "physical_count_completed");
}

/* ── Stage 2 · Tools ──────────────────────────────────────────────────── */

const TOOL_TAG: Partial<Record<Day2Tool, Day2Tag>> = {
  movement: "movement_log_checked",
  scans: "scan_log_checked",
  access: "access_log_checked",
  cctv: "cctv_checked",
};

/**
 * Opening a tool for the first time is investigation. Opening it a fourth time
 * is not, and the efficiency metric reads the difference. Neither is penalised
 * outright — a thorough learner should be able to look twice.
 */
export function openTool(state: CaseState, tool: Day2Tool): CaseState {
  const first = !state.toolOpens.includes(tool);
  let next: CaseState = { ...state, toolOpens: [...state.toolOpens, tool] };

  if (first) {
    const toolTag = TOOL_TAG[tool];
    if (toolTag) next = tag(next, toolTag);
    if (tool === "movement") next = applySignals(next, { rootCause: 2 });
    if (tool === "access") next = applySignals(next, { evidenceDiscipline: 1 });
  }
  return next;
}

export function openOrderTrace(state: CaseState, orderId: string): CaseState {
  if (state.orderTracesOpened.includes(orderId)) return state;
  const next: CaseState = {
    ...state,
    orderTracesOpened: [...state.orderTracesOpened, orderId],
  };
  const order = ORDERS.find((o) => o.id === orderId);
  if (!order?.material) return next;
  return tag(
    applySignals(next, { rootCause: 3, evidenceDiscipline: 1 }),
    "order_trace_checked",
    "missing_scan_identified",
  );
}

export function viewCctvMarker(state: CaseState, time: string): CaseState {
  if (state.cctvMarkersViewed.includes(time)) return state;
  return { ...state, cctvMarkersViewed: [...state.cctvMarkersViewed, time] };
}

export function inspectTote(state: CaseState): CaseState {
  if (state.toteInspected) return state;
  return tag(
    applySignals({ ...state, toteInspected: true }, { rootCause: 2, inventoryReasoning: 1 }),
    "cancelled_order_found",
  );
}

/* ── Evidence ─────────────────────────────────────────────────────────── */

export function addEvidence(state: CaseState, evidenceId: string): CaseState {
  const item = EVIDENCE[evidenceId];
  if (!item || state.evidence.some((e) => e.id === evidenceId)) return state;

  let next: CaseState = { ...state, evidence: [...state.evidence, item] };
  next = applySignals(next, { evidenceDiscipline: item.weight === "material" ? 2 : 1 });
  if (item.weight === "circumstantial") {
    next = tag(next, "circumstantial_evidence_recognised");
  }
  return next;
}

export const hasEvidence = (state: CaseState, id: string): boolean =>
  state.evidence.some((e) => e.id === id);

/* ── Settling units ───────────────────────────────────────────────────── */

/** Whether the CCTV movement can be classified yet. */
export function canClassifyIssue(state: CaseState): boolean {
  return (
    hasEvidence(state, "missing-scan") &&
    hasEvidence(state, "cctv-issue") &&
    !state.settled.includes("explained")
  );
}

export function canRecoverUnit(state: CaseState): boolean {
  return hasEvidence(state, "tote-unit") && !state.settled.includes("recovered");
}

function settle(state: CaseState, disposition: Disposition): CaseState {
  return { ...state, settled: [...state.settled, disposition] };
}

/**
 * Stage 6 · the unit that left legitimately without a scan.
 *
 * Called "explained", never "recovered". The stock is on somebody's kitchen
 * table — what was wrong was the record, and the store is not a rupee richer
 * for having worked that out.
 */
export function classifyProcessVariance(state: CaseState): CaseState {
  if (!canClassifyIssue(state)) return state;
  return tag(
    applySignals(settle(state, "explained"), {
      rootCause: 4,
      inventoryReasoning: 3,
      evidenceDiscipline: 2,
    }),
    "process_variance_identified",
    "evidence_before_conclusion",
  );
}

/** Stage 7 · the unit that was in the building the whole time. */
export function recoverUnit(state: CaseState): CaseState {
  if (!canRecoverUnit(state)) return state;
  return tag(
    applySignals(settle(state, "recovered"), {
      rootCause: 3,
      inventoryReasoning: 4,
    }),
    "physical_stock_recovered",
    "restow_failure_identified",
  );
}

/* ── Findings ─────────────────────────────────────────────────────────── */

/**
 * A finding can always be committed. Whether it was supported at the moment of
 * committing is what gets recorded — the habit being measured is reaching for
 * a conclusion early, and a button that refuses to be pressed measures nothing.
 */
export function logFinding(
  state: CaseState,
  id: FindingId,
  elapsedSeconds: number,
): CaseState {
  if (state.findings.some((f) => f.id === id)) return state;

  const spec = FINDINGS.find((f) => f.id === id);
  const supported = spec
    ? spec.requires.every((requirement) => hasEvidence(state, requirement))
    : false;

  let next: CaseState = {
    ...state,
    findings: [...state.findings, { id, at: elapsedSeconds, supported }],
  };

  if (supported) {
    next = tag(applySignals(next, { evidenceDiscipline: 2 }), "evidence_before_conclusion");
  } else {
    next = tag(
      applySignals(next, { evidenceDiscipline: -4, rootCause: -1 }),
      "concluded_without_evidence",
    );
    if (id === "staff_theft") {
      next = tag(applySignals(next, { evidenceDiscipline: -3 }), "premature_theft_assumption");
    }
  }
  return next;
}

/* ── Stage 9 · Action board ───────────────────────────────────────────── */

export function placeAction(
  state: CaseState,
  cardId: string,
  lane: ActionLane | null,
): CaseState {
  const cleared: Record<ActionLane, string[]> = {
    now: state.actions.now.filter((id) => id !== cardId),
    delegate: state.actions.delegate.filter((id) => id !== cardId),
    followUp: state.actions.followUp.filter((id) => id !== cardId),
  };
  if (lane === null) return { ...state, actions: cleared };
  return { ...state, actions: { ...cleared, [lane]: [...cleared[lane], cardId] } };
}

/**
 * Scored once, when the board is submitted, rather than as cards move. A
 * prioritisation exercise you can feel your way through by watching a number
 * react is a different exercise.
 */
function scorePlacedCards(state: CaseState): CaseState {
  let next = state;
  const lanes: ActionLane[] = ["now", "delegate", "followUp"];

  for (const lane of lanes) {
    for (const cardId of state.actions[lane]) {
      const card = ACTION_CARDS.find((c) => c.id === cardId);
      if (!card) continue;
      const delta = card.score[lane];
      if (delta) next = applySignals(next, delta);
      if (card.tagsWhenPlaced) next = tag(next, ...card.tagsWhenPlaced);
    }
  }
  return next;
}

export function commitActions(state: CaseState): CaseState {
  let next = scorePlacedCards(state);

  // Delegation is about the shape of the board, not any single card: work
  // handed to someone, and a "do now" list short enough to actually be done.
  const delegated = state.actions.delegate.length + state.actions.followUp.length;
  if (delegated >= 3 && state.actions.now.length <= 3) {
    next = tag(applySignals(next, { delegation: 4 }), "strong_delegation");
  } else if (delegated === 0) {
    next = tag(applySignals(next, { delegation: -3 }), "manager_overinvolved");
  }

  return { ...next, stage: "reconcile" };
}

/* ── Stage 10 · Signing ───────────────────────────────────────────────── */

export function signReconciliation(state: CaseState): CaseState {
  const ledger = caseLedger(state);
  let next = state;

  // Leaving a genuine gap open and escalated is the correct ending, and the
  // one a learner who wants a clean sheet will be tempted to avoid.
  if (ledger.unresolvedUnits > 0 && !state.tags.includes("premature_writeoff")) {
    next = tag(applySignals(next, { lossPrevention: 3 }), "unresolved_left_open");
  }

  return { ...next, stage: "complete", completedAt: Date.now() };
}

/**
 * The fifteen minutes ran out.
 *
 * The audit closes exactly where it stood. Units already settled stay settled;
 * anything not reached stays unexplained. Cards already on the action board
 * were real decisions and are scored — including the bad ones — but the
 * board's *shape* is not assessed, because a plan interrupted mid-placement
 * says nothing about whether its author delegates.
 *
 * What is deliberately withheld is the credit for leaving the gap open and
 * escalated. That is earned by signing an honest entry, and nobody signed.
 */
export function closeOnTimeout(state: CaseState): CaseState {
  if (state.stage === "complete") return state;

  // The board is scored on commit, which moves the stage to "reconcile".
  // Scoring it again here would count every card twice.
  let next = state.stage === "actions" ? scorePlacedCards(state) : state;
  next = tag(applySignals(next, { prioritisation: -2 }), "audit_timed_out");

  return { ...next, stage: "complete", completedAt: Date.now() };
}

/* ── Metrics ──────────────────────────────────────────────────────────── */

/**
 * Evidence efficiency.
 *
 * The numerator is investigative actions that could actually teach the learner
 * something; the denominator is every investigative action they took. Opening
 * the same log five times moves only the denominator, which is the behaviour
 * the metric exists to notice. It is reported, never used to reduce the score
 * directly — thoroughness that arrives at the truth is not failure.
 */
export function day2Metrics(state: CaseState): Day2Metrics {
  const materialTools: Day2Tool[] = ["movement", "orders", "scans", "cctv", "exception"];

  const firstOpens = [...new Set(state.toolOpens)];
  const usefulToolOpens = firstOpens.filter((tool) => materialTools.includes(tool)).length;

  const usefulTraces = state.orderTracesOpened.filter(
    (id) => ORDERS.find((o) => o.id === id)?.material,
  ).length;

  const usefulMarkers = state.cctvMarkersViewed.filter(
    (time) => CCTV_MARKERS.find((m) => m.time === time)?.material,
  ).length;

  const usefulActions =
    usefulToolOpens + usefulTraces + usefulMarkers + (state.toteInspected ? 1 : 0);

  const totalActions =
    state.toolOpens.length +
    state.orderTracesOpened.length +
    state.cctvMarkersViewed.length +
    (state.toteInspected ? 1 : 0);

  return {
    evidenceEfficiency: totalActions === 0 ? 0 : usefulActions / totalActions,
    usefulActions,
    totalActions,
    unsupportedFindings: state.findings.filter((f) => !f.supported).length,
    ledger: caseLedger(state),
    master: masterLedger(state),
  };
}

/** Applied at scoring time so the tag reflects the finished run, not a moment. */
export function efficiencyTags(state: CaseState): Day2Tag[] {
  const metrics = day2Metrics(state);
  if (metrics.totalActions < 4) return [];
  if (metrics.evidenceEfficiency >= 0.75) return ["efficient_evidence_path"];
  if (metrics.evidenceEfficiency < 0.5) return ["overinvestigated"];
  return [];
}
