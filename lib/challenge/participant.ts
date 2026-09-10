"use client";

import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";
import type { ChallengeResult } from "./types";

/**
 * Who is playing.
 *
 * The gate captures a name, an email and a phone number before Day 1 opens.
 * That is a lead-capture gate rather than authentication: nothing is verified
 * by a round trip, and it does not create an operator account. It is honest
 * about that in the copy, and swapping it for the magic link the rest of the
 * app already uses is a change to one component.
 *
 * The row is written straight to PostgREST rather than through a server action
 * so the challenge stays playable with no session. Row level security lets
 * anonymous visitors insert and update, and lets nobody read — the table holds
 * other people's phone numbers and only the admin panel can see it.
 */

const KEY = "of.challenge.participant";

export interface Participant {
  id: string;
  email: string;
  fullName: string;
  phone: string;
}

/* ── Validation ───────────────────────────────────────────────────────── */

export interface FieldErrors {
  fullName?: string;
  email?: string;
  phone?: string;
}

export function validate(input: {
  fullName: string;
  email: string;
  phone: string;
}): FieldErrors {
  const errors: FieldErrors = {};

  if (input.fullName.trim().length < 2) {
    errors.fullName = "Tell us what to call you.";
  }

  // Deliberately permissive. A stricter pattern rejects real addresses, and
  // the cost of a typo here is a lead we cannot reach — not a security hole.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.email.trim())) {
    errors.email = "Check the email address.";
  }

  // Indian mobile numbers, with or without +91 and separators.
  const digits = input.phone.replace(/[^\d]/g, "");
  const national = digits.startsWith("91") && digits.length > 10 ? digits.slice(2) : digits;
  if (national.length !== 10 || !/^[6-9]/.test(national)) {
    errors.phone = "Enter a 10-digit mobile number.";
  }

  return errors;
}

export function normalisePhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  const national = digits.startsWith("91") && digits.length > 10 ? digits.slice(2) : digits;
  return `+91${national}`;
}

/* ── Storage ──────────────────────────────────────────────────────────── */

export function readParticipant(): Participant | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Participant) : null;
  } catch {
    return null;
  }
}

function store(participant: Participant): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(participant));
  } catch {
    /* Private mode. The run still works; it just is not remembered. */
  }
}

const REST = supabaseUrl ? `${supabaseUrl}/rest/v1/challenge_participants` : null;

function headers(extra: Record<string, string> = {}): HeadersInit {
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

/**
 * Registers a participant. Falls back to a local-only identity when Supabase
 * is not configured or unreachable — a backend problem must never be the
 * reason somebody cannot start the challenge.
 */
export async function register(input: {
  fullName: string;
  email: string;
  phone: string;
}): Promise<Participant> {
  const participant: Participant = {
    id: crypto.randomUUID(),
    email: input.email.trim().toLowerCase(),
    fullName: input.fullName.trim(),
    phone: normalisePhone(input.phone),
  };

  if (REST) {
    try {
      const response = await fetch(`${REST}?on_conflict=email,day`, {
        method: "POST",
        headers: headers({ Prefer: "resolution=merge-duplicates,return=representation" }),
        body: JSON.stringify({
          email: participant.email,
          full_name: participant.fullName,
          phone: participant.phone,
          day: 1,
        }),
      });
      if (response.ok) {
        const rows = (await response.json()) as { id?: string }[];
        const id = rows[0]?.id;
        if (id) participant.id = id;
      }
    } catch {
      /* Offline or blocked. Keep going with the local identity. */
    }
  }

  store(participant);
  return participant;
}

/** Writes the result back against the same row at the end of the shift. */
export async function recordResult(
  participant: Participant,
  result: ChallengeResult,
  decisions: { scene: string; action: string }[],
): Promise<void> {
  if (!REST) return;
  try {
    await fetch(`${REST}?email=eq.${encodeURIComponent(participant.email)}&day=eq.1`, {
      method: "PATCH",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify({
        completed_at: new Date().toISOString(),
        score: result.score,
        band: result.band,
        signature: result.signature.name,
        competencies: Object.fromEntries(
          result.competencies.map((entry) => [entry.dimension, entry.score]),
        ),
        decisions,
      }),
    });
  } catch {
    /* The scorecard is on screen either way. */
  }
}
