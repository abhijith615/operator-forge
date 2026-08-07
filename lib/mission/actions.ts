import { cloneWorld } from "@/lib/mission/clone";
import { clamp } from "@/lib/utils";
import type { TimelineEntry } from "@/types/mission-run";
import type { WorldState } from "@/types/world";

/**
 * Everything the operator can actually do. Each one is a pure reducer that
 * returns the next world plus the line it writes on the record — there are no
 * free actions, and several of them cost something.
 */

export type OperatorAction =
  | { type: "expedite-order"; orderId: string }
  | { type: "cancel-order"; orderId: string }
  | { type: "recall-worker"; workerId: string }
  | { type: "grant-break"; workerId: string }
  | { type: "cycle-count"; sku: string }
  | { type: "block-sku"; sku: string }
  | { type: "request-replenishment"; sku: string }
  | { type: "resolve-complaint"; complaintId: string; resolution: "apologised" | "refunded" | "escalated" }
  | { type: "set-store-status"; status: "throttled" | "closed" | null }
  | { type: "clear-impairment"; impairmentId: string };

export interface ActionResult {
  world: WorldState;
  entry: TimelineEntry | null;
}

let actionCounter = 0;

function line(
  world: WorldState,
  tone: TimelineEntry["tone"],
  title: string,
  detail: string,
  source: TimelineEntry["source"],
): TimelineEntry {
  actionCounter += 1;
  return {
    id: `a-${world.elapsed}-${actionCounter}`,
    at: world.elapsed,
    kind: "action",
    tone,
    title,
    detail,
    source,
  };
}

export function applyOperatorAction(
  input: WorldState,
  action: OperatorAction,
): ActionResult {
  const world = cloneWorld(input);

  switch (action.type) {
    case "expedite-order": {
      const order = world.orders.find((candidate) => candidate.id === action.orderId);
      if (!order || order.expedited) return { world: input, entry: null };
      order.expedited = true;
      return {
        world,
        entry: line(
          world,
          "neutral",
          `Expedited ${order.code}`,
          "Jumps the pick queue. Everything behind it waits a little longer.",
          "orders",
        ),
      };
    }

    case "cancel-order": {
      const order = world.orders.find((candidate) => candidate.id === action.orderId);
      if (!order || ["delivered", "breached", "cancelled"].includes(order.status)) {
        return { world: input, entry: null };
      }
      order.status = "cancelled";
      order.assignedPickerId = null;
      order.assignedRiderId = null;
      world.metrics.ordersCancelled += 1;
      world.rating = clamp(world.rating - 0.025, 1, 5);
      return {
        world,
        entry: line(
          world,
          "warning",
          `Cancelled ${order.code}`,
          `${order.customerName} loses their order. Rating takes the hit instead of the queue.`,
          "orders",
        ),
      };
    }

    case "recall-worker": {
      const worker = world.workers.find((candidate) => candidate.id === action.workerId);
      if (!worker || worker.status === "active") return { world: input, entry: null };
      worker.status = "active";
      worker.shiftNote = "Called in";
      worker.fatigue = Math.max(worker.fatigue, 0.25);
      return {
        world,
        entry: line(
          world,
          "positive",
          `${worker.name} called in`,
          "Back on the pick face, and starting the shift already behind.",
          "people",
        ),
      };
    }

    case "grant-break": {
      const worker = world.workers.find((candidate) => candidate.id === action.workerId);
      if (!worker || worker.status !== "active") return { world: input, entry: null };
      worker.status = "break";
      worker.breakRemaining = 300;
      worker.shiftNote = null;
      return {
        world,
        entry: line(
          world,
          "neutral",
          `${worker.name} is on a break`,
          "Five minutes off the floor. Throughput drops until they are back.",
          "people",
        ),
      };
    }

    case "cycle-count": {
      const item = world.inventory.find((candidate) => candidate.sku === action.sku);
      if (!item) return { world: input, entry: null };
      const variance = item.actualQty - item.systemQty;
      item.systemQty = item.actualQty;
      item.counted = true;
      return {
        world,
        entry: line(
          world,
          variance === 0 ? "positive" : "warning",
          `Cycle count on ${item.name}`,
          variance === 0
            ? "System matched the shelf."
            : `Shelf was ${Math.abs(variance)} units ${variance < 0 ? "short of" : "over"} the system.`,
          "inventory",
        ),
      };
    }

    case "block-sku": {
      const item = world.inventory.find((candidate) => candidate.sku === action.sku);
      if (!item) return { world: input, entry: null };
      item.blocked = !item.blocked;
      return {
        world,
        entry: line(
          world,
          item.blocked ? "warning" : "positive",
          `${item.blocked ? "Blocked" : "Unblocked"} ${item.name}`,
          item.blocked
            ? "Stops pickers hunting for stock that is not there."
            : "Back in the pickable assortment.",
          "inventory",
        ),
      };
    }

    case "request-replenishment": {
      const item = world.inventory.find((candidate) => candidate.sku === action.sku);
      if (!item || item.replenishmentEta !== null) return { world: input, entry: null };
      item.replenishmentEta = 600;
      return {
        world,
        entry: line(
          world,
          "neutral",
          `Replenishment requested for ${item.name}`,
          "Ten minutes from the mother warehouse, if the van is loaded.",
          "inventory",
        ),
      };
    }

    case "resolve-complaint": {
      const complaint = world.complaints.find(
        (candidate) => candidate.id === action.complaintId,
      );
      if (!complaint || complaint.resolution) return { world: input, entry: null };
      complaint.resolution = action.resolution;

      if (action.resolution === "apologised") {
        world.rating = clamp(world.rating + 0.012, 1, 5);
        return {
          world,
          entry: line(
            world,
            "positive",
            `Apologised to ${complaint.customerName}`,
            "Costs nothing but your attention. Works less often than a refund.",
            "customers",
          ),
        };
      }

      if (action.resolution === "refunded") {
        world.rating = clamp(world.rating + 0.028, 1, 5);
        world.metrics.refunded += 250;
        return {
          world,
          entry: line(
            world,
            "neutral",
            `Refunded ${complaint.customerName}`,
            "Rating recovers. The store eats ₹250.",
            "customers",
          ),
        };
      }

      return {
        world,
        entry: line(
          world,
          "neutral",
          `Escalated ${complaint.orderCode}`,
          "Off your plate, onto the regional manager's. She will ask why.",
          "customers",
        ),
      };
    }

    case "set-store-status": {
      world.statusOverride = action.status;
      if (action.status === null) {
        return {
          world,
          entry: line(
            world,
            "positive",
            "Store back to normal intake",
            "Taking full demand again.",
            "hub",
          ),
        };
      }
      return {
        world,
        entry: line(
          world,
          action.status === "closed" ? "critical" : "warning",
          action.status === "closed" ? "Store closed to new orders" : "Store throttled",
          action.status === "closed"
            ? "Nothing new comes in. The backlog is all you have left to clear."
            : "Intake cut by more than half so the floor can catch up.",
          "hub",
        ),
      };
    }

    case "clear-impairment": {
      const impairment = world.impairments.find(
        (candidate) => candidate.id === action.impairmentId,
      );
      if (!impairment || impairment.resolved) return { world: input, entry: null };
      impairment.resolved = true;
      return {
        world,
        entry: line(
          world,
          "positive",
          `${impairment.label} resolved`,
          "Throughput recovers.",
          "hub",
        ),
      };
    }

    default:
      return { world: input, entry: null };
  }
}
