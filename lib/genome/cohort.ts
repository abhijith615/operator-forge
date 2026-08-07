"use server";

import { getOperator } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface CohortStanding {
  rank: number;
  total: number;
  percentile: number;
}

/**
 * Where this rating sits among every completed run on the same mission.
 *
 * Returns `null` when there is no cohort to rank against — Simulator Mode, or a
 * hub where nobody else has run the shift yet. A rank of "1 of 1" would be
 * flattering and meaningless, so we say there is no cohort instead.
 */
export async function getCohortStanding(
  rating: number,
): Promise<CohortStanding | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const operator = await getOperator();
  if (!operator) return null;

  const { data, error } = await supabase
    .from("mission_runs")
    .select("rating")
    .eq("mission_id", "first-shift")
    .eq("status", "complete")
    .not("rating", "is", null);

  if (error || !data) return null;

  const ratings = data
    .map((row) => (typeof row.rating === "number" ? row.rating : null))
    .filter((value): value is number => value !== null);

  // One run — our own — is not a cohort.
  if (ratings.length < 2) return null;

  const better = ratings.filter((value) => value > rating).length;
  const rank = better + 1;

  return {
    rank,
    total: ratings.length,
    percentile: Math.round(((ratings.length - rank) / (ratings.length - 1)) * 100),
  };
}
