import "server-only";

import { createClient } from "@supabase/supabase-js";

import { OFFER } from "@/lib/constants/offer";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Certificates of completion.
 *
 * The database decides everything: who qualifies (all five simulations done,
 * the live AMA attended, with access to the challenge — admins skip the AMA),
 * the certificate code, and the name on it — fixed when it is first issued.
 * The app only asks and draws.
 */

export const CERTIFICATE_ROUTE = "/challenge/certificate";
export const CERTIFICATE_DOWNLOAD_ROUTE = "/challenge/certificate/download";
export const DAYS_REQUIRED = 5;

export interface CertificateProgress {
  daysDone: number;
  daysRequired: number;
  /** Marked by an admin after the live AMA on Day 7. */
  amaAttended: boolean;
  /** Admins skip the AMA and the start date, so they can test certificates. */
  isAdmin: boolean;
  eligible: boolean;
}

export interface Certificate {
  code: string;
  fullName: string;
  cohort: string;
  completedAt: string;
  issuedAt: string;
}

interface CertificateRow {
  code: string;
  full_name: string;
  cohort: string;
  completed_at: string;
  issued_at: string;
}

const CODE = /^OF-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/;

function toCertificate(row: CertificateRow): Certificate {
  return {
    code: row.code,
    fullName: row.full_name,
    cohort: row.cohort,
    completedAt: row.completed_at,
    issuedAt: row.issued_at,
  };
}

function firstRow<T>(data: unknown): T | null {
  const row = Array.isArray(data) ? data[0] : data;
  return row && typeof row === "object" ? (row as T) : null;
}

export async function readCertificateProgress(): Promise<CertificateProgress | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("challenge_certificate_progress");
  const row = firstRow<{
    days_done: number;
    days_required: number;
    ama_attended: boolean;
    is_admin: boolean;
    eligible: boolean;
  }>(data);
  if (error || !row) return null;
  return {
    daysDone: row.days_done,
    daysRequired: row.days_required,
    amaAttended: row.ama_attended,
    isAdmin: row.is_admin,
    eligible: row.eligible,
  };
}

/** Issues the signed-in operator's certificate, or returns the one they have. Null if they do not qualify. */
export async function issueCertificate(): Promise<Certificate | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("issue_challenge_certificate");
  if (error) {
    if (error.message !== "not eligible") {
      console.error("[certificate] could not issue:", error.code, error.message);
    }
    return null;
  }
  const row = firstRow<CertificateRow>(data);
  return row ? toCertificate(row) : null;
}

/** Public lookup by code, for the verification page. Works signed out. */
export async function verifyCertificate(code: string): Promise<Certificate | null> {
  const normalised = code.trim().toUpperCase();
  if (!CODE.test(normalised) || !isSupabaseConfigured) return null;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("verify_challenge_certificate", { p_code: normalised });
  const row = firstRow<CertificateRow>(data);
  if (error || !row) return null;
  return toCertificate(row);
}

export function verificationPath(code: string): string {
  return `/certificate/${code}`;
}

/** The dates the certificate names — the cohort's, where we know them. */
export function cohortLabel(cohort: string): string {
  return cohort === OFFER.cohort ? OFFER.dateLabel : cohort;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

/** LinkedIn's "Add licence or certification" form, filled in. */
export function linkedInUrl(certificate: Certificate, verifyUrl: string): string {
  const issued = new Date(certificate.issuedAt);
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: `${OFFER.name} — Certificate of Completion`,
    organizationName: "Operator Forge",
    issueYear: String(issued.getUTCFullYear()),
    issueMonth: String(issued.getUTCMonth() + 1),
    certUrl: verifyUrl,
    certId: certificate.code,
  });
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}
