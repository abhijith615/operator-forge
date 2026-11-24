import "server-only";

import { resultFrom, type AttemptRow } from "@/lib/hiring/server";
import type { AssessmentResult } from "@/lib/hiring/scoring";
import type { FormId, Stamped } from "@/lib/hiring/types";
import { ASSESSMENT_VERSION } from "@/lib/hiring/weights";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import { CHALLENGE_CAMPAIGN, LEVELS } from "./content";

/**
 * The Startup Operator Challenge's reads.
 *
 * The shift is the Hiring Test's simulation and is scored by the Hiring
 * Test's scorer, on the server, from the saved actions — nothing the browser
 * sends is a score. Attempts sit in the same table under their own campaign,
 * so the Hiring Test never counts them and they never use up its attempt.
 */

export type Education = "student" | "graduate";

export interface ChallengeDetails {
  fullName: string;
  phone: string;
  city: string;
  education: Education;
  working: boolean;
  college: string;
  gradYear: number;
}

/** What a participant is shown at the end. */
export interface ChallengeScorecard {
  overall: number;
  /** 0–3, lowest first. Indexes LEVELS. */
  level: number;
  observed: number;
  opportunities: number;
  strengths: { title: string; text: string }[];
  grow: { label: string; text: string };
  timedOut: boolean;
}

function first<T>(data: unknown): T | null {
  const row = Array.isArray(data) ? data[0] : data;
  return (row as T | undefined) ?? null;
}

function asActions(value: unknown): Stamped[] {
  return Array.isArray(value) ? (value as Stamped[]) : [];
}

/** The Hiring Test's ladder, read as a rung: additional (0), mixed (1), promising (2), strong (3). */
export function levelOf(indication: string): number {
  if (indication.startsWith("STRONG")) return 3;
  if (indication.startsWith("PROMISING")) return 2;
  if (indication.startsWith("MIXED")) return 1;
  return 0;
}

export function levelLabel(level: number): string {
  return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, level))]!.label;
}

export function scorecardFrom(result: AssessmentResult, timedOut: boolean): ChallengeScorecard {
  return {
    overall: result.overall,
    level: levelOf(result.indication),
    observed: result.observed,
    opportunities: result.opportunities,
    strengths: result.candidate.strongest.slice(0, 2),
    grow: result.candidate.development,
    timedOut,
  };
}

/** Replay an attempt and read its scorecard. */
export function scoreChallenge(form: FormId, actions: Stamped[]): { result: AssessmentResult; scorecard: ChallengeScorecard } {
  const { result, incomplete } = resultFrom(form, asActions(actions));
  return { result, scorecard: scorecardFrom(result, incomplete) };
}

/** The signed-in participant's details, or null before they have given them. */
export async function readChallengeDetails(): Promise<ChallengeDetails | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("operator_challenge_details");
  if (error) return null;
  const row = first<{
    full_name: string;
    phone: string;
    city: string;
    education: Education;
    currently_working: boolean;
    college: string;
    grad_year: number;
  }>(data);
  if (!row) return null;
  return {
    fullName: row.full_name,
    phone: row.phone,
    city: row.city,
    education: row.education,
    working: row.currently_working,
    college: row.college,
    gradYear: row.grad_year,
  };
}

/**
 * The signed-in participant's attempt at this challenge, or null if they have
 * not started. One sat on an earlier version of the simulation comes back
 * marked `retired`: it still counts as their one try, but cannot be replayed.
 */
export async function readChallengeAttempt(): Promise<AttemptRow | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("hiring_sitting", { p_version: ASSESSMENT_VERSION, p_campaign: CHALLENGE_CAMPAIGN });
  if (error) return null;
  const row = first<AttemptRow>(data);
  if (row) return { ...row, actions: asActions(row.actions), retired: false };

  // Nothing on this version. Anything on an earlier one still used the try.
  const older = await supabase.rpc("hiring_attempt", { p_campaign: CHALLENGE_CAMPAIGN });
  if (older.error) return null;
  const earlier = first<AttemptRow>(older.data);
  return earlier ? { ...earlier, actions: asActions(earlier.actions), retired: true } : null;
}

/* ── Admin ────────────────────────────────────────────────────────────── */

export interface ChallengeAdminRow {
  userId: string;
  email: string;
  fullName: string;
  phone: string;
  city: string;
  education: Education;
  working: boolean;
  college: string;
  gradYear: number;
  registeredAt: string;
  attemptId: string | null;
  /** Not started, under way, finished in time, or out of time. */
  status: "registered" | "in_progress" | "completed" | "expired";
  startedAt: string | null;
  completedAt: string | null;
  device: string | null;
  /** Null until there is something to score, or where it was sat on an earlier version. */
  scorecard: ChallengeScorecard | null;
  earlierVersion: boolean;
}

interface RawRow {
  user_id: string;
  email: string;
  full_name: string;
  phone: string;
  city: string;
  education: Education;
  currently_working: boolean;
  college: string;
  grad_year: number;
  registered_at: string;
  attempt_id: string | null;
  status: "in_progress" | "completed" | "expired" | null;
  started_at: string | null;
  completed_at: string | null;
  scenario_variant: FormId | null;
  assessment_version: string | null;
  device_type: string | null;
  actions: unknown;
  time_limit_seconds: number | null;
}

/** A shift left open past its time (plus a little grace) is over, whatever the row still says. */
function settledStatus(row: RawRow): ChallengeAdminRow["status"] {
  if (!row.attempt_id || !row.status) return "registered";
  if (row.status !== "in_progress" || !row.started_at) return row.status;
  const ends = Date.parse(row.started_at) + ((row.time_limit_seconds ?? 1800) + 300) * 1000;
  return Date.now() > ends ? "expired" : "in_progress";
}

/** Admins only; the database refuses anybody else. `null` means it could not be read. */
export async function readChallengeRows(): Promise<ChallengeAdminRow[] | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_operator_challenge_rows");
  if (error) return null;
  if (!Array.isArray(data)) return [];

  return (data as RawRow[]).map((row) => {
    const status = settledStatus(row);
    const actions = asActions(row.actions);
    const earlierVersion = Boolean(row.assessment_version && row.assessment_version !== ASSESSMENT_VERSION);
    const scorable = row.scenario_variant && status !== "registered" && status !== "in_progress" && !earlierVersion;
    return {
      userId: row.user_id,
      email: row.email,
      fullName: row.full_name,
      phone: row.phone,
      city: row.city,
      education: row.education,
      working: row.currently_working,
      college: row.college,
      gradYear: row.grad_year,
      registeredAt: row.registered_at,
      attemptId: row.attempt_id,
      status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      device: row.device_type,
      scorecard: scorable ? scoreChallenge(row.scenario_variant!, actions).scorecard : null,
      earlierVersion,
    };
  });
}
