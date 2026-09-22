import "server-only";

/**
 * Copies a landing-page registration to Google Sheets through the Apps Script
 * web app in integrations/google-sheets/Code.gs.
 *
 * Off unless both variables are set. It runs after the person has been sent
 * to payment, is capped at a few seconds, and never throws — a slow or broken
 * sheet must not affect registering or paying. Supabase stays the record; the
 * sheet is a convenient copy.
 */

const URL_ENV = process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim() ?? "";
const SECRET_ENV = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET?.trim() ?? "";
const TIMEOUT_MS = 8_000;

// Only a Google Apps Script deployment is ever posted to.
const WEBHOOK_URL = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(URL_ENV) ? URL_ENV : "";

export const isSheetsConfigured = Boolean(WEBHOOK_URL && SECRET_ENV);

export interface SheetRegistration {
  submittedAt: string;
  name: string;
  phone: string;
  email: string;
  cohort: string;
  /** Whether the row also reached Supabase. */
  stored: boolean;
  attribution: Record<string, string>;
}

export async function sendRegistrationToSheet(registration: SheetRegistration): Promise<void> {
  if (!isSheetsConfigured) return;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      // Apps Script answers through a redirect to googleusercontent.com.
      redirect: "follow",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret: SECRET_ENV, registration }),
      signal: controller.signal,
      cache: "no-store",
    });
    const result = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!response.ok || !result?.ok) {
      console.error("[sheets] registration not copied:", response.status, result?.error ?? "no reply");
    }
  } catch (error) {
    console.error("[sheets] registration not copied:", error instanceof Error ? error.name : "error");
  } finally {
    clearTimeout(timer);
  }
}
