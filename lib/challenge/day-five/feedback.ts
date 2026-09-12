import { linkFits } from "./engine";
import { finaleOutcome } from "./outcome";
import {
  BAKING,
  BATCH,
  CONTROLS,
  CUSTOMERS,
  INCIDENTS,
  MILK,
  PACKING,
  clockAt,
} from "./scenario";
import {
  DAY_FIVE_BAND_RANGE,
  assessDay5,
  operatorCompetencies,
  type Day5Assessment,
} from "./scoring";
import {
  CASE_IDS,
  DAY_FIVE_DIMENSIONS,
  type CaseId,
  type Day5Dimension,
  type Day5State,
} from "./types";
import type { ChallengeResult, FeedbackItem, PromiseSummary } from "../types";

/**
 * Day 5 feedback.
 *
 * Every sentence names something the operator did and what the customer got
 * because of it. Nothing here congratulates generosity or punishes thrift on
 * its own — the question each line answers is whether the person waiting ended
 * up with what they came for, and what the store paid to make that true.
 */

const rupees = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

/* ── Decision timeline ────────────────────────────────────────────────── */

interface Entry {
  sim: number;
  tone: "good" | "warn";
  text: string;
  weight: number;
}

function buildTimeline(state: Day5State, a: Day5Assessment): PromiseSummary["timeline"] {
  const m = state.milestones;
  const entries: Entry[] = [];
  const push = (sim: number | undefined, tone: "good" | "warn", text: string, weight: number) => {
    if (sim !== undefined) entries.push({ sim, tone, text, weight });
  };

  if (m.milk) {
    const milk = state.milk;
    if (milk.placed.fresh72 === "pickface" && milk.placed.fresh36 === "markdown") {
      push(m.milk.sim, "good", "Protected usable milk life and sent the short-dated batch to controlled markdown", 5);
    } else if (milk.placed.fresh72 === "pickface" && milk.placed.fresh36 === "hold") {
      push(m.milk.sim, "warn", `Put 72-hour milk forward and wrote off ${MILK.batches.fresh36.units} sellable bottles`, 4);
    } else if (milk.placed.fresh72 === "pickface") {
      push(m.milk.sim, "good", "Moved 72-hour milk to the pick face before tonight's orders picked it", 4);
    } else if (milk.placed.fresh36 === "pickface") {
      push(m.milk.sim, "warn", "Left a 36-hour bottle on the pick face — inside policy, short of a household week", 5);
    } else {
      push(m.milk.sim, "warn", "Cleared the milk pick face entirely with milk demand high", 4);
    }
  }

  if (m.baking) {
    const baking = state.baking;
    if (baking.customerChose === "paste" || baking.customerChose === "essence") {
      push(
        m.baking.sim,
        "good",
        baking.held
          ? "Held the tote, offered baking-usable substitutes and kept the cake possible"
          : "Offered baking-usable substitutes rather than refunding the vanilla",
        5,
      );
    } else if (baking.contacted) {
      push(m.baking.sim, "warn", "Contacted the customer but offered nothing that would finish the baking", 4);
    } else if (baking.resolution === "refunded") {
      push(m.baking.sim, "warn", `Dispatched four ingredients and a ${rupees(BAKING.refundValue)} refund`, 5);
    } else {
      push(m.baking.sim, "warn", "Cancelled a recoverable order without asking the customer", 4);
    }
    if (baking.dependencySeen) {
      push(m.baking.sim, "good", "Read the basket as one baking task before deciding", 3);
    }
  }

  if (m.packing) {
    const safe = a.tags.includes("chemical_food_segregated");
    push(
      m.packing.sim,
      safe ? "good" : "warn",
      safe
        ? `Accepted ${a.cases.packing.ctd} sec of CTD to keep the cleaner away from open produce`
        : "Dispatched an acidic cleaner in one bag with unwrapped coriander",
      5,
    );
  }

  if (m.batch) {
    const batch = state.batch;
    if (a.tags.includes("future_customer_exposure_contained")) {
      push(m.batch.sim, "good", `Froze BF-0911-A and stopped ${BATCH.ordersAffected} live orders before they shipped`, 5);
    } else if (batch.actions.includes("removeOne")) {
      push(m.batch.sim, "warn", `Pulled the reported jar and left ${BATCH.units} of the same batch on sale`, 5);
    } else if (batch.actions.includes("wait")) {
      push(m.batch.sim, "warn", "Waited for formal instruction while the batch kept picking", 5);
    } else if (batch.actions.length > 0) {
      push(m.batch.sim, "warn", "Contained part of the batch and left the rest live", 4);
    }
  }

  if (m.finale) {
    const recoveries = finaleOutcome(state.finale);
    if (a.parts.managerUsedWell) {
      push(m.finale.sim, "good", "Used the one manager escalation where nothing else could authorise the fix", 5);
    } else if (state.finale.assigned.manager) {
      const on = state.finale.assigned.manager;
      push(m.finale.sim, "warn", `Spent the manager slot on ${CUSTOMERS[on].name.toLowerCase()}, which the floor could have handled`, 4);
    }
    if (recoveries.breakfast.protected && state.finale.assigned.associate === "breakfast") {
      push(m.finale.sim, "good", "Delegated the breakfast re-pick to the floor associate", 3);
    } else if (!recoveries.breakfast.protected) {
      push(m.finale.sim, "warn", "Let a dented egg carton go out because taking it back would cost the rider time", 4);
    }
    if (!recoveries.iceCream.protected) {
      push(m.finale.sim, "warn", "Sent ice cream into 42°C on a two-drop route with no thermal protection", 4);
    }
    if (a.parts.fundUsed >= 200) {
      push(m.finale.sim, "warn", `Spent ${rupees(a.parts.fundUsed)} of the ${rupees(250)} fund on recoveries that did not need money`, 3);
    }
  }

  if (m.loop) {
    push(
      m.loop.sim,
      a.parts.loopCorrect >= 3 ? "good" : "warn",
      a.parts.loopCorrect >= 3
        ? `Turned ${a.parts.loopCorrect} of tonight's failures into standing controls`
        : "Left tonight's failures as recoveries rather than controls",
      3,
    );
  }

  while (entries.length > 6) {
    const pool = entries.filter((entry) => entry.tone === "good");
    const from = pool.length > 0 ? pool : entries;
    const drop = from.reduce((low, entry) => (entry.weight < low.weight ? entry : low));
    entries.splice(entries.indexOf(drop), 1);
  }

  return entries
    .sort((x, y) => x.sim - y.sim)
    .map((entry) => ({ time: clockAt(entry.sim), tone: entry.tone, text: entry.text }));
}

/* ── Best customer call ───────────────────────────────────────────────── */

function bestCall(state: Day5State, a: Day5Assessment): FeedbackItem | null {
  const candidates: { gain: number; item: FeedbackItem }[] = [];
  const baking = state.baking;
  const recoveries = finaleOutcome(state.finale);

  if (baking.customerChose === "paste" || baking.customerChose === "essence") {
    candidates.push({
      gain: 10,
      item: {
        title: "Treated the basket as a task",
        body: `You treated the missing vanilla as a broken baking task, not a ${rupees(
          BAKING.refundValue,
        )} refund. Five usable ingredients arrived, and the customer never had to ask for anything.`,
      },
    });
  }

  if (a.tags.includes("future_customer_exposure_contained")) {
    candidates.push({
      gain: 12,
      item: {
        title: "Stopped the batch before the next complaint",
        body: `You froze BF-0911-A and paused the live picks on one customer's report rather than waiting for a second. One customer found it; the next ${BATCH.units} never had to.`,
      },
    });
  }

  if (a.tags.includes("chemical_food_segregated") && a.cases.packing.ctd > 0) {
    candidates.push({
      gain: 9,
      item: {
        title: "Let the metric lose",
        body: `Separating the cleaner from unwrapped coriander put CTD at ${
          PACKING.ctd + a.cases.packing.ctd
        } seconds against a ${PACKING.target}-second target. The target is the store's number; contamination is the customer's.`,
      },
    });
  }

  if (state.milk.placed.fresh72 === "pickface" && state.milk.placed.fresh36 !== "hold") {
    candidates.push({
      gain: 8,
      item: {
        title: "Read the use window, not the rule",
        body: "A 36-hour bottle clears the 24-hour rule and dies halfway through a normal household litre. You put the 72-hour batch forward and kept the short-dated stock selling as short-dated.",
      },
    });
  }

  if (a.parts.managerUsedWell && recoveries.breakfast.protected && recoveries.iceCream.protected) {
    candidates.push({
      gain: 11,
      item: {
        title: "Three customers, three kinds of ownership",
        body: "A thermal pouch, a floor associate and your own authority — each went where only it would work, and all three promises held without spending the budget on any of them.",
      },
    });
  }

  const top = candidates.reduce<{ gain: number; item: FeedbackItem } | null>(
    (best, candidate) => (!best || candidate.gain > best.gain ? candidate : best),
    null,
  );
  return top?.item ?? null;
}

/* ── Development area ─────────────────────────────────────────────────── */

const ORDER: Day5Dimension[] = [...DAY_FIVE_DIMENSIONS];

function developmentArea(state: Day5State, a: Day5Assessment): { area: string; body: string } {
  const lowest = ORDER.reduce((low, dimension) => (a.dims[dimension] < a.dims[low] ? dimension : low));

  switch (lowest) {
    case "needRecognition":
      if (state.milk.placed.fresh36 === "pickface") {
        return {
          area: "Customer usability",
          body: "You followed the sellability rule on the milk but did not account for how long a normal household needs to finish a litre. Thirty-six hours is compliant and unusable.",
        };
      }
      if (state.baking.resolution === "refunded") {
        return {
          area: "Customer need recognition",
          body: "Flour, butter, sugar and eggs are not four products when vanilla is the fifth — they are one baking task. The refund closed the line and left the task broken.",
        };
      }
      return {
        area: "Customer need recognition",
        body: "Each case was handled as the thing that appeared on the screen rather than the thing the customer was trying to do with it.",
      };
    case "safetyQuality":
      if (a.tags.includes("contamination_risk_created")) {
        return {
          area: "Food safety judgement",
          body: `An acidic cleaner travelled with unwrapped coriander to hold ${PACKING.ctd} seconds. A separator stockout is a packing problem; it is not a reason to put a chemical against open food.`,
        };
      }
      return {
        area: "Quality containment",
        body: `A cracked infant-food jar was reported and ${BATCH.units} units of the same batch stayed live across ${BATCH.activeWaves} pick waves. Contain first, decide disposition second.`,
      };
    case "ownership":
      return {
        area: "Ownership",
        body: "Two of tonight's failures were handed back to the customer to solve — a refund they did not ask for, or an order marked unavailable because reaching them was inconvenient.",
      };
    case "customerEffort":
      return {
        area: "Customer effort",
        body: "Several recoveries transferred store problems back to the customer: a ticket to raise, a photo to send, or a request to repeat. Effort the store does not absorb is effort the customer pays.",
      };
    case "recoveryProportionality":
      if (a.parts.fundUsed >= 200) {
        return {
          area: "Recovery proportionality",
          body: `You spent ${rupees(a.parts.fundUsed)} of the ${rupees(250)} fund. Compensation where a thermal pouch or a floor associate would have solved it protects the customer and spends the store's judgement with it.`,
        };
      }
      if (a.parts.waste > 0) {
        return {
          area: "Commercial proportionality",
          body: `${a.parts.waste} sellable units left the store as waste. Protecting a customer's use window does not require destroying stock that another customer would happily buy short-dated.`,
        };
      }
      return {
        area: "Recovery proportionality",
        body: "The manager slot went somewhere the floor could have handled. Scarce authority is for the problem nothing else can unlock.",
      };
    case "preventionMindset":
      return {
        area: "Prevention mindset",
        body: "Four failures were recovered and none became a control. The best recovery is the one the next customer never needs — a shelf-life rule, a nil-pick stop, a segregation standard, a containment trigger.",
      };
  }
}

/* ── The personalised insight ─────────────────────────────────────────── */

function insightFor(state: Day5State, a: Day5Assessment): string {
  if (state.lockedBy === "clock") {
    return "The evening closed before you did. What was left open ran on the automated path, which is exactly the path this day exists to question — it is fast, compliant, and it does not know what any of these customers came for.";
  }
  if (a.dims.needRecognition >= 82 && a.metrics.metricCourage >= 80 && a.dims.recoveryProportionality >= 72) {
    return "You consistently looked beyond the transaction. You protected the customer's intended use even when doing so cost seconds, packaging or markdown exposure — and you paid those costs in proportion to the failure rather than in proportion to the complaint.";
  }
  if (a.metrics.metricCourage <= 40 && a.dims.safetyQuality < 65) {
    return "You kept the operation fast and inside its targets. Three decisions optimised an internal metric at the expense of the person opening the bag — and none of those metrics are the one the customer is holding.";
  }
  if (a.metrics.promiseProtection >= 4 && a.dims.recoveryProportionality < 62) {
    return "You protected customers well, and several recoveries used more money or more of your own time than the situation required. Customer-first is a judgement about what the customer needs, not a decision to spend whatever is available.";
  }
  if (a.dims.preventionMindset < 45 && a.metrics.promiseProtection >= 3) {
    return "You recovered nearly every failure tonight and left the store exactly as likely to produce them tomorrow. The operators who stop repeating an evening like this one are the ones who turn each recovery into a control.";
  }
  if (a.dims.ownership < 55) {
    return "Several problems ended with the customer doing the remaining work — raising the ticket, accepting the refund, coming down to the gate. The store was the one with the information and the options; ownership means finishing it here.";
  }
  return "You balanced the customer's outcome against what protecting it cost, and neither was allowed to win automatically. The edge from here is consistency: the same reading of customer need when the clock is against you as when it is not.";
}

/* ── Recommendations ──────────────────────────────────────────────────── */

function recommendations(state: Day5State, a: Day5Assessment): string[] {
  const pool: string[] = [];
  const add = (when: boolean, line: string) => {
    if (when && !pool.includes(line)) pool.push(line);
  };

  add(
    a.tags.includes("milk_technical_compliance_only"),
    "Read the use window, not just the sell rule. A litre lasts a household two to three days — put the batch that survives that on the pick face and sell the short-dated stock as short-dated.",
  );
  add(
    a.tags.includes("order_dispatched_without_context"),
    "Read the basket before you raise the refund. Five lines that only work together are one task, and the automated workflow cannot see that.",
  );
  add(
    a.tags.includes("contamination_risk_created"),
    "Never let a chemical share a compartment with open food. A liner or a second bag costs seconds and a few rupees; the alternative is a contaminated order.",
  );
  add(
    a.tags.includes("single_unit_removed_only") || a.tags.includes("waited_for_additional_complaints"),
    "Contain first, decide disposition second. Freeze the batch and stop the live picks on the first report — inspection can take as long as it needs once nothing is shipping.",
  );
  add(
    a.tags.includes("unnecessary_inventory_disposal"),
    "Protecting a use window is not the same as writing stock off. Controlled markdown keeps the customer safe and the margin alive.",
  );
  add(
    a.tags.includes("manager_resource_wasted"),
    "Spend the manager slot on the problem only authority can unlock. A thermal pouch and a floor associate do not need you.",
  );
  add(
    a.tags.includes("recovery_budget_overspent"),
    "Money is the last recovery, not the first. Compensation where packaging or a re-pick would have worked buys goodwill you had already earned.",
  );
  add(
    a.tags.includes("customer_marked_unavailable_too_early"),
    "“Customer unavailable” is a status, not an outcome. A fourth-floor resident who cannot come down is a delivery problem to solve, not a failed drop.",
  );
  add(
    a.tags.includes("prevention_incomplete"),
    "Close every incident with a control. Tonight's four failures each have one, and a control costs nothing on the evenings it quietly works.",
  );
  add(
    a.tags.includes("damaged_order_dispatched"),
    "A dropped bag gets re-picked, not re-taped. Forty-five seconds inside the store is cheaper than a breakfast the customer has to replace.",
  );

  for (const line of [
    "Ask what the customer will do with the order, then check whether what you are about to send supports it.",
    "When protecting a customer costs a metric, spend the metric — and record why, so the number is understood rather than excused.",
    "Offer options the customer can act on. A refund is what the store does when it has run out of ideas.",
  ]) {
    add(true, line);
  }

  void state;
  return pool.slice(0, 3);
}

const LEARNED: FeedbackItem[] = [
  {
    title: "On time, in policy, and still a failure",
    body: "Every order tonight met its rule. Compliance describes what the store is allowed to send; it says nothing about whether the customer can use it.",
  },
  {
    title: "Understand the need, then protect it proportionately",
    body: "Customer-first is not a refund and it is not a yes. It is reading what the person actually came for and spending the smallest amount of money, time and authority that protects it.",
  },
  {
    title: "The best recovery is the one nobody needs",
    body: "A shelf-life control, a nil-pick stop, a segregation rule, a containment trigger. Each one removes a class of failure that would otherwise be recovered, one apologetic ticket at a time.",
  },
];

/* ── The result ───────────────────────────────────────────────────────── */

function journeys(state: Day5State, a: Day5Assessment): PromiseSummary["journeys"] {
  const recoveries = finaleOutcome(state.finale);
  const caseRows = CASE_IDS.map((id: CaseId) => ({
    id,
    label: INCIDENTS[id].label,
    customer:
      id === "milk"
        ? "Tonight's milk orders"
        : id === "baking"
          ? `Order ${BAKING.order}`
          : id === "packing"
            ? "Order #8448"
            : "Order #8455 and 3 live picks",
    state: a.cases[id].use === "pending" ? ("risk" as const) : (a.cases[id].use as "clear" | "risk" | "broken"),
    headline: a.cases[id].headline,
    detail: a.cases[id].detail,
  }));

  const finaleRows = (Object.keys(recoveries) as (keyof typeof recoveries)[]).map((id) => ({
    id,
    label: CUSTOMERS[id].headline,
    customer: `${CUSTOMERS[id].name} · ${CUSTOMERS[id].order}`,
    state: recoveries[id].protected ? ("clear" as const) : ("broken" as const),
    headline: recoveries[id].headline,
    detail: recoveries[id].detail,
  }));

  return [...caseRows, ...finaleRows];
}

export function buildDay5Result(state: Day5State): ChallengeResult {
  const a = assessDay5(state);
  const best = bestCall(state, a);
  const area = developmentArea(state, a);
  const protectedAll = a.parts.protectedCases + a.parts.customersProtected;

  const promise: PromiseSummary = {
    outcome: {
      title:
        protectedAll >= 6 ? "PROMISES PROTECTED" : protectedAll >= 3 ? "PROMISES PARTLY HELD" : "PROMISES BROKEN",
      promiseProtection: a.metrics.promiseProtection,
      customerEffort: a.metrics.customerEffortBand,
      customerEffortScore: a.metrics.customerEffort,
      metricCourage: a.metrics.metricCourage,
      needVsTransaction: a.metrics.needVsTransaction,
      ctdCost: a.parts.ctdCost,
      spend: a.parts.spend,
      wasteUnits: a.parts.waste,
    },
    promise: a.promise,
    journeys: journeys(state, a),
    prevention: CASE_IDS.map((id) => ({
      incident: INCIDENTS[id].label,
      control: state.loop.links[id] ? CONTROLS[state.loop.links[id]!].label : null,
      fits: linkFits(id, state.loop.links[id]),
    })),
    timeline: buildTimeline(state, a),
    bestCall: best,
    developmentArea: area,
    insight: insightFor(state, a),
    operatorCompetencies: operatorCompetencies(a),
    lockedByClock: state.lockedBy === "clock",
  };

  return {
    day: 5,
    score: a.score,
    band: a.band,
    bandRange: DAY_FIVE_BAND_RANGE[a.band],
    competencies: a.competencies,
    signature: a.style,
    strengths: best ? [best] : [],
    gaps: [{ title: area.area, body: area.body }],
    replay: recommendations(state, a),
    learned: LEARNED,
    sopViolations: [],
    decisionCount: Object.keys(state.milestones).length + state.inspected.length,
    promise,
    durationMs: state.completedAt ? state.completedAt - state.startedAt : (state.milestones.loop?.at ?? 0),
  };
}

export { assessDay5 };
