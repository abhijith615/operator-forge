"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import type { FormState } from "@/lib/auth/form-state";
import { magicLinkSchema } from "@/lib/auth/schema";
import { getOperator } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/utils";

import { CONSENT_VERSION } from "./content";
import { readGuestKey, writeGuestKey } from "./guest";
import { whatsappNumber } from "./phone";
import {
  candidateProfileFrom,
  isMissing,
  readCurrentAttempt,
  readGuestAttempt,
  resultFrom,
  type CandidateProfile,
} from "./server";
import type { FormId, Stamped } from "./types";
import { ASSESSMENT_SECONDS, ASSESSMENT_VERSION } from "./weights";

const ASSESSMENT_ROUTE = "/hiring-test/assessment";

/* ── Signing in ───────────────────────────────────────────────────────── */

/**
 * The candidate's way in: an email address and a link sent to it.
 *
 * The same sign-in the rest of the site uses, pointed back at the assessment
 * instead of at the operator onboarding — a candidate is not an operator and
 * is not asked for a WhatsApp number.
 */
export async function sendHiringLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = magicLinkSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the email address.",
      fieldErrors: { email: parsed.error.issues[0]?.message },
    };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { status: "error", message: "Sign-in is not available in this environment." };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: absoluteUrl(`/auth/callback?next=${encodeURIComponent(ASSESSMENT_ROUTE)}`),
    },
  });
  if (error) return { status: "error", message: error.message };

  return {
    status: "success",
    message: `Link sent to ${parsed.data.email}. Open it on this device to begin. It expires in 60 minutes.`,
  };
}

/** Sitting it under a different address: sign out, and back to the entry screen. */
export async function switchHiringAccount(): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect(ASSESSMENT_ROUTE);
}

/* ── The attempt ──────────────────────────────────────────────────────── */

export interface StartedAttempt {
  id: string;
  form: FormId;
  status: "in_progress" | "completed" | "expired";
  startedAt: number;
  serverNow: number;
  /** Seconds this attempt has: thirty minutes, plus any extra time arranged. */
  limit: number;
  actions: Stamped[];
}

export type StartFailure = "name" | "phone" | "busy" | "failed";

/** A name as it will be stored: trimmed, single-spaced, two to eighty characters. */
function tidyName(value: unknown): string | null {
  const name = String(value ?? "").replace(/\s+/g, " ").trim();
  return name.length >= 2 && name.length <= 80 ? name : null;
}

/**
 * Starting without signing in: a name and a WhatsApp number, and nothing else.
 *
 * The attempt belongs to no account. The database hands back a secret with
 * it, which goes into a cookie this browser keeps and the page's scripts
 * cannot read; every later save has to present it.
 */
async function startAsGuest(name: unknown, phone: unknown, p_device: string): Promise<StartedAttempt | { error: StartFailure }> {
  const p_name = tidyName(name);
  if (!p_name) return { error: "name" };
  const p_phone = whatsappNumber(phone);
  if (!p_phone) return { error: "phone" };
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { error: "failed" };

  const { data, error } = await supabase.rpc("hiring_guest_begin", {
    p_name,
    p_phone,
    p_version: ASSESSMENT_VERSION,
    p_consent_version: CONSENT_VERSION,
    p_device,
    p_role: "asm",
    p_campaign: null,
  });
  const row = (Array.isArray(data) ? data[0] : data) as
    | { id: string; token: string; scenario_variant: FormId; status: StartedAttempt["status"]; started_at: string; actions: unknown; server_now: string; time_limit_seconds?: number }
    | undefined;
  if (error || !row) return { error: error?.code === "53400" ? "busy" : "failed" };

  await writeGuestKey({ id: row.id, token: row.token });
  return {
    id: row.id,
    form: row.scenario_variant,
    status: row.status,
    startedAt: Date.parse(row.started_at),
    serverNow: Date.parse(row.server_now),
    limit: row.time_limit_seconds ?? ASSESSMENT_SECONDS,
    actions: Array.isArray(row.actions) ? (row.actions as Stamped[]) : [],
  };
}

/**
 * Pressing START SHIFT. The clock is the database's, and starts here.
 *
 * Only with consent: the candidate has to have ticked the data notice, and the
 * version of the notice they agreed to is recorded with the attempt. A call
 * without it starts nothing.
 *
 * Somebody signed in starts an attempt on their account. Anybody else starts
 * one under the name and WhatsApp number they typed.
 */
export async function startAssessment(
  device: string,
  consented: boolean,
  name?: string,
  phone?: string,
): Promise<StartedAttempt | { error: StartFailure }> {
  if (consented !== true) return { error: "failed" };
  const p_device = ["mobile", "tablet", "desktop"].includes(device) ? device : "unknown";
  const operator = await getOperator();
  if (!operator) return startAsGuest(name, phone, p_device);
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { error: "failed" };

  const begin = { p_version: ASSESSMENT_VERSION, p_consent_version: CONSENT_VERSION, p_device, p_role: "asm", p_campaign: null };
  // `hiring_open` knows which simulation an earlier attempt was sat on; the older functions do not.
  let { data, error } = await supabase.rpc("hiring_open", begin);
  if (isMissing(error)) ({ data, error } = await supabase.rpc("hiring_begin", begin));
  if (isMissing(error)) {
    ({ data, error } = await supabase.rpc("hiring_start", { p_version: ASSESSMENT_VERSION, p_device, p_role: "asm", p_campaign: null }));
  }
  const row = (Array.isArray(data) ? data[0] : data) as
    | { id: string; scenario_variant: FormId; status: StartedAttempt["status"]; started_at: string; actions: unknown; server_now: string; time_limit_seconds?: number }
    | undefined;
  if (error || !row) return { error: "failed" };

  return {
    id: row.id,
    form: row.scenario_variant,
    status: row.status,
    startedAt: Date.parse(row.started_at),
    serverNow: Date.parse(row.server_now),
    limit: row.time_limit_seconds ?? ASSESSMENT_SECONDS,
    actions: Array.isArray(row.actions) ? (row.actions as Stamped[]) : [],
  };
}

/* ── Extra time ───────────────────────────────────────────────────────── */

/**
 * Arrange, change or withdraw extra time for a candidate's email address.
 * Admins only — the database checks, and refuses anybody else.
 */
export async function setAccommodation(formData: FormData): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const percent = Number(formData.get("percent") ?? 0);
  const note = String(formData.get("note") ?? "").trim();
  if (!email || ![0, 25, 50, 100].includes(percent)) return;
  await supabase.rpc("admin_hiring_set_accommodation", {
    p_email: email,
    p_extra_seconds: Math.round((ASSESSMENT_SECONDS * percent) / 100),
    p_note: note || null,
  });
  revalidatePath("/hiring-test/results");
}

const tidy = (actions: Stamped[]): Stamped[] =>
  (Array.isArray(actions) ? actions : []).slice(0, 800).map((entry) => ({ a: entry.a, at: Math.round(Number(entry.at) || 0) }));

/** The secret for this attempt, where it was started without signing in and this browser holds its key. */
async function guestTokenFor(id: string): Promise<string | null> {
  const key = await readGuestKey();
  return key && key.id === id ? key.token : null;
}

/** Progress, saved as the candidate goes. The database only accepts additions. */
export async function syncAssessment(id: string, actions: Stamped[]): Promise<boolean> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return false;
  const token = await guestTokenFor(id);
  const { data, error } = token
    ? await supabase.rpc("hiring_guest_sync", { p_id: id, p_token: token, p_actions: tidy(actions) })
    : await supabase.rpc("hiring_sync", { p_id: id, p_actions: tidy(actions) });
  return !error && data === true;
}

export interface TelemetryEvent {
  eventType: string;
  realMs: number;
  simTime: number;
  entityId?: string;
  payload: Record<string, unknown>;
}

export async function logAssessment(id: string, events: TelemetryEvent[]): Promise<boolean> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || events.length === 0) return false;
  const token = await guestTokenFor(id);
  const { error } = token
    ? await supabase.rpc("hiring_guest_log", { p_id: id, p_token: token, p_events: events.slice(0, 200) })
    : await supabase.rpc("hiring_log", { p_id: id, p_events: events.slice(0, 200) });
  return !error;
}

/**
 * The shift is over, or the time is.
 *
 * The profile handed back is built from what the database holds after the
 * final save, not from what the browser sent, so a save the database refused
 * cannot appear in it.
 */
export async function completeAssessment(id: string, actions: Stamped[]): Promise<CandidateProfile | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const token = await guestTokenFor(id);
  const { error } = token
    ? await supabase.rpc("hiring_guest_complete", { p_id: id, p_token: token, p_actions: tidy(actions) })
    : await supabase.rpc("hiring_complete", { p_id: id, p_actions: tidy(actions) });
  if (error) return null;

  const attempt = token ? await readGuestAttempt() : await readCurrentAttempt();
  if (!attempt || attempt.id !== id || attempt.status === "in_progress") return null;

  const { result, incomplete } = resultFrom(attempt.scenario_variant, attempt.actions);

  // The evidence the result rests on, alongside the rest of the telemetry.
  await supabase.rpc(token ? "hiring_guest_log" : "hiring_log", {
    p_id: id,
    ...(token ? { p_token: token } : {}),
    p_events: result.evidence.map((evidence) => ({
      eventType: "evidence",
      simTime: evidence.simTime ?? 0,
      entityId: evidence.behaviourId,
      payload: {
        assessmentVersion: ASSESSMENT_VERSION,
        scenarioVariant: attempt.scenario_variant,
        evidenceObject: evidence,
      },
    })),
  });

  revalidatePath("/hiring-test", "layout");
  return candidateProfileFrom(result, incomplete);
}
