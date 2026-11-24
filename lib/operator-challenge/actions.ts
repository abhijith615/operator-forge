"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { signInWithGoogle } from "@/lib/auth/actions";
import type { FormState } from "@/lib/auth/form-state";
import type { StartedAttempt } from "@/lib/hiring/actions";
import { whatsappNumber } from "@/lib/hiring/phone";
import type { FormId, Stamped } from "@/lib/hiring/types";
import { ASSESSMENT_SECONDS, ASSESSMENT_VERSION } from "@/lib/hiring/weights";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import { CHALLENGE_CONSENT_VERSION, CHALLENGE_ROUTE } from "./content";
import { readChallengeAttempt, scoreChallenge, type ChallengeScorecard } from "./server";

/* ── Getting in ───────────────────────────────────────────────────────── */

/** Google, and straight back here. Not the operator onboarding: the callback lets this route through. */
export async function challengeGoogleSignIn(): Promise<FormState> {
  return signInWithGoogle(CHALLENGE_ROUTE);
}

/** Taking part under a different Google account. */
export async function switchChallengeAccount(): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect(CHALLENGE_ROUTE);
}

/* ── Details ──────────────────────────────────────────────────────────── */

const tidy = (value: FormDataEntryValue | null) => String(value ?? "").replace(/\s+/g, " ").trim();

/**
 * Name, WhatsApp number, city, education, college, graduation year and
 * whether they work now. Checked here for a clear message, and again by the
 * database, which is what decides.
 */
export async function saveChallengeDetails(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = tidy(formData.get("name"));
  const phone = whatsappNumber(formData.get("phone"));
  const city = tidy(formData.get("city"));
  const education = tidy(formData.get("education"));
  const college = tidy(formData.get("college"));
  const gradYear = Number(tidy(formData.get("gradYear")));
  const working = tidy(formData.get("working"));
  const thisYear = new Date().getFullYear();

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2 || name.length > 80) fieldErrors.name = "Enter your full name.";
  if (!phone) fieldErrors.phone = "Enter a 10-digit Indian WhatsApp number.";
  if (city.length < 2 || city.length > 60) fieldErrors.city = "Enter your city.";
  if (education !== "student" && education !== "graduate") fieldErrors.education = "Choose student or graduate.";
  if (college.length < 2 || college.length > 120) fieldErrors.college = "Enter your college.";
  if (!Number.isInteger(gradYear) || gradYear < 1980 || gradYear > thisYear + 6) fieldErrors.gradYear = "Enter a year, for example 2025.";
  else if (education === "student" && gradYear < thisYear) fieldErrors.gradYear = "As a student, enter the year you expect to graduate.";
  if (working !== "yes" && working !== "no") fieldErrors.working = "Choose yes or no.";
  if (Object.keys(fieldErrors).length) return { status: "error", message: "Check the highlighted fields.", fieldErrors };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { status: "error", message: "This is not available right now. Try again later." };

  const { error } = await supabase.rpc("operator_challenge_save_details", {
    p_name: name,
    p_phone: phone,
    p_city: city,
    p_education: education,
    p_working: working === "yes",
    p_college: college,
    p_grad_year: gradYear,
  });
  if (error) {
    return {
      status: "error",
      message: error.code === "42501" ? "Your sign-in has ended. Reload the page and sign in again." : "Your details could not be saved. Check them and try again.",
    };
  }

  revalidatePath(CHALLENGE_ROUTE);
  redirect(CHALLENGE_ROUTE);
}

/* ── The shift ────────────────────────────────────────────────────────── */

export type ChallengeStartFailure = "details" | "signin" | "failed";

/**
 * Pressing Start shift. The clock is the database's, and starts here — only
 * with consent, and only once the details are saved. A second call returns
 * the first attempt: one try per account.
 */
export async function startChallenge(device: string, consented: boolean): Promise<StartedAttempt | { error: ChallengeStartFailure }> {
  if (consented !== true) return { error: "failed" };
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { error: "failed" };
  const p_device = ["mobile", "tablet", "desktop"].includes(device) ? device : "unknown";

  const { data, error } = await supabase.rpc("operator_challenge_begin", {
    p_version: ASSESSMENT_VERSION,
    p_consent_version: CHALLENGE_CONSENT_VERSION,
    p_device,
  });
  const row = (Array.isArray(data) ? data[0] : data) as
    | { id: string; scenario_variant: FormId; status: StartedAttempt["status"]; started_at: string; actions: unknown; server_now: string; time_limit_seconds?: number }
    | undefined;
  if (error || !row) {
    if (error?.code === "42501") return { error: "signin" };
    if (error && /details are required/i.test(error.message)) return { error: "details" };
    return { error: "failed" };
  }

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

const cleanActions = (actions: Stamped[]): Stamped[] =>
  (Array.isArray(actions) ? actions : []).slice(0, 800).map((entry) => ({ a: entry.a, at: Math.round(Number(entry.at) || 0) }));

/**
 * The shift is over, or the time is. The scorecard comes from what the
 * database holds after the final save, not from what the browser sent.
 */
export async function completeChallenge(id: string, actions: Stamped[]): Promise<ChallengeScorecard | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { error } = await supabase.rpc("hiring_complete", { p_id: id, p_actions: cleanActions(actions) });
  if (error) return null;

  const attempt = await readChallengeAttempt();
  if (!attempt || attempt.retired || attempt.id !== id || attempt.status === "in_progress") return null;

  const { result, scorecard } = scoreChallenge(attempt.scenario_variant, attempt.actions);

  // The evidence the result rests on, alongside the rest of the attempt's events.
  await supabase.rpc("hiring_log", {
    p_id: id,
    p_events: result.evidence.slice(0, 200).map((evidence) => ({
      eventType: "evidence",
      simTime: evidence.simTime ?? 0,
      entityId: evidence.behaviourId,
      payload: { assessmentVersion: ASSESSMENT_VERSION, scenarioVariant: attempt.scenario_variant, evidenceObject: evidence },
    })),
  });

  revalidatePath(CHALLENGE_ROUTE);
  return scorecard;
}
