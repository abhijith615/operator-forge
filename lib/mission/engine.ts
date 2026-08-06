import { makeOrder } from "@/lib/mission/initial-state";
import { mulberry32, pick, randomInt } from "@/lib/mission/random";
import { clamp } from "@/lib/utils";
import type { TimelineEntry } from "@/types/mission-run";
import type { HubStatus, Order, WorldState } from "@/types/world";

/** Simulation resolution. The clock ticks every second; the floor moves in 5s. */
export const STEP_SECONDS = 5;

/**
 * Balance. The shift has to be winnable by a good operator and losable by a
 * passive one, so capacity and demand are set close to each other:
 *
 *   arrivals   0.55/min calm → 0.74 in rain → 1.11 under the promo surge
 *   picking    5 pickers ≈ 1.67/min · 3 pickers ≈ 1.00/min
 *   riders     6 riders ≈ 0.88/min dry · ≈ 0.60/min in rain
 *
 * A basket also has to clear pick (~3 min) plus ride (~3.5 min, ~5 in rain)
 * inside a ten-minute promise, which leaves about two minutes of queue slack.
 *
 * So: the calm opening clears, rain squeezes the road, and rain plus the promo
 * surge goes underwater unless the operator has recalled staff or throttled
 * intake. Nothing here is unrecoverable, and nothing is free.
 */
const BASE_ARRIVAL_RATE = 0.55;

/** Seconds a rider spends on the road, before weather. */
const BASE_TRAVEL_SECONDS = 210;
const BASE_RETURN_SECONDS = 200;

const RATING_HIT_BREACH = 0.018;
const RATING_HIT_COMPLAINT = 0.012;

export interface StepResult {
  world: WorldState;
  entries: TimelineEntry[];
}

let entryCounter = 0;

function entry(
  at: number,
  partial: Omit<TimelineEntry, "id" | "at" | "kind"> & { kind?: TimelineEntry["kind"] },
): TimelineEntry {
  entryCounter += 1;
  return {
    id: `t-${at}-${entryCounter}`,
    at,
    kind: partial.kind ?? "system",
    tone: partial.tone,
    title: partial.title,
    detail: partial.detail,
    source: partial.source,
  };
}

/** Backlog pressure the operator can feel before they can name it. */
export function deriveHubStatus(world: WorldState): HubStatus {
  if (world.statusOverride) return world.statusOverride;

  const open = world.orders.filter(
    (order) => order.status === "queued" || order.status === "picking",
  ).length;

  if (open > 26) return "critical";
  if (open > 14) return "strained";
  return "open";
}

export function activePickCapacity(world: WorldState): number {
  const penalty = world.impairments
    .filter((imp) => !imp.resolved)
    .reduce((factor, imp) => factor * imp.pickPenalty, 1);

  return world.workers
    .filter((worker) => worker.status === "active")
    .reduce((sum, worker) => sum + worker.throughput * (1 - worker.fatigue * 0.35), 0)
    * penalty;
}

function terminalCount(world: WorldState): number {
  return world.orders.filter((order) =>
    ["delivered", "breached", "cancelled"].includes(order.status),
  ).length;
}

/**
 * OTIF over everything that has settled — delivered, breached or cancelled.
 * Cancelling counts against you, because the customer did not get their order
 * either way.
 */
function recomputeMetrics(world: WorldState): WorldState {
  const settled = terminalCount(world);
  const onTime = world.metrics.ordersDelivered;
  return {
    ...world,
    metrics: {
      ...world.metrics,
      otif: settled === 0 ? 1 : onTime / settled,
    },
  };
}

/**
 * Advance the floor by `STEP_SECONDS`. Pure: same world plus same seed cursor
 * always produces the same next world, which is what makes the Phase 3 replay
 * trustworthy.
 */
export function stepWorld(input: WorldState): StepResult {
  const entries: TimelineEntry[] = [];
  const rand = mulberry32(input.seed + input.elapsed);

  let world: WorldState = {
    ...input,
    elapsed: input.elapsed + STEP_SECONDS,
    orders: input.orders.map((order) => ({ ...order })),
    workers: input.workers.map((worker) => ({ ...worker })),
    riders: input.riders.map((rider) => ({ ...rider })),
    inventory: input.inventory.map((item) => ({ ...item })),
    complaints: input.complaints.map((complaint) => ({ ...complaint })),
    metrics: { ...input.metrics },
  };

  const now = world.elapsed;

  /* ── Breaks and fatigue ───────────────────────────────────────────────── */
  for (const worker of world.workers) {
    if (worker.status === "break") {
      worker.breakRemaining -= STEP_SECONDS;
      worker.fatigue = Math.max(0, worker.fatigue - 0.02);
      if (worker.breakRemaining <= 0) {
        worker.status = "active";
        worker.breakRemaining = 0;
        entries.push(
          entry(now, {
            tone: "positive",
            title: `${worker.name} is back on the floor`,
            source: "people",
          }),
        );
      }
    } else if (worker.status === "active") {
      worker.fatigue = Math.min(1, worker.fatigue + 0.0016);
    }
  }

  /* ── Assign idle pickers ──────────────────────────────────────────────── */
  const busyPickerIds = new Set(
    world.orders
      .filter((order) => order.status === "picking" && order.assignedPickerId)
      .map((order) => order.assignedPickerId as string),
  );

  // Packers pack. Only pickers walk the aisles, which is why losing one hurts.
  const availablePickers = world.workers.filter(
    (worker) =>
      worker.role === "picker" &&
      worker.status === "active" &&
      !busyPickerIds.has(worker.id),
  );

  const queue = world.orders
    .filter((order) => order.status === "queued")
    .sort((a, b) => {
      if (a.expedited !== b.expedited) return a.expedited ? -1 : 1;
      return a.placedAt - b.placedAt;
    });

  for (const picker of availablePickers) {
    const next = queue.shift();
    if (!next) break;
    next.status = "picking";
    next.assignedPickerId = picker.id;
  }

  /* ── Picking progress ─────────────────────────────────────────────────── */
  const impairment = world.impairments
    .filter((imp) => !imp.resolved)
    .reduce((factor, imp) => factor * imp.pickPenalty, 1);

  for (const order of world.orders) {
    if (order.status !== "picking") continue;
    const picker = world.workers.find((worker) => worker.id === order.assignedPickerId);
    if (!picker || picker.status !== "active") {
      // Whoever was on it walked away. Back to the queue.
      order.status = "queued";
      order.assignedPickerId = null;
      continue;
    }
    const rate = picker.throughput * (1 - picker.fatigue * 0.35) * impairment;
    order.pickRemaining -= STEP_SECONDS * rate;
    if (order.pickRemaining <= 0) {
      order.pickRemaining = 0;
      order.status = "packed";
      order.assignedPickerId = null;
    }
  }

  /* ── Dispatch ─────────────────────────────────────────────────────────── */
  const packed = world.orders
    .filter((order) => order.status === "packed")
    .sort((a, b) => {
      if (a.expedited !== b.expedited) return a.expedited ? -1 : 1;
      return a.placedAt - b.placedAt;
    });

  for (const order of packed) {
    const rider = world.riders.find((candidate) => candidate.status === "idle");
    if (!rider) break;
    rider.status = "delivering";
    rider.currentOrderId = order.id;
    order.status = "dispatched";
    order.assignedRiderId = rider.id;
    order.travelRemaining = Math.round(
      BASE_TRAVEL_SECONDS * world.weather.travelPenalty * (0.82 + rand() * 0.36),
    );
  }

  /* ── On the road ──────────────────────────────────────────────────────── */
  for (const order of world.orders) {
    if (order.status !== "dispatched") continue;
    order.travelRemaining -= STEP_SECONDS;
    if (order.travelRemaining > 0) continue;

    const late = now - order.placedAt > order.promisedIn;
    order.status = late ? "breached" : "delivered";
    const rider = world.riders.find((candidate) => candidate.id === order.assignedRiderId);
    if (rider) {
      rider.status = "returning";
      rider.currentOrderId = null;
      rider.deliveriesCompleted += 1;
      rider.returnRemaining = Math.round(
        BASE_RETURN_SECONDS * world.weather.travelPenalty,
      );
    }

    if (late) {
      world.metrics.ordersBreached += 1;
      world.rating = clamp(world.rating - RATING_HIT_BREACH, 1, 5);
      entries.push(
        entry(now, {
          tone: "critical",
          title: `${order.code} delivered late`,
          detail: `${order.customerName} waited ${Math.round((now - order.placedAt) / 60)} minutes.`,
          source: "orders",
        }),
      );
    } else {
      world.metrics.ordersDelivered += 1;
      world.metrics.revenue += order.value;
    }
  }

  /* ── Riders returning ─────────────────────────────────────────────────── */
  for (const rider of world.riders) {
    if (rider.status !== "returning") continue;
    rider.returnRemaining -= STEP_SECONDS;
    if (rider.returnRemaining <= 0) {
      rider.status = "idle";
      rider.returnRemaining = 0;
    }
  }

  /* ── Breaches on orders still in the building ─────────────────────────── */
  for (const order of world.orders) {
    if (order.status !== "queued" && order.status !== "picking" && order.status !== "packed") {
      continue;
    }
    const overdueBy = now - order.placedAt - order.promisedIn;
    // Only fire once, on the step the promise is crossed. The count itself is
    // taken when the order settles, so an order cannot be counted twice.
    if (overdueBy >= 0 && overdueBy < STEP_SECONDS) {
      world.rating = clamp(world.rating - RATING_HIT_BREACH, 1, 5);
      entries.push(
        entry(now, {
          tone: "warning",
          title: `${order.code} has breached its promise`,
          detail: `Still ${order.status} in the hub. ${order.customerName} is waiting.`,
          source: "orders",
        }),
      );

      if (rand() < 0.42) {
        const complaintId = `c-${order.id}`;
        if (!world.complaints.some((complaint) => complaint.id === complaintId)) {
          world.complaints.push({
            id: complaintId,
            customerName: order.customerName,
            orderCode: order.code,
            reason: pick(rand, [
              "Order is twenty minutes past the promised time.",
              "No rider assigned yet and no update.",
              "This is the second late order this week.",
              "Cold items will not survive this delay.",
            ]),
            severity: rand() < 0.3 ? "high" : rand() < 0.7 ? "medium" : "low",
            raisedAt: now,
            resolution: null,
          });
          world.rating = clamp(world.rating - RATING_HIT_COMPLAINT, 1, 5);
          entries.push(
            entry(now, {
              tone: "critical",
              kind: "event",
              title: `Complaint raised on ${order.code}`,
              detail: `${order.customerName} is unhappy.`,
              source: "customers",
            }),
          );
        }
      }
    }
  }

  /* ── New demand ───────────────────────────────────────────────────────── */
  if (world.statusOverride !== "closed") {
    const throttle = world.statusOverride === "throttled" ? 0.45 : 1;
    const perStep =
      (BASE_ARRIVAL_RATE / 60) * STEP_SECONDS * world.weather.demandMultiplier * throttle;
    let arrivals = Math.floor(perStep);
    if (rand() < perStep - arrivals) arrivals += 1;

    for (let i = 0; i < arrivals; i += 1) {
      const index = world.orders.length + i + 1;
      world.orders.push(makeOrder(rand, index, now));
    }
  }

  /* ── Reserve stock against open orders ────────────────────────────────── */
  const reserved = new Map<string, number>();
  for (const order of world.orders) {
    if (["delivered", "breached", "cancelled"].includes(order.status)) continue;
    for (const line of order.lines) {
      reserved.set(line.sku, (reserved.get(line.sku) ?? 0) + line.qty);
    }
  }
  for (const item of world.inventory) {
    item.reserved = reserved.get(item.sku) ?? 0;
    if (item.replenishmentEta !== null) {
      item.replenishmentEta -= STEP_SECONDS;
      if (item.replenishmentEta <= 0) {
        const topUp = randomInt(rand, 24, 60);
        item.systemQty += topUp;
        item.actualQty += topUp;
        item.replenishmentEta = null;
        entries.push(
          entry(now, {
            tone: "positive",
            title: `Replenishment landed for ${item.name}`,
            detail: `${topUp} units received.`,
            source: "inventory",
          }),
        );
      }
    }
  }

  world.hubStatus = deriveHubStatus(world);
  world = recomputeMetrics(world);

  return { world, entries };
}

/** Orders the operator can still do something about. */
export function openOrders(world: WorldState): Order[] {
  return world.orders.filter((order) =>
    ["queued", "picking", "packed", "dispatched"].includes(order.status),
  );
}

export function secondsToBreach(order: Order, elapsed: number): number {
  return order.placedAt + order.promisedIn - elapsed;
}
