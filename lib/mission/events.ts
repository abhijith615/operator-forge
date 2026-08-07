import { mulberry32, pick } from "@/lib/mission/random";
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
  /** Mutates a draft world in place. Return a line for the record if useful. */
  apply: (world: WorldState, rand: () => number) => string | undefined;
}

const minutes = (value: number) => Math.round(value * 60);

/**
 * World shocks, not the mission's content. The operator's minute-to-minute work
 * comes from the task queue; these eight moments exist only to change the shape
 * of the floor underneath it — the weather, the roster, the demand curve — so
 * that the same task means something different at minute five and minute
 * twenty-five.
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
    id: "rain",
    at: minutes(5),
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
    id: "rider-down",
    at: minutes(9),
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
    id: "surge",
    at: minutes(13),
    title: "Rain-day promo has gone live",
    body: "Marketing pushed a discount to the whole zone. Inbound is about to jump by half.",
    tone: "warning",
    source: "orders",
    href: "/orders",
    actionLabel: "Open Orders",
    apply: (world) => {
      world.weather = {
        ...world.weather,
        demandMultiplier: world.weather.demandMultiplier * 1.5,
      };
      return "Order rate is about to jump by half.";
    },
  },
  {
    id: "manager-visit",
    at: minutes(17),
    title: "Regional manager is coming by",
    body: "Kavitha will be at the store in five minutes. She reads the board before she says hello.",
    tone: "info",
    source: "hub",
    apply: () => "Whatever the floor looks like at 09:22 is the impression she takes.",
  },
  {
    id: "manager-arrives",
    at: minutes(22),
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
    id: "rain-clears",
    at: minutes(26),
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
    at: minutes(28.5),
    title: "Next shift arrives in ninety seconds",
    body: "Whatever is still open becomes somebody else's morning.",
    tone: "info",
    source: "hub",
    apply: (world, rand) =>
      pick(rand, [
        "What you leave behind is part of the read.",
        `${world.orders.filter((order) => order.status === "queued").length} orders are still unpicked.`,
      ]),
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
