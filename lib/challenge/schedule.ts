import {
  DISPATCH_CHOICES,
  FLOW_CHOICES,
  NIL_PICK_CHOICES,
  NIL_PICK_ORDER,
  PACK_ORDER,
} from "./day-one";
import type { SceneChoice, TaskPriority, TaskStream } from "./types";

/**
 * When the shift hands you each thing.
 *
 * The scenarios are unchanged — the same six situations, the same options, the
 * same signals. What changed is delivery: instead of six full-screen scenes in
 * a fixed order, they arrive on a live board while a clock runs down, so the
 * operator is choosing what to open as well as what to answer.
 */

// The clock is shared with every other day; re-exported so Day 1's imports
// did not have to move when Day 2 needed the same fifteen minutes.
export { SHIFT_SECONDS, countdown, timeScale } from "./clock";

/** Store clock at a given point in the shift. Starts 07:12, runs to 07:27. */
export function storeClock(elapsed: number): string {
  const total = 7 * 60 + 12 + Math.floor(elapsed / 60);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} AM`;
}

export type TaskKind =
  | "staffing"
  | "choice"
  | "nil-pick"
  | "packing"
  | "recovery";

export interface ScheduledTask {
  id: string;
  /** Seconds into the shift when it lands on the board. */
  releaseAt: number;
  kind: TaskKind;
  stream: TaskStream;
  priority: TaskPriority;
  title: string;
  detail: string;
  source: string;
  /** Present for `choice` tasks. The other kinds render their own surface. */
  choices?: SceneChoice[];
  /** Seconds on the clock once it lands. Null means it waits for you. */
  ttl: number | null;
}

/**
 * Release times are spaced so a first-timer is never idle and never has more
 * than three things open at once. The recovery task lands with enough clock
 * left to actually execute a plan.
 */
export const SCHEDULE: ScheduledTask[] = [
  {
    id: "floor-allocation",
    releaseAt: 0,
    kind: "staffing",
    stream: "people",
    priority: "critical",
    title: "Set the floor for the next 10 minutes",
    detail:
      "Rakesh hasn't reported. You are one person short and breakfast volume is climbing.",
    source: "Floor Lead",
    ttl: null,
  },
  {
    id: "packing-intervention",
    releaseAt: 120,
    kind: "choice",
    stream: "operations",
    priority: "high",
    title: "Packing queue is climbing",
    detail:
      "Orders are reaching packing faster than they are leaving it. You have capacity for one move.",
    source: "Fulfillment board",
    choices: FLOW_CHOICES,
    ttl: 210,
  },
  {
    id: "nil-pick-resolution",
    releaseAt: 270,
    kind: "nil-pick",
    stream: "operations",
    priority: "critical",
    title: `${NIL_PICK_ORDER.product} — shelf empty`,
    detail: `Order ${NIL_PICK_ORDER.order} at ${NIL_PICK_ORDER.location}. System says ${NIL_PICK_ORDER.systemStock} units. The picker says nothing is there.`,
    source: "Handheld · Picker",
    ttl: 240,
  },
  {
    id: "packing-configuration",
    releaseAt: 420,
    kind: "packing",
    stream: "customers",
    priority: "high",
    title: `Order ${PACK_ORDER} — can this go in one bag?`,
    detail: "Bread, eggs, curd and a floor cleaner. Packer is waiting on you.",
    source: "Packing station",
    ttl: 240,
  },
  {
    id: "dispatch-action",
    releaseAt: 570,
    kind: "choice",
    stream: "customers",
    priority: "critical",
    title: "Rider 218 — scanner not reading",
    detail:
      "He is already late and asking to take the bag without the scan. Two other bays are verified and ready.",
    source: "Dispatch bay",
    choices: DISPATCH_CHOICES,
    ttl: 180,
  },
  {
    id: "recovery-plan",
    releaseAt: 720,
    kind: "recovery",
    stream: "management",
    priority: "critical",
    title: "CTD has crossed target — recovery plan",
    detail:
      "The Cluster Manager wants three actions and the order you will run them in.",
    source: "Cluster Manager",
    ttl: null,
  },
];

/** Nil-pick options are reused unchanged; exported for the panel. */
export const NIL_PICK_OPTIONS = NIL_PICK_CHOICES;

/* ── Pacing ───────────────────────────────────────────────────────────── */

/**
 * Six scored scenarios across fifteen minutes leaves the queue empty about
 * sixty per cent of the time, which reads as a quiz with pauses. Routine work
 * fills the gaps, released against the board rather than a timetable: whenever
 * the operator drops below MIN_PENDING and enough time has passed since the
 * last arrival, something lands.
 *
 * The spine stays on fixed times so the shift still has a shape — the peak
 * arrives when it arrives. Only the filler is adaptive.
 */
export const MIN_PENDING = 2;
export const MAX_PENDING = 4;

/** Seconds between arrivals, so a burst of resolutions is not met by a burst. */
export function routineGap(pending: number): number {
  if (pending === 0) return 12;
  if (pending === 1) return 26;
  return 38;
}

/**
 * Ambient drift.
 *
 * Between decisions the store keeps moving, so the board is never static and
 * the operator can watch a queue build before anything asks them to act. Drift
 * is gentle: it should create unease, not decide the outcome.
 */
export function driftFor(elapsed: number, openTasks: number) {
  const pressure = openTasks >= 3 ? 2 : openTasks >= 2 ? 1 : 0;
  return {
    ordersWaiting: elapsed % 30 === 0 ? 1 + pressure : 0,
    packingQueue: elapsed % 45 === 0 ? pressure : 0,
    ctd: elapsed % 30 === 0 ? pressure : 0,
    ridersWaiting: elapsed % 60 === 0 ? 1 : 0,
    nilPicks: 0,
    pickingCapacity: 0,
  };
}
