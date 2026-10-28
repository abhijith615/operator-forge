/**
 * The WhatsApp number a name-only candidate gives at the start.
 *
 * Indian mobile numbers only: ten digits starting 6–9, with or without +91,
 * 91 or a leading 0, and with any spaces, dashes or brackets. Stored as
 * +91 and the ten digits, which is what the database accepts.
 */
export function whatsappNumber(value: unknown): string | null {
  let digits = String(value ?? "").replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (!/^\d+$/.test(digits)) return null;
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

/** "+91 98765 43210", for an admin reading it. */
export function formatWhatsapp(stored: string | null | undefined): string {
  const match = /^\+91(\d{5})(\d{5})$/.exec(stored ?? "");
  return match ? `+91 ${match[1]} ${match[2]}` : (stored ?? "");
}

/** A link that opens a WhatsApp chat with the number. */
export function whatsappLink(stored: string | null | undefined): string | null {
  return stored && /^\+91\d{10}$/.test(stored) ? `https://wa.me/${stored.slice(1)}` : null;
}
