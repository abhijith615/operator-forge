import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ChallengeResult } from "./types";

/**
 * Challenge results, stored against an operator account.
 *
 * Reads and writes go through the operator's own session, so row level
 * security applies exactly as it does everywhere else: an operator can see
 * their own run and nobody else's. The leaderboard is the one exception, and
 * it comes from a `security definer` function that returns a shortened name
 * and a score — never contact details or the decision record.
 */

export interface LeaderboardRow {
  rank: number;
  display_name: string;
  score: number;
  band: string;
  signature: string;
  completed_at: string;
  is_you: boolean;
}

export interface Standing {
  rank: number;
  total: number;
  score: number | null;
}

export interface StoredRun {
  day: number;
  score: number;
  band: string;
  signature: string;
  competencies: Record<string, number>;
  completed_at: string;
}

export async function readLeaderboard(day = 1, limit = 50): Promise<LeaderboardRow[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("challenge_leaderboard", {
    p_day: day,
    p_limit: limit,
  });
  if (error || !data) return [];
  return data as LeaderboardRow[];
}

export async function readStanding(day = 1): Promise<Standing | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("challenge_standing", { p_day: day });
  if (error || !data) return null;
  const row = (Array.isArray(data) ? data[0] : data) as Standing | undefined;
  // No run yet returns a row of nulls rather than no row.
  return row && row.score !== null ? row : null;
}

export async function readOwnRun(day = 1): Promise<StoredRun | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("challenge_runs")
    .select("day, score, band, signature, competencies, completed_at")
    .eq("day", day)
    .maybeSingle<StoredRun>();
  if (error) return null;
  return data;
}

/**
 * The stored scorecard, for showing a completed day again.
 *
 * Returns null both when there is no run and when the run predates the
 * `result` column — the caller has to handle a run without a scorecard either
 * way, so collapsing the two into one absent case keeps the branch honest.
 */
export async function readOwnResult(day = 1): Promise<ChallengeResult | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("challenge_runs")
    .select("result")
    .eq("day", day)
    .maybeSingle<{ result: unknown }>();
  if (error || !data) return null;
  return isResult(data.result) ? data.result : null;
}

/**
 * The column is ours to write and row level security keeps it ours to read, so
 * this is not a trust boundary — it is a guard against rendering a row written
 * by an older shape of the code and crashing on a missing array.
 */
function isResult(value: unknown): value is ChallengeResult {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ChallengeResult>;
  return (
    typeof candidate.score === "number" &&
    typeof candidate.band === "string" &&
    Array.isArray(candidate.competencies) &&
    Array.isArray(candidate.sopViolations) &&
    Array.isArray(candidate.replay) &&
    Array.isArray(candidate.learned) &&
    Array.isArray(candidate.strengths) &&
    Array.isArray(candidate.gaps) &&
    typeof candidate.signature === "object" &&
    candidate.signature !== null
  );
}

/** Shape sent from the browser when a shift finishes. */
export function toRow(
  operatorId: string,
  result: ChallengeResult,
  decisions: { scene: string; action: string }[],
) {
  return {
    operator_id: operatorId,
    day: 1,
    score: result.score,
    band: result.band,
    signature: result.signature.name,
    competencies: Object.fromEntries(
      result.competencies.map((entry) => [entry.dimension, entry.score]),
    ),
    decisions,
    // The whole scorecard, so returning to a finished day shows what the
    // operator actually earned rather than a summary rebuilt from columns.
    result,
    sop_breaches: result.sopViolations.length,
    duration_ms: Math.round(result.durationMs),
    completed_at: new Date().toISOString(),
  };
}
