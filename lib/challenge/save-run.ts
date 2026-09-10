"use server";

import { getOperator } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { toRow } from "./runs";
import type { ChallengeResult } from "./types";

/**
 * Writes a finished shift against the signed-in operator.
 *
 * A server action rather than a fetch from the browser so the operator id is
 * taken from the session and never from whatever the client says it is. Row
 * level security would catch a mismatch anyway; not handing the client the
 * opportunity is cheaper than relying on the policy to say no.
 */
export async function saveChallengeRun(
  result: ChallengeResult,
  decisions: { scene: string; action: string }[],
): Promise<{ ok: boolean }> {
  const operator = await getOperator();
  if (!operator) return { ok: false };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false };

  // A day is played once. The page guard sends a returning operator to their
  // scorecard rather than the floor, and this is the other half of the same
  // rule: if a second run does finish — two tabs, a race, a reload caught
  // mid-shift — the first score stands. Overwriting would quietly turn the
  // leaderboard into best-of-many-retries, which is a different product.
  const { error } = await supabase
    .from("challenge_runs")
    .upsert(toRow(operator.id, result, decisions), {
      onConflict: "operator_id,day",
      ignoreDuplicates: true,
    });

  return { ok: !error };
}
