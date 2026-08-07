import { capabilities, type CapabilityId } from "@/lib/constants/site";
import { hubClock } from "@/lib/mission/config";
import { clamp } from "@/lib/utils";
import type { CapabilityReading, GenomeMoment } from "@/types/genome";
import { bandOf, confidenceOf } from "@/types/genome";
import type { TaskDecision } from "@/types/tasks";

import {
  actedAfterAsking,
  blend,
  investigatedBeforeDeciding,
  mean,
  median,
  ramp,
  taggedQuality,
  thirds,
  type RunSignals,
} from "./signals";

interface RawReading {
  score: number;
  evidenceCount: number;
  moments: GenomeMoment[];
}

function momentFrom(decision: TaskDecision, lead: string): GenomeMoment {
  return {
    at: decision.at,
    text: `${lead} “${decision.optionLabel ?? "—"}” at ${hubClock(decision.at)}.`,
  };
}

/** The best and worst call tagged to a capability, as citable evidence. */
function bookendMoments(signals: RunSignals, capability: CapabilityId): GenomeMoment[] {
  const tagged = signals.answered
    .filter((decision) => decision.capabilities.includes(capability))
    .sort((a, b) => b.quality - a.quality);

  const moments: GenomeMoment[] = [];
  const best = tagged[0];
  const worst = tagged[tagged.length - 1];

  if (best && best.quality >= 0.7) moments.push(momentFrom(best, "You chose"));
  if (worst && worst !== best && worst.quality <= 0.35) {
    moments.push(momentFrom(worst, "You also chose"));
  }
  return moments;
}

/* ── The ten scorers ──────────────────────────────────────────────────────── */

function scoreCuriosity(signals: RunSignals): RawReading {
  const quality = taggedQuality(signals, "curiosity");
  const investigated = investigatedBeforeDeciding(signals);
  const termCount = signals.terms.length;
  const questions = signals.prompts.filter((event) => event.meta?.isQuestion === true);

  const moments = bookendMoments(signals, "curiosity");
  if (termCount > 0) {
    const first = signals.terms[0];
    if (first) {
      moments.push({
        at: first.at,
        text:
          termCount === 1
            ? "You stopped to look up an operations term rather than working around it."
            : `You looked up ${termCount} operations terms rather than working around them.`,
      });
    }
  }

  return {
    score: blend([
      { value: quality.value, weight: 0.4 },
      { value: investigated.value, weight: 0.25 },
      { value: termCount > 0 ? ramp(termCount, 4) : null, weight: 0.2 },
      { value: questions.length > 0 ? ramp(questions.length, 4) : null, weight: 0.15 },
    ]),
    evidenceCount: quality.count + termCount + questions.length,
    moments,
  };
}

function scoreDecisionMaking(signals: RunSignals): RawReading {
  const quality = taggedQuality(signals, "decision-making");
  const total = signals.decisions.length;
  const actionRate = total > 0 ? signals.answered.length / total : null;

  const criticals = signals.decisions.filter((d) => d.priority === "critical");
  const criticalRate =
    criticals.length > 0
      ? criticals.filter((d) => !d.expired).length / criticals.length
      : null;

  return {
    score: blend([
      { value: quality.value, weight: 0.45 },
      { value: actionRate, weight: 0.25 },
      { value: criticalRate, weight: 0.3 },
    ]),
    evidenceCount: quality.count + criticals.length,
    moments: bookendMoments(signals, "decision-making"),
  };
}

function scoreSystemsThinking(signals: RunSignals): RawReading {
  const quality = taggedQuality(signals, "systems-thinking");
  const counts = signals.events.filter(
    (event) => event.kind === "control" && event.target === "cycle-count",
  ).length;
  const throttled = signals.events.some(
    (event) => event.kind === "control" && event.target === "set-hub-status",
  );
  const throttleTask = signals.answered.some(
    (decision) => decision.optionId === "throttle" || decision.optionId === "prepare",
  );

  const moments = bookendMoments(signals, "systems-thinking");
  if (throttled || throttleTask) {
    moments.push({
      at: signals.duration,
      text: "You reached for intake control instead of asking the floor to absorb it.",
    });
  }

  return {
    score: blend([
      { value: quality.value, weight: 0.6 },
      { value: throttled || throttleTask ? 0.9 : null, weight: 0.2 },
      { value: counts > 0 ? ramp(counts, 3) : null, weight: 0.2 },
    ]),
    evidenceCount: quality.count + counts + (throttled ? 1 : 0),
    moments,
  };
}

function scorePrioritization(signals: RunSignals): RawReading {
  const quality = taggedQuality(signals, "prioritization");

  const byPriority = (priority: TaskDecision["priority"]) =>
    signals.decisions.filter((decision) => decision.priority === priority);

  const critical = byPriority("critical");
  const normal = byPriority("normal");

  // Letting routine work expire while criticals get answered is the right shape.
  const criticalSurvival =
    critical.length > 0
      ? critical.filter((decision) => !decision.expired).length / critical.length
      : null;

  const normalExpiry =
    normal.length > 0
      ? normal.filter((decision) => decision.expired).length / normal.length
      : null;

  const shape =
    criticalSurvival !== null && normalExpiry !== null
      ? clamp(0.5 + (criticalSurvival - (1 - normalExpiry)) * 0.8, 0, 1)
      : criticalSurvival;

  const criticalLatency = median(
    critical.filter((d) => !d.expired).map((d) => d.latency),
  );
  const normalLatency = median(normal.filter((d) => !d.expired).map((d) => d.latency));
  const urgencySense =
    criticalLatency > 0 && normalLatency > 0
      ? clamp(1 - criticalLatency / (normalLatency + criticalLatency), 0, 1)
      : null;

  const moments: GenomeMoment[] = [];
  const missedCritical = critical.find((decision) => decision.expired);
  if (missedCritical) {
    moments.push({
      at: missedCritical.at,
      text: `A critical task expired unanswered at ${hubClock(missedCritical.at)} with ${missedCritical.queueDepth} other items on the board.`,
    });
  }

  return {
    score: blend([
      { value: quality.value, weight: 0.3 },
      { value: criticalSurvival, weight: 0.3 },
      { value: shape, weight: 0.2 },
      { value: urgencySense, weight: 0.2 },
    ]),
    evidenceCount: signals.decisions.length,
    moments: [...moments, ...bookendMoments(signals, "prioritization")],
  };
}

function scoreLearningAgility(signals: RunSignals): RawReading {
  const quality = taggedQuality(signals, "learning-agility");
  const { first, last } = thirds(signals);

  const qualityTrend =
    first.length >= 2 && last.length >= 2
      ? clamp(
          0.5 + (mean(last.map((d) => d.quality)) - mean(first.map((d) => d.quality))) * 1.5,
          0,
          1,
        )
      : null;

  const latencyTrend =
    first.length >= 2 && last.length >= 2
      ? clamp(
          0.5 +
            (median(first.map((d) => d.latency)) - median(last.map((d) => d.latency))) / 90,
          0,
          1,
        )
      : null;

  const moments: GenomeMoment[] = [];
  if (qualityTrend !== null && qualityTrend > 0.62) {
    moments.push({
      at: last[0]?.at ?? signals.duration,
      text: "Your calls in the last ten minutes were better than your calls in the first ten.",
    });
  } else if (qualityTrend !== null && qualityTrend < 0.4) {
    moments.push({
      at: last[0]?.at ?? signals.duration,
      text: "Your judgement drifted as the shift went on rather than sharpening.",
    });
  }

  return {
    score: blend([
      { value: quality.value, weight: 0.3 },
      { value: qualityTrend, weight: 0.45 },
      { value: latencyTrend, weight: 0.25 },
    ]),
    evidenceCount: first.length + last.length,
    moments,
  };
}

function scoreOwnership(signals: RunSignals): RawReading {
  const quality = taggedQuality(signals, "ownership");
  const tagged = signals.answered.filter((d) => d.capabilities.includes("ownership"));
  const corners = tagged.filter((decision) => decision.quality <= 0.2).length;
  const cornerRate = tagged.length > 0 ? 1 - corners / tagged.length : null;

  const moments = bookendMoments(signals, "ownership");
  if (corners > 0) {
    moments.push({
      at: signals.duration,
      text: `You took the quick way out of ${corners} call${corners === 1 ? "" : "s"} that had your name on it.`,
    });
  }

  return {
    score: blend([
      { value: quality.value, weight: 0.65 },
      { value: cornerRate, weight: 0.35 },
    ]),
    evidenceCount: tagged.length,
    moments,
  };
}

function scoreAiCollaboration(signals: RunSignals): RawReading {
  const prompts = signals.prompts;
  const words = signals.operatorMessages.map(
    (message) => message.content.trim().split(/\s+/).length,
  );
  const acted = actedAfterAsking(signals);

  const moments: GenomeMoment[] = [];
  if (prompts.length === 0) {
    moments.push({
      at: 0,
      text: "You ran the whole shift without asking anyone a single question.",
    });
  } else {
    const first = prompts[0];
    if (first) {
      moments.push({
        at: first.at,
        text: `You opened a conversation at ${hubClock(first.at)} and sent ${prompts.length} message${prompts.length === 1 ? "" : "s"} in total.`,
      });
    }
  }

  return {
    score: blend([
      { value: ramp(prompts.length, 6), weight: 0.4 },
      { value: words.length > 0 ? ramp(mean(words), 22) : null, weight: 0.3 },
      { value: acted.value, weight: 0.3 },
    ]),
    evidenceCount: prompts.length,
    moments,
  };
}

function scoreCustomerThinking(signals: RunSignals): RawReading {
  const quality = taggedQuality(signals, "customer-thinking");
  const customerTasks = signals.decisions.filter(
    (decision) => decision.stream === "customers",
  );
  const answerRate =
    customerTasks.length > 0
      ? customerTasks.filter((d) => !d.expired).length / customerTasks.length
      : null;

  // The rating starts at 4.6. Holding it is the whole job.
  const ratingHeld = clamp((signals.world.rating - 3.4) / 1.2, 0, 1);

  const moments = bookendMoments(signals, "customer-thinking");
  moments.push({
    at: signals.duration,
    text: `The hub rating finished at ${signals.world.rating.toFixed(2)}, from 4.60 when you took over.`,
  });

  return {
    score: blend([
      { value: quality.value, weight: 0.4 },
      { value: answerRate, weight: 0.3 },
      { value: ratingHeld, weight: 0.3 },
    ]),
    evidenceCount: quality.count + customerTasks.length,
    moments,
  };
}

function scoreCommunication(signals: RunSignals): RawReading {
  const quality = taggedQuality(signals, "communication");
  const words = signals.operatorMessages.map(
    (message) => message.content.trim().split(/\s+/).length,
  );
  const specificity = words.length > 0 ? ramp(mean(words), 20) : null;

  return {
    score: blend([
      { value: quality.value, weight: 0.6 },
      { value: specificity, weight: 0.25 },
      { value: words.length > 0 ? ramp(words.length, 5) : null, weight: 0.15 },
    ]),
    evidenceCount: quality.count + words.length,
    moments: bookendMoments(signals, "communication"),
  };
}

function scoreStressHandling(signals: RunSignals): RawReading {
  const underPressure = signals.answered.filter((decision) => decision.queueDepth >= 6);
  const calm = signals.answered.filter((decision) => decision.queueDepth <= 3);

  const pressureQuality =
    underPressure.length >= 2 ? mean(underPressure.map((d) => d.quality)) : null;

  // Holding your standard when the board is stacked is the actual signal.
  const holdUp =
    underPressure.length >= 2 && calm.length >= 2
      ? clamp(
          0.5 +
            (mean(underPressure.map((d) => d.quality)) - mean(calm.map((d) => d.quality))) *
              1.5,
          0,
          1,
        )
      : null;

  const { last } = thirds(signals);
  const lateQuality = last.length >= 2 ? mean(last.map((d) => d.quality)) : null;

  const moments: GenomeMoment[] = [];
  const peak = signals.decisions.reduce(
    (max, decision) => Math.max(max, decision.queueDepth),
    0,
  );
  if (peak >= 6) {
    moments.push({
      at: signals.duration,
      text: `The board reached ${peak} open items. You were still answering at that depth.`,
    });
  }

  return {
    score: blend([
      { value: pressureQuality, weight: 0.4 },
      { value: holdUp, weight: 0.3 },
      { value: lateQuality, weight: 0.3 },
    ]),
    evidenceCount: underPressure.length + last.length,
    moments,
  };
}

const SCORERS: Record<CapabilityId, (signals: RunSignals) => RawReading> = {
  curiosity: scoreCuriosity,
  "decision-making": scoreDecisionMaking,
  "systems-thinking": scoreSystemsThinking,
  prioritization: scorePrioritization,
  "learning-agility": scoreLearningAgility,
  ownership: scoreOwnership,
  "ai-collaboration": scoreAiCollaboration,
  "customer-thinking": scoreCustomerThinking,
  communication: scoreCommunication,
  "stress-handling": scoreStressHandling,
};

export function scoreCapabilities(
  signals: RunSignals,
  headlineFor: (id: CapabilityId, reading: RawReading) => string,
): CapabilityReading[] {
  return capabilities.map((capability) => {
    const raw = SCORERS[capability.id](signals);
    return {
      id: capability.id,
      name: capability.name,
      score: raw.score,
      band: bandOf(raw.score),
      confidence: confidenceOf(raw.evidenceCount),
      evidenceCount: raw.evidenceCount,
      headline: headlineFor(capability.id, raw),
      moments: raw.moments.slice(0, 3),
    };
  });
}

/**
 * Operator Rating. A composite of the ten readings, nudged by what the hub
 * actually looked like at handover — judgement matters more than outcome, but
 * outcome is not nothing.
 */
export function operatorRating(
  readings: CapabilityReading[],
  signals: RunSignals,
): number {
  const composite = mean(readings.map((reading) => reading.score));
  const outcome = clamp(
    (signals.world.rating - 3.2) / 1.4 * 0.5 + signals.world.metrics.otif * 0.5,
    0,
    1,
  );
  const blended = composite * 0.78 + outcome * 0.22;
  return Math.round(1200 + blended * 700);
}
