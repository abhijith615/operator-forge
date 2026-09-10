import { bandFor, decisionSignature, scoreCompetencies, scoreOverall } from "./scoring";
import type {
  ChallengeResult,
  CompetencyScore,
  DecisionTag,
  Dimension,
  FeedbackItem,
  SimulationState,
} from "./types";

/**
 * Feedback generation. Deterministic — the same decisions always produce the
 * same sentences, and every sentence is gated on a tag the run actually
 * earned. Nothing here writes generically about "your performance"; if a line
 * appears, the operator did the thing it describes.
 */

interface TaggedLine {
  tag: DecisionTag;
  title: string;
  body: string;
}

const STRENGTHS: TaggedLine[] = [
  {
    tag: "replenished_pickface",
    title: "You fixed the cause, not the order",
    body: "You did not treat the milk Nil Pick as a stockout. You checked alternate locations, found 16 units on the replenishment pallet, and put them on the pick face — so every later milk order picked first time instead of raising the same alert.",
  },
  {
    tag: "investigated_nil_pick",
    title: "You checked before you accepted",
    body: "An empty shelf did not end the enquiry. You looked at other places the stock could be before letting anyone confirm an Item Not Found.",
  },
  {
    tag: "anticipated_bottleneck",
    title: "You moved on packing before it broke",
    body: "You read the relationship between picking output and packing capacity and moved a cross-trained picker across while the queue was still amber. That is the difference between managing flow and reacting to it.",
  },
  {
    tag: "maintained_food_segregation",
    title: "You kept the chemical out of the food bag",
    body: "Click-to-dispatch was climbing and you still split the order properly. Floor cleaner does not travel with bread, eggs and curd, whatever the clock says.",
  },
  {
    tag: "maintained_dispatch_verification",
    title: "You did not trade verification for seconds",
    body: "A rider under pressure asked you to skip the scan. You held the check — and, importantly, found him something else that was already verified rather than freezing the bay.",
  },
  {
    tag: "delegated_effectively",
    title: "You used the people around you",
    body: "You pushed the Nil Pick escalations to the Floor Lead instead of absorbing them yourself. A manager who does the searching is a manager who has stopped managing.",
  },
  {
    tag: "solved_true_bottleneck",
    title: "You went at the slowest stage first",
    body: "Under peak alert you reinforced packing rather than pushing harder on picking. Fulfillment speed is set by the slowest active stage, not the fastest one.",
  },
  {
    tag: "protected_cold_chain",
    title: "You handled the chilled item as chilled",
    body: "Curd went out with temperature protection rather than in with ambient goods.",
  },
  {
    tag: "protected_fragile_goods",
    title: "You protected the eggs",
    body: "Twelve eggs in a breakfast bag with bread and a bottle. You packed for the journey, not just for the count.",
  },
  {
    tag: "balanced_floor",
    title: "You set the floor for the peak, not for the average",
    body: "You reinforced packing before breakfast volume arrived, with one person already absent. That decision paid out for the rest of the shift.",
  },
];

const GAPS: TaggedLine[] = [
  {
    tag: "cancelled_without_investigation",
    title: "You confirmed a Nil Pick with stock in the building",
    body: "Sixteen units were on the replenishment pallet. The customer lost their milk, the order shrank, and the pick face is still empty for the next one. An empty shelf is a question, not an answer.",
  },
  {
    tag: "broke_food_segregation",
    title: "Food and household chemical shared a bag",
    body: "QC caught it and the order was repacked, which cost 28 seconds — far more than splitting the bag would have. Had it left the store, it would have cost a customer.",
  },
  {
    tag: "bypassed_dispatch_verification",
    title: "A parcel left without being verified",
    body: "It saved a handful of seconds at the bay. What it removed was the only record that the right bag went to the right rider for the right order — the check that makes every downstream number trustworthy.",
  },
  {
    tag: "skipped_scan_discipline",
    title: "You suspended scanning to buy speed",
    body: "Scans are what keep system stock and shelf stock in agreement. Turning them off during a peak is how a store ends up with the Day 2 problem: inventory the system insists exists.",
  },
  {
    tag: "reacted_late",
    title: "You moved after the queue was already visible",
    body: "The packing queue was climbing while picking output was still rising. An experienced operator watches the gap between those two rates and moves before click-to-dispatch turns.",
  },
  {
    tag: "abandoned_packing",
    title: "You set the floor without protecting packing",
    body: "Picking fills the queue and packing empties it. With packing short, more picking only makes the backlog grow faster.",
  },
  {
    tag: "froze_the_line",
    title: "You stopped the line to clear a stage",
    body: "Pausing picking does clear packing. It also stops everything entering the pipeline, so orders waiting climbs while you wait — you traded one queue for a bigger one.",
  },
  {
    tag: "manager_overinvolved",
    title: "You went to the shelves yourself",
    body: "You were the only person who could see the whole floor, and for those minutes you were looking at one bin. Delegating the search would have cost you nothing and kept you in command.",
  },
  {
    tag: "took_single_unit",
    title: "You served this order and left the cause in place",
    body: "One unit closed #4857. The other fifteen stayed on the pallet and the pick face was empty again immediately, so the next milk order raised the same alert.",
  },
  {
    tag: "left_dispatch_bare",
    title: "Dispatch was left unstaffed",
    body: "Orders that are picked and packed still have to be handed over. With nobody on dispatch, riders queued and finished orders sat in the bay.",
  },
  {
    tag: "stalled_dispatch",
    title: "You held the whole bay for one parcel",
    body: "Protecting verification was right. Freezing every handover behind a single scanner fault was not — other riders were holding verified orders they could have taken.",
  },
];

/** Ordered by dimension, chosen for whichever scored lowest. */
const REPLAY_BY_DIMENSION: Record<Dimension, string[]> = {
  priority: [
    "Watch the gap between two stages, not one metric. Packing filling faster than it empties is visible long before click-to-dispatch moves.",
    "Decide what you are willing to let go of before the peak, not during it.",
  ],
  reasoning: [
    "Ask what the number is a symptom of before you act on the number itself.",
    "When a metric surprises you, check the stage upstream of it first.",
  ],
  inventory: [
    "Investigate Nil Picks before accepting an out-of-stock. Overstock, replenishment and drop locations are all still your inventory.",
    "Fix the pick face, not just the order — replenishing prevents every repeat of the same alert.",
  ],
  team: [
    "Delegate the search. Your value on a peak is seeing the whole floor, not finding one item.",
    "Use cross-trained staff deliberately — knowing who can move is half of managing capacity.",
  ],
  customer: [
    "Protect verification and segregation even when the clock is against you. Those checks are the customer's only representation on the floor.",
    "Ask who is waiting behind each number before you optimise it.",
  ],
};

const LEARNED: FeedbackItem[] = [
  {
    title: "Bottlenecks move",
    body: "Fulfillment speed is set by the slowest active stage, not the fastest one. Reinforcing picking when packing is the constraint makes the backlog grow faster.",
  },
  {
    title: "An empty shelf is not an empty store",
    body: "Stock sits in overstock, on replenishment pallets and in drop locations. Investigating alternate locations before confirming an Item Not Found is the difference between a lost sale and a served one.",
  },
  {
    title: "Speed without process control creates hidden failures",
    body: "Skipping scans or waving through a handover saves seconds now and costs inventory accuracy, mismatched parcels and customer trust later — in numbers nobody traces back to this shift.",
  },
];

function pick(lines: TaggedLine[], tags: Set<DecisionTag>, limit: number): FeedbackItem[] {
  return lines
    .filter((line) => tags.has(line.tag))
    .slice(0, limit)
    .map(({ title, body }) => ({ title, body }));
}

export function buildResult(state: SimulationState): ChallengeResult {
  const competencies = scoreCompetencies(state);
  const score = scoreOverall(competencies, state);
  const tags = new Set(state.tags);

  const strengths = pick(STRENGTHS, tags, 3);
  const gaps = pick(GAPS, tags, 3);

  // Replay advice is aimed at the two weakest dimensions, plus one line that
  // always applies to whatever they actually broke.
  const weakest = [...competencies]
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map((entry) => entry.dimension);

  const replay: string[] = [];
  for (const dimension of weakest) {
    const line = REPLAY_BY_DIMENSION[dimension][0];
    if (line && !replay.includes(line)) replay.push(line);
  }
  if (state.sopViolations.length > 0) {
    replay.push(
      "Treat verification and segregation as fixed costs of the job. They are the two things a peak will always tempt you to spend.",
    );
  }
  while (replay.length < 3) {
    const filler = REPLAY_BY_DIMENSION[weakest[0] ?? "priority"][1];
    if (!filler || replay.includes(filler)) break;
    replay.push(filler);
  }
  while (replay.length < 3) {
    const extra = REPLAY_BY_DIMENSION.reasoning[1];
    if (!extra || replay.includes(extra)) break;
    replay.push(extra);
  }

  return {
    score,
    band: bandFor(score),
    competencies,
    signature: decisionSignature(state, competencies),
    strengths: strengths.length > 0 ? strengths : fallbackStrength(competencies),
    gaps,
    replay: replay.slice(0, 3),
    learned: LEARNED,
    sopViolations: state.sopViolations,
    decisionCount: state.decisions.length,
    finalMetrics: state.metrics,
    durationMs: (state.completedAt ?? Date.now()) - state.startedAt,
  };
}

/** A run can end with no strength tags. Say something true rather than warm. */
function fallbackStrength(competencies: CompetencyScore[]): FeedbackItem[] {
  const best = [...competencies].sort((a, b) => b.score - a.score)[0];
  return [
    {
      title: "You finished the shift",
      body: best
        ? `Every order was handled and the store was still running at handover. Your steadiest dimension was ${best.label.toLowerCase()} — that is the thread to pull on tomorrow.`
        : "Every order was handled and the store was still running at handover.",
    },
  ];
}
