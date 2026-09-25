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
  /** leadEventId pairs the browser's Lead with the server's, for deduplication. */
  | { status: "ready"; paymentUrl: string; leadEventId?: string }
  | { status: "invalid"; errors: RegistrationErrors }
  | { status: "closed"; message: string };

export const REGISTER_ENDPOINT = "/api/challenge/register";

/**
 * A field people never see. Named and labelled so browser autofill has no
 * reason to fill it — the old "company" field was being autofilled.
 */
export const HONEYPOT_FIELD = "hp_x7";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Removes what browser and phone autofill slip into values: invisible
 * formatting characters (iOS wraps saved phone numbers in U+202A…U+202C,
 * some keyboards add zero-width spaces) and full-width forms. Without this an
 * autofilled number fails validation while the same number typed by hand
 * passes, and an email could be stored with a character the sign-in email
 * does not have.
 */
export function cleanInput(raw: string): string {
  return raw.normalize("NFKC").replace(/\p{Cf}/gu, "");
}

/** An Indian mobile number in any common spelling, as +91XXXXXXXXXX — or null. */
export function normalisePhone(raw: string): string | null {
  const digits = cleanInput(raw).replace(/\D/g, "");
  // Ten digits, optionally after 0, 91, 091 or 0091.
  const match = /^(?:0{0,2}91|0)?([6-9]\d{9})$/.exec(digits);
  return match ? `+91${match[1]}` : null;
}

export function validateRegistration(
  input: RegistrationFields,
): { ok: true; value: RegistrationFields } | { ok: false; errors: RegistrationErrors } {
  const name = cleanInput(input.name).replace(/\s+/g, " ").trim();
  const email = cleanInput(input.email).replace(/\s+/g, "").toLowerCase();
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

export const FORM_EVENT_ENDPOINT = "/api/challenge/form-event";

/**
 * The pattern of a value with its content masked: digits become 9, letters
 * a, and anything unusual is spelled out as its code point — which is exactly
 * what reveals an autofill quirk, and nothing about the person.
 */
export function shapeOf(raw: string, max = 40): string {
  let out = "";
  for (const char of raw.slice(0, max)) {
    if (/\p{Nd}/u.test(char)) out += /\d/.test(char) ? "9" : "<wide9>";
    else if (/\p{L}/u.test(char)) out += "a";
    else if (" @.+-()".includes(char)) out += char;
    else out += `<U+${char.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0")}>`;
  }
  return raw.length > max ? `${out}…` : out;
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
