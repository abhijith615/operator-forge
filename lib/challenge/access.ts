import "server-only";

import { cache } from "react";

import { redirect } from "next/navigation";

import { getOperator } from "@/lib/auth/session";
import { OFFER } from "@/lib/constants/offer";
import { LOGIN_ROUTE, ONBOARDING_ROUTE } from "@/lib/constants/routes";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Operator } from "@/types/operator";

export const CHALLENGE_ACCESS_ROUTE = "/challenge/access";

export type ChallengeAccessStatus = "granted" | "unpaid" | "unregistered";

/**
 * Where the signed-in operator stands with the challenge.
 *
 * The database decides: `challenge_access_status` matches the confirmed email
 * on the account against the registrations, which the app itself cannot read,
 * and only a registration an admin has marked paid lets someone in. Anything
 * that goes wrong asking counts as a no — a paid product fails closed.
 * Simulator Mode has no registrations to check, so it lets everyone in.
 */
export const readChallengeAccess = cache(async (): Promise<ChallengeAccessStatus> => {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return "granted";

  const { data, error } = await supabase.rpc("challenge_access_status", {
    p_cohort: OFFER.cohort,
  });
  if (error) {
    console.error("[challenge] access check failed:", error.code, error.message);
    return "unregistered";
  }
  return data === "granted" || data === "unpaid" ? data : "unregistered";
});

export async function hasChallengeAccess(): Promise<boolean> {
  return (await readChallengeAccess()) === "granted";
}

/**
 * The guard in front of every challenge page, in order: signed in, onboarded,
 * registered and paid. `path` is where to come back to once each is sorted.
 */
export async function requireChallengeAccess(path: string): Promise<Operator> {
  const next = encodeURIComponent(path);

  const operator = await getOperator();
  if (!operator) redirect(`${LOGIN_ROUTE}?next=${next}`);
  if (!operator.onboarded) redirect(`${ONBOARDING_ROUTE}?next=${next}`);
  if (!(await hasChallengeAccess())) redirect(`${CHALLENGE_ACCESS_ROUTE}?next=${next}`);

  return operator;
}
