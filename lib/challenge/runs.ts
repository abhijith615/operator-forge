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
    sop_breaches: result.sopViolations.length,
    duration_ms: Math.round(result.durationMs),
    completed_at: new Date().toISOString(),
  };
}
