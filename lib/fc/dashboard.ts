import "server-only";

import { fcResultFrom, isCurrentFc, type FcAdminRow } from "./server";
import { FC_COMPETENCIES, FC_COMPETENCY_LABEL, FC_SECONDS, FC_VERSION, type FcCompetencyId } from "./weights";

/**
 * The FC Executive test, as the admin panel sees it.
 *
 * Every number is read off the same replay the employer profile is built
 * from, so the panel and the profile cannot disagree. Only attempts on the
 * current version are counted; earlier ones are reported as a count only.
 * Candidates start with a name and a WhatsApp number and no sign-in, so each
 * attempt is its own row: a typed name does not identify a person.
 */

export const FC_INDICATIONS = [
  { key: "STRONG", label: "Strong · proceed to interview" },
  { key: "PROMISING", label: "Promising · probe specific areas" },
  { key: "MIXED", label: "Mixed evidence · review" },
  { key: "ADDITIONAL", label: "Additional assessment" },
] as const;

export type FcIndicationKey = (typeof FC_INDICATIONS)[number]["key"];

export interface FcAttemptSummary {
  id: string;
  name: string;
  phone: string | null;
  startedAt: string;
  device: string | null;
  state: "in_progress" | "completed" | "not_completed";
  score: number | null;
  indication: FcIndicationKey | null;
  flags: number;
  observed: number;
  opportunities: number;
  competencies: Record<FcCompetencyId, number> | null;
}

export interface FcDashboardData {
  version: string;
  attempts: FcAttemptSummary[];
  totals: {
    candidates: number;
    finished: number;
    completed: number;
    notCompleted: number;
    inProgress: number;
    flagged: number;
    average: number | null;
  };
  indications: { key: FcIndicationKey; label: string; count: number }[];
  competencies: { id: FcCompetencyId; label: string; average: number | null }[];
  earlier: number;
}

const mean = (values: number[]): number | null =>
  values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;

/** Past its time limit with no finish saved: the candidate left, and the clock closed it. */
export function timedOut(row: FcAdminRow): boolean {
  const limit = (row.time_limit_seconds ?? FC_SECONDS) * 1000;
  return Date.now() - Date.parse(row.started_at) > limit + 5 * 60 * 1000;
}

function summarise(row: FcAdminRow): FcAttemptSummary {
  const base = {
    id: row.id,
    name: row.candidate_name?.trim() || "Unnamed candidate",
    phone: row.candidate_phone ?? null,
    startedAt: row.started_at,
    device: row.device_type,
  };
  if (row.status === "in_progress" && !timedOut(row)) {
    return { ...base, state: "in_progress", score: null, indication: null, flags: 0, observed: 0, opportunities: 0, competencies: null };
  }
  const { result } = fcResultFrom(row.actions);
  return {
    ...base,
    state: result.incomplete ? "not_completed" : "completed",
    score: result.overall,
    indication: result.indication,
    flags: result.flags.length,
    observed: result.observed,
    opportunities: result.opportunities,
    competencies: Object.fromEntries(result.competencies.map((c) => [c.id, c.score])) as Record<FcCompetencyId, number>,
  };
}

export function buildFcDashboard(rows: FcAdminRow[]): FcDashboardData {
  const current = rows.filter(isCurrentFc);
  const attempts = current.map(summarise).sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  const finished = attempts.filter((entry) => entry.state !== "in_progress");
  const completed = finished.filter((entry) => entry.state === "completed");

  return {
    version: FC_VERSION,
    attempts,
    totals: {
      candidates: attempts.length,
      finished: finished.length,
      completed: completed.length,
      notCompleted: finished.length - completed.length,
      inProgress: attempts.length - finished.length,
      flagged: finished.filter((entry) => entry.flags > 0).length,
      average: mean(completed.map((entry) => entry.score!)),
    },
    indications: FC_INDICATIONS.map((entry) => ({ ...entry, count: finished.filter((result) => result.indication === entry.key).length })),
    competencies: FC_COMPETENCIES.map((id) => ({
      id,
      label: FC_COMPETENCY_LABEL[id],
      average: mean(completed.map((entry) => entry.competencies![id])),
    })),
    earlier: rows.length - current.length,
  };
}
