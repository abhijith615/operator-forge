"use server";

import { randomUUID } from "node:crypto";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { OPERATORS_TABLE, isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/utils";
import type { Operator } from "@/types/operator";

import type { FormState } from "./form-state";
import { magicLinkSchema, onboardingSchema } from "./schema";
import { getOperator } from "./session";
import {
  clearSimulatorOperator,
  readSimulatorOperator,
  writeSimulatorOperator,
} from "./simulator";

/* ── Google ─────────────────────────────────────────────────────────────── */

export async function signInWithGoogle(): Promise<FormState> {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    // Simulator Mode: mint a local identity and go straight to onboarding.
    await writeSimulatorOperator(makeSimulatorOperator());
    redirect("/onboarding");
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: absoluteUrl("/auth/callback"),
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data.url) {
    return {
      status: "error",
      message: error?.message ?? "Google sign-in is unavailable right now.",
    };
  }

  redirect(data.url);
}

/* ── Magic link ─────────────────────────────────────────────────────────── */

export async function sendMagicLink(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
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
    await writeSimulatorOperator(makeSimulatorOperator(parsed.data.email));
    redirect("/onboarding");
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: absoluteUrl("/auth/callback") },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  return {
    status: "success",
    message: `Link sent to ${parsed.data.email}. It expires in 60 minutes.`,
  };
}

/* ── Onboarding ─────────────────────────────────────────────────────────── */

/** Shared validate-and-persist path for onboarding and settings. */
async function saveProfile(formData: FormData): Promise<FormState> {
  const parsed = onboardingSchema.safeParse({
    fullName: formData.get("fullName"),
    whatsapp: formData.get("whatsapp"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  const operator = await getOperator();
  if (!operator) {
    return { status: "error", message: "Your session expired. Sign in again." };
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    await writeSimulatorOperator({
      ...operator,
      fullName: parsed.data.fullName,
      whatsapp: parsed.data.whatsapp,
      onboarded: true,
    });
  } else {
    const { error } = await supabase.from(OPERATORS_TABLE).upsert(
      {
        id: operator.id,
        email: operator.email,
        full_name: parsed.data.fullName,
        whatsapp: parsed.data.whatsapp,
        avatar_url: operator.avatarUrl,
      },
      { onConflict: "id" },
    );

    if (error) {
      return { status: "error", message: error.message };
    }
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "Saved." };
}

export async function completeOnboarding(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await saveProfile(formData);
  if (result.status === "error") return result;
  redirect("/mission");
}

/** Same fields, but stays on the settings page. */
export async function updateProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await saveProfile(formData);
  if (result.status === "success") {
    return { status: "success", message: "Roster updated." };
  }
  return result;
}

/* ── Sign out ───────────────────────────────────────────────────────────── */

export async function signOut(): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  } else {
    await clearSimulatorOperator();
  }
  revalidatePath("/", "layout");
  redirect("/");
}

/* ── Simulator Mode helpers ─────────────────────────────────────────────── */

function makeSimulatorOperator(email = "operator@simulator.local"): Operator {
  return {
    id: randomUUID(),
    email,
    fullName: "",
    whatsapp: null,
    avatarUrl: null,
    onboarded: false,
    createdAt: new Date().toISOString(),
  };
}

/** Exposed for the login screen's "continue without a backend" affordance. */
export async function startSimulatorSession(): Promise<FormState> {
  if (isSupabaseConfigured) {
    return { status: "error", message: "Simulator Mode is disabled when Supabase is connected." };
  }
  const existing = await readSimulatorOperator();
  await writeSimulatorOperator(existing ?? makeSimulatorOperator());
  redirect(existing?.onboarded ? "/mission" : "/onboarding");
}
