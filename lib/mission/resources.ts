import type { WorldState } from "@/types/world";

/**
 * Finite things on the floor that two decisions can want at the same time.
 *
 * The store has always had scarcity — five workers, six riders, one of you —
 * but the task queue never let anything compete for it. Every card could be
 * answered as if it were the only card. This is what makes them fight.
 *
 * Nothing here is hidden. The operator can see exactly how many riders are
 * free and exactly which options that rules out. The difficulty is not knowing
 * less; it is that you cannot spend the same rider twice.
 */
export type ResourceKind =
  | "idle-rider"
  | "active-picker"
  | "active-packer"
  | "active-worker";

export interface ResourceNeed {
  kind: ResourceKind;
  /** Defaults to one. */
  count?: number;
}

export const RESOURCE_POOL_KINDS: readonly ResourceKind[] = [
  "idle-rider",
  "active-picker",
  "active-packer",
  "active-worker",
] as const;

/** How many of each are free right now. Cheap enough to recompute per tick. */
export interface ResourcePool {
  "idle-rider": number;
  "active-picker": number;
  "active-packer": number;
  "active-worker": number;
}

export function readResourcePool(world: WorldState): ResourcePool {
  const active = world.workers.filter((worker) => worker.status === "active");
  return {
    "idle-rider": world.riders.filter((rider) => rider.status === "idle").length,
    "active-picker": active.filter((worker) => worker.role === "picker").length,
    "active-packer": active.filter((worker) => worker.role === "packer").length,
    "active-worker": active.length,
  };
}

export function countAvailable(world: WorldState, kind: ResourceKind): number {
  return readResourcePool(world)[kind];
}

export function hasResource(pool: ResourcePool, need: ResourceNeed | undefined): boolean {
  if (!need) return true;
  return pool[need.kind] >= (need.count ?? 1);
}

const NOUN: Record<ResourceKind, [string, string]> = {
  "idle-rider": ["a rider free", "riders free"],
  "active-picker": ["a picker on the floor", "pickers on the floor"],
  "active-packer": ["a packer on the floor", "packers on the floor"],
  "active-worker": ["anyone on the floor", "people on the floor"],
};

/**
 * Why an option is closed, in the operator's language rather than the
 * engine's. Shown on the greyed-out row so nothing is mysterious.
 */
export function shortfallNote(
  pool: ResourcePool,
  need: ResourceNeed | undefined,
): string | null {
  if (!need || hasResource(pool, need)) return null;

  const wanted = need.count ?? 1;
  const have = pool[need.kind];
  const [singular, plural] = NOUN[need.kind];

  if (have === 0) return `Needs ${wanted === 1 ? singular : `${wanted} ${plural}`}. There are none.`;
  return `Needs ${wanted} ${plural}. Only ${have} left.`;
}
