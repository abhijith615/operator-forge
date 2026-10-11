import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

import { expire, replay } from "./engine";
import { scoreAssessment, type AssessmentResult } from "./scoring";
import type { FormId, Stamped } from "./types";

/**
 * The server's side of the Hiring Test.
 *
 * Scoring lives here and nowhere else. The browser runs the store — it has to,
 * the candidate is playing it — but it never imports the scorer, and nothing
 * it sends is a score. A result is what comes out when the server replays the
 * saved actions through the engine and reads what happened.
 */

export interface AttemptRow {
  id: string;
  scenario_variant: FormId;
  status: "in_progress" | "completed" | "expired";
  started_at: string;
  completed_at: string | null;
  actions: Stamped[];
  server_now?: string;
}

export interface AdminAttemptRow extends AttemptRow {
  candidate_email: string;
  role_id: string;
  campaign_id: string | null;
  assessment_version: string;
  device_type: string | null;
  session?: Record<string, number>;
}

/** What the candidate is shown. A subset, chosen on purpose. */
export interface CandidateProfile {
  overall: number;
  competencies: { id: string; label: string; score: number }[];
  strongest: { title: string; text: string }[];
  development: { label: string; text: string };
  recommendations: string[];
  signature: { name: string; blurb: string };
  outcomeTitle: string;
  timedOut: boolean;
}

function first<T>(data: unknown): T | null {
  const row = Array.isArray(data) ? data[0] : data;
  return (row as T | undefined) ?? null;
}

const asActions = (value: unknown): Stamped[] => (Array.isArray(value) ? (value as Stamped[]) : []);

/** Replay what was done. A shift that was never finished is run out to 18:20 as it stood. */
export function resultFrom(form: FormId, actions: Stamped[]): { result: AssessmentResult; incomplete: boolean } {
  const state = replay(form, asActions(actions));
  const incomplete = !state.outcome;
  return { result: scoreAssessment(incomplete ? expire(state) : state), incomplete };
}

export function candidateProfileFrom(result: AssessmentResult, timedOut: boolean): CandidateProfile {
  return {
    overall: result.overall,
    competencies: result.competencies.map((c) => ({ id: c.id, label: c.label, score: c.score })),
    strongest: result.candidate.strongest,
    development: result.candidate.development,
    recommendations: result.candidate.recommendations,
    signature: result.signature,
    outcomeTitle: result.outcomeTitle,
    timedOut,
  };
}

/** The signed-in candidate's latest attempt, or null if they have not started. */
export async function readCurrentAttempt(): Promise<AttemptRow | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("hiring_current", { p_campaign: null });
  if (error) return null;
  const row = first<AttemptRow>(data);
  return row ? { ...row, actions: asActions(row.actions) } : null;
}

/** Admins only; the database refuses anybody else. */
export async function readAllAttempts(): Promise<AdminAttemptRow[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("admin_hiring_assessments");
  if (error || !Array.isArray(data)) return [];
  return (data as AdminAttemptRow[]).map((row) => ({ ...row, actions: asActions(row.actions) }));
}

export async function readAttempt(id: string): Promise<AdminAttemptRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_hiring_assessment", { p_id: id });
  if (error) return null;
  const row = first<AdminAttemptRow>(data);
  return row ? { ...row, actions: asActions(row.actions) } : null;
}
