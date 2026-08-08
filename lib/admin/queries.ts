import "server-only";

import { redirect } from "next/navigation";

import { getOperator } from "@/lib/auth/session";
import { HOME_ROUTE, LOGIN_ROUTE } from "@/lib/constants/routes";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Admin data.
 *
 * Nothing here reaches past row level security on its own. Every read goes
 * through a `security definer` function that checks the caller against the
 * `admins` table first — see supabase/schema.sql. There is no service_role key
 * in this codebase, so there is no credential that could bypass RLS if it
 * leaked, and revoking someone is a single delete.
 */

export interface AdminSummary {
  total_operators: number;
  operators_today: number;
  operators_7d: number;
  onboarded: number;
  runs_started: number;
  runs_completed: number;
  runs_dropped: number;
  waitlist_count: number;
}

export interface AdminOperator {
  id: string;
  full_name: string | null;
  email: string;
  whatsapp: string | null;
  created_at: string;
  runs: number;
  completed: number;
  best_rating: number | null;
  last_activity: string;
}

export interface AdminDailySignup {
  day: string;
  signups: number;
}

export interface AdminDropoff {
  run_id: string;
  email: string;
  full_name: string | null;
  status: string;
  elapsed_seconds: number;
  started_at: string;
  last_touched: string;
}

export interface AdminWaitlistEntry {
  email: string;
  topic: string;
  full_name: string | null;
  created_at: string;
}

export interface AdminSnapshot {
  summary: AdminSummary;
  operators: AdminOperator[];
  daily: AdminDailySignup[];
  dropoffs: AdminDropoff[];
  waitlist: AdminWaitlistEntry[];
  /** When the server read this, so the page can say how stale it is. */
  readAt: string;
}

/** Is the signed-in operator listed in `admins`? Decided by the database. */
export async function isAdmin(): Promise<boolean> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return false;

  const { data, error } = await supabase.rpc("is_admin");
  if (error) return false;
  return data === true;
}

/**
 * Guard for the admin route. Sends non-admins to the shift rather than showing
 * a permission error — an error page confirms the route exists.
 */
export async function requireAdmin(): Promise<void> {
  const operator = await getOperator();
  if (!operator) redirect(LOGIN_ROUTE);
  if (!(await isAdmin())) redirect(HOME_ROUTE);
}

/**
 * One round of every panel. Fired in parallel: five small reads against a
 * database that already has the answers, so serialising them would only add
 * latency to a page that refreshes on a timer.
 */
export async function readAdminSnapshot(): Promise<AdminSnapshot | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const [summary, operators, daily, dropoffs, waitlist] = await Promise.all([
    supabase.rpc("admin_summary"),
    supabase.rpc("admin_operators"),
    supabase.rpc("admin_daily_signups", { p_days: 30 }),
    supabase.rpc("admin_dropoffs"),
    supabase.rpc("admin_waitlist"),
  ]);

  // A denied caller errors on every one of these. Returning null rather than
  // partial data keeps "not an admin" and "one query failed" distinguishable.
  if (summary.error || !summary.data) return null;

  const row = (Array.isArray(summary.data) ? summary.data[0] : summary.data) as
    | AdminSummary
    | undefined;
  if (!row) return null;

  return {
    summary: row,
    operators: (operators.data ?? []) as AdminOperator[],
    daily: (daily.data ?? []) as AdminDailySignup[],
    dropoffs: (dropoffs.data ?? []) as AdminDropoff[],
    waitlist: (waitlist.data ?? []) as AdminWaitlistEntry[],
    readAt: new Date().toISOString(),
  };
}
