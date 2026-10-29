import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

import { expire, replay } from "./engine";
import { readFcKey } from "./guest";
import { scoreFc, type FcResult } from "./scoring";
import type { Stamped } from "./types";
import { FC_ROLE_ID, FC_VERSION } from "./weights";

/**
 * Reading FC Executive attempts.
 *
 * Attempts sit in the same table as the store-manager test's, told apart by
 * role_id. Results are never stored: they are the stored actions replayed
 * through the FC engine and scored, here on the server.
 */

export interface FcAttemptRow {
  id: string;
  scenario_variant: string;
  status: "in_progress" | "completed" | "expired";
  started_at: string;
  completed_at: string | null;
  actions: Stamped[];
  server_now?: string;
  time_limit_seconds?: number;
  assessment_version?: string;
  candidate_name?: string | null;
}

export interface FcAdminRow extends FcAttemptRow {
  role_id: string;
  candidate_phone?: string | null;
  device_type: string | null;
  session?: Record<string, number>;
}

/** What the candidate is shown at the end. A subset, on purpose. */
export interface FcCandidateProfile {
  overall: number;
  observed: number;
  opportunities: number;
  competencies: { id: string; label: string; score: number; observed: number; opportunities: number }[];
  strengths: { title: string; text: string }[];
  development: { title: string; text: string } | null;
  outcome: { title: string; lines: string[] };
  timedOut: boolean;
}

const asActions = (value: unknown): Stamped[] => (Array.isArray(value) ? (value as Stamped[]) : []);
const first = <T,>(data: unknown): T | null => ((Array.isArray(data) ? data[0] : data) as T | undefined) ?? null;

export const isFcRow = (row: { role_id?: string | null; assessment_version?: string | null }) =>
  row.role_id === FC_ROLE_ID || (row.assessment_version ?? "").startsWith("fc-");

/** Sat on this version of the shift. An attempt can only be replayed by the engine it was played on. */
export const isCurrentFc = (row: { assessment_version?: string | null }) => row.assessment_version === FC_VERSION;

export function fcResultFrom(actions: unknown): { result: FcResult; incomplete: boolean } {
  const state = replay(asActions(actions));
  const finished = state.scene === "done" && state.expiredIn === null;
  return { result: scoreFc(finished ? state : expire(state)), incomplete: !finished };
}

export function fcProfileFrom(result: FcResult, timedOut: boolean): FcCandidateProfile {
  return {
    overall: result.overall,
    observed: result.observed,
    opportunities: result.opportunities,
    competencies: result.competencies.map(({ id, label, score, observed, opportunities }) => ({ id, label, score, observed, opportunities })),
    strengths: result.strengths,
    development: result.development,
    outcome: result.outcome,
    timedOut,
  };
}

/** This browser's FC attempt, read with the secret in its cookie. */
export async function readFcAttempt(): Promise<FcAttemptRow | null> {
  const key = await readFcKey();
  if (!key) return null;
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("hiring_guest_attempt", { p_id: key.id, p_token: key.token });
  if (error) return null;
  const row = first<FcAttemptRow>(data);
  if (!row || row.assessment_version !== FC_VERSION) return null;
  return { ...row, actions: asActions(row.actions) };
}

/** Admins only; the database refuses anybody else. */
export async function readFcAttempts(): Promise<FcAdminRow[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("admin_hiring_rows", { p_id: null });
  if (error || !Array.isArray(data)) return [];
  return (data as FcAdminRow[]).filter(isFcRow).map((row) => ({ ...row, actions: asActions(row.actions) }));
}

export async function readFcAttemptById(id: string): Promise<FcAdminRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_hiring_rows", { p_id: id });
  if (error) return null;
  const row = first<FcAdminRow>(data);
  return row && isFcRow(row) ? { ...row, actions: asActions(row.actions) } : null;
}
