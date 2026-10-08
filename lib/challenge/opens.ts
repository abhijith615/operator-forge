import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Note that somebody has opened a day.
 *
 * A finished shift is the only thing `challenge_runs` ever sees, so a
 * participant who opened Day 3, looked at it and left is invisible: the
 * drop-off report would show them as having never arrived. This is the other
 * half. It is a proxy for "started", not the moment the clock began — the
 * intro and the video come first — and the report labels it that way.
 *
 * First open wins, so a refresh does not move the time. Failure is swallowed:
 * a tracking write must never be the reason a day does not load.
 */
export async function recordDayOpen(day: number): Promise<void> {
  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase) return;
    await supabase.rpc("record_day_open", { p_day: day });
  } catch {
    /* Analytics, not function. */
  }
}
