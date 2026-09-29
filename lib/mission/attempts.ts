import "server-only";

import { isAdmin } from "@/lib/admin/queries";
import { getOperator } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * One shift per operator — which is what the brief, the dossier and the launch
 * card have always claimed, and what nothing enforced.
 *
 * The claim matters to the thing being measured. A trial mission you can redo
 * until the numbers look good is a puzzle with a known answer; the first
 * unrepeatable morning is the only one that reads like the job. It was also
 * simply untrue: the debrief offered "Run another shift" to everybody.
 *
 * Decided here rather than in the browser. The live run lives in
 * localStorage, so anything client-side is undone by clearing site data or
 * opening a second device — this reads `mission_runs`, which is written when
 * the clock stops and is protected by row level security.
 *
 * Admins are exempt, decided by the `admins` table through `is_admin()`, so
 * the mission can be exercised end to end without a second account.
 */
export async function canRunShift(): Promise<boolean> {
  const supabase = await getSupabaseServerClient();
  // Simulator Mode: no database to ask, so nothing to enforce.
  if (!supabase) return true;

  if (await isAdmin()) return true;

  const operator = await getOperator();
  // Not signed in. The route guards deal with that; this is not the place to
  // turn a missing session into a lockout.
  if (!operator) return true;

  const { data, error } = await supabase
    .from("mission_runs")
    .select("id")
    .eq("operator_id", operator.id)
    .eq("mission_id", "first-shift")
    .eq("status", "complete")
    .limit(1);

  // A read that failed is not evidence of a finished shift. Locking somebody
  // out of the only thing on the site because a query timed out is worse than
  // letting a rare second run through.
  if (error) return true;

  return (data?.length ?? 0) === 0;
}
