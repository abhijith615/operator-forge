/**
 * The provisional SME weights for the Hiring Test.
 *
 * One place, read by the scorer and by every screen that shows a weight. They
 * are provisional: a judgement by subject-matter experts about what the job
 * consists of, not a result of validation against job performance. When that
 * data exists these are the numbers it will revise.
 */

export const COMPETENCIES = [
  "teamManagement",
  "inventoryManagement",
  "timePrioritisation",
  "criticalThinking",
  "customerFirst",
] as const;

export type CompetencyId = (typeof COMPETENCIES)[number];

export const assessmentWeights: Record<CompetencyId, number> = {
  teamManagement: 0.3,
  inventoryManagement: 0.25,
  timePrioritisation: 0.2,
  criticalThinking: 0.15,
  customerFirst: 0.1,
};

export const COMPETENCY_LABEL: Record<CompetencyId, string> = {
  teamManagement: "Team Management",
  inventoryManagement: "Inventory Management",
  timePrioritisation: "Time & Priority",
  criticalThinking: "Critical Thinking",
  customerFirst: "Customer-First",
};

/**
 * The simulation's version. It changes whenever the store itself does —
 * the people, the workflows, the rules that turn decisions into numbers —
 * because an attempt can only be replayed by the engine it was played on.
 *
 * 1.0  Evening shift; picking, packing, dispatch and replenishment stations.
 * 2.0  Morning shift; picking (with packing), putaway and auditing, device
 *      locks, riders, the sixteen-second item and the morning round.
 */
export const ASSESSMENT_VERSION = "2.0";
/**
 * When this version went live. Only used where the database cannot say which
 * version an attempt was sat on: anything started before this was not this one.
 */
export const CURRENT_SINCE = Date.parse("2026-10-12T10:00:00Z");
/** Wall-clock cap. The store itself runs on actions, not on this. */
export const ASSESSMENT_SECONDS = 30 * 60;
