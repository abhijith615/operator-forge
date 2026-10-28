/**
 * FC Executive — what is measured and how much each part counts.
 *
 * Five competencies at 20% each, as the brief sets them. Kept apart from the
 * store-manager test's weights on purpose: the two tests share nothing in
 * scoring.
 */

export const FC_VERSION = "fc-1.0";
/** Stored in `hiring_assessments.role_id`; how an FC attempt is told apart from a store-manager one. */
export const FC_ROLE_ID = "fc_exec";
export const FC_SECONDS = 30 * 60;

export const FC_COMPETENCIES = ["IP", "DP", "DR", "IQ", "TL"] as const;
export type FcCompetencyId = (typeof FC_COMPETENCIES)[number];

export const FC_COMPETENCY_LABEL: Record<FcCompetencyId, string> = {
  IP: "Inbound Process Control",
  DP: "Vendor Scheduling & Dock Planning",
  DR: "Data Handling & Reporting",
  IQ: "Issue Resolution & Quality Control",
  TL: "Team Leadership & Communication",
};

/** The same areas in everyday words, for the candidate and the employer brief. */
export const FC_COMPETENCY_PLAIN: Record<FcCompetencyId, { name: string; about: string }> = {
  IP: { name: "Receiving control", about: "Checks before unloading, correct counts, GRN only after QC, clean putaway and returns." },
  DP: { name: "Dock planning", about: "Booking trucks onto docks, handling late and unbooked trucks, keeping crews and docks busy." },
  DR: { name: "Working with data", about: "Reading the tracker, checking numbers before sending, clear shift updates." },
  IQ: { name: "Fixing problems", about: "Finding out what really happened, handling damage, protecting QC, stopping repeats." },
  TL: { name: "Leading people", about: "Staffing the floor, moving people when work changes, delegating, talking to vendors and teams." },
};

export const FC_WEIGHTS: Record<FcCompetencyId, number> = { IP: 0.2, DP: 0.2, DR: 0.2, IQ: 0.2, TL: 0.2 };
