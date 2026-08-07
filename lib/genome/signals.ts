import type { CapabilityId } from "@/lib/constants/site";
import type { ChatMessage } from "@/types/agents";
import type { TaskDecision } from "@/types/tasks";
import type { TelemetryEvent } from "@/types/telemetry";
import type { WorldState } from "@/types/world";
import { clamp } from "@/lib/utils";

/**
 * Everything the scorers read, gathered once. Keeping this separate from the
 * scoring maths makes it obvious what evidence exists — and what does not.
 */
export interface RunSignals {
  decisions: TaskDecision[];
  answered: TaskDecision[];
  expired: TaskDecision[];
  events: TelemetryEvent[];
  prompts: TelemetryEvent[];
  terms: TelemetryEvent[];
  navigations: TelemetryEvent[];
  dwells: TelemetryEvent[];
  operatorMessages: ChatMessage[];
  world: WorldState;
  duration: number;
}

export function gatherSignals(input: {
  decisions: TaskDecision[];
  events: TelemetryEvent[];
  threads: Record<string, ChatMessage[]>;
  world: WorldState;
}): RunSignals {
  const { decisions, events, threads, world } = input;

  return {
    decisions,
    answered: decisions.filter((decision) => !decision.expired),
    expired: decisions.filter((decision) => decision.expired),
    events,
    prompts: events.filter((event) => event.kind === "prompt"),
    terms: events.filter((event) => event.kind === "term"),
    navigations: events.filter((event) => event.kind === "navigate"),
    dwells: events.filter((event) => event.kind === "dwell"),
    operatorMessages: Object.values(threads)
      .flat()
      .filter((message) => message.role === "operator"),
    world,
    duration: Math.max(1, world.elapsed),
  };
}

/* ── Small maths helpers ──────────────────────────────────────────────────── */

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/** Maps a raw count onto 0–1, saturating at `full`. */
export function ramp(value: number, full: number): number {
  return clamp(value / full, 0, 1);
}

/** Blends weighted parts, ignoring any part with no evidence behind it. */
export function blend(parts: { value: number | null; weight: number }[]): number {
  const present = parts.filter(
    (part): part is { value: number; weight: number } => part.value !== null,
  );
  if (present.length === 0) return 0.5;
  const total = present.reduce((sum, part) => sum + part.weight, 0);
  if (total === 0) return 0.5;
  return clamp(
    present.reduce((sum, part) => sum + part.value * part.weight, 0) / total,
    0,
    1,
  );
}

/** Critical calls carry more weight than routine ones. */
const PRIORITY_WEIGHT = { critical: 1.6, high: 1.2, normal: 1 } as const;

/**
 * Mean decision quality for one capability, weighted by how much was riding on
 * each call. `null` when the shift produced no evidence at all.
 */
export function taggedQuality(
  signals: RunSignals,
  capability: CapabilityId,
): { value: number | null; count: number } {
  const tagged = signals.answered.filter((decision) =>
    decision.capabilities.includes(capability),
  );
  if (tagged.length === 0) return { value: null, count: 0 };

  const weightSum = tagged.reduce(
    (sum, decision) => sum + PRIORITY_WEIGHT[decision.priority],
    0,
  );
  const value =
    tagged.reduce(
      (sum, decision) => sum + decision.quality * PRIORITY_WEIGHT[decision.priority],
      0,
    ) / weightSum;

  return { value, count: tagged.length };
}

/** Decisions in the first and last third of the shift, for trend signals. */
export function thirds(signals: RunSignals): {
  first: TaskDecision[];
  last: TaskDecision[];
} {
  const cut = signals.duration / 3;
  return {
    first: signals.answered.filter((decision) => decision.at <= cut),
    last: signals.answered.filter((decision) => decision.at >= cut * 2),
  };
}

/**
 * Did the operator look at a relevant panel shortly before deciding? This is the
 * clearest behavioural trace of checking before committing.
 */
export function investigatedBeforeDeciding(signals: RunSignals): {
  value: number | null;
  count: number;
} {
  if (signals.answered.length === 0) return { value: null, count: 0 };

  const routeForStream: Record<string, string> = {
    operations: "/inventory",
    people: "/people",
    customers: "/customers",
  };

  let checked = 0;
  let checkable = 0;

  for (const decision of signals.answered) {
    const route = routeForStream[decision.stream];
    if (!route) continue;
    checkable += 1;

    const looked = signals.navigations.some(
      (event) =>
        (event.target === route || event.target === "/orders") &&
        event.at <= decision.at &&
        decision.at - event.at <= 90,
    );
    if (looked) checked += 1;
  }

  if (checkable === 0) return { value: null, count: 0 };
  // Checking before every single call is neither realistic nor the goal.
  return { value: clamp((checked / checkable) / 0.5, 0, 1), count: checked };
}

/** Prompts that were followed by a decision inside ninety seconds. */
export function actedAfterAsking(signals: RunSignals): {
  value: number | null;
  count: number;
} {
  if (signals.prompts.length === 0) return { value: null, count: 0 };

  const acted = signals.prompts.filter((prompt) =>
    signals.answered.some(
      (decision) => decision.at >= prompt.at && decision.at - prompt.at <= 90,
    ),
  ).length;

  return { value: acted / signals.prompts.length, count: acted };
}
