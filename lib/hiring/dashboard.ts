import "server-only";

import { candidateLabel, isCurrentVersion, resultFrom, type AdminAttemptRow } from "./server";
import type { FormId } from "./types";
import { ASSESSMENT_VERSION, COMPETENCIES, COMPETENCY_LABEL, type CompetencyId } from "./weights";

/**
 * The Hiring Test, as the admin panel sees it: who has sat it and how they did.
 *
 * One row per person, not per attempt, and every number is read off the same
 * replay the employer profile is built from — there is no second copy of a
 * score here to drift from the first. Only attempts at the current version of
 * the simulation are counted; earlier ones cannot be replayed on it and are
 * reported as a count and nothing else.
 *
 * The admin looking at the panel is listed like anybody else, and left out of
 * the totals: somebody who built the test, or has sat it five times to check
 * it, is not a candidate, and would move every average on a small sample.
 */

export const INDICATIONS = [
  { key: "STRONG", label: "Strong · proceed to interview" },
  { key: "PROMISING", label: "Promising · probe specific areas" },
  { key: "MIXED", label: "Mixed evidence · review" },
  { key: "ADDITIONAL", label: "Additional assessment" },
] as const;

export type IndicationKey = (typeof INDICATIONS)[number]["key"];

export interface HiringAttemptSummary {
  id: string;
  startedAt: string;
  form: FormId;
  device: string | null;
  /** Still inside its time, finished properly, or closed by the clock. */
  state: "in_progress" | "completed" | "not_completed";
  score: number | null;
  indication: IndicationKey | null;
  flags: number;
  observed: number;
  opportunities: number;
  extraTime: boolean;
  competencies: Record<CompetencyId, number> | null;
}

export interface HiringCandidateRow {
  /** Stable for the row: the email, or the attempt's id for somebody who gave only a name. */
  key: string;
  /** Their email if they signed in, the name they typed if they did not. */
  who: string;
  /** Sat with a name and no sign-in. Two rows with the same name may or may not be the same person. */
  nameOnly: boolean;
  /** The WhatsApp number given with the name (+91 and ten digits), where there is one. */
  phone: string | null;
  /** The signed-in admin's own attempts: shown, and kept out of the totals. */
  own: boolean;
  attempts: number;
  /** The most recent attempt, and the one the row's numbers are from. */
  latest: HiringAttemptSummary;
  /** Best score across finished attempts, where there is more than one. */
  best: number | null;
}

export interface HiringDashboardData {
  version: string;
  candidates: HiringCandidateRow[];
  totals: {
    candidates: number;
    finished: number;
    completed: number;
    notCompleted: number;
    inProgress: number;
    flagged: number;
    /** Across shifts that were completed. Null until there is one. */
    average: number | null;
  };
  indications: { key: IndicationKey; label: string; count: number }[];
  forms: { form: FormId; finished: number; average: number | null }[];
  competencies: { id: CompetencyId; label: string; average: number | null }[];
  /** Attempts sat on an earlier version of the simulation. */
  earlier: number;
  /** Whether the admin's own attempts were found and set aside. */
  ownAttempts: number;
}

const mean = (values: number[]): number | null =>
  values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;

function summarise(attempt: AdminAttemptRow): HiringAttemptSummary {
  const base = {
    id: attempt.id,
    startedAt: attempt.started_at,
    form: attempt.scenario_variant,
    device: attempt.device_type,
    extraTime: (attempt.time_limit_seconds ?? 1800) > 1800,
  };
  if (attempt.status === "in_progress") {
    return { ...base, state: "in_progress", score: null, indication: null, flags: 0, observed: 0, opportunities: 0, competencies: null };
  }
  const { result, incomplete } = resultFrom(attempt.scenario_variant, attempt.actions);
  return {
    ...base,
    state: incomplete ? "not_completed" : "completed",
    score: result.overall,
    indication: (INDICATIONS.find((entry) => result.indication.startsWith(entry.key))?.key ?? "ADDITIONAL") as IndicationKey,
    flags: result.flags.length,
    observed: result.observed,
    opportunities: result.opportunities,
    competencies: Object.fromEntries(result.competencies.map((c) => [c.id, c.score])) as Record<CompetencyId, number>,
  };
}

export function buildHiringDashboard(rows: AdminAttemptRow[], ownEmail: string | null): HiringDashboardData {
  const own = ownEmail?.trim().toLowerCase() ?? null;
  const current = rows.filter(isCurrentVersion);

  // Newest first within each person. An email identifies a person; a typed name does not, so each
  // name-only attempt is its own row rather than being merged with others that happen to share a name.
  const byPerson = new Map<string, AdminAttemptRow[]>();
  for (const attempt of [...current].sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at))) {
    const email = (attempt.candidate_email ?? "").trim().toLowerCase();
    const key = email || `name:${attempt.id}`;
    byPerson.set(key, [...(byPerson.get(key) ?? []), attempt]);
  }

  const candidates: HiringCandidateRow[] = [...byPerson.entries()].map(([key, attempts]) => {
    const summaries = attempts.map(summarise);
    const scores = summaries.filter((entry) => entry.score !== null).map((entry) => entry.score!);
    const nameOnly = key.startsWith("name:");
    return {
      key,
      who: candidateLabel(attempts[0]!),
      nameOnly,
      phone: attempts[0]!.candidate_phone ?? null,
      own: !nameOnly && key === own,
      attempts: attempts.length,
      latest: summaries[0]!,
      best: scores.length > 1 ? Math.max(...scores) : null,
    };
  });
  candidates.sort((a, b) => Date.parse(b.latest.startedAt) - Date.parse(a.latest.startedAt));

  // The totals are about candidates: one result each, and not the admin's own.
  const counted = candidates.filter((row) => !row.own).map((row) => row.latest);
  const finished = counted.filter((entry) => entry.state !== "in_progress");
  const completed = finished.filter((entry) => entry.state === "completed");

  return {
    version: ASSESSMENT_VERSION,
    candidates,
    totals: {
      candidates: counted.length,
      finished: finished.length,
      completed: completed.length,
      notCompleted: finished.length - completed.length,
      inProgress: counted.length - finished.length,
      flagged: finished.filter((entry) => entry.flags > 0).length,
      average: mean(completed.map((entry) => entry.score!)),
    },
    indications: INDICATIONS.map((entry) => ({
      ...entry,
      count: finished.filter((result) => result.indication === entry.key).length,
    })),
    forms: (["A", "B", "C"] as FormId[]).map((form) => {
      const sat = finished.filter((entry) => entry.form === form);
      return { form, finished: sat.length, average: mean(sat.filter((entry) => entry.state === "completed").map((entry) => entry.score!)) };
    }),
    competencies: COMPETENCIES.map((id) => ({
      id,
      label: COMPETENCY_LABEL[id],
      average: mean(completed.map((entry) => entry.competencies![id])),
    })),
    earlier: rows.length - current.length,
    ownAttempts: candidates.find((row) => row.own)?.attempts ?? 0,
  };
}
