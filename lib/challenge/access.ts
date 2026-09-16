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
 * Whether the signed-in operator registered for the challenge.
 *
 * The database decides: `has_challenge_access` matches the confirmed email on
 * the account against the registrations, which the app itself cannot read.
 * Anything that goes wrong asking counts as a no — a paid product fails closed.
 * Simulator Mode has no registrations to check, so it lets everyone in.
 */
export const hasChallengeAccess = cache(async (): Promise<boolean> => {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return true;

  const { data, error } = await supabase.rpc("has_challenge_access", {
    p_cohort: OFFER.cohort,
  });
  if (error) {
    console.error("[challenge] access check failed:", error.code, error.message);
    return false;
  }
  return data === true;
});

/**
 * The guard in front of every challenge page, in order: signed in, onboarded,
 * registered. `path` is where to come back to once each is sorted.
 */
export async function requireChallengeAccess(path: string): Promise<Operator> {
  const next = encodeURIComponent(path);

  const operator = await getOperator();
  if (!operator) redirect(`${LOGIN_ROUTE}?next=${next}`);
  if (!operator.onboarded) redirect(`${ONBOARDING_ROUTE}?next=${next}`);
  if (!(await hasChallengeAccess())) redirect(`${CHALLENGE_ACCESS_ROUTE}?next=${next}`);

  return operator;
}
