import "server-only";

import { createHash, randomUUID } from "node:crypto";

/**
 * Meta Conversions API — the server-side half of the pixel.
 *
 * The browser pixel loses events to ad blockers, iOS and in-app browsers,
 * which is most of a Meta campaign's traffic. Every important event is
 * therefore sent twice: once from the browser and once from here, with the
 * same `event_id` so Meta keeps one and discards the duplicate.
 *
 * It is deliberately quiet. Without `META_CAPI_ACCESS_TOKEN` nothing is sent,
 * a failure is logged and swallowed, and no caller ever waits on it:
 * measurement must never stand between somebody and paying.
 */

const API_VERSION = "v21.0";
const TIMEOUT_MS = 5_000;

const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN?.trim() ?? "";
const PIXEL_ID = (process.env.META_PIXEL_ID ?? process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "").trim();
/** Set while testing to make events appear under Test Events in Events Manager. */
const TEST_EVENT_CODE = process.env.META_CAPI_TEST_EVENT_CODE?.trim() ?? "";

export const isCapiConfigured = Boolean(ACCESS_TOKEN && /^\d{5,20}$/.test(PIXEL_ID));

/** A fresh id to share between the browser event and its server twin. */
export function newEventId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

/** Meta wants personal data lower-cased, trimmed and SHA-256 hashed. */
function hash(value: string | null | undefined): string | undefined {
  const normalised = (value ?? "").trim().toLowerCase();
  if (!normalised) return undefined;
  return createHash("sha256").update(normalised).digest("hex");
}

/** Phone numbers hash as digits only, including the country code. */
function hashPhone(value: string | null | undefined): string | undefined {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits ? createHash("sha256").update(digits).digest("hex") : undefined;
}

export interface MetaUser {
  email?: string;
  phone?: string;
  /** The `_fbp` and `_fbc` cookies the pixel sets in the browser. */
  fbp?: string;
  fbc?: string;
  ip?: string;
  userAgent?: string;
}

export interface MetaEvent {
  name: "Lead" | "Purchase" | "InitiateCheckout";
  eventId: string;
  /** The page the person was on, as Meta's event_source_url. */
  sourceUrl?: string;
  user: MetaUser;
  value?: number;
  currency?: string;
  contentName?: string;
  /** Seconds since the epoch; defaults to now. */
  eventTime?: number;
}

function payloadFor(event: MetaEvent) {
  const { user } = event;
  const userData: Record<string, unknown> = {
    em: hash(user.email),
    ph: hashPhone(user.phone),
    fbp: user.fbp || undefined,
    fbc: user.fbc || undefined,
    client_ip_address: user.ip || undefined,
    client_user_agent: user.userAgent || undefined,
  };
  for (const key of Object.keys(userData)) {
    if (userData[key] === undefined) delete userData[key];
  }

  const custom: Record<string, unknown> = {};
  if (event.value !== undefined) custom.value = event.value;
  if (event.currency) custom.currency = event.currency;
  if (event.contentName) custom.content_name = event.contentName;

  return {
    event_name: event.name,
    event_time: event.eventTime ?? Math.floor(Date.now() / 1000),
    event_id: event.eventId,
    event_source_url: event.sourceUrl,
    action_source: "website",
    user_data: userData,
    custom_data: Object.keys(custom).length > 0 ? custom : undefined,
  };
}

/**
 * Sends one event. Resolves either way — callers use it as fire-and-forget,
 * typically inside `after()` so the response has already gone out.
 */
export async function sendMetaEvent(event: MetaEvent): Promise<void> {
  if (!isCapiConfigured) return;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const body: Record<string, unknown> = { data: [payloadFor(event)] };
    if (TEST_EVENT_CODE) body.test_event_code = TEST_EVENT_CODE;

    const response = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(ACCESS_TOKEN)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      // The reply names the offending field but never the person's data.
      const detail = await response.text().catch(() => "");
      console.error(`[meta-capi] ${event.name} rejected:`, response.status, detail.slice(0, 300));
    }
  } catch (error) {
    console.error("[meta-capi] not sent:", error instanceof Error ? error.name : "error");
  } finally {
    clearTimeout(timer);
  }
}

/** The bits of a request Meta wants for matching, read once per call. */
export function requestContext(headers: Headers): Pick<MetaUser, "ip" | "userAgent"> {
  const forwarded = headers.get("x-forwarded-for") ?? "";
  return {
    ip: forwarded.split(",")[0]?.trim() || undefined,
    userAgent: headers.get("user-agent") ?? undefined,
  };
}

/** `_fbp` / `_fbc` as the pixel wrote them, from a cookie header. */
export function pixelCookies(cookieHeader: string | null): Pick<MetaUser, "fbp" | "fbc"> {
  if (!cookieHeader) return {};
  const read = (name: string) =>
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.slice(name.length + 1);
  return { fbp: read("_fbp"), fbc: read("_fbc") };
}
