"use server";

import { getOperator } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ChatMessage } from "@/types/agents";
import type { RunStatus, TimelineEntry } from "@/types/mission-run";
import type { Achievement, MissionTask, TaskDecision } from "@/types/tasks";
import type { WorldState } from "@/types/world";

export interface RunSnapshot {
  runId: string;
  status: RunStatus;
  startedAt: number;
  completedAt: number | null;
  world: WorldState;
  timeline: TimelineEntry[];
  conversations: Record<string, ChatMessage[]>;
  tasks: MissionTask[];
  /** The scoring substrate: every call, how fast, and against what queue depth. */
  decisions: TaskDecision[];
  achievements: Achievement[];
}

/**
 * Durable copy of the run. The browser holds the authoritative live state — a
 * shift has to survive a refresh without a round trip — and this is the record
 * Phase 3 will read to build the Genome.
 *
 * A no-op in Simulator Mode: there is nowhere to write, and localStorage
 * already holds it.
 */
export async function saveRunSnapshot(snapshot: RunSnapshot): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const operator = await getOperator();
  if (!operator) return;

  await supabase.from("mission_runs").upsert(
    {
      id: snapshot.runId,
      operator_id: operator.id,
      mission_id: "first-shift",
      status: snapshot.status,
      started_at: new Date(snapshot.startedAt).toISOString(),
      completed_at: snapshot.completedAt
        ? new Date(snapshot.completedAt).toISOString()
        : null,
      world: snapshot.world,
      timeline: snapshot.timeline,
      conversations: snapshot.conversations,
      tasks: snapshot.tasks,
      decisions: snapshot.decisions,
      achievements: snapshot.achievements,
    },
    { onConflict: "id" },
  );
}
