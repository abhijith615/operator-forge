import { bandFor, BAND_RANGE } from "@/lib/challenge/scoring";
import { coreScoresOf } from "@/lib/challenge/day-six/skills";
import {
  DIMENSIONS,
  DIMENSION_LABEL,
  type Band,
  type ChallengeResult,
  type Dimension,
} from "@/lib/challenge/types";

/**
 * Day 6 · the Operator Profile.
 *
 * Five simulations produce five scorecards, and a scorecard is a verdict on
 * one morning. This reads all five at once.
 *
 * Written for two readers at the same time, which is the constraint that
 * shapes everything below. The operator wants to know what they are like; a
 * hiring manager wants to know whether to put them in front of a store. The
 * second reader is the harder one to serve, because "Team Management: 74"
 * tells them nothing they can act on. So every main skill carries two or
 * three lines of evidence: the spread behind the average, how it held up on
 * the day built around it, and a plain statement of what that score means
 * somebody can actually do.
 *
 * Five main skills, not ten. They are the five the simulations score against,
 * and inventing more by rearranging the same numbers would have made the page
 * look thorough rather than be it. Three further signals sit underneath as a
 * subset — they are real, they are cross-day, and they are not competencies.
 */

/* ── The five ─────────────────────────────────────────────────────────── */

/**
 * The day each competency was built to test.
 *
 * This is the most useful single fact on the page for somebody hiring. An
 * operator who averages well on inventory but drops on Day 2 — the morning
 * designed around inventory — is a different proposition from one who holds
 * it there, and no average shows that.
 */
const HOME_DAY: Record<Dimension, number> = {
  priority: 1,
  inventory: 2,
  team: 3,
  reasoning: 4,
  customer: 5,
};

export const DAY_TITLES: Record<number, string> = {
  1: "Run a Live Dark Store",
  2: "Investigate Inventory Losses",
  3: "Build and Lead Your Team",
  4: "Fix the Operational Bottleneck",
  5: "Protect the Customer Promise",
};

/**
 * What the score means for somebody deciding whether to hire.
 *
 * Deliberately written as a capability and its limit rather than as praise:
 * "can do X, will need Y" is the sentence a hiring manager is trying to
 * construct anyway, and the honest version of it is more useful than a
 * flattering one.
 */
const CAPABILITY: Record<Dimension, [string, string, string]> = {
  priority: [
    "Works through a board in the order it arrives. Would need the priority order set for them, and checking against the clock during a peak.",
    "Gets to the urgent thing first most of the time. Reliable on a normal shift; would benefit from a second pair of eyes when three things break together.",
    "Sorts a contested board without being told how. Can be left with a peak and a queue and trusted to choose what fails.",
  ],
  reasoning: [
    "Treats the symptom in front of them. Would need a supervisor to ask why before the same fault returns.",
    "Finds the cause when there is time to look. Sound on recurring problems; patches under pressure.",
    "Goes to the cause under time pressure and keeps finding it. Suited to a store with a recurring unexplained loss.",
  ],
  inventory: [
    "Reads stock as a shelf rather than a system. Would need the count discipline enforced rather than assumed.",
    "Trusts the system about as far as it deserves. Solid on routine counts; would miss a slow drift.",
    "Treats stock as a system with a trail behind it. Can be handed a variance investigation and left with it.",
  ],
  team: [
    "Carries the floor themselves. Would struggle to scale past the number of people they can personally watch.",
    "Delegates the clear work and keeps the awkward conversations. Would grow quickly with coaching on the latter.",
    "Puts people where they are worth most, including when it is unpopular. Ready to lead a shift, not just run one.",
  ],
  customer: [
    "Loses sight of the person waiting once the board is busy. Would need customer impact surfaced as a metric in front of them.",
    "Handles the customers who complain. Would miss the quiet breach that leaves without saying anything.",
    "Can name who is affected and it changes what they choose. Safe on escalations and on the ones that never escalate.",
  ],
};

export interface MainSkill {
  dimension: Dimension;
  name: string;
  /** Mean across the days played. Null before anything has been played. */
  score: number | null;
  /** Two or three lines of evidence, for a reader who was not there. */
  evidence: string[];
}

/* ── The subset ───────────────────────────────────────────────────────── */

export const SUB_SKILLS = ["discipline", "consistency", "improvement"] as const;
export type SubSkillId = (typeof SUB_SKILLS)[number];

export interface SubSkill {
  id: SubSkillId;
  name: string;
  score: number | null;
  /** One line. These support the five above; they do not compete with them. */
  line: string;
}

const SUB_NAME: Record<SubSkillId, string> = {
  discipline: "Procedural Discipline",
  consistency: "Consistency",
  improvement: "Improvement",
};

const SUB_LINES: Record<SubSkillId, [string, string, string]> = {
  discipline: [
    "Procedure went first when the clock tightened — the habit an audit finds.",
    "Held the line most of the time, and cut a corner when it was expensive.",
    "Kept to procedure under time pressure, including where nobody would check.",
  ],
  consistency: [
    "Swung widely between days. A store could not predict which operator it got.",
    "Steady, with one or two days well off their own standard.",
    "Performed inside a narrow band all week, whatever the day threw at them.",
  ],
  improvement: [
    "Finished the week running the same play they opened it with.",
    "Picked things up, mostly after the floor had told them twice.",
    "Measurably better on the last day than the first. Learns from the floor.",
  ],
};

/* ── Profile ──────────────────────────────────────────────────────────── */

export interface DayStanding {
  day: number;
  title: string;
  score: number;
  band: string;
  done: boolean;
}

export interface OperatorProfile {
  daysDone: number;
  overall: number | null;
  band: Band | null;
  bandRange: string | null;
  signature: { name: string; blurb: string };
  main: MainSkill[];
  subset: SubSkill[];
  days: DayStanding[];
  strongest: Dimension | null;
  growth: Dimension | null;
  decisionsTaken: number;
  sopViolations: number;
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const mean = (values: number[]) =>
  values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;

function tier(score: number): 0 | 1 | 2 {
  if (score < 55) return 0;
  if (score < 78) return 1;
  return 2;
}

/**
 * Every day's score for one of the five, keyed by day.
 *
 * Days 2 to 5 do not score against the five directly — each has its own skills
 * under its own names — so each is rolled up through `coreScoresOf` first.
 * Matching on the five names alone would have read Day 1 and silently skipped
 * the other four, while still printing "across 5 simulations".
 */
function byDay(results: ChallengeResult[], dimension: Dimension): Map<number, number> {
  const scores = new Map<number, number>();
  for (const result of results) {
    const rolled = coreScoresOf(result.competencies)[dimension];
    if (rolled !== null) scores.set(result.day, rolled);
  }
  return scores;
}

/**
 * The two or three lines under a main skill.
 *
 * Line one is the spread, because an average of 70 built from 68 and 72 is a
 * different person from one built from 48 and 92. Line two is the day the
 * competency was designed around, which is the only place it was properly
 * stressed. Line three is what it means for somebody deciding.
 */
function evidenceFor(
  dimension: Dimension,
  scores: Map<number, number>,
  average: number | null,
): string[] {
  if (average === null || scores.size === 0) {
    return ["No simulation has scored this yet."];
  }

  const entries = [...scores.entries()].sort((a, b) => a[1] - b[1]);
  const [lowDay, low] = entries[0]!;
  const [highDay, high] = entries[entries.length - 1]!;
  const lines: string[] = [];

  lines.push(
    scores.size === 1
      ? `Scored ${high} on the one simulation played so far. One run is a reading, not yet a pattern.`
      : low === high
        ? `Scored ${high} on every one of the ${scores.size} simulations that tested it — no variation at all.`
        : `Averaged ${Math.round(average)} across ${scores.size} simulations, from ${low} on Day ${lowDay} to ${high} on Day ${highDay}.`,
  );

  const home = HOME_DAY[dimension];
  const homeScore = scores.get(home);
  if (homeScore !== undefined) {
    const delta = homeScore - Math.round(average);
    const title = DAY_TITLES[home] ?? `Day ${home}`;
    lines.push(
      delta >= 6
        ? `On Day ${home} — ${title}, the simulation built to stress this — they scored ${homeScore}, ${delta} above their own average. It holds up where it is tested hardest.`
        : delta <= -6
          ? `On Day ${home} — ${title}, the simulation built to stress this — they scored ${homeScore}, ${Math.abs(delta)} below their own average. The average flatters it; this is the number to probe.`
          : `On Day ${home} — ${title}, the simulation built to stress this — they scored ${homeScore}, in line with their own average. It does not fall away under focused pressure.`,
    );
  }

  lines.push(CAPABILITY[dimension][tier(clamp(average))]);
  return lines;
}

/* ── The subset's three ───────────────────────────────────────────────── */

function disciplineScore(results: ChallengeResult[]): number | null {
  if (results.length === 0) return null;
  const breaches = results.reduce((sum, result) => sum + result.sopViolations.length, 0);
  return clamp(100 - (breaches / results.length) * 34);
}

function consistencyScore(scores: number[]): number | null {
  if (scores.length < 3) return null;
  const average = mean(scores)!;
  const deviation = Math.sqrt(
    scores.reduce((sum, score) => sum + (score - average) ** 2, 0) / scores.length,
  );
  // Fifteen points of swing is a different operator every day.
  return clamp(100 - (deviation / 15) * 100);
}

function improvementScore(scores: number[]): number | null {
  if (scores.length < 3) return null;
  const first = scores[0]!;
  const last = scores[scores.length - 1]!;
  // Fifty is flat; twenty points of movement either way saturates the scale.
  return clamp(50 + ((last - first) / 20) * 50);
}

/* ── Signature ────────────────────────────────────────────────────────── */

const ARCHETYPES: { pair: [Dimension, Dimension]; name: string; blurb: string }[] = [
  {
    pair: ["reasoning", "inventory"],
    name: "The Investigator",
    blurb: "Finds what caused it before spending anything on the symptom.",
  },
  {
    pair: ["priority", "reasoning"],
    name: "The Closer",
    blurb: "Works a contested board down and does not leave decisions sitting on it.",
  },
  {
    pair: ["team", "customer"],
    name: "The Floor Leader",
    blurb: "Runs the store through the people on it, and keeps the customer in the room.",
  },
  {
    pair: ["inventory", "priority"],
    name: "The Custodian",
    blurb: "Keeps the record true, which is the part nobody thanks anybody for.",
  },
  {
    pair: ["customer", "reasoning"],
    name: "The Promise Keeper",
    blurb: "Fixes the thing that produced the complaint, not just the complaint.",
  },
  {
    pair: ["team", "priority"],
    name: "The Shift Runner",
    blurb: "Puts the right people on the right stage before the peak, not during it.",
  },
  {
    pair: ["customer", "inventory"],
    name: "The Shelf Keeper",
    blurb: "Treats an empty bin as a person who is about to be let down.",
  },
  {
    pair: ["team", "reasoning"],
    name: "The Coach",
    blurb: "Fixes the method rather than the person, and the floor keeps the fix.",
  },
];

function signatureFor(main: MainSkill[]): { name: string; blurb: string } {
  const ranked = main
    .filter((skill) => skill.score !== null)
    .sort((a, b) => b.score! - a.score!)
    .map((skill) => skill.dimension);

  if (ranked.length < 2) {
    return {
      name: "Unwritten",
      blurb: "Play the week through and this becomes a profile rather than a placeholder.",
    };
  }

  const top = new Set(ranked.slice(0, 2));
  const match = ARCHETYPES.find((archetype) => archetype.pair.every((id) => top.has(id)));
  if (match) return { name: match.name, blurb: match.blurb };

  const best = ranked[0]!;
  return {
    name: `The ${DIMENSION_LABEL[best].split(" ")[0]} Operator`,
    blurb: `Across the week, ${DIMENSION_LABEL[best].toLowerCase()} is the thing they reached for first.`,
  };
}

/* ── Build ────────────────────────────────────────────────────────────── */

export interface ProfileInput {
  runs: { day: number; score: number; band: string }[];
  results: ChallengeResult[];
}

export function buildOperatorProfile({ runs, results }: ProfileInput): OperatorProfile {
  const played = [...runs].sort((a, b) => a.day - b.day);
  const ordered = [...results].sort((a, b) => a.day - b.day);
  const dayScores = played.map((run) => run.score);

  const main: MainSkill[] = DIMENSIONS.map((dimension) => {
    const scores = byDay(ordered, dimension);
    const average = mean([...scores.values()]);
    return {
      dimension,
      name: DIMENSION_LABEL[dimension],
      score: average === null ? null : clamp(average),
      evidence: evidenceFor(dimension, scores, average),
    };
  });

  const subset: SubSkill[] = [
    { id: "discipline" as const, score: disciplineScore(ordered) },
    { id: "consistency" as const, score: consistencyScore(dayScores) },
    { id: "improvement" as const, score: improvementScore(dayScores) },
  ].map(({ id, score }) => ({
    id,
    name: SUB_NAME[id],
    score,
    line:
      score === null
        ? "Needs at least three simulations before this says anything."
        : SUB_LINES[id][tier(score)],
  }));

  const overall = mean(dayScores);
  const ranked = main
    .filter((skill) => skill.score !== null)
    .sort((a, b) => b.score! - a.score!);

  return {
    daysDone: played.length,
    overall: overall === null ? null : Math.round(overall),
    band: overall === null ? null : bandFor(Math.round(overall)),
    bandRange: overall === null ? null : BAND_RANGE[bandFor(Math.round(overall))],
    signature: signatureFor(main),
    main,
    subset,
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
    strongest: ranked[0]?.dimension ?? null,
    growth: ranked[ranked.length - 1]?.dimension ?? null,
    decisionsTaken: ordered.reduce((sum, result) => sum + result.decisionCount, 0),
    sopViolations: ordered.reduce((sum, result) => sum + result.sopViolations.length, 0),
  };
}
