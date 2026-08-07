import type { CapabilityId } from "@/lib/constants/site";
import { hubClock } from "@/lib/mission/config";
import type { CapabilityReading, StoryBeat } from "@/types/genome";
import type { TaskDecision } from "@/types/tasks";

import { median, type RunSignals } from "./signals";

/**
 * The debrief speaks to the operator about the shift they just ran. Every line
 * here has to survive being read by someone who was there — no horoscopes, no
 * "you are a natural leader", nothing that would read the same for anyone.
 */

type Tier = "low" | "mid" | "high";

function tierOf(score: number): Tier {
  if (score < 0.5) return "low";
  if (score < 0.75) return "mid";
  return "high";
}

const HEADLINES: Record<CapabilityId, Record<Tier, string>> = {
  curiosity: {
    low: "You mostly acted on what was in front of you rather than going to look.",
    mid: "You checked before committing some of the time, and guessed the rest.",
    high: "You went and looked before you decided, repeatedly, under time pressure.",
  },
  "decision-making": {
    low: "A lot of the board went unanswered — the calls you did make were not the problem.",
    mid: "You committed to most things, though the harder options often got the safer answer.",
    high: "You committed quickly and the calls held up when they mattered.",
  },
  "systems-thinking": {
    low: "You treated problems as they appeared, one at a time.",
    mid: "You saw some of the second-order effects, mostly after they had started.",
    high: "You kept reaching for the causes rather than the symptoms.",
  },
  prioritization: {
    low: "Critical work expired while routine work got your attention.",
    mid: "You mostly got to the urgent things first, with some expensive exceptions.",
    high: "You let the right things fail. That is the hard half of this job.",
  },
  "learning-agility": {
    low: "Your approach at the end of the shift looked like your approach at the start.",
    mid: "You adjusted, though it took the floor telling you twice.",
    high: "You were visibly better in the last ten minutes than in the first ten.",
  },
  ownership: {
    low: "Several things with your name on them got the quickest possible answer.",
    mid: "You closed most loops, and let a few go when the board got heavy.",
    high: "You signed for what you had actually checked, including when nobody would know.",
  },
  "ai-collaboration": {
    low: "You had three colleagues and a copilot available and barely used them.",
    mid: "You asked when you were stuck, in fairly general terms.",
    high: "You directed the people around you with specific questions and then acted on what came back.",
  },
  "customer-thinking": {
    low: "The person waiting for the order rarely entered the decision.",
    mid: "You handled the customers who complained, and not the ones who did not.",
    high: "You could name who was affected, and it changed what you chose.",
  },
  communication: {
    low: "What you sent was brief enough to be ambiguous.",
    mid: "You were clear when you had time to be.",
    high: "You said the uncomfortable thing plainly, upward and downward.",
  },
  "stress-handling": {
    low: "Your judgement thinned as the board filled.",
    mid: "You held together, though the quality dipped when it got busy.",
    high: "Your last decision at a full board was as good as your first at an empty one.",
  },
};

export function headlineFor(id: CapabilityId, reading: { score: number }): string {
  return HEADLINES[id][tierOf(reading.score)];
}

/** Lowercases a capability name for use mid-sentence, leaving acronyms alone. */
function inSentence(name: string): string {
  return name.startsWith("AI ") ? name : name.toLowerCase();
}

/** Drops the leading capital so a headline can follow a colon. */
function continued(headline: string): string {
  return headline.charAt(0).toLowerCase() + headline.slice(1);
}

/* ── Signature ────────────────────────────────────────────────────────────── */

interface Archetype {
  pair: [CapabilityId, CapabilityId];
  name: string;
  blurb: string;
}

const ARCHETYPES: Archetype[] = [
  {
    pair: ["curiosity", "systems-thinking"],
    name: "The Investigator",
    blurb: "You go and find the cause before you spend anything on the symptom.",
  },
  {
    pair: ["decision-making", "stress-handling"],
    name: "The Closer",
    blurb: "You keep deciding when the board is full and most people stop.",
  },
  {
    pair: ["customer-thinking", "communication"],
    name: "The Advocate",
    blurb: "You keep the person at the other end of the order in the room.",
  },
  {
    pair: ["prioritization", "decision-making"],
    name: "The Triager",
    blurb: "You are comfortable letting the right things fail.",
  },
  {
    pair: ["ownership", "communication"],
    name: "The Steward",
    blurb: "You close loops and you say what actually happened.",
  },
  {
    pair: ["ai-collaboration", "curiosity"],
    name: "The Convener",
    blurb: "You get more out of the people around you than you do alone.",
  },
  {
    pair: ["systems-thinking", "prioritization"],
    name: "The Planner",
    blurb: "You spend the first minute of a problem deciding what not to do.",
  },
  {
    pair: ["learning-agility", "stress-handling"],
    name: "The Adapter",
    blurb: "You are a different operator at minute twenty-five than at minute five.",
  },
  {
    pair: ["ownership", "systems-thinking"],
    name: "The Engineer",
    blurb: "You fix the mechanism, and you put your name on the fix.",
  },
  {
    pair: ["systems-thinking", "stress-handling"],
    name: "The Controller",
    blurb: "The busier it gets, the further ahead you look.",
  },
  {
    pair: ["ownership", "stress-handling"],
    name: "The Anchor",
    blurb: "When the board fills, you are the thing that does not move.",
  },
  {
    pair: ["customer-thinking", "prioritization"],
    name: "The Broker",
    blurb: "You decide whose morning gets protected, and you can defend it.",
  },
  {
    pair: ["communication", "stress-handling"],
    name: "The Signal",
    blurb: "You stay legible to everyone else while it is going wrong.",
  },
];

/** Used when no pair matches, so the signature is never a shrug. */
const SOLO: Partial<Record<CapabilityId, { name: string; blurb: string }>> = {
  curiosity: { name: "The Digger", blurb: "You would rather know than assume." },
  "decision-making": { name: "The Decider", blurb: "You commit, and you commit early." },
  "systems-thinking": {
    name: "The Systems Reader",
    blurb: "You keep asking what caused the thing in front of you.",
  },
  prioritization: {
    name: "The Sorter",
    blurb: "You are unusually comfortable deciding what does not get done.",
  },
  "learning-agility": {
    name: "The Fast Study",
    blurb: "The floor only has to tell you once.",
  },
  ownership: {
    name: "The Custodian",
    blurb: "You sign for what you have actually checked.",
  },
  "ai-collaboration": {
    name: "The Director",
    blurb: "You get more out of the people around you than you do alone.",
  },
  "customer-thinking": {
    name: "The Advocate",
    blurb: "You keep the person at the other end of the order in the room.",
  },
  communication: {
    name: "The Straight Talker",
    blurb: "You say the uncomfortable thing plainly.",
  },
  "stress-handling": {
    name: "The Steady Hand",
    blurb: "Your judgement at minute twenty-five looks like minute five.",
  },
};

export function signatureFor(readings: CapabilityReading[]): {
  name: string;
  blurb: string;
} {
  const ranked = [...readings].sort((a, b) => b.score - a.score);
  const top = new Set(ranked.slice(0, 3).map((reading) => reading.id));

  const match = ARCHETYPES.find(
    (archetype) => top.has(archetype.pair[0]) && top.has(archetype.pair[1]),
  );

  if (match) return { name: match.name, blurb: match.blurb };

  // No pair matched — fall back to the single strongest axis rather than a
  // generic label, so the signature still says something specific.
  const strongest = ranked[0];
  const solo = strongest ? SOLO[strongest.id] : undefined;
  if (solo) return solo;

  return {
    name: "The Operator",
    blurb: "One shift is not enough to see a pattern yet.",
  };
}

/* ── Summary ──────────────────────────────────────────────────────────────── */

export function summaryFor(
  readings: CapabilityReading[],
  signals: RunSignals,
): string {
  const answered = signals.answered.length;
  const expired = signals.expired.length;
  const total = answered + expired;
  const ranked = [...readings].sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];

  const share = total > 0 ? Math.round((answered / total) * 100) : 0;

  const opener =
    share >= 55
      ? `You got to ${answered} of the ${total} things that landed on the board — more than most people manage in thirty minutes.`
      : share >= 30
        ? `You got to ${answered} of the ${total} things that landed. The rest expired, which is the normal outcome and not by itself a failure.`
        : `${expired} of ${total} items expired unanswered. The board was moving faster than you were.`;

  const middle = best
    ? ` Your strongest read was ${inSentence(best.name)}: ${continued(best.headline)}`
    : "";

  const closer = worst
    ? ` The thinnest was ${inSentence(worst.name)} — ${continued(worst.headline)}`
    : "";

  return `${opener}${middle}${closer}`;
}

/* ── Story beats ──────────────────────────────────────────────────────────── */

function beatFor(decision: TaskDecision, kind: "good" | "poor"): StoryBeat {
  const time = hubClock(decision.at);
  const label = decision.optionLabel ?? "that call";

  if (kind === "good") {
    return {
      at: decision.at,
      tone: "positive",
      title: `${time} — you took the longer route`,
      body: `You chose “${label}” with ${decision.queueDepth} other items waiting. Strong operators buy information before they spend money or goodwill, even when the board is full. Keep doing this.`,
    };
  }

  return {
    at: decision.at,
    tone: "critical",
    title: `${time} — you took the cheap option`,
    body: `You chose “${label}”. It closed the item and left the cause in place. When the same thing appears twice in a shift, that is usually why.`,
  };
}

export function buildStory(signals: RunSignals): StoryBeat[] {
  const beats: StoryBeat[] = [];

  beats.push({
    at: 0,
    tone: "neutral",
    title: "09:00 — you took the floor",
    body: "Five orders already on the clock, a rating you did not earn, and a manager thirty minutes away. Nothing about the opening was your doing; everything after it was.",
  });

  const sorted = [...signals.answered].sort((a, b) => b.quality - a.quality);
  const best = sorted[0];
  if (best && best.quality >= 0.8) beats.push(beatFor(best, "good"));

  const firstCriticalMiss = signals.expired.find(
    (decision) => decision.priority === "critical",
  );
  if (firstCriticalMiss) {
    beats.push({
      at: firstCriticalMiss.at,
      tone: "critical",
      title: `${hubClock(firstCriticalMiss.at)} — something critical ran out of time`,
      body: `It sat for its whole window with ${firstCriticalMiss.queueDepth} other items on the board. Letting things expire is unavoidable; letting the critical ones expire is the choice worth examining.`,
    });
  }

  const worst = sorted[sorted.length - 1];
  if (worst && worst !== best && worst.quality <= 0.25) {
    beats.push(beatFor(worst, "poor"));
  }

  const peak = signals.answered.reduce<TaskDecision | null>(
    (max, decision) =>
      max === null || decision.queueDepth > max.queueDepth ? decision : max,
    null,
  );
  if (peak && peak.queueDepth >= 6) {
    beats.push({
      at: peak.at,
      tone: "positive",
      title: `${hubClock(peak.at)} — the board peaked at ${peak.queueDepth}`,
      body: `You were still making calls at that depth, and this one took you ${Math.round(peak.latency)} seconds. Deciding under a full board is the skill this shift is built to test.`,
    });
  }

  const medianLatency = median(signals.answered.map((decision) => decision.latency));
  if (signals.answered.length >= 4) {
    beats.push({
      at: signals.duration,
      tone: medianLatency < 25 ? "positive" : "neutral",
      body:
        medianLatency < 25
          ? `Your median time to decide was ${Math.round(medianLatency)} seconds, and the quality of those calls did not drop as they got faster. Speed did not cost you anything here.`
          : `Your median time to decide was ${Math.round(medianLatency)} seconds. That reads as deliberate rather than slow — but several items expired while you were thinking about others.`,
      title: "Across the shift — how you moved",
    });
  }

  const openAtClose = signals.world.orders.filter((order) =>
    ["queued", "picking", "packed", "dispatched"].includes(order.status),
  ).length;

  beats.push({
    at: signals.duration,
    tone: "neutral",
    title: "10:00 — what you handed over",
    body: `${openAtClose} orders still open, a rating of ${signals.world.rating.toFixed(2)}, and whatever you wrote down. The next supervisor inherits all of it, and what they inherit is part of the job.`,
  });

  return beats.sort((a, b) => a.at - b.at);
}
