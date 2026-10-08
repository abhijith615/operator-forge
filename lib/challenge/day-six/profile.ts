import { bandFor, BAND_RANGE } from "@/lib/challenge/scoring";
import { DIMENSIONS, type Band, type ChallengeResult, type Dimension } from "@/lib/challenge/types";

/**
 * Day 6 · the Operator Profile.
 *
 * Five simulations produce five scorecards, and a scorecard is a verdict on
 * one morning. What an operator actually wants to know after a week is the
 * thing no single day can tell them: what they are consistently like. This
 * reads all five runs at once and says so.
 *
 * Ten skills, which is more than the five dimensions the days score against —
 * the other five are only visible across days. Whether somebody holds their
 * standard when the shift is unfamiliar, whether they got better as the week
 * went on, whether they are an all-rounder or a specialist: none of that is a
 * question a single run can answer, and all of it is in the five runs
 * together.
 *
 * Nothing here is invented. Every skill names the stored field it reads, and
 * the three that need several days to mean anything say so rather than
 * guessing from one.
 */

export const SKILLS = [
  "prioritisation",
  "root-cause",
  "inventory",
  "team",
  "customer",
  "discipline",
  "pace",
  "consistency",
  "improvement",
  "range",
] as const;

export type SkillId = (typeof SKILLS)[number];

export interface SkillReading {
  id: SkillId;
  name: string;
  /** 0–100, or null when the week did not produce enough to read it. */
  score: number | null;
  /** One line about this operator, not a definition of the skill. */
  line: string;
  /** Where the number came from, so nothing on the page is unexplained. */
  source: string;
}

export interface DayStanding {
  day: number;
  title: string;
  score: number;
  band: string;
  done: boolean;
}

export interface OperatorProfile {
  daysDone: number;
  /** Mean of the days played. Null before anything has been played. */
  overall: number | null;
  band: Band | null;
  bandRange: string | null;
  signature: { name: string; blurb: string };
  skills: SkillReading[];
  days: DayStanding[];
  /** The two highest and two lowest readings that could be scored. */
  strongest: SkillId[];
  growth: SkillId[];
  decisionsTaken: number;
  sopViolations: number;
}

export const DAY_TITLES: Record<number, string> = {
  1: "Run a Live Dark Store",
  2: "Investigate Inventory Losses",
  3: "Build and Lead Your Team",
  4: "Fix the Operational Bottleneck",
  5: "Protect the Customer Promise",
};

const SKILL_NAME: Record<SkillId, string> = {
  prioritisation: "Prioritisation",
  "root-cause": "Root-Cause Thinking",
  inventory: "Inventory Control",
  team: "Team Leadership",
  customer: "Customer Judgement",
  discipline: "Procedural Discipline",
  pace: "Decision Pace",
  consistency: "Consistency",
  improvement: "Improvement",
  range: "Range",
};

/** Low, mid and high. Written about the operator, never about the skill. */
const SKILL_LINES: Record<SkillId, [string, string, string]> = {
  prioritisation: [
    "You worked the board in the order it arrived rather than the order it mattered.",
    "You got to the urgent thing first most days, with some expensive exceptions.",
    "You let the right things fail. That is the hard half of running a floor.",
  ],
  "root-cause": [
    "You treated the symptom in front of you and moved on to the next one.",
    "You found the cause when there was time, and patched it when there was not.",
    "You went looking for why, under pressure, and kept finding it.",
  ],
  inventory: [
    "Stock was a shelf to you rather than a system with a trail behind it.",
    "You read the counts, and trusted them a little further than they deserved.",
    "You treated stock as a system — counts, causes and the drift between them.",
  ],
  team: [
    "You carried the floor yourself instead of using the people standing on it.",
    "You delegated the clear work and kept the awkward conversations.",
    "You put people where they were worth most, including when it was unpopular.",
  ],
  customer: [
    "The person waiting stopped being real once the board got busy.",
    "You handled the customers who complained, and not the ones who did not.",
    "You could name who was affected, and it changed what you chose.",
  ],
  discipline: [
    "Procedure went first when the clock tightened. That is the habit audits find.",
    "You held the line most of the time and cut a corner when it was expensive.",
    "You kept to procedure under time pressure, including when nobody would know.",
  ],
  pace: [
    "You sat on decisions. Much of the board resolved itself without you.",
    "You moved steadily, though the harder cards waited longer than they should.",
    "You worked through the board quickly without the quality dropping.",
  ],
  consistency: [
    "Your days swung widely. The floor could not predict which operator it got.",
    "You were steady with one or two days well off your own standard.",
    "You performed within a narrow band all week, whatever the day threw.",
  ],
  improvement: [
    "You finished the week running the same play you opened it with.",
    "You picked things up, mostly after the floor had told you twice.",
    "You were visibly better on Day 5 than on Day 1. That is the whole point.",
  ],
  range: [
    "One strong area carried the week and the rest were thin behind it.",
    "You are stronger in some parts of the job than others, by a clear margin.",
    "You scored evenly across all five kinds of problem. Rare, and worth keeping.",
  ],
};

const SKILL_SOURCE: Record<SkillId, string> = {
  prioritisation: "Mean of the time-and-priority score across the days you played.",
  "root-cause": "Mean of the critical-thinking score across the days you played.",
  inventory: "Mean of the inventory score across the days you played.",
  team: "Mean of the team-management score across the days you played.",
  customer: "Mean of the customer-judgement score across the days you played.",
  discipline: "SOP breaches recorded across the week, per day played.",
  pace: "Decisions taken per minute of simulation, across the week.",
  consistency: "How far your day scores sat from your own average.",
  improvement: "The trend from your first played day to your last.",
  range: "The spread between your strongest and weakest of the five dimensions.",
};

/* ── Helpers ──────────────────────────────────────────────────────────── */

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const mean = (values: number[]) =>
  values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;

/** The band a reading falls in, for picking which of the three lines to use. */
function tier(score: number): 0 | 1 | 2 {
  if (score < 55) return 0;
  if (score < 78) return 1;
  return 2;
}

function dimensionMean(results: ChallengeResult[], dimension: Dimension): number | null {
  const scores = results
    .flatMap((result) => result.competencies)
    .filter((competency) => competency.dimension === dimension)
    .map((competency) => competency.score);
  return mean(scores);
}

function reading(id: SkillId, score: number | null): SkillReading {
  return {
    id,
    name: SKILL_NAME[id],
    score: score === null ? null : clamp(score),
    line:
      score === null
        ? "Not enough of the week played yet to read this one."
        : SKILL_LINES[id][tier(clamp(score))],
    source: SKILL_SOURCE[id],
  };
}

/* ── The five that only exist across days ─────────────────────────────── */

/** Fewer breaches is better. Three a day is a floor nobody should be running. */
function disciplineScore(results: ChallengeResult[]): number | null {
  if (results.length === 0) return null;
  const breaches = results.reduce((sum, result) => sum + result.sopViolations.length, 0);
  return clamp(100 - (breaches / results.length) * 34);
}

/**
 * Decisions per minute of simulation. Two a minute is a well-worked board;
 * half of one is somebody watching the clock run out.
 */
function paceScore(results: ChallengeResult[]): number | null {
  const minutes = results.reduce((sum, result) => sum + result.durationMs / 60_000, 0);
  if (minutes <= 0) return null;
  const decisions = results.reduce((sum, result) => sum + result.decisionCount, 0);
  return clamp((decisions / minutes / 2) * 100);
}

/** Spread around the operator's own average, not around anybody else's. */
function consistencyScore(scores: number[]): number | null {
  if (scores.length < 3) return null;
  const average = mean(scores)!;
  const deviation = Math.sqrt(
    scores.reduce((sum, score) => sum + (score - average) ** 2, 0) / scores.length,
  );
  // Fifteen points of swing is a different operator every day.
  return clamp(100 - (deviation / 15) * 100);
}

/** First played day against last. Needs three to be a trend rather than noise. */
function improvementScore(scores: number[]): number | null {
  if (scores.length < 3) return null;
  const first = scores[0]!;
  const last = scores[scores.length - 1]!;
  // Fifty is flat; twenty points of movement either way saturates the scale.
  return clamp(50 + ((last - first) / 20) * 50);
}

/** How even the five dimensions are. An all-rounder scores high here. */
function rangeScore(dimensionScores: (number | null)[]): number | null {
  const present = dimensionScores.filter((score): score is number => score !== null);
  if (present.length < 3) return null;
  const spread = Math.max(...present) - Math.min(...present);
  return clamp(100 - (spread / 40) * 100);
}

/* ── Signature ────────────────────────────────────────────────────────── */

interface Archetype {
  pair: [SkillId, SkillId];
  name: string;
  blurb: string;
}

const ARCHETYPES: Archetype[] = [
  {
    pair: ["root-cause", "inventory"],
    name: "The Investigator",
    blurb: "You go and find what caused it before you spend anything on the symptom.",
  },
  {
    pair: ["prioritisation", "pace"],
    name: "The Closer",
    blurb: "You work the board down and you do not leave decisions sitting on it.",
  },
  {
    pair: ["customer", "team"],
    name: "The Floor Leader",
    blurb: "You run the store through the people on it, and you keep the customer in the room.",
  },
  {
    pair: ["discipline", "inventory"],
    name: "The Custodian",
    blurb: "You keep the record true, which is the part nobody thanks anybody for.",
  },
  {
    pair: ["consistency", "discipline"],
    name: "The Steady Hand",
    blurb: "The floor knows what it is getting from you on any given morning.",
  },
  {
    pair: ["improvement", "root-cause"],
    name: "The Fast Study",
    blurb: "You do not need telling twice, and you change the method rather than the effort.",
  },
  {
    pair: ["range", "prioritisation"],
    name: "The All-Rounder",
    blurb: "There is no part of this job you have to route around.",
  },
  {
    pair: ["customer", "root-cause"],
    name: "The Promise Keeper",
    blurb: "You fix the thing that produced the complaint, not just the complaint.",
  },
];

function signatureFor(skills: SkillReading[]): { name: string; blurb: string } {
  const ranked = skills
    .filter((skill) => skill.score !== null)
    .sort((a, b) => b.score! - a.score!)
    .map((skill) => skill.id);

  if (ranked.length < 2) {
    return {
      name: "Unwritten",
      blurb: "Play the week through and this becomes a profile rather than a placeholder.",
    };
  }

  const top = new Set(ranked.slice(0, 3));
  const match = ARCHETYPES.find((archetype) => archetype.pair.every((id) => top.has(id)));
  if (match) return { name: match.name, blurb: match.blurb };

  // No pair matched: name it after the single strongest reading instead of
  // forcing the operator into an archetype they did not earn.
  const best = ranked[0]!;
  return {
    name: `The ${SKILL_NAME[best]} Operator`,
    blurb: `Across five days, ${SKILL_NAME[best].toLowerCase()} is the thing you reached for first.`,
  };
}

/* ── The profile ──────────────────────────────────────────────────────── */

export interface ProfileInput {
  /** Every stored run, any subset of days 1–5, in any order. */
  runs: { day: number; score: number; band: string }[];
  /** The full scorecards, for the days that have one. */
  results: ChallengeResult[];
}

export function buildOperatorProfile({ runs, results }: ProfileInput): OperatorProfile {
  const played = [...runs].sort((a, b) => a.day - b.day);
  const ordered = [...results].sort((a, b) => a.day - b.day);
  const dayScores = played.map((run) => run.score);

  const dimensionScores = DIMENSIONS.map((dimension) => dimensionMean(ordered, dimension));
  const [priority, reasoning, inventory, team, customer] = dimensionScores;

  const skills: SkillReading[] = [
    reading("prioritisation", priority ?? null),
    reading("root-cause", reasoning ?? null),
    reading("inventory", inventory ?? null),
    reading("team", team ?? null),
    reading("customer", customer ?? null),
    reading("discipline", disciplineScore(ordered)),
    reading("pace", paceScore(ordered)),
    reading("consistency", consistencyScore(dayScores)),
    reading("improvement", improvementScore(dayScores)),
    reading("range", rangeScore(dimensionScores)),
  ];

  const overall = mean(dayScores);
  const scored = skills.filter((skill) => skill.score !== null);
  const ranked = [...scored].sort((a, b) => b.score! - a.score!);

  return {
    daysDone: played.length,
    overall: overall === null ? null : Math.round(overall),
    band: overall === null ? null : bandFor(Math.round(overall)),
    bandRange: overall === null ? null : BAND_RANGE[bandFor(Math.round(overall))],
    signature: signatureFor(skills),
    skills,
    days: [1, 2, 3, 4, 5].map((day) => {
      const run = played.find((entry) => entry.day === day);
      return {
        day,
        title: DAY_TITLES[day] ?? `Day ${day}`,
        score: run?.score ?? 0,
        band: run?.band ?? "",
        done: Boolean(run),
      };
    }),
    strongest: ranked.slice(0, 2).map((skill) => skill.id),
    growth: ranked.slice(-2).reverse().map((skill) => skill.id),
    decisionsTaken: ordered.reduce((sum, result) => sum + result.decisionCount, 0),
    sopViolations: ordered.reduce((sum, result) => sum + result.sopViolations.length, 0),
  };
}
