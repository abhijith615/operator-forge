import { CATALOG, CUSTOMER_NAMES, PICKERS, RIDERS } from "@/lib/mission/catalog";
import { mulberry32, pick, randomInt } from "@/lib/mission/random";
import type {
  InventoryItem,
  Order,
  Rider,
  WorldState,
  Weather,
  Worker,
} from "@/types/world";

/** The store opens at 09:00. Everything on screen is offset from here. */
export const HUB_OPENS_AT_MINUTES = 9 * 60;

export const CLEAR_WEATHER: Weather = {
  condition: "clear",
  note: "Dry and bright. Roads moving.",
  travelPenalty: 1,
  demandMultiplier: 1,
};

/**
 * Base seconds of picking work per line. A three-line basket is about three
 * minutes of walking. With a ~3.5 minute ride on top, a ten-minute promise
 * leaves roughly two minutes of queue slack — enough to be achievable, little
 * enough that a backlog turns into breaches almost immediately.
 */
export const SECONDS_PER_LINE = 60;

export function makeOrder(
  rand: () => number,
  index: number,
  placedAt: number,
): Order {
  const lineCount = randomInt(rand, 1, 5);
  const lines = Array.from({ length: lineCount }, () => {
    const item = pick(rand, CATALOG);
    return { sku: item.sku, name: item.name, qty: randomInt(rand, 1, 3) };
  });

  // Collapse duplicate SKUs so a basket never lists the same item twice.
  const merged = new Map<string, { sku: string; name: string; qty: number }>();
  for (const line of lines) {
    const existing = merged.get(line.sku);
    if (existing) existing.qty += line.qty;
    else merged.set(line.sku, { ...line });
  }
  const finalLines = [...merged.values()];

  const value = finalLines.reduce((sum, line) => {
    const item = CATALOG.find((entry) => entry.sku === line.sku);
    return sum + (item?.value ?? 100) * line.qty;
  }, 0);

  return {
    id: `o-${index}`,
    code: `#${4400 + index}`,
    placedAt,
    // Ten-minute promise. The backlog you inherit is already partway through it.
    promisedIn: 600,
    lines: finalLines,
    status: "queued",
    assignedPickerId: null,
    assignedRiderId: null,
    pickRemaining: finalLines.length * SECONDS_PER_LINE,
    travelRemaining: 0,
    expedited: false,
    customerName: pick(rand, CUSTOMER_NAMES),
    value,
  };
}

function makeInventory(rand: () => number): InventoryItem[] {
  return CATALOG.map((item) => {
    const systemQty = randomInt(rand, 6, 90);
    return {
      sku: item.sku,
      name: item.name,
      category: item.category,
      systemQty,
      // The floor is never exactly what the system says. Nobody knows this yet.
      actualQty: Math.max(0, systemQty - (rand() < 0.22 ? randomInt(rand, 1, 8) : 0)),
      reserved: 0,
      counted: false,
      blocked: false,
      replenishmentEta: null,
    };
  });
}

function makeWorkers(): Worker[] {
  return PICKERS.map((worker) => ({
    id: worker.id,
    name: worker.name,
    role: worker.role,
    status: "active",
    throughput: worker.role === "picker" ? 1 : 0.7,
    fatigue: 0.1,
    breakRemaining: 0,
    shiftNote: null,
  }));
}

function makeRiders(): Rider[] {
  return RIDERS.map((rider) => ({
    id: rider.id,
    name: rider.name,
    status: "idle",
    currentOrderId: null,
    deliveriesCompleted: 0,
    returnRemaining: 0,
  }));
}

/**
 * The store as the previous shift left it: a small backlog already on the clock,
 * a rating you did not earn, and stock records that are quietly wrong.
 */
export function createInitialWorld(seed: number): WorldState {
  const rand = mulberry32(seed);

  // The previous shift left five orders on the clock. They are recoverable —
  // but only if the operator moves early.
  const backlog: Order[] = Array.from({ length: 5 }, (_, index) => {
    const order = makeOrder(rand, index, -randomInt(rand, 30, 180));
    // Some of it is already being worked.
    if (index < 3) {
      order.status = "picking";
      order.pickRemaining = Math.max(30, order.pickRemaining - randomInt(rand, 40, 120));
    }
    return order;
  });

  return {
    elapsed: 0,
    hubStatus: "open",
    statusOverride: null,
    rating: 4.6,
    weather: CLEAR_WEATHER,
    orders: backlog,
    workers: makeWorkers(),
    riders: makeRiders(),
    inventory: makeInventory(rand),
    complaints: [],
    metrics: {
      otif: 1,
      ordersDelivered: 0,
      ordersBreached: 0,
      ordersCancelled: 0,
      revenue: 0,
      refunded: 0,
    },
    impairments: [],
    seed,
  };
}
