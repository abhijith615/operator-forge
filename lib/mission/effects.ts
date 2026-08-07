import { clamp } from "@/lib/utils";
import type { RiderStatus, WorkerStatus, WorldState } from "@/types/world";

/**
 * Task consequences as data, not closures.
 *
 * Tasks are persisted so a refresh cannot wipe the board, and functions do not
 * survive JSON. Describing an effect instead of capturing one also means Phase 3
 * can replay a shift and see exactly what each decision did to the floor.
 */
export type WorldEffect =
  | { kind: "rating"; delta: number }
  | { kind: "refund"; amount: number }
  | { kind: "expedite-order"; orderId: string }
  | { kind: "cancel-order"; orderId: string }
  | { kind: "block-sku"; sku: string }
  | { kind: "count-sku"; sku: string }
  | { kind: "replenish-sku"; sku: string }
  | {
      kind: "worker-status";
      workerId: string;
      status: WorkerStatus;
      note?: string;
      breakSeconds?: number;
    }
  /** `workerId: "any-active"` picks whoever is on the floor. */
  | { kind: "worker-fatigue"; workerId: string | "all-active"; delta: number }
  | { kind: "sideline-any-active-worker"; note: string }
  | {
      kind: "rider-status";
      riderId: string | "any-delivering";
      status: RiderStatus;
      returnSeconds?: number;
      releaseOrder?: boolean;
    }
  | { kind: "impairment"; label: string; pickPenalty: number }
  | { kind: "throttle"; status: "throttled" | "closed" | null }
  | { kind: "cold-chain-loss"; units: number };

export function applyEffects(world: WorldState, effects: readonly WorldEffect[]): void {
  for (const effect of effects) applyEffect(world, effect);
}

function applyEffect(world: WorldState, effect: WorldEffect): void {
  switch (effect.kind) {
    case "rating":
      world.rating = clamp(world.rating + effect.delta, 1, 5);
      return;

    case "refund":
      world.metrics.refunded += effect.amount;
      return;

    case "expedite-order": {
      const order = world.orders.find((entry) => entry.id === effect.orderId);
      if (order) order.expedited = true;
      return;
    }

    case "cancel-order": {
      const order = world.orders.find((entry) => entry.id === effect.orderId);
      if (!order || ["delivered", "breached", "cancelled"].includes(order.status)) return;
      order.status = "cancelled";
      order.assignedPickerId = null;
      order.assignedRiderId = null;
      world.metrics.ordersCancelled += 1;
      return;
    }

    case "block-sku": {
      const item = world.inventory.find((entry) => entry.sku === effect.sku);
      if (item) item.blocked = true;
      return;
    }

    case "count-sku": {
      const item = world.inventory.find((entry) => entry.sku === effect.sku);
      if (!item) return;
      item.systemQty = item.actualQty;
      item.counted = true;
      return;
    }

    case "replenish-sku": {
      const item = world.inventory.find((entry) => entry.sku === effect.sku);
      if (item && item.replenishmentEta === null) item.replenishmentEta = 600;
      return;
    }

    case "worker-status": {
      const worker = world.workers.find((entry) => entry.id === effect.workerId);
      if (!worker) return;
      worker.status = effect.status;
      if (effect.note !== undefined) worker.shiftNote = effect.note;
      if (effect.breakSeconds !== undefined) worker.breakRemaining = effect.breakSeconds;
      if (effect.status === "active") worker.fatigue = Math.max(worker.fatigue, 0.25);
      return;
    }

    case "worker-fatigue": {
      const targets =
        effect.workerId === "all-active"
          ? world.workers.filter((entry) => entry.status === "active")
          : world.workers.filter((entry) => entry.id === effect.workerId);
      for (const worker of targets) {
        worker.fatigue = clamp(worker.fatigue + effect.delta, 0, 1);
      }
      return;
    }

    case "sideline-any-active-worker": {
      const worker = world.workers.find((entry) => entry.status === "active");
      if (!worker) return;
      worker.status = "offline";
      worker.shiftNote = effect.note;
      return;
    }

    case "rider-status": {
      const rider =
        effect.riderId === "any-delivering"
          ? world.riders.find((entry) => entry.status === "delivering")
          : world.riders.find((entry) => entry.id === effect.riderId);
      if (!rider) return;

      if (effect.releaseOrder && rider.currentOrderId) {
        const order = world.orders.find((entry) => entry.id === rider.currentOrderId);
        if (order && order.status === "dispatched") {
          order.status = "packed";
          order.assignedRiderId = null;
          order.travelRemaining = 0;
        }
      }

      rider.status = effect.status;
      if (effect.status !== "delivering") rider.currentOrderId = null;
      rider.returnRemaining = effect.returnSeconds ?? 0;
      return;
    }

    case "impairment":
      world.impairments.push({
        id: `imp-${effect.label}-${world.elapsed}`,
        label: effect.label,
        pickPenalty: effect.pickPenalty,
        resolved: false,
      });
      return;

    case "throttle":
      world.statusOverride = effect.status;
      return;

    case "cold-chain-loss":
      for (const item of world.inventory) {
        if (item.category !== "Cold chain") continue;
        item.actualQty = Math.max(0, item.actualQty - effect.units);
      }
      return;
  }
}
