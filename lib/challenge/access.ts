import "server-only";

import { cache } from "react";

import { redirect } from "next/navigation";

import { getOperator } from "@/lib/auth/session";
import { OFFER } from "@/lib/constants/offer";
import { LOGIN_ROUTE, ONBOARDING_ROUTE } from "@/lib/constants/routes";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Operator } from "@/types/operator";

export const CHALLENGE_ACCESS_ROUTE = "/challenge/access";

/**
 * `upcoming` is registered and paid, but the cohort has not started yet —
 * only admins play before the start date.
 */
export type ChallengeAccessStatus = "granted" | "upcoming" | "unpaid" | "unregistered";

const STATUSES: readonly ChallengeAccessStatus[] = ["granted", "upcoming", "unpaid", "unregistered"];

/**
 * Where the signed-in operator stands with the challenge.
 *
 * The database decides: `challenge_access_status` matches the confirmed email
 * on the account against the registrations, which the app itself cannot read.
 * Only a paid registration lets someone in, and only once the cohort has
 * started; admins are let in at any time. Anything
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
  return STATUSES.find((status) => status === data) ?? "unregistered";
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
