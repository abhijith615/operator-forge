import { FIRST_SHIFT } from "@/lib/constants/mission";

export const MISSION_DURATION_SECONDS = FIRST_SHIFT.durationMinutes * 60;

/** The store's own clock starts here. Displayed time is this plus elapsed. */
export const HUB_START_HOUR = 9;
export const HUB_START_MINUTE = 0;

/**
 * QA affordance: `NEXT_PUBLIC_MISSION_TIME_SCALE=12` runs the hour in five
 * minutes so the full arc can be exercised. Ignored in production builds — a
 * real shift is a real hour.
 */
export function missionTimeScale(): number {
  if (process.env.NODE_ENV === "production") return 1;
  const raw = Number(process.env.NEXT_PUBLIC_MISSION_TIME_SCALE);
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  return Math.min(60, raw);
}

/** `0` → "09:00", `3720` → "10:02". */
export function hubClock(elapsedSeconds: number): string {
  const total = HUB_START_HOUR * 60 + HUB_START_MINUTE + Math.floor(elapsedSeconds / 60);
  const hours = Math.floor(total / 60) % 24;
  const mins = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}
