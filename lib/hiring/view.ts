import { candidatesFor, leavesStation } from "./engine";
import { coverageOf, isFree, isLocked, pullOf } from "./model";
import { BY_ID, STATION_LABEL, isTemp } from "./roster";
import type { HiringState, Station, TaskKind } from "./types";

/**
 * What the screens show about people.
 *
 * Skills are words, not decimals. A manager knows that Lakshmi is trained on
 * counts and that Vishnu can cover putaway at a push; nobody knows that one
 * of them is a 0.95. Showing the numbers would turn building a team into an
 * arithmetic exercise, which is a different test.
 */

export type SkillWord = "Strong" | "Trained" | "Can cover" | "Not trained";

export function skillWord(value: number): SkillWord {
  if (value >= 1.0) return "Strong";
  if (value >= 0.75) return "Trained";
  if (value >= 0.55) return "Can cover";
  return "Not trained";
}

export const pct = (value: number) => `${Math.round(value * 100)}%`;

export interface OwnerOption {
  id: string;
  name: string;
  title: string;
  station: Station;
  fit: "strong" | "possible" | "weak";
  fitLabel: string;
  note: string;
  free: boolean;
}

const TASK_LABEL: Partial<Record<string, string>> = {
  count: "counting",
  records: "getting the records",
  search: "searching",
  replenish: "putting a crate away",
  aisle: "clearing Aisle C",
  repack: "repacking",
  riders: "the rider pickup point",
  followUp: "putting the evidence together",
  coaching: "showing someone around",
  "plan:audit": "the full store count",
};

/** What somebody's own work drops to while they are away from it. */
function without(state: HiringState, id: string): string {
  const station = state.assign[id];
  if (!station) return "";
  const before = coverageOf(state, station);
  const away: HiringState = { ...state, busy: { ...state.busy, [id]: { until: Infinity, task: "away" } } };
  const after = coverageOf(away, station);

  // An unlocked device the app has already taken for orders is not doing its own work to begin with.
  const pull = pullOf(state);
  if (station !== "picking" && !isLocked(state, id) && pull >= 0.9) {
    return `Unlocked · already doing orders ${pct(pull)} of the time`;
  }
  // A picker's gap is filled by the app from unlocked devices, for as long as there are any.
  if (station === "picking" && Math.abs(after - before) < 0.005) {
    const later = pullOf(away);
    return later > pull + 0.005
      ? `Unlocked devices fill the gap: orders ${pct(pull)} → ${pct(later)} while away`
      : `${STATION_LABEL[station]} stays at ${pct(after)} while away`;
  }
  return `${STATION_LABEL[station]} ${pct(before)} → ${pct(after)} while away`;
}

/** Who could be given a job, best suited first, and what it costs to give it to them. */
export function ownerOptions(state: HiringState, kind: TaskKind): OwnerOption[] {
  return candidatesFor(state, kind)
    .filter((candidate) => !isTemp(candidate.id))
    .map((candidate) => {
      const employee = BY_ID[candidate.id]!;
      const station = state.assign[candidate.id]!;
      const fit = candidate.fit >= 0.9 ? "strong" : candidate.fit >= 0.6 ? "possible" : "weak";
      const busy = state.busy[candidate.id];
      const note = !candidate.free
        ? `Busy · ${TASK_LABEL[busy?.task ?? ""] ?? "another task"}`
        : leavesStation(state, candidate.id, kind)
          ? without(state, candidate.id)
          : "Part of their current job";
      return {
        id: candidate.id,
        name: employee.name,
        title: employee.title,
        station,
        fit,
        fitLabel: fit === "strong" ? "Good fit" : fit === "possible" ? "Can do it, slower" : "Poor fit",
        note,
        free: candidate.free,
      } satisfies OwnerOption;
    });
}

/** Who could be moved to stand at a station, and what they leave behind. */
export function moverOptions(state: HiringState, to: Station): OwnerOption[] {
  return Object.keys(state.assign)
    .filter((id) => id !== "riya" && !isTemp(id) && state.assign[id] !== to)
    .map((id) => {
      const employee = BY_ID[id]!;
      const skill = employee.skills[to];
      const fit = skill >= 0.9 ? "strong" : skill >= 0.6 ? "possible" : "weak";
      const free = isFree(state, id);
      return {
        id,
        name: employee.name,
        title: employee.title,
        station: state.assign[id]!,
        fit,
        fitLabel: `${skillWord(skill)} at ${STATION_LABEL[to].split(" ")[0]!.toLowerCase()}`,
        note: free ? without(state, id).replace(" while away", " if moved") : "Busy on another task",
        free,
      } satisfies OwnerOption;
    })
    .sort((a, b) => (BY_ID[b.id]!.skills[to] ?? 0) - (BY_ID[a.id]!.skills[to] ?? 0));
}

/** What it costs the manager to do a job with their own hands. */
export const PERSONAL_COST: Partial<Record<TaskKind, string>> = {
  count: "About 5 minutes away from the floor",
  search: "About 2½ minutes away from the floor",
  replenish: "About 2 minutes away from the floor",
  aisle: "About 4 minutes away from the floor",
  repack: "About 1½ minutes at the rider shelf",
};

export function deviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  return width < 640 ? "mobile" : width < 1024 ? "tablet" : "desktop";
}
