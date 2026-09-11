/**
 * The challenge clock, shared by every day.
 *
 * Each day is fifteen minutes — the challenge page promises exactly that — so
 * the length, the QA compression and the display format live here once rather
 * than being re-declared per day and drifting apart.
 */

export const SHIFT_SECONDS = 15 * 60;

/**
 * QA affordance, mirroring NEXT_PUBLIC_MISSION_TIME_SCALE in the 30-minute
 * mission: `NEXT_PUBLIC_CHALLENGE_TIME_SCALE=20` runs a day in 45 seconds so
 * the whole arc can be exercised. Forced to 1 in production builds — a
 * fifteen-minute day is fifteen minutes.
 */
export function timeScale(): number {
  if (process.env.NODE_ENV === "production") return 1;
  const raw = Number(process.env.NEXT_PUBLIC_CHALLENGE_TIME_SCALE);
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  return Math.min(60, raw);
}

export function countdown(remaining: number): string {
  const clamped = Math.max(0, remaining);
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** The last two minutes, when the clock turns red on every day. */
export const URGENT_SECONDS = 120;
