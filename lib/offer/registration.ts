/**
 * Registration rules for the paid-challenge landing page.
 *
 * Shared by the form, for instant feedback, and by the server action, which
 * is the one that counts. Kept free of server-only imports so both can use it.
 */

export interface RegistrationFields {
  name: string;
  phone: string;
  email: string;
}

export type RegistrationErrors = Partial<Record<keyof RegistrationFields, string>>;

export type RegistrationResult =
  | { status: "invalid"; errors: RegistrationErrors }
  | { status: "closed"; message: string }
  | { status: "ignored" };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** An Indian mobile number in any common spelling, as +91XXXXXXXXXX — or null. */
export function normalisePhone(raw: string): string | null {
  const compact = raw.replace(/[\s\-().]/g, "");
  const match = /^(?:\+?91|0)?([6-9]\d{9})$/.exec(compact);
  return match ? `+91${match[1]}` : null;
}

export function validateRegistration(
  input: RegistrationFields,
): { ok: true; value: RegistrationFields } | { ok: false; errors: RegistrationErrors } {
  const name = input.name.replace(/\s+/g, " ").trim();
  const email = input.email.trim().toLowerCase();
  const phone = normalisePhone(input.phone);
  const errors: RegistrationErrors = {};

  if (name.length < 2) errors.name = "Please enter your full name.";
  else if (name.length > 80) errors.name = "Please keep your name under 80 characters.";

  if (!phone) errors.phone = "Enter a 10-digit Indian mobile number.";

  if (!email) errors.email = "Please enter your email address.";
  else if (email.length > 254 || !EMAIL.test(email)) errors.email = "Enter a valid email address.";

  if (Object.keys(errors).length > 0 || !phone) return { ok: false, errors };
  return { ok: true, value: { name, phone, email } };
}

/** Where an ad click came from. Only these keys are kept, each capped in length. */
export const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
] as const;

export function attributionFrom(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = form.get(key);
    if (typeof value === "string" && value.trim()) out[key] = value.trim().slice(0, 200);
  }
  return out;
}
