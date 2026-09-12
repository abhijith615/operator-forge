import { BAKING, BATCH, CONTROL_FIT, MILK, PACKING } from "./scenario";
import {
  CASE_IDS,
  type BakingState,
  type BatchState,
  type CaseId,
  type Day5State,
  type FinaleState,
  type LoopState,
  type MilkState,
  type NodeState,
  type PackingState,
  type PromiseScore,
} from "./types";

/**
 * What the customer ends up holding.
 *
 * This is the only file that decides whether a promise was protected, and it
 * reads the resulting situation rather than the buttons pressed to reach it.
 * Two different ways of keeping a cleaner away from open coriander both score
 * as segregated; two different ways of preserving a baking task both count as
 * the task preserved. That is deliberate — the spec's rule is to score the
 * customer experience, not the click.
 *
 * Each case returns the same shape: five promise dimensions, the operational
 * side effects it caused, and the state of the journey's final node.
 */

export interface CaseOutcome {
  /** 0–100 per dimension. */
  promise: PromiseScore;
  /** Where the customer's journey ends up. */
  use: NodeState;
  /** Seconds added to click-to-dispatch. */
  ctd: number;
  /** Rupees of packaging, markdown, re-pick or recovery spend. */
  cost: number;
  /** Units taken out of sale that did not need to be. */
  waste: number;
  /** One line, in the customer's terms, for the case's closing chip. */
  headline: string;
  detail: string;
}

function score(values: Partial<PromiseScore>): PromiseScore {
  return {
    usability: values.usability ?? 70,
    quality: values.quality ?? 70,
    safety: values.safety ?? 100,
    effort: values.effort ?? 80,
    trust: values.trust ?? 70,
  };
}

export function promiseMean(promise: PromiseScore): number {
  const values = Object.values(promise);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/* ── Case 1 · milk ────────────────────────────────────────────────────── */

/**
 * The question is what a household picking milk tonight ends up with. A
 * 36-hour bottle is inside policy and outside the two-to-three days a litre
 * normally lasts, so the pick face is the thing that matters — not whether the
 * short-dated stock was punished.
 */
export function milkOutcome(state: MilkState): CaseOutcome {
  const { placed } = state;
  const shortForward = placed.fresh36 === "pickface";
  const freshForward = placed.fresh72 === "pickface";
  const shortControlled = placed.fresh36 === "markdown";
  const shortDumped = placed.fresh36 === "hold";
  const shortParked = placed.fresh36 === "back";

  // Nothing on the pick face is its own failure: milk is high demand tonight.
  if (!shortForward && !freshForward) {
    return {
      promise: score({ usability: 20, quality: 70, effort: 35, trust: 35 }),
      use: "broken",
      ctd: 0,
      cost: shortDumped ? MILK.batches.fresh36.units * 32 : 0,
      waste: shortDumped ? MILK.batches.fresh36.units : 0,
      headline: "Milk unavailable",
      detail: "Nothing was left on the pick face. Tonight's milk orders have nothing to pick.",
    };
  }

  if (freshForward && !shortForward) {
    const controlled = shortControlled;
    const dumped = shortDumped;
    return {
      promise: score({
        usability: 100,
        quality: 95,
        effort: 92,
        // Writing off saleable stock is not customer protection, it is waste.
        trust: dumped ? 78 : 92,
      }),
      use: "clear",
      ctd: 0,
      cost: controlled ? 220 : dumped ? MILK.batches.fresh36.units * 32 : 0,
      waste: dumped ? MILK.batches.fresh36.units : 0,
      headline: "Customer usability protected",
      detail: controlled
        ? "Tonight's orders pick 72-hour milk. The short-dated batch sells as short-dated, priced accordingly."
        : dumped
          ? "Tonight's orders pick 72-hour milk. Eighteen sellable bottles left the store as waste."
          : shortParked
            ? "Tonight's orders pick 72-hour milk. The short-dated batch waits in the chilled room."
            : "Tonight's orders pick 72-hour milk.",
    };
  }

  if (freshForward && shortForward) {
    // Both forward: FEFO sends the 36-hour bottle first, so most customers
    // still get the short one — better than only the short batch, not much.
    return {
      promise: score({ usability: 55, quality: 72, effort: 70, trust: 62 }),
      use: "risk",
      ctd: 0,
      cost: 0,
      waste: 0,
      headline: "Mixed pick face",
      detail: "Both batches are forward. FEFO still sends the 36-hour bottle to tonight's customers first.",
    };
  }

  return {
    promise: score({ usability: 30, quality: 55, effort: 62, trust: 45 }),
    use: "broken",
    ctd: 0,
    cost: 0,
    waste: 0,
    headline: "Technically sellable · use window at risk",
    detail: "A 36-hour bottle meets the 24-hour rule and expires halfway through a normal household's litre.",
  };
}

/* ── Case 2 · baking ──────────────────────────────────────────────────── */

/** Did a baking task survive, and how much work did the customer have to do? */
export function bakingOutcome(state: BakingState): CaseOutcome {
  const chose = state.customerChose;
  const substituted = chose === "paste" || chose === "essence";
  const strength = chose === "paste" ? BAKING.substitutes.paste.strength : BAKING.substitutes.essence.strength;

  if (substituted) {
    const usability = Math.round(70 + 30 * strength);
    return {
      promise: score({
        usability,
        quality: chose === "paste" ? 96 : 84,
        effort: state.held ? 94 : 88,
        trust: 95,
      }),
      use: "clear",
      ctd: state.held ? 22 : 14,
      cost: chose === "paste" ? 40 : 0,
      waste: 0,
      headline: "Customer intent preserved",
      detail: `Five usable ingredients left the store. ${
        chose === "paste" ? "Bean paste" : "Essence"
      } went in the tote instead of a refund line.`,
    };
  }

  if (chose === "cancel" || state.resolution === "cancelled") {
    return {
      promise: score({ usability: 40, quality: 70, effort: 55, trust: 60 }),
      use: "broken",
      ctd: 0,
      cost: 0,
      waste: 0,
      headline: "Order cancelled",
      detail: "The customer asked to cancel once they saw the options. Nothing arrived, and nothing got baked.",
    };
  }

  if (state.contacted) {
    // Contacted, but only offered a refund or a bare continue.
    return {
      promise: score({ usability: 45, quality: 72, effort: 68, trust: 72 }),
      use: "risk",
      ctd: 10,
      cost: BAKING.refundValue,
      waste: 0,
      headline: "Asked, but not solved",
      detail: "The customer was told what was missing and offered nothing that would finish the cake.",
    };
  }

  return {
    promise: score({
      usability: 28,
      quality: 70,
      effort: 38,
      trust: 45,
    }),
    use: "broken",
    ctd: 0,
    cost: BAKING.refundValue,
    waste: 0,
    headline: "Four items, no task",
    detail: `Flour, butter, sugar and eggs arrived with a ₹${BAKING.refundValue} refund. The cake still cannot be made tonight.`,
  };
}

/* ── Case 3 · packing ─────────────────────────────────────────────────── */

/**
 * Safe means the acidic cleaner does not share a compartment with food the
 * customer eats unwashed. A liner around the cleaner and a second bag are both
 * valid ways to get there.
 */
export function packingSafety(state: PackingState): { safe: boolean; openFoodWithChemical: boolean } {
  const cleanerBag = state.bags.cleaner;
  const lined = state.extras.includes("liner");
  const openFood = PACKING.items.filter((item) => item.kind === "openFood");
  const sharing = openFood.filter((item) => state.bags[item.id] === cleanerBag);
  // A sealed liner keeps the chemical out of contact even in a shared bag.
  return { safe: sharing.length === 0 || lined, openFoodWithChemical: sharing.length > 0 && !lined };
}

export function packingOutcome(state: PackingState): CaseOutcome {
  const { safe, openFoodWithChemical } = packingSafety(state);
  const seconds = state.extras.reduce((sum, extra) => sum + PACKING.extras[extra].seconds, 0);
  const cost = state.extras.reduce((sum, extra) => sum + PACKING.extras[extra].cost, 0);
  const moved = PACKING.items.some((item) => state.bags[item.id] === "bag2");
  const repack = moved ? PACKING.repackSeconds - seconds : 0;
  const ctd = Math.max(0, seconds + Math.max(0, repack));

  if (safe) {
    return {
      promise: score({ usability: 92, quality: 94, safety: 100, effort: 95, trust: 92 }),
      use: "clear",
      ctd,
      cost,
      waste: 0,
      headline: "Contamination risk controlled",
      detail: `Cleaner and open produce travel apart. CTD ${PACKING.ctd} → ${PACKING.ctd + ctd} sec.`,
    };
  }

  return {
    promise: score({
      usability: 55,
      quality: 40,
      safety: openFoodWithChemical ? 15 : 45,
      effort: 60,
      trust: 30,
    }),
    use: "broken",
    ctd,
    cost,
    waste: 0,
    headline: "Chemical against open food",
    detail: `An acidic cleaner travels upright beside unwrapped coriander for 14 minutes. CTD held at ${PACKING.ctd} sec.`,
  };
}

/* ── Case 4 · infant food ─────────────────────────────────────────────── */

/**
 * Containment is what protects the next customer: the bin frozen, the live
 * picks stopped. Disposition — inspect, escalate, return — comes after, and
 * the order matters: freezing after nine minutes of selling is not the same
 * decision.
 */
export function batchOutcome(state: BatchState): CaseOutcome {
  const has = (action: BatchState["actions"][number]) => state.actions.includes(action);
  const frozen = has("freeze");
  const paused = has("pausePicks");
  const contained = frozen && paused;
  const escalated = has("escalate");
  const inspected = has("inspect");
  const waited = has("wait") || has("continue");
  const onlyOne = has("removeOne") && !frozen;

  const exposure = contained ? 0 : frozen || paused ? 1 : BATCH.ordersAffected;

  if (contained) {
    return {
      promise: score({
        usability: 90,
        quality: escalated || inspected ? 98 : 88,
        safety: 100,
        effort: 95,
        trust: 96,
      }),
      use: "clear",
      ctd: 0,
      cost: 0,
      // Freezing pending inspection is containment, not disposal.
      waste: 0,
      headline: "Future customer exposure contained",
      detail: `Three live orders stopped, ${BATCH.units} units frozen pending inspection.`,
    };
  }

  if (frozen || paused) {
    return {
      promise: score({ usability: 78, quality: 76, safety: 65, effort: 82, trust: 74 }),
      use: "risk",
      ctd: 0,
      cost: 0,
      waste: 0,
      headline: "Partly contained",
      detail: frozen
        ? "The bin is frozen, but orders already holding the batch went out."
        : "Live picks stopped, and the bin kept selling to new orders.",
    };
  }

  if (onlyOne) {
    return {
      promise: score({ usability: 70, quality: 45, safety: 30, effort: 70, trust: 40 }),
      use: "broken",
      ctd: 0,
      cost: 0,
      waste: 1,
      headline: "One jar removed, 24 live",
      detail: `The reported jar was pulled. ${BATCH.units} jars of BF-0911-A stayed on sale across ${BATCH.activeWaves} pick waves.`,
    };
  }

  return {
    promise: score({
      usability: 68,
      quality: 35,
      safety: waited ? 18 : 25,
      effort: 62,
      trust: 25,
    }),
    use: "broken",
    ctd: 0,
    cost: 0,
    waste: 0,
    headline: `${exposure} orders still exposed`,
    detail: waited
      ? "The batch kept selling while the store waited for instruction. The next customer finds the next one."
      : "Nothing was contained. The batch kept picking into live orders.",
  };
}

/* ── The finale ───────────────────────────────────────────────────────── */

export interface CustomerRecovery {
  protected: boolean;
  promise: PromiseScore;
  headline: string;
  detail: string;
  /** Resource weight spent on this customer, for proportionality. */
  spend: number;
}

/**
 * Three customers, three different kinds of ownership. Each is protected by
 * the resource that fits it — not by whichever resource is most expensive.
 */
export function finaleOutcome(state: FinaleState): Record<"iceCream" | "breakfast" | "elderly", CustomerRecovery> {
  const owner = (resource: keyof FinaleState["assigned"]) => state.assigned[resource] ?? null;
  const money = state.spend;

  const thermal = owner("thermal") === "iceCream";
  const route = owner("route") === "iceCream";
  const iceProtected = thermal || route;
  const iceCream: CustomerRecovery = {
    protected: iceProtected,
    promise: score({
      usability: iceProtected ? (thermal && route ? 100 : 94) : 25,
      quality: iceProtected ? 95 : 20,
      safety: 100,
      effort: iceProtected ? 95 : 45,
      trust: iceProtected ? 94 : 35,
    }),
    headline: iceProtected ? "Arrives frozen" : "Arrives melted",
    detail: iceProtected
      ? thermal && route
        ? "Thermal pouch and a direct drop. Both were not needed, but it arrives frozen."
        : thermal
          ? "Insulated pouch and gel pads hold it across a 14-minute run at 42°C."
          : "A direct drop cuts the transit short enough to hold its condition."
      : "Fourteen minutes in a side box at 42°C. The customer opens soup.",
    spend:
      (thermal ? 1 : 0) +
      (route ? 1 : 0) +
      (owner("manager") === "iceCream" ? 4 : 0) +
      (owner("associate") === "iceCream" ? 2 : 0) +
      money.iceCream / 50,
  };

  const repicked = owner("associate") === "breakfast" || owner("manager") === "breakfast";
  const breakfast: CustomerRecovery = {
    protected: repicked,
    promise: score({
      usability: repicked ? 96 : 30,
      quality: repicked ? 94 : 25,
      safety: repicked ? 100 : 70,
      effort: repicked ? 92 : 40,
      trust: repicked ? 93 : 32,
    }),
    headline: repicked ? "Usable breakfast" : "Dented eggs delivered",
    detail: repicked
      ? owner("associate") === "breakfast"
        ? "The floor associate re-picks eggs and bread in 45 seconds and the rider leaves with it."
        : "You re-picked it yourself. It works — and you were the only manager on the floor."
      : "A dented carton and bruised bread reach the door. The customer raises a ticket for a breakfast they already paid for.",
    spend:
      (owner("associate") === "breakfast" ? 1 : 0) +
      (owner("manager") === "breakfast" ? 4 : 0) +
      (owner("route") === "breakfast" ? 1 : 0) +
      money.breakfast / 50,
  };

  const authorised = owner("manager") === "elderly";
  const incentive = money.elderly > 0;
  const elderlyProtected = authorised || incentive;
  const elderly: CustomerRecovery = {
    protected: elderlyProtected,
    promise: score({
      usability: elderlyProtected ? 95 : 20,
      quality: 90,
      safety: 100,
      effort: elderlyProtected ? 90 : 20,
      trust: elderlyProtected ? 95 : 25,
    }),
    headline: elderlyProtected ? "Delivered to the door" : "Marked unavailable",
    detail: elderlyProtected
      ? authorised
        ? "You authorised the walking time, the bike parks securely and the order reaches the fourth floor."
        : "A discretionary incentive covers the walk, and the order reaches the door."
      : "A customer who cannot come down is recorded as unavailable, and 6 kg of groceries go back to the store.",
    spend:
      (authorised ? 4 : 0) +
      (owner("associate") === "elderly" ? 2 : 0) +
      (owner("thermal") === "elderly" ? 1 : 0) +
      money.elderly / 50,
  };

  return { iceCream, breakfast, elderly };
}

/* ── Close the loop ───────────────────────────────────────────────────── */

export function loopCorrect(state: LoopState): number {
  return CASE_IDS.filter((id) => {
    const control = state.links[id];
    return control !== undefined && CONTROL_FIT[id].includes(control);
  }).length;
}

/* ── Everything, for the scoring and the scorecard ────────────────────── */

export function caseOutcomes(state: Day5State): Record<CaseId, CaseOutcome> {
  return {
    milk: milkOutcome(state.milk),
    baking: bakingOutcome(state.baking),
    packing: packingOutcome(state.packing),
    batch: batchOutcome(state.batch),
  };
}

/** The five promise dimensions across every case and customer, 0–100. */
export function promiseProfile(state: Day5State): PromiseScore {
  const outcomes = Object.values(caseOutcomes(state));
  const recoveries = Object.values(finaleOutcome(state.finale));
  const all = [...outcomes.map((entry) => entry.promise), ...recoveries.map((entry) => entry.promise)];
  const sum = all.reduce(
    (total, promise) => ({
      usability: total.usability + promise.usability,
      quality: total.quality + promise.quality,
      safety: total.safety + promise.safety,
      effort: total.effort + promise.effort,
      trust: total.trust + promise.trust,
    }),
    { usability: 0, quality: 0, safety: 0, effort: 0, trust: 0 },
  );
  const count = Math.max(1, all.length);
  return {
    usability: Math.round(sum.usability / count),
    quality: Math.round(sum.quality / count),
    safety: Math.round(sum.safety / count),
    effort: Math.round(sum.effort / count),
    trust: Math.round(sum.trust / count),
  };
}
