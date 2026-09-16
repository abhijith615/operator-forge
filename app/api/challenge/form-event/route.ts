import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Records why the registration form refused a submission in the browser.
 * Only masked shapes and field names arrive here (see `shapeOf`); anything
 * else in the body is dropped. Always answers 204 — it is a beacon.
 */

export const dynamic = "force-dynamic";

const KINDS = new Set(["invalid", "request_failed"]);
const FIELDS = new Set(["name", "phone", "email"]);

function text(value: unknown, max: number): string | undefined {
  return typeof value === "string" ? value.slice(0, max) : undefined;
}

export async function POST(request: NextRequest) {
  const done = new NextResponse(null, { status: 204 });

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return done;
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return done;
  }

  const kind = text(body.kind, 20);
  if (!kind || !KINDS.has(kind)) return done;

  const fields = Array.isArray(body.fields)
    ? body.fields.filter((f): f is string => typeof f === "string" && FIELDS.has(f)).slice(0, 3)
    : [];

  const source = typeof body.detail === "object" && body.detail !== null ? (body.detail as Record<string, unknown>) : {};
  const detail = {
    phoneShape: text(source.phoneShape, 200),
    emailShape: text(source.emailShape, 200),
    nameLength: typeof source.nameLength === "number" ? Math.min(Math.max(0, source.nameLength), 999) : undefined,
    autofilled: Array.isArray(source.autofilled)
      ? source.autofilled.filter((f): f is string => typeof f === "string" && FIELDS.has(f)).slice(0, 3)
      : undefined,
    error: text(source.error, 120),
  };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return done;
  const { error } = await supabase.from("challenge_form_events").insert({
    kind,
    fields,
    detail,
    user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
  });
  if (error) console.error("[7-day-challenge] form event not stored:", error.code, error.message);
  return done;
}
