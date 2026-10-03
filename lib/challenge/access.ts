import "server-only";

import { cache } from "react";

import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin/queries";
import { getOperator } from "@/lib/auth/session";
import { OFFER } from "@/lib/constants/offer";
import { LOGIN_ROUTE, ONBOARDING_ROUTE } from "@/lib/constants/routes";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Operator } from "@/types/operator";

import { readOwnRun } from "./runs";

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
 * Has this operator already used up their one attempt at a day?
 *
 * A day is played once. A shift you can retake until the score flatters you is
 * not an assessment, and the leaderboard is only worth reading if every row on
 * it is somebody's first attempt.
 *
 * Admins are outside that rule, because they are not competing — they are
 * testing. Content changes between cohorts, and the only way to know a day
 * still reads correctly is to play it again. The same exemption the trial
 * mission makes, for the same reason.
 */
export async function replayBlocked(day: number): Promise<boolean> {
  if (await isAdmin()) return false;
  return (await readOwnRun(day)) !== null;
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
