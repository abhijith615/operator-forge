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

export const ASSESSMENT_VERSION = "1.0";
/** Wall-clock cap. The store itself runs on actions, not on this. */
export const ASSESSMENT_SECONDS = 30 * 60;
