import { DECISIONS, type AssessmentResult } from "./scoring";
import type { EvidenceEvent } from "./types";
import { COMPETENCIES, assessmentWeights, type CompetencyId } from "./weights";

/**
 * The two-page candidate brief an employer can download and keep.
 *
 * The full profile speaks the simulation's language — the people in it, the
 * scenes, the times on the store clock — which means nothing to somebody who
 * has never sat it. This says the same things in the terms a dark store
 * manager already uses: picking, putaway, riders, stock counts, a late order.
 * No name of anybody in the simulation, no scene, no clock time: only what
 * the candidate did, said the way it would be said about a real shift.
 *
 * It leans on what to do next. A score tells an employer whether to interview;
 * the weaknesses and the questions tell them what to spend the interview on.
 *
 * Every sentence below is fixed text chosen by the score, so the brief can
 * never say anything the scoring did not find.
 */

interface Plain {
  /** Short name for the skill, in everyday words. */
  area: string;
  /** Said when the candidate did this well (3 of 3). */
  strength: string;
  /** Said when they did it badly (0 or 1 of 3). */
  weakness: string;
  /** Said when they did it partly (2 of 3). Falls back to `weakness`. */
  partial?: string;
  ask: string;
  listen: string;
  careful: string;
}

export const PLAIN: Readonly<Record<string, Plain>> = {
  T1: {
    area: "Planning staff before the rush",
    strength: "Before the busy period, placed people so that picking, stock putaway and riders were all covered.",
    weakness: "Went into the busy period with one area short of people — picking, putaway or riders.",
    partial: "Covered most areas before the busy period, but left one of them a little short.",
    ask: "Before a morning or evening rush, how do you decide how many people go to picking, putaway and dispatch? What do you check first?",
    listen: "Checks the demand forecast, rider attendance and stock waiting to be put away — before the rush, not after.",
    careful: "Talks only about picking, or waits for orders to pile up before moving people.",
  },
  T2: {
    area: "Putting people on the right work",
    strength: "Put each person on work they are trained for.",
    weakness: "Left several people on work they are not trained for, which slowed them down.",
    partial: "Left one person on work they are not trained for.",
    ask: "How do you decide who does picking, who does putaway and who does stock audits on a shift?",
    listen: "Knows each person's skills and training, and uses them.",
    careful: "Moves people only to fill numbers, without thinking about skill.",
  },
  T3: {
    area: "Covering staff absences",
    strength: "When staff did not turn up, arranged cover early — extra hours or agency staff — before the rush.",
    weakness: "When staff did not turn up, went into the rush short-handed.",
    partial: "Arranged some cover for missing staff, but not enough for the busiest time.",
    ask: "Two people do not come in and the rush starts in 30 minutes. What do you do, and in what order?",
    listen: "Acts early: overtime from willing staff, agency help, moving people around — and thinks about the cost.",
    careful: "Plans to \"manage somehow\", or waits to see how bad it gets.",
  },
  T4: {
    area: "Keeping some flexibility",
    strength: "Kept a few staff who could switch to picking if orders grew more than expected, without leaving their own work short.",
    weakness: "Kept no flexibility: when orders grew, nobody could be moved without hurting another area.",
    partial: "Kept only one person who could be moved if orders grew more than expected.",
    ask: "How do you keep some flexibility in your team for when orders suddenly jump?",
    listen: "Keeps cross-trained people on work that can pause, like audits, ready to help picking.",
    careful: "Has everyone fully busy all the time, with no backup plan.",
  },
  T5: {
    area: "Understanding a slow worker",
    strength: "When a new worker was called slow, checked their record first and found the real cause — they had been given work they were not trained for yet.",
    weakness: "Judged a slow new worker without checking the facts first.",
    partial: "Supported a slow new worker, but without first checking why they were slow.",
    ask: "A supervisor says a new picker is too slow and should be removed. What do you do before deciding?",
    listen: "Looks at the numbers, the training stage and where the time is going before deciding anything.",
    careful: "Removes, warns or pushes targets without checking why.",
  },
  T6: {
    area: "Supporting new staff",
    strength: "Supported a new worker — right work, and a plan for training — instead of removing or warning them.",
    weakness: "Pressured, warned or removed a new worker instead of training them.",
    partial: "Protected a new worker for the shift, but did not plan the next step of their training.",
    ask: "Tell me about a new team member who was struggling. What did you do, and what happened?",
    listen: "Training, pairing with an experienced person, the right first tasks, and following up.",
    careful: "Warnings, full targets on day one, or sending people back to the agency quickly.",
  },
  T7: {
    area: "Handling staff complaints",
    strength: "Took a worker's complaint away from the floor and calmed it down.",
    weakness: "Answered a worker's complaint with pressure or orders.",
    partial: "Handled a worker's complaint fairly, but in front of the rest of the team.",
    ask: "A senior worker complains loudly on the floor about late incentive pay, in the middle of the rush. What do you do?",
    listen: "Takes it aside, listens, and deals with it calmly.",
    careful: "Orders, threatens, or argues in front of the team.",
  },
  T8: {
    area: "Being honest with staff",
    strength: "Checked the facts before answering a worker, and said only what was true.",
    weakness: "Answered a worker without checking the facts, brushed them off, or made a promise outside their control.",
    partial: "Answered a worker honestly, but without checking the facts first.",
    ask: "Have you ever promised your team something that was not in your control? What happened next?",
    listen: "Says \"let me check and come back to you\", and promises only what they can deliver.",
    careful: "Guarantees payments, or blames other departments.",
  },
  T9: {
    area: "Delegating",
    strength: "Gave tasks to the right people — those trained for them and free to do them.",
    weakness: "Handed over little work, or gave tasks to people who were not suited to them.",
    partial: "Handed over some work well, but kept other tasks the team could have done.",
    ask: "During a busy shift, how do you decide which tasks to give to whom?",
    listen: "Chooses the person by skill and availability, then checks back.",
    careful: "Gives work to whoever is nearest, or keeps it all to themselves.",
  },
  T10: {
    area: "Doing everything themselves",
    strength: "Let the team do the hands-on work and stayed free to manage the floor.",
    weakness: "Did many hands-on tasks personally — searching for stock, packing, counting — while trained staff were free. The shift depended on them.",
    partial: "Did a few hands-on tasks personally that trained staff could have done.",
    ask: "When the store is under pressure, what do you personally stop doing? Give me a real example.",
    listen: "Hands work to the team and keeps themselves free to watch the whole floor.",
    careful: "Is proud of doing everything personally: \"it is faster if I do it\".",
  },
  I1: {
    area: "Checking stock alerts",
    strength: "When the system showed a stock gap on an expensive item, had it physically counted straight away.",
    weakness: "Ignored or put off a stock gap on an expensive item.",
    ask: "The system shows 12 units of an expensive item, but a picker says there are fewer. What do you do first?",
    listen: "A physical count first, then the records.",
    careful: "Adjusts the system, or blames somebody, without counting.",
  },
  I2: {
    area: "Counting before concluding",
    strength: "Counted the stock first, before deciding what had happened.",
    weakness: "Never found out the real count before deciding what had happened.",
    partial: "Went to the records before counting — got there, but in the wrong order.",
    ask: "Walk me through how you investigate missing stock, step by step.",
    listen: "Physical count, then records, then movement history.",
    careful: "Starts with guesses about who took it.",
  },
  I3: {
    area: "Using stock records",
    strength: "Used order, scan and stock-movement records to explain where missing units went.",
    weakness: "Did not use the records to trace the missing units.",
    partial: "Used the records, but traced only part of the missing stock.",
    ask: "Which reports or logs do you check when expensive stock goes missing?",
    listen: "Order history, scan logs, cancellations and returns, and the damaged or returns area.",
    careful: "Knows only to \"recount\" or \"check CCTV\".",
  },
  I4: {
    area: "Explaining stock gaps clearly",
    strength: "Clearly separated stock that was explained, stock that was found, and stock still missing.",
    weakness: "Mixed up explained, found and missing stock when closing a stock gap.",
    partial: "Explained part of a stock gap correctly, but grouped the rest together.",
    ask: "When you close a stock gap, how do you report it to your manager?",
    listen: "Separates \"found\", \"explained by records\" and \"still missing\", with an action for each.",
    careful: "Writes everything off as one loss figure.",
  },
  I5: {
    area: "Handling possible loss",
    strength: "Secured expensive stock and escalated properly — without blaming anyone and without stopping the store.",
    weakness: "Blamed a person without proof, wrote stock off too quickly, or stopped orders to search.",
    partial: "Took some control steps for missing expensive stock, but not all of them.",
    ask: "One expensive unit is missing and you have no proof of who took it. What do you do — and what do you not do?",
    listen: "Keeps the CCTV and logs, limits access, escalates to loss prevention, keeps the store running.",
    careful: "Accuses a worker, or writes it off without investigating.",
  },
  I8: {
    area: "Fixing the cause of loss",
    strength: "Fixed the process gaps that caused the loss — for example, scanning every expensive item and clearing returns quickly.",
    weakness: "Did not fix the process that caused the stock loss, so it can happen again.",
    partial: "Fixed one cause of the loss, but relied on a reminder to the team for the other.",
    ask: "After you find out how stock went missing, how do you stop it happening again next week?",
    listen: "Names a specific process change and checks it is followed.",
    careful: "Only \"reminds the team\".",
  },
  I6: {
    area: "Item not found",
    strength: "When an item showed in stock but was not in its place, searched and found it waiting to be put away — instead of cancelling it.",
    weakness: "Marked an item as unavailable without searching, while the stock was in the store.",
    partial: "Searched for a missing item, but still cancelled it from the order.",
    ask: "A picker reports \"item not found\" but the system shows stock. What happens in the next two minutes?",
    listen: "Checks backstock, the receiving and putaway area, and nearby bins before cancelling.",
    careful: "Approves \"item not found\" straight away.",
  },
  I7: {
    area: "Using trained staff for counts",
    strength: "Gave the stock count to the person trained and cleared to do it.",
    weakness: "Did the count personally, or gave it to someone not trained for it.",
    partial: "Gave the count to someone trained for counts, but not cleared for expensive stock.",
    ask: "Who in your store is allowed to count expensive stock, and why?",
    listen: "Uses trained, authorised staff, and keeps themselves free.",
    careful: "Counts everything personally.",
  },
  P1: {
    area: "Seeing problems coming",
    strength: "Strengthened the weak area before the rush hit, not after.",
    weakness: "Reacted only after the problem was already causing delays.",
    partial: "Acted once the pressure was visible, rather than before.",
    ask: "Tell me about a time you saw a problem coming before the numbers showed it. What did you notice?",
    listen: "Uses forecasts and early signs, and acts before queues build.",
    careful: "Acts only when customers start complaining.",
  },
  P2: {
    area: "Protecting delivery time",
    strength: "Kept orders moving within the delivery-time target.",
    weakness: "Let delivery times go past the target before acting.",
    partial: "Acted early enough to limit delays, but delivery times still went over target for a while.",
    ask: "Your order-to-dispatch time is creeping up. What do you look at, and what do you change first?",
    listen: "Finds where orders are waiting — picking, stock in bins or riders — and fixes that point.",
    careful: "General answers like \"push the team harder\".",
  },
  P3: {
    area: "Several problems at once",
    strength: "When several problems came together, dealt with the ones costing the most orders first.",
    weakness: "When several problems came together, left the most costly one for later.",
    partial: "Dealt with the biggest problem, but left another costly one waiting.",
    ask: "Three things go wrong at once and you can only be in one place. How do you decide?",
    listen: "Ranks by impact on customers and orders, and hands the others to the right people.",
    careful: "Does whichever is closest or loudest.",
  },
  P6: {
    area: "Using their own time well",
    strength: "Kept their own time for decisions only a manager can make.",
    weakness: "Spent their own time on hands-on work during the rush instead of managing.",
    partial: "Spent some of their own time on hands-on work during the rush.",
    ask: "Describe the last time you ended up doing floor work yourself during a rush. Looking back, should you have?",
    listen: "Knows when to step in and when to step back.",
    careful: "Regularly works a station during busy periods.",
  },
  P4: {
    area: "Urgent versus important",
    strength: "During the rush, did only what could not wait and kept the rest for later.",
    weakness: "Spent rush time on work that could have waited, like full stock audits or training.",
    partial: "Mostly kept the rush for urgent work, but scheduled one task that could have waited.",
    ask: "Give me an example of something important you deliberately left until after a busy period.",
    listen: "A clear sense of what can wait (audits, training) and what cannot (late orders, safety).",
    careful: "Tries to do everything at once.",
  },
  P5: {
    area: "Postponing safely",
    strength: "Postponed only tasks that were safe to postpone.",
    weakness: "Postponed urgent work that got worse while it waited.",
    partial: "Postponed nothing, which overloaded the busy period.",
    ask: "Tell me about something you postponed that you should not have. What did it cost?",
    listen: "Checks whether a task gets worse if it waits.",
    careful: "Cannot name a mistake, or postpones customer problems.",
  },
  C1: {
    area: "Checking before believing",
    strength: "When a supervisor said what the problem was, checked the numbers before agreeing.",
    weakness: "Acted on a supervisor's opinion without checking the numbers.",
    partial: "Checked some numbers, but not the area that was actually stuck.",
    ask: "Your floor lead tells you what the problem is. When do you take their word, and when do you check?",
    listen: "Respects the team, but checks with data.",
    careful: "Always goes with the loudest person.",
  },
  C2: {
    area: "Fixing the real bottleneck",
    strength: "Fixed the real cause of the delay, not just the symptom.",
    weakness: "Changed things that did not fix the real problem, or made it worse.",
    partial: "Fixed the real problem, but one of the changes also made something worse.",
    ask: "Orders are backing up. How do you work out which step is really holding things up?",
    listen: "Looks at each step — picking, stock in bins, riders — and finds the slowest.",
    careful: "Adds more pickers whatever the problem is.",
  },
  C3: {
    area: "Naming the real problem",
    strength: "Correctly said where the store was stuck.",
    weakness: "Named the wrong cause for the delay.",
    partial: "Named a weak area when the store was actually keeping up.",
    ask: "Tell me about a time your first idea about a problem turned out to be wrong. How did you find out?",
    listen: "Admits it, and describes how they checked.",
    careful: "Is never wrong, and has no way of checking.",
  },
  C4: {
    area: "Testing a change",
    strength: "Made one clear change and watched what it did.",
    weakness: "Made changes without watching the result.",
    partial: "Changed several things at once, so it was hard to tell what worked.",
    ask: "When you try a new way of working on the floor, how do you know whether it helped?",
    listen: "Changes one thing at a time and watches the numbers.",
    careful: "Changes many things at once.",
  },
  C5: {
    area: "Checking results",
    strength: "Went back and checked whether the change had worked.",
    weakness: "Made a change and moved on without checking whether it worked.",
    ask: "After you change something on the floor, how do you find out whether it worked?",
    listen: "Looks at the numbers again a few minutes later, and adjusts.",
    careful: "Assumes it worked.",
  },
  C6: {
    area: "Deciding with enough information",
    strength: "Looked at enough information to decide, then decided.",
    weakness: "Decided without looking at any information, or spent too long checking everything.",
    partial: "Checked more than needed before deciding, which slowed things down.",
    ask: "How do you know when you have enough information to act? Tell me about a time you waited too long.",
    listen: "Gets the key facts quickly, then acts.",
    careful: "Needs every detail first, or never checks at all.",
  },
  U1: {
    area: "Food safety",
    strength: "Separated a cleaning product from fresh food before the order left, even though it cost a few seconds.",
    weakness: "Let a cleaning product go out in the same bag as fresh food to save time.",
    partial: "Partly protected the food with an inner bag, but kept the cleaning product in the same bag.",
    ask: "An order is about to miss its time target and the bag is packed wrongly. What do you do?",
    listen: "Safety first — repacks even if it costs time.",
    careful: "Sends it as it is to meet the target.",
  },
  U2: {
    area: "Complete orders",
    strength: "Spent a few extra minutes so the customer got the full order.",
    weakness: "Sent an order short to save time while the stock was in the store.",
    partial: "Tried to find the item, but still sent the order short.",
    ask: "When is it right to send an order a little late to get it complete?",
    listen: "Weighs a few minutes against a missing item, and finds the stock first.",
    careful: "Always puts speed first.",
  },
  U3: {
    area: "Numbers versus customers",
    strength: "Never made customers wait just to protect the store's own numbers.",
    weakness: "Held back or slowed customer orders to make the store's numbers look better.",
    ask: "Tell me about a time a target and a customer's interest pulled in different directions. Which won?",
    listen: "Puts the customer first, and explains the trade-off.",
    careful: "Slows or pauses orders to hit a target.",
  },
  U4: {
    area: "Late order recovery",
    strength: "Told a customer about a delay early, and made sure the order reached them.",
    weakness: "Did not tell a customer about a delay, or gave a voucher or cancelled instead of fixing it.",
    ask: "An order is going to be late and the customer does not know yet. What do you do?",
    listen: "Tells the customer early with a real time, and gets the order moving.",
    careful: "Gives vouchers without telling the customer, or cancels.",
  },
};

export const SKILL_AREAS: Record<CompetencyId, { name: string; about: string }> = {
  teamManagement: { name: "Leading the team", about: "Planning staff, matching people to work, staff issues, delegating." },
  inventoryManagement: { name: "Stock control", about: "Checking stock gaps, finding missing stock, preventing loss." },
  timePrioritisation: { name: "Priorities under pressure", about: "Preparing for the rush, handling several problems at once." },
  criticalThinking: { name: "Problem solving", about: "Finding the real cause of delays, checking that fixes work." },
  customerFirst: { name: "Customer and safety", about: "Food safety, complete orders, keeping customers informed." },
};

export const FLAG_TEXT: Readonly<Record<string, string>> = {
  segregation: "Sent a cleaning product in the same bag as fresh food.",
  writeoff: "Wrote off an expensive item without checking what had happened to it.",
  accusation: "Named a staff member as responsible for missing stock, without proof.",
  nilpick: "Marked an item as unavailable without searching, while the stock was in the store.",
  uncovered: "Left an area of the store with nobody working on it.",
  disposition: "Left missing expensive stock unsecured through the busy period.",
  perishables: "Let fresh products go on sale without the morning date and quality check.",
};

const RECOMMENDATION: Record<string, { label: string; text: string }> = {
  STRONG: { label: "Strong — move to interview", text: "Did well across the shift. Use the interview to confirm the areas below." },
  PROMISING: { label: "Promising — interview and probe", text: "Good overall, with some clear gaps. Spend the interview on the weaknesses below." },
  MIXED: { label: "Mixed — review carefully", text: "Some good decisions and some serious gaps. Interview only if the gaps can be trained." },
  ADDITIONAL: { label: "Not enough evidence yet", text: "The test did not show enough to judge. Consider a further assessment before interviewing." },
  WEAK: { label: "Weak result — further assessment advised", text: "Many decisions went against good store practice. If you still want to consider them, discuss the gaps below in detail or use a further assessment first." },
};

export interface BriefItem {
  area: string;
  text: string;
}

export interface BriefProbe extends BriefItem {
  ask: string;
  listen: string;
  careful: string;
}

export interface EmployerBrief {
  candidate: string;
  date: string | null;
  sample: boolean;
  overall: number;
  /** Score on the moments reached, for an unfinished test. */
  reachedOverall?: number;
  recommendation: { label: string; text: string };
  completed: boolean;
  reached: { observed: number; total: number };
  skills: { name: string; about: string; score: number; word: string; reached: boolean }[];
  strengths: BriefItem[];
  weaknesses: BriefItem[];
  probes: BriefProbe[];
  flags: string[];
  /** Another test's own wording for the PDF header and intro. Left out, the dark-store wording is used. */
  workSample?: string;
  about?: string;
}

const word = (score: number) => (score >= 80 ? "Strong" : score >= 60 ? "Good" : score >= 40 ? "Needs work" : "Weak");

const reached = (event: EvidenceEvent) => !event.behaviourTags.includes("not_reached");

/** Which decision a behaviour is read from. Two behaviours from one decision say one thing; only one is kept. */
const DECISION_OF: Record<string, string> = Object.fromEntries(
  DECISIONS.flatMap((decision) => decision.behaviours.map((id) => [id, decision.id])),
);

/** Lowest score first, then the heavier competency, one per decision. */
function onePerDecision(events: EvidenceEvent[]): EvidenceEvent[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    const decision = DECISION_OF[event.behaviourId] ?? event.behaviourId;
    if (seen.has(decision)) return false;
    seen.add(decision);
    return true;
  });
}

/** Interview topics for somebody who showed no clear weakness: still worth asking. */
const FALLBACK_PROBES = ["T9", "C5", "P1", "I5"];

export function buildEmployerBrief(
  result: AssessmentResult,
  meta: { candidate: string; completedAt?: string | null; sample?: boolean },
): EmployerBrief {
  const byWeight = (a: EvidenceEvent, b: EvidenceEvent) => assessmentWeights[b.competencyId] - assessmentWeights[a.competencyId];
  const evidence = result.evidence.filter(reached).filter((event) => PLAIN[event.behaviourId]);

  // Weaknesses: everything scored 0–1, then the 2s, worst and weightiest first, one per decision.
  const low = evidence.filter((event) => event.score <= 2).sort((a, b) => a.score - b.score || byWeight(a, b));
  const weakEvents = onePerDecision(low).slice(0, 5);
  const weaknesses = weakEvents.map((event) => {
    const plain = PLAIN[event.behaviourId]!;
    return { area: plain.area, text: event.score <= 1 ? plain.weakness : (plain.partial ?? plain.weakness) };
  });

  // Strengths: 3 of 3, spread across the skill areas, heavier areas first.
  const good = onePerDecision(evidence.filter((event) => event.score === 3).sort(byWeight));
  const strengths: BriefItem[] = [];
  const used = new Set<string>();
  for (const pass of [0, 1]) {
    for (const event of good) {
      if (strengths.length >= 4) break;
      if (strengths.some((item) => item.area === PLAIN[event.behaviourId]!.area)) continue;
      if (pass === 0 && used.has(event.competencyId)) continue;
      used.add(event.competencyId);
      strengths.push({ area: PLAIN[event.behaviourId]!.area, text: PLAIN[event.behaviourId]!.strength });
    }
  }

  const probeIds = weakEvents.length ? weakEvents.map((event) => event.behaviourId) : FALLBACK_PROBES;
  const probes = probeIds.slice(0, 4).map((id) => {
    const plain = PLAIN[id]!;
    const event = weakEvents.find((entry) => entry.behaviourId === id);
    return {
      area: plain.area,
      text: event ? (event.score <= 1 ? plain.weakness : (plain.partial ?? plain.weakness)) : "No clear weakness here; worth confirming.",
      ask: plain.ask,
      listen: plain.listen,
      careful: plain.careful,
    };
  });

  const rung = (["STRONG", "PROMISING", "MIXED", "ADDITIONAL"] as const).find((entry) => result.indication.startsWith(entry)) ?? "ADDITIONAL";
  // The bottom rung means one of two things: too little of the test was reached
  // to judge, or it was reached and went badly. An employer needs to know which.
  const tooLittle = result.incomplete && result.observed / Math.max(1, result.opportunities) < 0.5;
  const key = rung === "ADDITIONAL" && !tooLittle ? "WEAK" : rung;

  return {
    candidate: meta.candidate,
    date: meta.completedAt ?? null,
    sample: meta.sample ?? false,
    overall: result.overall,
    reachedOverall: result.reachedOverall,
    recommendation: RECOMMENDATION[key]!,
    completed: !result.incomplete,
    reached: { observed: result.observed, total: result.opportunities },
    skills: COMPETENCIES.map((id) => {
      const competency = result.competencies.find((entry) => entry.id === id)!;
      return { ...SKILL_AREAS[id], score: competency.score, word: competency.decisions ? word(competency.score) : "Not reached", reached: competency.decisions > 0 };
    }),
    strengths,
    weaknesses,
    probes,
    flags: result.flags.map((flag) => FLAG_TEXT[flag.id] ?? flag.title),
  };
}

/** Every fixed sentence the brief can use, so a check can prove none of them names the simulation. */
export function allBriefText(): string[] {
  return [
    ...Object.values(PLAIN).flatMap((plain) => [plain.area, plain.strength, plain.weakness, plain.partial ?? "", plain.ask, plain.listen, plain.careful]),
    ...Object.values(SKILL_AREAS).flatMap((area) => [area.name, area.about]),
    ...Object.values(FLAG_TEXT),
    ...Object.values(RECOMMENDATION).flatMap((entry) => [entry.label, entry.text]),
  ].filter(Boolean);
}
