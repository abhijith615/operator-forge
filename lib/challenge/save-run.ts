"use server";

import { isAdmin } from "@/lib/admin/queries";
import { getOperator } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hasChallengeAccess } from "./access";
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
  day = 1,
): Promise<{ ok: boolean }> {
  const operator = await getOperator();
  if (!operator) return { ok: false };
  // The pages already turn away anyone unregistered; this keeps a direct call
  // to the action from putting them on the leaderboard anyway.
  if (!(await hasChallengeAccess())) return { ok: false };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false };

  // A day is played once. The page guard sends a returning operator to their
  // scorecard rather than the floor, and this is the other half of the same
  // rule: if a second run does finish — two tabs, a race, a reload caught
  // mid-shift — the first score stands. Overwriting would quietly turn the
  // leaderboard into best-of-many-retries, which is a different product.
  //
  // An admin replaying to test the content is the exception, and has to
  // overwrite: ignoring their rerun would send them back to a scorecard from
  // the version of the day they just replaced.
  const admin = await isAdmin();
  const { error } = await supabase
    .from("challenge_runs")
    .upsert(toRow(operator.id, result, decisions, day), {
      onConflict: "operator_id,day",
      ignoreDuplicates: !admin,
    });

  return { ok: !error };
}
