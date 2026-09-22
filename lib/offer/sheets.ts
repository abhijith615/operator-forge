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

const URL_ENV = process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim().replace(/\/+$/, "") ?? "";
const SECRET_ENV = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET?.trim() ?? "";
const TIMEOUT_MS = 8_000;

// Only a Google Apps Script deployment is ever posted to — including the
// Google Workspace form, script.google.com/a/macros/<domain>/s/<id>/exec.
const APPS_SCRIPT_URL = /^https:\/\/script\.google\.com\/(?:a\/macros\/[\w.-]+|macros)\/s\/[\w-]+\/exec$/;
const WEBHOOK_URL = APPS_SCRIPT_URL.test(URL_ENV) ? URL_ENV : "";

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

export type SheetCheck =
  | { ok: true; message: string }
  | { ok: false; reason: string; message: string };

/** Posts one registration and says exactly what happened. Never throws. */
async function post(registration: SheetRegistration): Promise<SheetCheck> {
  if (!URL_ENV && !SECRET_ENV) {
    return {
      ok: false,
      reason: "not_configured",
      message:
        "GOOGLE_SHEETS_WEBHOOK_URL and GOOGLE_SHEETS_WEBHOOK_SECRET are not set on this deployment. Add them in Vercel → Settings → Environment Variables, then redeploy.",
    };
  }
  if (!URL_ENV) {
    return { ok: false, reason: "no_url", message: "GOOGLE_SHEETS_WEBHOOK_URL is not set on this deployment." };
  }
  if (!SECRET_ENV) {
    return { ok: false, reason: "no_secret", message: "GOOGLE_SHEETS_WEBHOOK_SECRET is not set on this deployment." };
  }
  if (!WEBHOOK_URL) {
    return {
      ok: false,
      reason: "bad_url",
      message:
        "GOOGLE_SHEETS_WEBHOOK_URL is not an Apps Script web app URL. Use the URL from Deploy → Manage deployments, ending in /exec (not /dev).",
    };
  }

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
    const text = await response.text();
    type ScriptReply = { ok?: boolean; error?: string; message?: string; emailed?: boolean; emailError?: string | null };
    let result: ScriptReply | null = null;
    try {
      result = JSON.parse(text) as ScriptReply;
    } catch {
      result = null;
    }

    if (result?.ok) {
      if (result.emailed === false) {
        return {
          ok: false,
          reason: "email_failed",
          message: `A test row was added to the sheet, but the email failed: ${result.emailError ?? "unknown error"}. Deploy a new version and allow the "send email" permission.`,
        };
      }
      return {
        ok: true,
        message:
          result.emailed === true
            ? "Connected. A test row was added to the sheet and a [TEST] email was sent."
            : "Connected. A test row was added to the sheet. (No email — update Code.gs to the latest version to turn on emails.)",
      };
    }
    if (result?.error === "unauthorised") {
      return {
        ok: false,
        reason: "secret_mismatch",
        message:
          "The script refused the secret. WEBHOOK_SECRET in Apps Script → Project Settings → Script properties must match GOOGLE_SHEETS_WEBHOOK_SECRET exactly.",
      };
    }
    if (result?.error === "script") {
      return { ok: false, reason: "script_error", message: `The script ran but failed: ${result.message ?? "unknown error"}` };
    }
    if (/<html/i.test(text) && /(sign in|signin|accounts\.google)/i.test(text)) {
      return {
        ok: false,
        reason: "needs_sign_in",
        message:
          "Google asked for a sign-in. In Apps Script → Deploy → Manage deployments → edit, set “Who has access” to “Anyone” (not “Anyone with Google account”) and deploy a new version.",
      };
    }
    if (/<html/i.test(text)) {
      // Apps Script's error page carries the message; show it rather than a guess.
      const scriptError = /(?:TypeError|ReferenceError|Exception|Script function not found)[^<]{0,160}/i
        .exec(text)?.[0]
        ?.replace(/&#39;|&quot;/g, "'")
        .trim();
      const notAttached = Boolean(scriptError && /null/i.test(scriptError) && /getSheetByName|getActiveSpreadsheet/i.test(scriptError));
      return {
        ok: false,
        reason: "script_error",
        message: notAttached
          ? "The script is not attached to your spreadsheet. Replace Code.gs with the latest version and add a SPREADSHEET_ID script property (the ID from the sheet's URL), then deploy a new version."
          : scriptError
            ? `The script ran but failed: ${scriptError}. Replace Code.gs with the latest version, save, and deploy a new version.`
            : `The script returned a web page instead of a reply (HTTP ${response.status}). Deploy a new version of the web app and use its /exec URL.`,
      };
    }
    return {
      ok: false,
      reason: "unexpected",
      message: `Unexpected reply from Apps Script (HTTP ${response.status}): ${text.slice(0, 120)}`,
    };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      reason: timedOut ? "timeout" : "unreachable",
      message: timedOut ? "Apps Script did not answer within 8 seconds." : "Could not reach Apps Script.",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function sendRegistrationToSheet(registration: SheetRegistration): Promise<void> {
  if (!isSheetsConfigured) return;
  const result = await post(registration);
  if (!result.ok) console.error("[sheets] registration not copied or not emailed:", result.reason);
}

/** For the admin panel: sends a clearly-marked test row and reports the outcome. */
export function checkSheetConnection(): Promise<SheetCheck> {
  return post({
    submittedAt: new Date().toISOString(),
    name: "TEST — delete me",
    phone: "+919000000000",
    email: "test@example.com",
    cohort: "connection-test",
    stored: false,
    attribution: { flag: "admin-test" },
  });
}
