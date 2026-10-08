import { DIMENSIONS, type Dimension } from "@/lib/challenge/types";

/**
 * Rolling each day's own skills up into the five.
 *
 * Only Day 1 scores against the five operating skills directly. Days 2 to 5
 * each score the competencies that day was built around — nine for the
 * inventory investigation, seven for the shift build, six each for the
 * bottleneck and the customer promise — under names of their own.
 *
 * The Day 6 profile and the participant report both speak in the five, so
 * every native skill has to land in exactly one of them. This is the one place
 * that decision is made, and it is a judgement rather than a measurement, so it
 * is written down skill by skill with the reason, in the same words the
 * scorecards use. If a scorecard's description of a skill changes, this should
 * be revisited with it.
 *
 * A skill that is not listed here is ignored, not guessed at. `unmapped()`
 * exists so a test can fail loudly when a day adds a competency nobody placed.
 */

export const CORE_SKILL_OF: Record<string, Dimension> = {
  /* Day 1 · already the five */
  priority: "priority",
  reasoning: "reasoning",
  inventory: "inventory",
  team: "team",
  customer: "customer",

  /* Day 2 · the inventory investigation */
  prioritisation: "priority", // went at the money first, investigated narrowly (Days 2 and 3 share the key)
  inventoryReasoning: "inventory", // established a physical count before reasoning about the gap
  lossPrevention: "inventory", // tightened the control that failed
  processDiscipline: "inventory", // found the failed control and put it back
  rootCause: "reasoning", // rebuilt the movement trail rather than stopping at the symptom
  patternRecognition: "reasoning", // saw two variances were one event
  evidenceDiscipline: "reasoning", // conclusions after evidence; proximity versus proof
  correctiveAction: "reasoning", // fixes aimed at the mechanism and sized to the problem
  delegation: "team", // follow-up work went to the people who should own it

  /* Day 3 · building the shift */
  workforcePlanning: "team", // enough of the right capacity, built before it was needed
  skillMatching: "team", // strongest skills where they were scarce
  peopleJudgement: "team", // how two slow but accurate pickers were treated
  communicationTrust: "team", // checked facts, said what was true, asked rather than demanded
  adaptability: "priority", // re-sequenced when the forecast moved and a temp was late
  resourceDiscipline: "reasoning", // whether the money bought capacity the store needed

  /* Day 4 · the bottleneck */
  bottleneckDiagnosis: "reasoning", // found the real constraint, then relieved it
  processSequencing: "reasoning", // work moved through receiving in an order the floor could absorb
  timePriority: "priority", // lunch stock was pick-ready before lunch
  flowSpace: "inventory", // how long the floor was choked, and whether routes came back
  sopQuality: "inventory", // cold chain, QC and scan verification kept while moving fast
  commercial: "customer", // whether the floor cleared was the floor that sells

  /* Day 5 · the customer promise */
  needRecognition: "customer", // read what the customer came for, not the SKUs they typed
  customerEffort: "customer", // how much work the customer did for what they had paid for
  safetyQuality: "customer", // what was done when protecting the customer cost a metric
  ownership: "customer", // the store finished the problem rather than handing it back
  preventionMindset: "reasoning", // four failures became controls, not four recoveries
  recoveryProportionality: "reasoning", // fix sized to the failure in money, people and stock
};

export type CoreScores = Record<Dimension, number | null>;

const mean = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

/**
 * One day's native skills, rolled up. A dimension the day did not test comes
 * back null rather than zero — Day 3 has nothing on inventory, and scoring it
 * as 0 would drag the week down for a skill nobody asked about.
 */
export function coreScoresOf(
  competencies: readonly { dimension: string; score: number }[],
): CoreScores {
  const buckets = new Map<Dimension, number[]>();
  for (const entry of competencies) {
    const core = CORE_SKILL_OF[entry.dimension];
    if (!core) continue;
    const bucket = buckets.get(core) ?? [];
    bucket.push(entry.score);
    buckets.set(core, bucket);
  }

  const out = {} as CoreScores;
  for (const dimension of DIMENSIONS) {
    const scores = buckets.get(dimension);
    out[dimension] = scores && scores.length > 0 ? Math.round(mean(scores)) : null;
  }
  return out;
}

/** Native skill keys that have no home, for a test to assert is empty. */
export function unmapped(keys: readonly string[]): string[] {
  return keys.filter((key) => !(key in CORE_SKILL_OF));
}
