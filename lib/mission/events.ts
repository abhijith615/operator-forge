import { mulberry32, pick, randomInt } from "@/lib/mission/random";
import { clamp } from "@/lib/utils";
import type { MissionNotification, TimelineEntry, TimelineTone } from "@/types/mission-run";
import type { WorldState } from "@/types/world";

export interface MissionEvent {
  id: string;
  /** Elapsed mission seconds at which this fires. */
  at: number;
  title: string;
  body: string;
  tone: TimelineTone;
  source: TimelineEntry["source"];
  href?: string;
  actionLabel?: string;
  /** Mutates a draft world in place. Return extra timeline lines if useful. */
  apply: (world: WorldState, rand: () => number) => string | undefined;
}

const minutes = (value: number) => Math.round(value * 60);

/**
 * The morning, scripted. Times are deliberately front-loaded — an operator who
 * gets ten quiet minutes stops paying attention, and the shift only lasts an
 * hour.
 */
export const MISSION_EVENTS: MissionEvent[] = [
  {
    id: "absences",
    at: minutes(1.5),
    title: "Two pickers have not shown up",
    body: "Sunil and Ritika are both marked absent. Nobody called ahead.",
    tone: "critical",
    source: "people",
    href: "/people",
    actionLabel: "Open People",
    apply: (world) => {
      let marked = 0;
      for (const worker of world.workers) {
        if (worker.role !== "picker" || worker.status !== "active") continue;
        if (marked >= 2) break;
        worker.status = "absent";
        worker.shiftNote = "No call, no show";
        marked += 1;
      }
      return `${marked} of your pickers are unaccounted for.`;
    },
  },
  {
    id: "scanner",
    at: minutes(4),
    title: "Scanner at station 2 has died",
    body: "Picks at that station are being keyed in by hand. Everything slows.",
    tone: "warning",
    source: "hub",
    href: "/orders",
    actionLabel: "See the queue",
    apply: (world) => {
      world.impairments.push({
        id: "scanner-2",
        label: "Station 2 scanner down",
        pickPenalty: 0.78,
        resolved: false,
      });
      return "Pick throughput is down roughly a fifth.";
    },
  },
  {
    id: "first-complaint",
    at: minutes(7),
    title: "A customer is on the line",
    body: "An order from the previous shift never arrived. She would like to know why.",
    tone: "critical",
    source: "customers",
    href: "/messages",
    actionLabel: "Open Messages",
    apply: (world, rand) => {
      world.complaints.push({
        id: "c-inherited",
        customerName: "Meera K.",
        orderCode: "#4386",
        reason:
          "Ordered before nine. Nothing has arrived and the app still says picking.",
        severity: "high",
        raisedAt: world.elapsed,
        resolution: null,
      });
      world.rating = clamp(world.rating - 0.03, 1, 5);
      return pick(rand, [
        "She is polite, which is worse.",
        "She has ordered here every week for a year.",
      ]);
    },
  },
  {
    id: "rain",
    at: minutes(10),
    title: "Heavy rain over the zone",
    body: "Riders are slower and more people are ordering in. Both at once.",
    tone: "warning",
    source: "hub",
    apply: (world) => {
      world.weather = {
        condition: "rain",
        note: "Heavy rain. Roads slow, demand climbing.",
        travelPenalty: 1.45,
        demandMultiplier: 1.35,
      };
      return "Travel times up 45%, demand up a third.";
    },
  },
  {
    id: "mismatch",
    at: minutes(14),
    title: "Stock records do not match the shelf",
    body: "A picker has flagged six SKUs where the system count is wrong.",
    tone: "warning",
    source: "inventory",
    href: "/inventory",
    actionLabel: "Open Inventory",
    apply: (world, rand) => {
      let flagged = 0;
      for (const item of world.inventory) {
        if (flagged >= 6) break;
        if (item.actualQty === item.systemQty) continue;
        item.systemQty = Math.max(0, item.actualQty + randomInt(rand, 3, 12));
        flagged += 1;
      }
      return `${flagged} SKUs are overstated in the system.`;
    },
  },
  {
    id: "rider-down",
    at: minutes(19),
    title: "Rider breakdown on Old Airport Road",
    body: "Pradeep's bike has given up. He is fine; the order is not.",
    tone: "critical",
    source: "hub",
    apply: (world) => {
      const rider = world.riders.find((candidate) => candidate.status !== "offline");
      if (!rider) return undefined;
      rider.status = "offline";
      const order = world.orders.find((candidate) => candidate.id === rider.currentOrderId);
      if (order) {
        order.status = "packed";
        order.assignedRiderId = null;
        order.travelRemaining = 0;
      }
      rider.currentOrderId = null;
      return `${rider.name} is out for the rest of the shift.`;
    },
  },
  {
    id: "manager-visit",
    at: minutes(24),
    title: "Regional manager is coming by",
    body: "Kavitha will be at the hub in twenty minutes. She reads the board before she says hello.",
    tone: "info",
    source: "hub",
    apply: () => "Whatever the floor looks like at 09:44 is the impression she takes.",
  },
  {
    id: "surge",
    at: minutes(29),
    title: "Promo push just went out",
    body: "Marketing pushed a rain-day discount to the whole zone. Nobody told you.",
    tone: "warning",
    source: "orders",
    href: "/orders",
    actionLabel: "Open Orders",
    apply: (world) => {
      world.weather = { ...world.weather, demandMultiplier: world.weather.demandMultiplier * 1.5 };
      return "Order rate is about to jump by half.";
    },
  },
  {
    id: "fatigue",
    at: minutes(34),
    title: "Ganesh is asking for a break",
    body: "He has been on the pick face since six without stopping.",
    tone: "info",
    source: "people",
    href: "/people",
    actionLabel: "Open People",
    apply: (world) => {
      const worker = world.workers.find(
        (candidate) => candidate.status === "active" && candidate.role === "picker",
      );
      if (!worker) return undefined;
      worker.fatigue = Math.max(worker.fatigue, 0.82);
      worker.shiftNote = "Requested a break";
      return `${worker.name} is at the point where mistakes start.`;
    },
  },
  {
    id: "stockout",
    at: minutes(39),
    title: "Full Cream Milk is out",
    body: "The shelf is empty and there are open orders that need it.",
    tone: "critical",
    source: "inventory",
    href: "/inventory",
    actionLabel: "Open Inventory",
    apply: (world) => {
      const item = world.inventory.find((candidate) => candidate.sku === "CHL-4101");
      if (!item) return undefined;
      item.actualQty = 0;
      item.systemQty = Math.max(item.systemQty, 14);
      return "The system still thinks there are units on the shelf.";
    },
  },
  {
    id: "manager-arrives",
    at: minutes(44),
    title: "Kavitha is on the floor",
    body: "She has walked the pick face and is looking at the queue board.",
    tone: "info",
    source: "hub",
    apply: (world) =>
      world.hubStatus === "critical"
        ? "She arrived to a backlog. She has not said anything yet."
        : "She arrived to a floor that is holding.",
  },
  {
    id: "cold-chain",
    at: minutes(49),
    title: "Cold chain alert on bay 3",
    body: "Chiller door has been open long enough to trip the sensor.",
    tone: "warning",
    source: "inventory",
    apply: (world) => {
      for (const item of world.inventory) {
        if (item.category !== "Cold chain") continue;
        item.actualQty = Math.max(0, item.actualQty - 4);
      }
      return "Cold chain stock is now less than the system believes.";
    },
  },
  {
    id: "rain-clears",
    at: minutes(53),
    title: "Rain is easing",
    body: "Roads are moving again. Demand stays high for a while yet.",
    tone: "positive",
    source: "hub",
    apply: (world) => {
      world.weather = {
        condition: "cloudy",
        note: "Rain easing. Roads recovering.",
        travelPenalty: 1.12,
        demandMultiplier: 1.2,
      };
      return "Travel penalty down to 12%.";
    },
  },
  {
    id: "handover-prep",
    at: minutes(57),
    title: "Next shift arrives in three minutes",
    body: "Whatever is still open becomes somebody else's morning.",
    tone: "info",
    source: "hub",
    apply: () => "What you leave behind is part of the read.",
  },
];

export function eventsDueBetween(from: number, to: number): MissionEvent[] {
  return MISSION_EVENTS.filter((event) => event.at > from && event.at <= to);
}

/** Applies an event to a draft world and produces its record. */
export function applyEvent(
  event: MissionEvent,
  world: WorldState,
): { entry: TimelineEntry; notification: MissionNotification } {
  const rand = mulberry32(world.seed + event.at);
  const detail = event.apply(world, rand);

  return {
    entry: {
      id: `e-${event.id}`,
      at: world.elapsed,
      kind: "event",
      tone: event.tone,
      title: event.title,
      detail: detail ?? event.body,
      source: event.source,
    },
    notification: {
      id: `n-${event.id}`,
      at: world.elapsed,
      tone: event.tone,
      title: event.title,
      body: event.body,
      href: event.href,
      actionLabel: event.actionLabel,
    },
  };
}
