import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

import { expire, replay } from "./engine";
import { scoreAssessment, type AssessmentResult } from "./scoring";
import type { FormId, Stamped } from "./types";
import { ASSESSMENT_SECONDS, ASSESSMENT_VERSION, CURRENT_SINCE } from "./weights";

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
  /** How long this attempt was given. Absent on a database that predates extra time. */
  time_limit_seconds?: number;
  /** Which simulation it was sat on. Absent from the first release's functions. */
  assessment_version?: string;
  /** Sat on a simulation that has since been replaced, and cannot be replayed on this one. */
  retired?: boolean;
}

/**
 * Was this attempt sat on the simulation this code runs?
 *
 * Only the ordered actions are stored, and a result is those actions replayed
 * through the engine — so an attempt can only be read by the engine it was
 * played on. One from an earlier simulation is kept, shown as such, and never
 * scored by this one.
 */
export function isCurrentVersion(row: { assessment_version?: string; started_at: string }): boolean {
  if (row.assessment_version) return row.assessment_version === ASSESSMENT_VERSION;
  return Date.parse(row.started_at) >= CURRENT_SINCE;
}

export interface AdminAttemptRow extends AttemptRow {
  candidate_email: string;
  role_id: string;
  campaign_id: string | null;
  assessment_version: string;
  device_type: string | null;
  consented_at?: string | null;
  session?: Record<string, number>;
}

export interface Accommodation {
  email: string;
  extra_seconds: number;
  note: string | null;
  granted_at: string;
}

/** What the candidate is shown. A subset, chosen on purpose. */
export interface CandidateProfile {
  overall: number;
  /** Moments reached, of all there were. Equal on a finished shift. */
  observed: number;
  opportunities: number;
  competencies: { id: string; label: string; score: number; observed: number; opportunities: number }[];
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

function asActions(value: unknown): Stamped[] {
  return Array.isArray(value) ? (value as Stamped[]) : [];
}

/**
 * The database function does not exist (yet).
 *
 * Consent, time limits and extra time arrived in a later database update than
 * the first release. Until that update has been run, the calls that need it
 * fall back to the first release's functions rather than failing, so the code
 * and the database can be updated in either order.
 */
export function isMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "PGRST202" || error.code === "42883" || /could not find the function|does not exist/i.test(error.message ?? "");
}

/** Replay what was done. A shift that was never finished is run out to 06:50 as it stood. */
export function resultFrom(form: FormId, actions: Stamped[]): { result: AssessmentResult; incomplete: boolean } {
  const state = replay(form, asActions(actions));
  const incomplete = !state.outcome;
  return { result: scoreAssessment(incomplete ? expire(state) : state), incomplete };
}

export function candidateProfileFrom(result: AssessmentResult, timedOut: boolean): CandidateProfile {
  return {
    overall: result.overall,
    observed: result.observed,
    opportunities: result.opportunities,
    competencies: result.competencies.map((c) => ({ id: c.id, label: c.label, score: c.score, observed: c.observed, opportunities: c.opportunities })),
    strongest: result.candidate.strongest,
    development: result.candidate.development,
    recommendations: result.candidate.recommendations,
    signature: result.signature,
    outcomeTitle: result.outcomeTitle,
    timedOut,
  };
}

/**
 * The signed-in candidate's latest attempt at this simulation, or null if they
 * have not started it. Somebody who only ever sat an earlier one has not.
 */
export async function readCurrentAttempt(): Promise<AttemptRow | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  let { data, error } = await supabase.rpc("hiring_sitting", { p_version: ASSESSMENT_VERSION, p_campaign: null });
  // A database that has not had the latest update cannot tell versions apart.
  const unversioned = isMissing(error);
  if (unversioned) ({ data, error } = await supabase.rpc("hiring_attempt", { p_campaign: null }));
  if (isMissing(error)) ({ data, error } = await supabase.rpc("hiring_current", { p_campaign: null }));
  if (error) return null;
  const row = first<AttemptRow>(data);
  if (!row) return null;
  return { ...row, actions: asActions(row.actions), retired: unversioned && !isCurrentVersion(row) };
}

/** How long the signed-in candidate will be given, including any extra time arranged for them. */
export async function readTimeLimit(): Promise<number> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return ASSESSMENT_SECONDS;
  const { data, error } = await supabase.rpc("hiring_time_limit");
  return !error && typeof data === "number" && data >= ASSESSMENT_SECONDS ? data : ASSESSMENT_SECONDS;
}

/** Admins only; the database refuses anybody else. */
export async function readAllAttempts(): Promise<AdminAttemptRow[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];
  let { data, error } = await supabase.rpc("admin_hiring_list");
  if (isMissing(error)) ({ data, error } = await supabase.rpc("admin_hiring_assessments"));
  if (error || !Array.isArray(data)) return [];
  return (data as AdminAttemptRow[]).map((row) => ({ ...row, actions: asActions(row.actions) }));
}

export async function readAttempt(id: string): Promise<AdminAttemptRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  let { data, error } = await supabase.rpc("admin_hiring_one", { p_id: id });
  if (isMissing(error)) ({ data, error } = await supabase.rpc("admin_hiring_assessment", { p_id: id }));
  if (error) return null;
  const row = first<AdminAttemptRow>(data);
  return row ? { ...row, actions: asActions(row.actions) } : null;
}

/**
 * Who has extra time arranged. Admins only.
 * `null` means the database update that adds extra time has not been run.
 */
export async function readAccommodations(): Promise<Accommodation[] | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_hiring_accommodations");
  if (error) return isMissing(error) ? null : [];
  return Array.isArray(data) ? (data as Accommodation[]) : [];
}
