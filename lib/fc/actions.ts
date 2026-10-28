"use server";

import { revalidatePath } from "next/cache";

import { isAdmin } from "@/lib/admin/queries";
import { whatsappNumber } from "@/lib/hiring/phone";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import { FC_CONSENT_VERSION } from "./content";
import { clearFcKey, readFcKey, writeFcKey } from "./guest";
import { fcProfileFrom, fcResultFrom, readFcAttempt, type FcCandidateProfile } from "./server";
import type { Stamped } from "./types";
import { FC_SECONDS, FC_VERSION } from "./weights";

/**
 * The FC Executive test's server actions.
 *
 * Every attempt is name-only (name + WhatsApp), reached with the secret in
 * this browser's FC cookie. Saving, logging and completing reuse the shared
 * guest functions in the database, which work by attempt id + secret.
 */

export interface FcStarted {
  id: string;
  status: "in_progress" | "completed" | "expired";
  startedAt: number;
  serverNow: number;
  limit: number;
  actions: Stamped[];
}

export type FcStartFailure = "name" | "phone" | "busy" | "failed";

function tidyName(value: unknown): string | null {
  const name = String(value ?? "").replace(/\s+/g, " ").trim();
  return name.length >= 2 && name.length <= 80 ? name : null;
}

export async function startFc(device: string, consented: boolean, name: string, phone: string): Promise<FcStarted | { error: FcStartFailure }> {
  if (consented !== true) return { error: "failed" };
  const p_name = tidyName(name);
  if (!p_name) return { error: "name" };
  const p_phone = whatsappNumber(phone);
  if (!p_phone) return { error: "phone" };
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { error: "failed" };

  const { data, error } = await supabase.rpc("hiring_fc_begin", {
    p_name,
    p_phone,
    p_version: FC_VERSION,
    p_consent_version: FC_CONSENT_VERSION,
    p_device: ["mobile", "tablet", "desktop"].includes(device) ? device : "unknown",
    p_campaign: null,
  });
  const row = (Array.isArray(data) ? data[0] : data) as
    | { id: string; token: string; status: FcStarted["status"]; started_at: string; actions: unknown; server_now: string; time_limit_seconds?: number }
    | undefined;
  if (error || !row) return { error: error?.code === "53400" ? "busy" : "failed" };

  await writeFcKey({ id: row.id, token: row.token });
  return {
    id: row.id,
    status: row.status,
    startedAt: Date.parse(row.started_at),
    serverNow: Date.parse(row.server_now),
    limit: row.time_limit_seconds ?? FC_SECONDS,
    actions: Array.isArray(row.actions) ? (row.actions as Stamped[]) : [],
  };
}

const tidy = (actions: Stamped[]): Stamped[] =>
  (Array.isArray(actions) ? actions : []).slice(0, 800).map((entry) => ({ a: entry.a, at: Math.round(Number(entry.at) || 0) }));

async function tokenFor(id: string): Promise<string | null> {
  const key = await readFcKey();
  return key && key.id === id ? key.token : null;
}

export async function syncFc(id: string, actions: Stamped[]): Promise<boolean> {
  const token = await tokenFor(id);
  const supabase = await getSupabaseServerClient();
  if (!token || !supabase) return false;
  const { data, error } = await supabase.rpc("hiring_guest_sync", { p_id: id, p_token: token, p_actions: tidy(actions) });
  return !error && data === true;
}

export interface FcTelemetry {
  eventType: string;
  realMs: number;
  simTime: number;
  entityId?: string;
  payload: Record<string, unknown>;
}

export async function logFc(id: string, events: FcTelemetry[]): Promise<boolean> {
  const token = await tokenFor(id);
  const supabase = await getSupabaseServerClient();
  if (!token || !supabase || events.length === 0) return false;
  const { error } = await supabase.rpc("hiring_guest_log", { p_id: id, p_token: token, p_events: events.slice(0, 200) });
  return !error;
}

/** The shift is over. The profile comes from what the database holds, replayed here. */
export async function completeFc(id: string, actions: Stamped[]): Promise<FcCandidateProfile | null> {
  const token = await tokenFor(id);
  const supabase = await getSupabaseServerClient();
  if (!token || !supabase) return null;
  const { error } = await supabase.rpc("hiring_guest_complete", { p_id: id, p_token: token, p_actions: tidy(actions) });
  if (error) return null;

  const attempt = await readFcAttempt();
  if (!attempt || attempt.id !== id || attempt.status === "in_progress") return null;
  const { result, incomplete } = fcResultFrom(attempt.actions);

  await supabase.rpc("hiring_guest_log", {
    p_id: id,
    p_token: token,
    p_events: result.evidence.map((e) => ({ eventType: "evidence", simTime: 0, entityId: e.id, payload: { assessmentVersion: FC_VERSION, evidenceObject: e } })),
  });

  revalidatePath("/hiring-test/fc-executive");
  return fcProfileFrom(result, incomplete);
}

/** Admins only: forget this browser's attempt so the test can be sat again. The attempt itself is kept. */
export async function fcStartOver(): Promise<void> {
  if (!(await isAdmin())) return;
  await clearFcKey();
  revalidatePath("/hiring-test/fc-executive");
}
