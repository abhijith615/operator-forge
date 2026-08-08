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
 * store where nobody else has run the shift yet. A rank of "1 of 1" would be
 * flattering and meaningless, so we say there is no cohort instead.
 */
export async function getCohortStanding(
  rating: number,
): Promise<CohortStanding | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const operator = await getOperator();
  if (!operator) return null;

  // Ranking has to look across operators, and row level security deliberately
  // stops the client doing that. `mission_cohort_standing` is a security
  // definer function that counts on our behalf and returns only two integers.
  const { data, error } = await supabase
    .rpc("mission_cohort_standing", {
      p_mission: "first-shift",
      p_rating: Math.round(rating),
    })
    .maybeSingle<{ cohort_rank: number; cohort_total: number }>();

  if (error || !data) return null;

  const { cohort_rank: rank, cohort_total: total } = data;

  // One run — our own — is not a cohort.
  if (total < 2) return null;

  return {
    rank,
    total,
    percentile: Math.round(((total - rank) / (total - 1)) * 100),
  };
}
