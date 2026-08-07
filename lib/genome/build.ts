import type { ChatMessage } from "@/types/agents";
import type { OperatorGenome } from "@/types/genome";
import type { TaskDecision } from "@/types/tasks";
import type { TelemetryEvent } from "@/types/telemetry";
import type { WorldState } from "@/types/world";

import { buildStory, headlineFor, signatureFor, summaryFor } from "./narrative";
import { operatorRating, scoreCapabilities } from "./scoring";
import { gatherSignals, median } from "./signals";

export interface GenomeInput {
  runId: string;
  decisions: TaskDecision[];
  events: TelemetryEvent[];
  threads: Record<string, ChatMessage[]>;
  world: WorldState;
}

/**
 * Turns a finished shift into a reading of the operator who ran it. Pure, so it
 * can be regenerated from a stored run at any point without replaying anything.
 */
export function buildGenome(input: GenomeInput): OperatorGenome {
  const signals = gatherSignals(input);
  const capabilities = scoreCapabilities(signals, headlineFor);
  const ranked = [...capabilities].sort((a, b) => b.score - a.score);
  const signature = signatureFor(capabilities);

  return {
    runId: input.runId,
    generatedAt: Date.now(),
    capabilities,
    rating: operatorRating(capabilities, signals),
    signature: signature.name,
    signatureBlurb: signature.blurb,
    summary: summaryFor(capabilities, signals),
    strengths: ranked.slice(0, 3).map((reading) => reading.id),
    growth: ranked
      .slice(-3)
      .reverse()
      .map((reading) => reading.id),
    story: buildStory(signals),
    stats: {
      tasksHandled: signals.answered.length,
      tasksExpired: signals.expired.length,
      medianLatency: Math.round(
        median(signals.answered.map((decision) => decision.latency)),
      ),
      peakQueue: signals.decisions.reduce(
        (max, decision) => Math.max(max, decision.queueDepth),
        0,
      ),
      promptsSent: signals.prompts.length,
      termsOpened: signals.terms.length,
      panelsVisited: new Set(signals.navigations.map((event) => event.target)).size,
      ratingAtClose: Number(signals.world.rating.toFixed(2)),
      otifAtClose: Number(signals.world.metrics.otif.toFixed(3)),
    },
  };
}
