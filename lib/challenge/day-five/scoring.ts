import { fundLeft, linkFits, packingSeconds, reached } from "./engine";
import {
  batchOutcome,
  caseOutcomes,
  finaleOutcome,
  loopCorrect,
  packingSafety,
  promiseMean,
  promiseProfile,
  type CaseOutcome,
} from "./outcome";
import { BAKING, BATCH, FUND_TOTAL, PACKING } from "./scenario";
import {
  CASE_IDS,
  DAY_FIVE_DIMENSIONS,
  DAY_FIVE_DIMENSION_BLURB,
  DAY_FIVE_DIMENSION_LABEL,
  type CaseId,
  type Day5Dimension,
  type Day5State,
  type Day5Tag,
  type Phase,
  type PromiseScore,
} from "./types";
import type { CompetencyScore } from "../types";

/**
 * Day 5 assessment.
 *
 * Read from what the customer ended up holding, never from which button
 * produced it. Two different ways of keeping a cleaner away from open produce
 * both score as safe; two different ways of preserving a baking task both
 * score as the task preserved. What separates a high score from a low one is
 * whether the person waiting got the thing they actually came for, and whether
 * the store paid a proportionate price to make that happen.
 */

export const DAY_FIVE_WEIGHTS: Record<Day5Dimension, number> = {
  needRecognition: 0.25,
  safetyQuality: 0.2,
  ownership: 0.15,
  customerEffort: 0.15,
  recoveryProportionality: 0.15,
  preventionMindset: 0.1,
};

export type Day5Band =
  | "Needs Foundation"
  | "Developing Operator"
  | "Capable Customer Operator"
  | "Strong Customer Advocate"
  | "Exceptional Day 5 Performance";

export function day5Band(score: number): Day5Band {
  if (score < 50) return "Needs Foundation";
  if (score < 65) return "Developing Operator";
  if (score < 80) return "Capable Customer Operator";
  if (score < 90) return "Strong Customer Advocate";
  return "Exceptional Day 5 Performance";
}

export const DAY_FIVE_BAND_RANGE: Record<Day5Band, string> = {
  "Needs Foundation": "Below 50",
  "Developing Operator": "50–64",
  "Capable Customer Operator": "65–79",
  "Strong Customer Advocate": "80–89",
  "Exceptional Day 5 Performance": "90–100",
};

/**
 * An honest first attempt is not told it scored 11 — but the floor has to sit
 * low enough that the three ways of failing this day stay distinguishable.
 */
const SOFT_FLOOR = 28;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lin(value: number, zero: number, full: number): number {
  return Math.round(clamp01((value - zero) / (full - zero)) * 100);
}

export interface Day5Assessment {
  dims: Record<Day5Dimension, number>;
  competencies: CompetencyScore[];
  score: number;
  band: Day5Band;
  tags: Day5Tag[];
  style: { name: string; blurb: string };
  cases: Record<CaseId, CaseOutcome>;
  promise: PromiseScore;
  metrics: {
    /** Promises protected, out of five journeys — four cases and the finale. */
    promiseProtection: number;
    /** 0–100; high means the customer did almost none of the work. */
    customerEffort: number;
    customerEffortBand: "Low" | "Moderate" | "High";
    /** Whether legitimate customer protection was allowed to cost something. */
    metricCourage: number;
    /** Whether intent was read past the SKU list. */
    needVsTransaction: number;
  };
  parts: {
    protectedCases: number;
    customersProtected: number;
    ctdCost: number;
    spend: number;
    waste: number;
    fundUsed: number;
    resourcesUsed: number;
    managerUsedWell: boolean;
    loopCorrect: number;
    courageMoments: number;
    courageTaken: number;
  };
}

export function assessDay5(state: Day5State): Day5Assessment {
  const cases = caseOutcomes(state);
  const recoveries = finaleOutcome(state.finale);
  const promise = promiseProfile(state);
  const milk = state.milk;
  const baking = state.baking;
  const packing = state.packing;
  const batch = state.batch;
  const safety = packingSafety(packing);

  const protectedCases = CASE_IDS.filter((id) => cases[id].use === "clear").length;
  const customersProtected = Object.values(recoveries).filter((entry) => entry.protected).length;

  /* ── Customer need recognition ── */
  // Reading the situation before acting, and acting on what was read.
  const milkNeed = milk.placed.fresh72 === "pickface" ? 100 : milk.placed.fresh36 === "pickface" ? 25 : 55;
  const milkEvidence = milk.useSignalSeen ? 100 : 55;
  const bakingNeed =
    baking.customerChose === "paste" || baking.customerChose === "essence"
      ? 100
      : baking.contacted
        ? 65
        : baking.resolution === "cancelled"
          ? 30
          : 15;
  const bakingEvidence = baking.dependencySeen ? 100 : baking.inspected.length > 0 ? 60 : 30;
  const finaleNeed = Math.round((customersProtected / 3) * 100);
  const needRecognition = Math.round(
    0.24 * milkNeed + 0.1 * milkEvidence + 0.28 * bakingNeed + 0.1 * bakingEvidence + 0.28 * finaleNeed,
  );

  /* ── Safety and quality ── */
  const packSafe = safety.safe ? 100 : safety.openFoodWithChemical ? 10 : 45;
  const contained = batch.actions.includes("freeze") && batch.actions.includes("pausePicks");
  const batchScore = contained
    ? batch.actions.includes("escalate") || batch.actions.includes("inspect")
      ? 100
      : 88
    : batch.actions.includes("freeze") || batch.actions.includes("pausePicks")
      ? 60
      : batch.actions.includes("removeOne")
        ? 28
        : 12;
  const milkQuality = milk.placed.fresh36 === "pickface" ? 45 : 100;
  // Following the written rule everywhere is worth something on its own, even
  // when it misses the customer entirely — that is what separates a compliant
  // operator from one closing tickets.
  const compliance = milk.policySeen || batch.evidenceSeen ? 8 : 0;
  const safetyQuality = Math.min(
    100,
    Math.round(0.4 * packSafe + 0.4 * batchScore + 0.2 * milkQuality) + compliance,
  );

  /* ── Ownership ── */
  // Did the store finish the problem, or hand it back to the customer?
  const bakingOwned = baking.contacted ? (baking.held ? 100 : 85) : baking.resolution === "refunded" ? 20 : 45;
  const batchOwned = batch.actions.includes("wait") ? 25 : contained ? 100 : batch.actions.length > 0 ? 60 : 15;
  const breakfastOwned = recoveries.breakfast.protected ? 100 : 25;
  const elderlyOwned = recoveries.elderly.protected ? 100 : 20;
  const ownership = Math.round(
    0.3 * bakingOwned + 0.25 * batchOwned + 0.22 * breakfastOwned + 0.23 * elderlyOwned,
  );

  /* ── Customer effort ── */
  const effortScore = Math.round(promise.effort);
  const ticketsRaised =
    (cases.milk.use === "broken" ? 1 : 0) +
    (cases.baking.use !== "clear" ? 1 : 0) +
    (cases.packing.use === "broken" ? 1 : 0) +
    (cases.batch.use === "broken" ? 1 : 0) +
    (recoveries.breakfast.protected ? 0 : 1) +
    (recoveries.elderly.protected ? 0 : 1);
  const customerEffort = Math.round(0.65 * effortScore + 0.35 * lin(ticketsRaised, 5, 0));

  /* ── Recovery proportionality ── */
  const fundUsed = FUND_TOTAL - fundLeft(state.finale);
  const assigned = Object.values(state.finale.assigned);
  const resourcesUsed = assigned.length;
  const managerOn = state.finale.assigned.manager ?? null;
  // The manager slot is worth spending where nothing else can authorise the fix.
  const managerUsedWell = managerOn === "elderly";
  const managerWasted = managerOn !== null && managerOn !== "elderly";
  const spend = Object.values(cases).reduce((sum, entry) => sum + entry.cost, 0) + fundUsed;
  const waste = Object.values(cases).reduce((sum, entry) => sum + entry.waste, 0);
  // Spending nothing because nothing was attempted is not discipline. The
  // ceiling on proportionality is set by how much was actually protected.
  const protectedShare = (protectedCases + customersProtected) / 7;
  let proportion = Math.round(45 + 55 * protectedShare);
  if (managerWasted) proportion -= 22;
  if (!managerUsedWell && !recoveries.elderly.protected) proportion -= 10;
  // Money where a bag or a person would have done.
  if (state.finale.spend.iceCream > 0) proportion -= 14;
  if (state.finale.spend.breakfast > 0) proportion -= 12;
  if (fundUsed >= 200) proportion -= 12;
  if (waste > 0) proportion -= 18;
  if (milk.placed.fresh36 === "hold") proportion -= 6;
  if (baking.resolution === "cancelled" && !baking.contacted) proportion -= 15;
  if (packing.extras.length === 2 && safety.safe) proportion -= 6;
  if (batch.actions.includes("continue")) proportion -= 10;
  const recoveryProportionality = Math.max(0, Math.min(100, proportion));

  /* ── Prevention ── */
  const correctLinks = loopCorrect(state.loop);
  const linked = CASE_IDS.filter((id) => state.loop.links[id] !== undefined).length;
  const preventionMindset = Math.round(
    linked === 0 ? 10 : 25 + (correctLinks / CASE_IDS.length) * 75,
  );

  // Recovering everything and preventing nothing is a real shape, and it is
  // not a 90-scoring evening: the store is exactly as likely to repeat tonight.
  const preventionDrag = preventionMindset < 30 ? 0.9 : preventionMindset < 50 ? 0.96 : 1;

  const dims: Record<Day5Dimension, number> = {
    needRecognition,
    safetyQuality,
    ownership,
    customerEffort,
    recoveryProportionality,
    preventionMindset,
  };

  /* ── Metric courage ── */
  // Moments where protecting the customer legitimately costs something, and
  // whether the operator paid it. Overspending is not courage.
  const courage: { taken: boolean }[] = [
    // Markdown exposure rather than a short-dated pick face.
    { taken: milk.placed.fresh72 === "pickface" },
    // Holding a tote out of the packing flow to fix it.
    { taken: baking.held || baking.contacted },
    // Seconds and packaging against a 180-second target.
    { taken: safety.safe && packingSeconds(packing) > 0 },
    // Freezing sellable stock on one report.
    { taken: batch.actions.includes("freeze") },
    // Rider time and walking effort for a customer who cannot come down.
    { taken: recoveries.elderly.protected },
  ];
  const courageTaken = courage.filter((entry) => entry.taken).length;
  const metricCourage = Math.round((courageTaken / courage.length) * 100);

  /* ── Need vs transaction ── */
  const needVsTransaction = Math.round(
    (((milk.placed.fresh72 === "pickface" ? 1 : 0) +
      (baking.customerChose === "paste" || baking.customerChose === "essence" ? 1 : 0) +
      (recoveries.iceCream.protected ? 1 : 0) +
      (recoveries.breakfast.protected ? 1 : 0)) /
      4) *
      100,
  );

  const promiseProtection =
    Math.round(((protectedCases + customersProtected / 3) / 5) * 10 * 10) / 10 / 2 + 0;

  const weighted = DAY_FIVE_DIMENSIONS.reduce(
    (sum, dimension) => sum + dims[dimension] * DAY_FIVE_WEIGHTS[dimension],
    0,
  );
  // Sending an acidic cleaner against unwrapped food, or leaving a defective
  // infant-food batch live, are customer-harm outcomes rather than slow ones.
  const integrity =
    (safety.openFoodWithChemical ? 0.9 : 1) *
    (batchOutcome(batch).use === "broken" ? 0.93 : 1) *
    preventionDrag;
  const score = Math.max(0, Math.min(100, Math.round(Math.max(SOFT_FLOOR, weighted * integrity))));

  const competencies: CompetencyScore[] = DAY_FIVE_DIMENSIONS.map((dimension) => ({
    dimension,
    label: DAY_FIVE_DIMENSION_LABEL[dimension],
    score: Math.max(SOFT_FLOOR, dims[dimension]),
    blurb: DAY_FIVE_DIMENSION_BLURB[dimension],
  }));

  const assessment: Day5Assessment = {
    dims,
    competencies,
    score,
    band: day5Band(score),
    tags: [],
    style: { name: "", blurb: "" },
    cases,
    promise,
    metrics: {
      promiseProtection: Math.round((protectedCases + customersProtected / 3) * 10) / 10,
      customerEffort,
      customerEffortBand: customerEffort >= 80 ? "Low" : customerEffort >= 60 ? "Moderate" : "High",
      metricCourage,
      needVsTransaction,
    },
    parts: {
      protectedCases,
      customersProtected,
      ctdCost: Object.values(cases).reduce((sum, entry) => sum + entry.ctd, 0),
      spend,
      waste,
      fundUsed,
      resourcesUsed,
      managerUsedWell,
      loopCorrect: correctLinks,
      courageMoments: courage.length,
      courageTaken,
    },
  };
  void promiseProtection;
  void promiseMean;

  assessment.tags = deriveTags(state, assessment);
  assessment.style = decisionStyle(state, assessment);
  return assessment;
}

/* ── Behavioural tags ─────────────────────────────────────────────────── */

function deriveTags(state: Day5State, a: Day5Assessment): Day5Tag[] {
  const tags: Day5Tag[] = [];
  const add = (tag: Day5Tag, when: boolean) => {
    if (when) tags.push(tag);
  };
  const milk = state.milk;
  const baking = state.baking;
  const packing = state.packing;
  const batch = state.batch;
  const finale = state.finale;
  const recoveries = finaleOutcome(finale);
  const safety = packingSafety(packing);

  add("milk_usage_window_considered", milk.useSignalSeen && milk.placed.fresh72 === "pickface");
  add("milk_technical_compliance_only", milk.placed.fresh36 === "pickface");
  add("older_batch_controlled", milk.placed.fresh36 === "markdown" || milk.placed.fresh36 === "back");
  add("fresh_batch_moved_forward", milk.placed.fresh72 === "pickface");
  add("unnecessary_inventory_disposal", milk.placed.fresh36 === "hold");

  add("basket_context_recognised", baking.dependencySeen);
  add("baking_dependency_recognised", baking.dependencySeen && baking.inspected.includes("vanilla"));
  add("substitution_checked", baking.substitutesChecked);
  add("customer_contact_used", baking.contacted);
  add("order_dispatched_without_context", baking.resolution === "refunded");
  add("unnecessary_cancellation", baking.resolution === "cancelled" && !baking.contacted);

  add("chemical_food_segregated", safety.safe);
  add("extra_packaging_used", packing.extras.length > 0);
  add("ctd_prioritised_over_safety", !safety.safe);
  add("contamination_risk_created", safety.openFoodWithChemical);

  add("infant_batch_frozen", batch.actions.includes("freeze"));
  add("active_picks_paused", batch.actions.includes("pausePicks"));
  add(
    "future_customer_exposure_contained",
    batch.actions.includes("freeze") && batch.actions.includes("pausePicks"),
  );
  add("waited_for_additional_complaints", batch.actions.includes("wait") || batch.actions.includes("continue"));
  add("quality_escalated", batch.actions.includes("escalate"));
  add("single_unit_removed_only", batch.actions.includes("removeOne") && !batch.actions.includes("freeze"));

  add("thermal_protection_selected", finale.assigned.thermal === "iceCream");
  add("route_split_selected", finale.assigned.route === "iceCream");
  add("damaged_items_repicked", recoveries.breakfast.protected);
  add("damaged_order_dispatched", !recoveries.breakfast.protected);
  add("elderly_accessibility_supported", recoveries.elderly.protected);
  add("customer_marked_unavailable_too_early", !recoveries.elderly.protected);
  add("manager_resource_used_well", a.parts.managerUsedWell);
  add(
    "manager_resource_wasted",
    finale.assigned.manager !== undefined && finale.assigned.manager !== "elderly",
  );
  add("floor_associate_delegated", finale.assigned.associate === "breakfast");
  add("recovery_budget_proportionate", a.parts.fundUsed <= 100 && a.dims.recoveryProportionality >= 75);
  add("recovery_budget_overspent", a.parts.fundUsed >= 200 || finale.spend.iceCream > 0);

  add("preventive_control_linked", a.parts.loopCorrect >= 3);
  add("prevention_incomplete", a.parts.loopCorrect <= 1);

  add("customer_effort_minimised", a.metrics.customerEffort >= 80);
  add(
    "technical_process_followed_but_need_missed",
    milk.placed.fresh36 === "pickface" && baking.resolution === "refunded",
  );
  return tags;
}

/**
 * When each tag becomes true of the evening, so a mid-run event never reports
 * a judgement about a case the operator has not reached.
 */
const TAG_PHASE: Partial<Record<Day5Tag, Phase>> = {
  milk_usage_window_considered: "milk",
  milk_technical_compliance_only: "baking",
  older_batch_controlled: "baking",
  fresh_batch_moved_forward: "baking",
  unnecessary_inventory_disposal: "baking",
  basket_context_recognised: "baking",
  baking_dependency_recognised: "baking",
  substitution_checked: "baking",
  customer_contact_used: "baking",
  order_dispatched_without_context: "packing",
  unnecessary_cancellation: "packing",
  chemical_food_segregated: "batch",
  extra_packaging_used: "packing",
  ctd_prioritised_over_safety: "batch",
  contamination_risk_created: "batch",
  infant_batch_frozen: "batch",
  active_picks_paused: "batch",
  future_customer_exposure_contained: "finale",
  waited_for_additional_complaints: "finale",
  quality_escalated: "batch",
  single_unit_removed_only: "finale",
  thermal_protection_selected: "finale",
  route_split_selected: "finale",
  damaged_items_repicked: "loop",
  damaged_order_dispatched: "loop",
  elderly_accessibility_supported: "loop",
  customer_marked_unavailable_too_early: "loop",
  manager_resource_used_well: "loop",
  manager_resource_wasted: "loop",
  floor_associate_delegated: "loop",
  recovery_budget_proportionate: "loop",
  recovery_budget_overspent: "loop",
  preventive_control_linked: "done",
  prevention_incomplete: "done",
  customer_effort_minimised: "done",
  technical_process_followed_but_need_missed: "packing",
};

export function tagsSoFar(state: Day5State): Day5Tag[] {
  return assessDay5(state).tags.filter((tag) => {
    const phase = TAG_PHASE[tag];
    return !phase || reached(state, phase);
  });
}

/* ── Decision style ───────────────────────────────────────────────────── */

interface StyleRule {
  name: string;
  blurb: string;
  test: (state: Day5State, a: Day5Assessment) => boolean;
}

/** Deterministic, checked in order: specific shapes above general ones. */
const STYLES: StyleRule[] = [
  {
    name: "Out of Time · Promises Unfinished",
    blurb:
      "The clock closed the evening before you did. What was still open ran on the automated path — the refund, the tote as packed, the batch still selling.",
    test: (state) => state.lockedBy === "clock",
  },
  {
    name: "Fast Ticket Closer",
    blurb:
      "Every case was closed quickly and none of them were understood. A refund raised before anyone read the basket closes a ticket and leaves the customer exactly where they started.",
    test: (state, a) =>
      state.baking.resolution === "refunded" &&
      a.dims.needRecognition < 55 &&
      a.dims.ownership < 55 &&
      state.inspected.length <= 1,
  },
  {
    name: "Policy-Compliant · Experience-Blind",
    blurb:
      "You did what the system allowed at every step, and you checked what it allowed. The system permits a 36-hour bottle on the pick face and a missing vanilla as a refund — that is what it is for, and it is not the same as customer judgement.",
    test: (state, a) =>
      state.milk.placed.fresh36 === "pickface" &&
      a.dims.needRecognition < 65 &&
      state.inspected.length >= 2,
  },
  {
    name: "SLA-First Operator",
    blurb:
      "Fast, compliant and inside target. Tonight's customers opened something that met every internal rule and none of their own — the metric was protected and the promise was not.",
    test: (_state, a) => a.dims.safetyQuality < 60 && a.metrics.metricCourage <= 40,
  },
  {
    name: "Generous but Inefficient",
    blurb:
      "Every customer was protected, and several were protected twice. Money and manager time went where a thermal pouch or a floor associate would have done the same job.",
    test: (state, a) =>
      a.metrics.promiseProtection >= 4 &&
      a.dims.recoveryProportionality < 62 &&
      (a.parts.fundUsed >= 150 || state.finale.assigned.manager === "iceCream"),
  },
  {
    name: "Safety-First · Low Commercial Judgement",
    blurb:
      "Nothing unsafe reached a customer. Sellable stock left the store as waste to make that true, and one recoverable order was cancelled rather than solved.",
    test: (_state, a) => a.dims.safetyQuality >= 85 && a.dims.recoveryProportionality < 62,
  },
  {
    name: "Strong Recoverer · Weak Preventer",
    blurb:
      "You handled all five failures well and left them as five failures. Nothing you learned tonight became a control that stops the sixth.",
    test: (_state, a) => a.metrics.promiseProtection >= 3.5 && a.dims.preventionMindset < 45,
  },
  {
    name: "Customer Advocate · Strong Operator",
    blurb:
      "You read what each customer actually came for, protected it, and paid a proportionate price to do so. The evening cost the store a little and cost the customers nothing.",
    test: (_state, a) =>
      a.dims.needRecognition >= 85 &&
      a.dims.safetyQuality >= 80 &&
      a.dims.recoveryProportionality >= 75 &&
      a.dims.preventionMindset >= 70 &&
      a.metrics.metricCourage >= 80,
  },
  {
    name: "High-Ownership Operator",
    blurb:
      "Nothing got handed back to the person waiting. You finished problems inside the store — including the two that would have been easier to pass on.",
    test: (_state, a) => a.dims.ownership >= 88 && a.dims.customerEffort >= 80,
  },
  {
    name: "Balanced Customer-First Manager",
    blurb:
      "You weighed the customer's outcome against what protecting it cost, and neither one was allowed to win automatically. That is the judgement the day is about.",
    test: () => true,
  },
];

function decisionStyle(state: Day5State, a: Day5Assessment): { name: string; blurb: string } {
  const rule = STYLES.find((candidate) => candidate.test(state, a));
  return rule ? { name: rule.name, blurb: rule.blurb } : { name: "Balanced Customer-First Manager", blurb: "" };
}

/** Day 5 read against the five competencies every day reports into. */
export function operatorCompetencies(a: Day5Assessment): Record<string, number> {
  const mean = (...values: number[]) => Math.round(values.reduce((s, v) => s + v, 0) / values.length);
  return {
    priority: mean(a.dims.ownership, a.dims.recoveryProportionality),
    reasoning: mean(a.dims.needRecognition, a.dims.preventionMindset),
    inventory: mean(a.dims.safetyQuality, a.dims.recoveryProportionality),
    team: a.dims.ownership,
    customer: mean(a.dims.needRecognition, a.dims.customerEffort, a.dims.safetyQuality),
  };
}

export { BAKING, BATCH, PACKING };
