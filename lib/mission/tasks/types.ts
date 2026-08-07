import type { WorldEffect } from "@/lib/mission/effects";
import type { MissionTask, TaskOption, TaskPriority, TaskStream } from "@/types/tasks";
import type { WorldState } from "@/types/world";

export interface TaskContext {
  world: WorldState;
  rand: () => number;
  elapsed: number;
  /**
   * Workers, riders and orders that are already the subject of a pending task.
   * Two live tasks about the same person read as a bug even when both are
   * individually plausible, so templates exclude these.
   */
  busySubjects: ReadonlySet<string>;
}

/** What a template produces. The scheduler wraps this into a `MissionTask`. */
export interface TaskDraft {
  title: string;
  detail: string;
  source: string;
  options: TaskOption[];
  /** Worker, rider or order id this task is about, if any. */
  subjectId?: string;
  /** Overrides the template's default when the world makes it urgent. */
  priority?: TaskPriority;
  ttl?: number;
}

export interface TaskTemplate {
  id: string;
  stream: TaskStream;
  priority: TaskPriority;
  /** Relative draw likelihood. Routine work is weighted heavily on purpose. */
  weight: number;
  /** Seconds before this template may be drawn again. */
  cooldown: number;
  /** Seconds on the clock once it lands. */
  ttl: number;
  /**
   * Templates fire once per shift by default, so an operator never sees the
   * same task twice. Set this only where the situation genuinely recurs and
   * reads differently each time — a different customer chasing a different
   * order, a different SKU running short.
   */
  repeatable?: boolean;
  /** Only offered when the floor actually warrants it. */
  when?: (world: WorldState) => boolean;
  /** Return `null` to decline the draw — the scheduler will pick another. */
  build: (ctx: TaskContext) => TaskDraft | null;
  /** What ignoring it costs. Every unanswered task should leave a mark. */
  onExpire?: {
    note: string;
    effects?: WorldEffect[];
    /** Template ids queued immediately as a consequence. */
    cascades?: string[];
  };
}

/* ── Helpers shared across the catalogue ──────────────────────────────────── */

export function activeWorkers(world: WorldState) {
  return world.workers.filter((worker) => worker.status === "active");
}

export function activePickers(world: WorldState) {
  return activeWorkers(world).filter((worker) => worker.role === "picker");
}

export function openOrdersIn(world: WorldState) {
  return world.orders.filter((order) =>
    ["queued", "picking", "packed", "dispatched"].includes(order.status),
  );
}

export function lowStock(world: WorldState) {
  return world.inventory.filter((item) => item.systemQty - item.reserved <= 4);
}

/** Deterministic pick that tolerates an empty list. */
export function maybePick<T>(rand: () => number, items: readonly T[]): T | null {
  if (items.length === 0) return null;
  const index = Math.min(items.length - 1, Math.floor(rand() * items.length));
  return items[index] ?? null;
}

/** Pick something that is not already the subject of another live task. */
export function pickFree<T extends { id: string }>(
  ctx: TaskContext,
  items: readonly T[],
): T | null {
  return maybePick(
    ctx.rand,
    items.filter((item) => !ctx.busySubjects.has(item.id)),
  );
}

export function isPending(task: MissionTask): boolean {
  return task.status === "pending";
}
