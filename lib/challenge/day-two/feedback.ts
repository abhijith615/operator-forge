import { day2Metrics, efficiencyTags } from "./engine";
import { rupees } from "./ledger";
import {
  breachesIn,
  DAY_TWO_BAND_RANGE,
  day2Band,
  day2Signature,
  scoreDay2Competencies,
  scoreDay2Overall,
} from "./scoring";
import type { CaseState, Day2Tag } from "./types";
import type { ChallengeResult, FeedbackItem } from "../types";

/**
 * Day 2 feedback.
 *
 * Every line is gated on tags the run actually produced, and the case insight
 * quotes the learner's own numbers back at them. Generic encouragement is
 * worse than silence here — the entire value of a forensics exercise is being
 * told what *you* did, and "good investigative thinking!" is what a simulation
 * says when it has not been watching.
 */

interface Gated {
  when: (has: (tag: Day2Tag) => boolean, state: CaseState) => boolean;
  item: FeedbackItem;
}

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

function pick(pool: Gated[], state: CaseState, has: (tag: Day2Tag) => boolean, limit: number) {
  return pool
    .filter((entry) => entry.when(has, state))
    .slice(0, limit)
    .map((entry) => entry.item);
}

/* ── Case insight ─────────────────────────────────────────────────────── */

/**
 * The short note shown immediately after signing, before the day's scorecard.
 * It reports what happened rather than grading it — the numbers are the
 * learner's own, so the sentence is true no matter how the run went.
 */
export function caseInsight(state: CaseState): { headline: string; lines: string[] } {
  const { ledger } = day2Metrics(state);
  const accounted = ledger.explainedValue + ledger.recoveredValue;
  const lines: string[] = [];

  if (accounted > 0 && !state.tags.includes("premature_theft_assumption")) {
    lines.push(
      `You accounted for ${rupees(accounted)} without treating every discrepancy as theft.`,
    );
  } else if (accounted > 0) {
    lines.push(
      `You accounted for ${rupees(accounted)}, but you reached a conclusion before the movement trail was complete.`,
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
    const ending = state.tags.includes("loss_prevention_escalated")
      ? "and has been escalated."
      : state.tags.includes("premature_writeoff")
        ? "and you moved to write it off rather than pass it on."
        : "and stays open.";
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

export function buildDay2Result(state: CaseState): ChallengeResult {
  const competencies = scoreDay2Competencies(state);
  const score = scoreDay2Overall(competencies, state);
  const band = day2Band(score);
  const metrics = day2Metrics(state);

  const allTags = new Set<Day2Tag>([...state.tags, ...efficiencyTags(state)]);
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
      "Work the highest-value line first. Earbuds were sixty-four per cent of the night's variance; the other six SKUs together were less than half of what one secure cage was hiding.",
    );
  }

  return {
    day: 2,
    score,
    band,
    bandRange: DAY_TWO_BAND_RANGE[band],
    competencies,
    signature: day2Signature(state, competencies),
    strengths: pick(STRENGTHS, state, has, 3),
    gaps: pick(GAPS, state, has, 3),
    replay: replay.slice(0, 3),
    learned: LEARNED,
    // Day 2 records judgement breaches rather than SOP breaches; they are
    // surfaced through the scorecard's own section, not this one.
    sopViolations: [],
    decisionCount: metrics.totalActions + state.findings.length,
    forensics: {
      originalVariance: metrics.master.totalOriginalVariance,
      explainedValue: metrics.master.explainedValue,
      recoveredValue: metrics.master.recoveredValue,
      unresolvedValue: metrics.master.unresolvedValue,
      caseExposure: metrics.ledger.exposure,
      caseExplainedUnits: metrics.ledger.explainedUnits,
      caseRecoveredUnits: metrics.ledger.recoveredUnits,
      caseUnresolvedUnits: metrics.ledger.unresolvedUnits,
      evidenceEfficiency: metrics.evidenceEfficiency,
      usefulActions: metrics.usefulActions,
      totalActions: metrics.totalActions,
      unsupportedFindings: metrics.unsupportedFindings,
    },
    durationMs: (state.completedAt ?? Date.now()) - state.startedAt,
  };
}

const REPLAY: Record<string, string> = {
  inventoryReasoning:
    "Count first, then reason. The physical number is the only figure in an audit that is not somebody's assertion, and everything downstream is arithmetic on top of it.",
  rootCause:
    "Follow the unit, not the number. The movement log tells you what the system believes happened; the order trace and the camera tell you what actually did.",
  evidenceDiscipline:
    "Let the tray decide. If you cannot point at the record that supports a finding, the finding is a hypothesis and belongs in the follow-up column, not the report.",
  prioritisation:
    "Open the record most likely to move the case. Six logs were available and three of them could not have changed the outcome.",
  lossPrevention:
    "Close the control, escalate the gap, keep the store trading. All three, in that order — a variance that stops fulfilment costs more than it saves.",
  delegation:
    "Decide what only you can do tonight. Recounts, sweeps and record pulls belong to the people whose shift it is.",
};

export { breachesIn };
