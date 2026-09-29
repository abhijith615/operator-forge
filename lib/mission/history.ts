import "server-only";

import { getOperator } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ChatMessage } from "@/types/agents";
import type { TimelineEntry } from "@/types/mission-run";
import type { Achievement, TaskDecision } from "@/types/tasks";
import type { TelemetryEvent, WorldTrace } from "@/types/telemetry";
import type { WorldState } from "@/types/world";

/**
 * The finished shift, read back from the database.
 *
 * The genome has always been derived in the browser from the Zustand stores,
 * which meant it lived exactly as long as somebody's localStorage did. Clear
 * site data, switch laptop, open it on a phone, and the reading of the only
 * thing they did here was gone — while the run itself sat in `mission_runs`
 * the whole time. Now that a shift cannot be re-run, that was a way to lose
 * the result permanently.
 *
 * `buildGenome` is pure, so nothing needs replaying: the stored decisions,
 * telemetry and closing world rebuild the same reading, and a later change to
 * the scoring model applies to old runs too.
 *
 * Row level security scopes the read to the signed-in operator; the filter
 * below is belt and braces, not the boundary.
 */
export interface StoredRun {
  runId: string;
  world: WorldState;
  decisions: TaskDecision[];
  telemetry: TelemetryEvent[];
  conversations: Record<string, ChatMessage[]>;
  /** For the replay: the floor, sampled, and the record beside it. */
  traces: WorldTrace[];
  timeline: TimelineEntry[];
  achievements: Achievement[];
}

export async function loadLatestCompletedRun(): Promise<StoredRun | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const operator = await getOperator();
  if (!operator) return null;

  const { data, error } = await supabase
    .from("mission_runs")
    .select("id, world, decisions, telemetry, conversations, traces, timeline, achievements")
    .eq("operator_id", operator.id)
    .eq("mission_id", "first-shift")
    .eq("status", "complete")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // No run, or the read failed. Either way the browser's copy is still the
  // first thing tried, so this is a missing fallback rather than a failure.
  if (error || !data?.world) return null;

  return {
    runId: String(data.id),
    world: data.world as WorldState,
    decisions: (data.decisions ?? []) as TaskDecision[],
    telemetry: (data.telemetry ?? []) as TelemetryEvent[],
    conversations: (data.conversations ?? {}) as Record<string, ChatMessage[]>,
    traces: (data.traces ?? []) as WorldTrace[],
    timeline: (data.timeline ?? []) as TimelineEntry[],
    achievements: (data.achievements ?? []) as Achievement[],
  };
}
