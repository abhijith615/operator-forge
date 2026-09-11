import { day2Metrics, dayMaster, efficiencyTags } from "./engine";
import { EARBUDS_ROW, lossShare, rupees } from "./ledger";
import { AFFECTED_PICKS, NET_VALUE_IMPACT, RECORD_UNITS_AFFECTED } from "./parleg/content";
import { pgPreventiveControls, pgReached, pgRecordUnitsCorrected } from "./parleg/engine";
import { OVERREACH_TAGS } from "./parleg/scoring";
import type { ParleGState, PgTag } from "./parleg/types";
import {
  breachesIn,
  DAY_TWO_BAND_RANGE,
  day2Band,
  day2Signature,
  scoreDay2,
} from "./scoring";
import type { CaseState, Day2Tag } from "./types";
import type { ChallengeResult, FeedbackItem } from "../types";

/**
 * Day 2 feedback.
 *
 * Every line is gated on tags the run actually produced, and the case insights
 * quote the learner's own numbers back at them. Generic encouragement is worse
 * than silence here — the entire value of a forensics exercise is being told
 * what *you* did, and "good investigative thinking!" is what a simulation says
 * when it has not been watching. Each case keeps its own pool, so a line about
 * the secure cage can never fire because of something done at the biscuit bay.
 */

interface Gated {
  when: (has: (tag: Day2Tag) => boolean, state: CaseState) => boolean;
  item: FeedbackItem;
}

interface PgGated {
  when: (has: (tag: PgTag) => boolean, state: ParleGState) => boolean;
  item: FeedbackItem;
}

/* ── Case 01 ──────────────────────────────────────────────────────────── */

const STRENGTHS: Gated[] = [
  {
    when: (has) => has("process_variance_identified") && has("missing_scan_identified"),
    item: {
      title: "You separated a record failure from a stock loss",
      body: "One unit had genuinely left the building on a real customer order. What was missing was the scan, not the earbuds. Calling that a process variance rather than a loss is the difference between fixing a control and writing off ₹3,999.",
    },
  },
  {
    when: (has) => has("physical_stock_recovered"),
    item: {
      title: "You found stock the system had given up on",
      body: "A cancelled order that was picked and never restowed sits in a tote looking exactly like theft on a variance report. You went and looked.",
    },
  },
  {
    when: (has) => has("circumstantial_evidence_recognised") && !has("premature_theft_assumption"),
    item: {
      title: "You held presence and proof apart",
      body: "An associate was in the aisle during the unscanned movement. You recorded that as circumstantial and kept going, which is what stops an audit from turning into an accusation.",
    },
  },
  {
    when: (has) => has("efficient_evidence_path"),
    item: {
      title: "You investigated narrowly",
      body: "Most of what you opened was worth opening. Across one shift that reads as instinct; across a cluster of stores it is the difference between an audit that finishes and one that does not.",
    },
  },
  {
    when: (has) => has("loss_prevention_escalated") && has("unresolved_left_open"),
    item: {
      title: "You escalated the gap instead of closing it",
      body: "One unit stayed unexplained and you left it that way, in someone else's queue. A reconciliation that ends clean because the last line was tidied away is worth less than one that ends honest.",
    },
  },
  {
    when: (has) => has("high_value_access_protected"),
    item: {
      title: "You tightened the control that actually failed",
      body: "The cage opened and stock moved without a scan. Putting a named credential and a witness on it addresses the mechanism rather than the symptom.",
    },
  },
  {
    when: (has) => has("strong_delegation"),
    item: {
      title: "You gave the follow-up away",
      body: "The remaining work went to the people who own it. At two in the morning the manager who keeps every thread personally is the bottleneck by breakfast.",
    },
  },
];

const GAPS: Gated[] = [
  {
    when: (has) => has("premature_theft_assumption"),
    item: {
      title: "You reached a conclusion before the trail was complete",
      body: "Presence near secure stock is not proof of loss. In this store the unscanned movement turned out to be a legitimate customer order — the same evidence you were reading would have cleared the associate you named.",
    },
  },
  {
    when: (has) => has("premature_writeoff"),
    item: {
      title: "You moved to write the value off",
      body: "A write-off closes the number and leaves the mechanism running. The missing scan step would have produced the same variance again tomorrow night.",
    },
  },
  {
    when: (has) => has("unnecessary_store_shutdown"),
    item: {
      title: "You stopped the whole store for one SKU",
      body: "The variance sat in a single secure cage. Halting fulfilment across every aisle costs more before dawn than the unit you were protecting.",
    },
  },
  {
    when: (has) => has("audit_timed_out"),
    item: {
      title: "The clock closed the audit before you did",
      body: "Fifteen minutes was the window. What you had settled by then was recorded; the units you had not reached and the entry you had not signed stay exactly as they were, which on a real night means they go into the morning report unexplained.",
    },
  },
  {
    when: (has, state) => !has("process_variance_identified") && state.settled.length < 2,
    item: {
      title: "Two of the three units were accountable",
      body: "The movement log and order #6214 explain one of them and the exception bay holds another. Both were reachable with the records that were already in front of you.",
    },
  },
  {
    when: (has) => has("overinvestigated"),
    item: {
      title: "You opened more than the case needed",
      body: "You arrived at the right answers, and you read a lot of records that could not have changed them. Accuracy is the harder half; the other half is knowing which log will move the case.",
    },
  },
  {
    when: (has) => has("manager_overinvolved"),
    item: {
      title: "You kept every action yourself",
      body: "Nothing on your board went to anybody else. A high-value escalation and a cancelled-order sweep are both somebody's job — they do not have to be yours tonight.",
    },
  },
  {
    when: (has) => has("concluded_without_evidence") && !has("premature_theft_assumption"),
    item: {
      title: "A finding went in ahead of its evidence",
      body: "You committed to a cause the tray could not support yet. The order matters: a conclusion recorded early tends to decide which records you go and read next.",
    },
  },
  {
    when: (has) => !has("cctv_checked"),
    item: {
      title: "You never watched the movement happen",
      body: "The camera window covering the cage was available the whole time. It is the one record that could show a physical unit leaving, which is the difference between a theory about the scan gap and a fact about it.",
    },
  },
];

/* ── Case 02 ──────────────────────────────────────────────────────────── */

const PG_STRENGTHS: PgGated[] = [
  {
    when: (has) => has("mirrored_variance_recognised") && has("both_skus_verified"),
    item: {
      title: "You saw one event where the report showed two",
      body: "+17 on one bin and −17 on the next reads as two problems on a variance report. You counted both shelves and read them as one.",
    },
  },
  {
    when: (has) => has("scan_gap_identified") && has("wrong_size_pick_identified"),
    item: {
      title: "You found the control behind the pick",
      body: "The order record said 30 g every time. The scan log showed the product was never scanned — which is exactly why the record could say 30 g while a 40 g pack left.",
    },
  },
  {
    when: (has) => has("scan_control_selected") && has("shelf_separation_selected"),
    item: {
      title: "You fixed the mechanism, not only its output",
      body: "Correcting the counts closes tonight's variance. A mandatory product scan and physically separated pack sizes are what stop it rebuilding.",
    },
  },
  {
    when: (has) => has("record_impact_understood") && has("financial_impact_understood"),
    item: {
      title: "You sized the problem correctly",
      body: `${rupees(NET_VALUE_IMPACT)} is small. ${RECORD_UNITS_AFFECTED} wrong record units are not: they are tomorrow's nil picks and a replenishment order sized to stock that is not there.`,
    },
  },
];

const PG_GAPS: PgGated[] = [
  {
    when: (has) => has("corrected_without_cause"),
    item: {
      title: "You changed the numbers before you knew why they moved",
      body: "Both Parle-G records now match the shelf. The pick process that bent them has not changed, so the drift will rebuild — and the next audit will find it without the trail you had tonight.",
    },
  },
  {
    when: (has) => has("blind_writeoff"),
    item: {
      title: "You wrote off stock that was on the shelf",
      body: `Every unit was accounted for — ${AFFECTED_PICKS} extra on one bin, ${AFFECTED_PICKS} missing from the next. A write-off books a loss for inventory the store still holds.`,
    },
  },
  {
    when: (has) => OVERREACH_TAGS.some(has) && !has("blind_writeoff"),
    item: {
      title: "Your controls were wider than the problem",
      body: "One pair of adjacent SKUs and one skippable scan step. Stopping picking, delisting the product or recounting the store all cost more than the drift they answer.",
    },
  },
  {
    when: (has, state) =>
      state.reconciled && !has("scan_control_selected") && !has("corrected_without_cause"),
    item: {
      title: "The barcode gap is still open",
      body: `You reconciled both SKUs, but nothing in your plan makes the product scan mandatory. The ${AFFECTED_PICKS} picks got through because that step could be skipped, and it still can.`,
    },
  },
  {
    when: (has) => has("flow_needed_retries"),
    item: {
      title: "The two directions took more than one pass",
      body: "The wrong pick was clear. Why it pushes one SKU's record down and the other SKU's shelf down took retries — and it is the part that explains every mirrored variance you will meet.",
    },
  },
  {
    when: (has) => has("case_timed_out") || has("case_left_open"),
    item: {
      title: "Case 02 closed unreconciled",
      body: `Both Parle-G records still disagree with their shelves. On a real night that is ${RECORD_UNITS_AFFECTED} units of wrong availability going into the morning.`,
    },
  },
];

function pick(pool: Gated[], state: CaseState, has: (tag: Day2Tag) => boolean, limit: number) {
  return pool
    .filter((entry) => entry.when(has, state))
    .slice(0, limit)
    .map((entry) => entry.item);
}

function pickPg(pool: PgGated[], state: ParleGState | null, limit: number): FeedbackItem[] {
  if (!state || !pgReached(state)) return [];
  const has = (tag: PgTag) => state.tags.includes(tag);
  return pool
    .filter((entry) => entry.when(has, state))
    .slice(0, limit)
    .map((entry) => entry.item);
}

/* ── Case 01 insight ──────────────────────────────────────────────────── */

/**
 * The short note shown immediately after signing, before the day's scorecard.
 * It reports what happened rather than grading it — the numbers are the
 * learner's own, so the sentence is true no matter how the run went.
 */
export function caseInsight(state: CaseState): { headline: string; lines: string[] } {
  const { ledger } = day2Metrics(state);
  const accounted = ledger.explainedValue + ledger.recoveredValue;
  const lines: string[] = [];

  if (state.tags.includes("audit_timed_out")) {
    lines.push("The fifteen minutes ran out before the audit entry was signed.");
  }

  if (accounted > 0 && !state.tags.includes("premature_theft_assumption")) {
    lines.push(
      `You accounted for ${rupees(accounted)} without treating every discrepancy as theft.`,
    );
  } else if (accounted > 0) {
    lines.push(
      `You accounted for ${rupees(accounted)}, but you reached a conclusion before the movement trail was complete.`,
    );
  } else if (state.physicalCount === null) {
    lines.push(
      "The cage was never counted, so the variance was never verified. The report's three missing units stand exactly as it stated them.",
    );
  } else {
    lines.push(
      "You established the count and left the variance where you found it. Nothing in the movement trail was ruled in or out.",
    );
  }

  if (ledger.explainedValue > 0 && ledger.recoveredValue > 0) {
    lines.push(
      `${rupees(ledger.explainedValue)} was explained — stock that genuinely left on a customer order without its scan. ${rupees(ledger.recoveredValue)} was recovered — stock that was in the building the whole time. Those are not the same result, and only one of them puts a unit back on a shelf.`,
    );
  }

  if (ledger.unresolvedUnits > 0) {
    const one = ledger.unresolvedUnits === 1;
    // Only say "escalated" if they actually escalated it. A run that reached
    // for a write-off has not handed anything to anybody.
    const them = one ? "it" : "them";
    const ending = state.tags.includes("loss_prevention_escalated")
      ? one
        ? "and has been escalated."
        : "and have been escalated."
      : state.tags.includes("premature_writeoff")
        ? `and you moved to write ${them} off rather than pass ${them} on.`
        : one
          ? "and stays open."
          : "and stay open.";
    lines.push(
      `${ledger.unresolvedUnits} ${one ? "unit remains" : "units remain"} unresolved at ${rupees(ledger.unresolvedValue)} ${ending}`,
    );
  }

  return { headline: "Case insight", lines };
}

/* ── The day's result ─────────────────────────────────────────────────── */

const LEARNED: FeedbackItem[] = [
  {
    title: "Inventory variance is not automatically theft",
    body: "Three units short in a secure cage reads as one story on a report. It was three different stories: a record that was never written, stock standing in the wrong place, and one genuine gap.",
  },
  {
    title: "Explained, recovered and unresolved are three different outcomes",
    body: "Explained means the stock is gone and the paperwork was wrong. Recovered means the stock is back. Unresolved means you do not know. A ledger that adds them together tells you nothing you can act on.",
  },
  {
    title: "The scan step is the control, not the paperwork",
    body: "Every high-value unit that moves without an item scan is a future variance that nobody will be able to explain months later. The gap you found tonight was four hours old and still traceable.",
  },
  {
    title: "Cancelled orders are an inventory location, not an event",
    body: "Stock picked against an order that dies is physically somewhere. Until a restow scan puts it back, the system is confidently wrong about where it is.",
  },
];

const PG_LEARNED: FeedbackItem[] = [
  {
    title: "A small value loss can hide a large record error",
    body: `${AFFECTED_PICKS} wrong picks cost ${rupees(NET_VALUE_IMPACT)}. They also left ${RECORD_UNITS_AFFECTED} record units wrong across two SKUs — the difference between an item showing as available and a nil pick tomorrow.`,
  },
  {
    title: "The system records what was scanned, not what was picked",
    body: "With the product scan skipped, the record follows the order, not the pack. Every pick like that moves one SKU's record and a different SKU's shelf — which is why the variances come out mirrored.",
  },
];

const REPLAY: Record<string, string> = {
  inventoryReasoning:
    "Count first, then reason. The physical number is the only figure in an audit that is not somebody's assertion, and everything downstream is arithmetic on top of it.",
  rootCause:
    "Follow the unit, not the number. The movement log tells you what the system believes happened; the order trace and the camera tell you what actually did.",
  evidenceDiscipline:
    "Let the tray decide. If you cannot point at the record that supports a finding, the finding is a hypothesis and belongs in the follow-up column, not the report.",
  prioritisation:
    "Open the record most likely to move the case, and the case most likely to move the night. Size of exposure first; everything else in its turn.",
  lossPrevention:
    "Close the control, escalate the gap, keep the store trading. All three, in that order — a variance that stops fulfilment costs more than it saves.",
  delegation:
    "Decide what only you can do tonight. Recounts, sweeps and record pulls belong to the people whose shift it is.",
  patternRecognition:
    "Read variances in pairs. When two lines move by the same amount in opposite directions they are almost always one event — find it before working either line alone.",
  processDiscipline:
    "Ask which control should have caught it. A variance is the output of a step that was skipped; the fix that lasts is the step, not the number.",
  correctiveAction:
    "Size the fix to the mechanism. Two adjacent SKUs and one skippable scan need a separated shelf and a mandatory scan — not a stopped store.",
};

export function buildDay2Result(
  earbuds: CaseState,
  parleg: ParleGState | null = null,
): ChallengeResult {
  const { competencies, score, notReached } = scoreDay2(earbuds, parleg);
  const band = day2Band(score);
  const metrics = day2Metrics(earbuds);
  const master = dayMaster(earbuds, parleg);
  const reached = parleg ? pgReached(parleg) : false;

  const allTags = new Set<Day2Tag>([...earbuds.tags, ...efficiencyTags(earbuds)]);
  const has = (tag: Day2Tag) => allTags.has(tag);

  const weakest = [...competencies].sort((a, b) => a.score - b.score).slice(0, 2);
  const replay: string[] = [];
  for (const entry of weakest) {
    const line = REPLAY[entry.dimension];
    if (line && !replay.includes(line)) replay.push(line);
  }
  if (metrics.unsupportedFindings > 0) {
    replay.push(
      "Put the finding in last. Open the records, fill the tray, and only then say what happened — the reverse order quietly narrows which records you bother to open.",
    );
  }
  if (replay.length < 3) {
    replay.push(
      `Work the highest-value line first. Twelve units in one secure cage carried ${Math.round(lossShare(EARBUDS_ROW))}% of the night's variance — more than every other line combined.`,
    );
  }

  const strengths = [...pick(STRENGTHS, earbuds, has, 3), ...pickPg(PG_STRENGTHS, parleg, 2)];
  const gaps = [...pick(GAPS, earbuds, has, 3), ...pickPg(PG_GAPS, parleg, 2)];

  const finishedAt = Math.max(earbuds.completedAt ?? 0, parleg?.completedAt ?? 0) || Date.now();
  const pgActions = parleg
    ? parleg.actions.fixNow.length + parleg.actions.preventRepeat.length + parleg.actions.notNeeded.length
    : 0;

  return {
    day: 2,
    score,
    band,
    bandRange: DAY_TWO_BAND_RANGE[band],
    competencies,
    signature: day2Signature(earbuds, competencies, parleg),
    strengths: strengths.slice(0, 4),
    gaps: gaps.slice(0, 4),
    replay: replay.slice(0, 3),
    learned: reached ? [...LEARNED, ...PG_LEARNED] : LEARNED,
    // Day 2 records judgement breaches rather than SOP breaches; they are
    // surfaced through the scorecard's own section, not this one.
    sopViolations: [],
    decisionCount: metrics.totalActions + earbuds.findings.length + pgActions,
    forensics: {
      originalVariance: master.totalOriginalVariance,
      explainedValue: master.explainedValue,
      recoveredValue: master.recoveredValue,
      unresolvedValue: master.unresolvedValue,
      caseExposure: metrics.ledger.exposure,
      caseExplainedUnits: metrics.ledger.explainedUnits,
      caseRecoveredUnits: metrics.ledger.recoveredUnits,
      caseUnresolvedUnits: metrics.ledger.unresolvedUnits,
      evidenceEfficiency: metrics.evidenceEfficiency,
      usefulActions: metrics.usefulActions,
      totalActions: metrics.totalActions,
      unsupportedFindings: metrics.unsupportedFindings,
      timedOut:
        earbuds.tags.includes("audit_timed_out") ||
        (parleg?.tags.includes("case_timed_out") ?? false),
      parleg:
        parleg && reached
          ? {
              reconciled: parleg.reconciled,
              rootCauseEstablished: parleg.flowSolved,
              recordUnitsCorrected: pgRecordUnitsCorrected(parleg),
              recordUnitsAffected: RECORD_UNITS_AFFECTED,
              netValueImpact: NET_VALUE_IMPACT,
              affectedTransactions: AFFECTED_PICKS,
              preventiveControls: pgPreventiveControls(parleg),
              timedOut: parleg.tags.includes("case_timed_out"),
            }
          : undefined,
      dimensionsNotReached: notReached,
    },
    durationMs: finishedAt - earbuds.startedAt,
  };
}

export { breachesIn };
