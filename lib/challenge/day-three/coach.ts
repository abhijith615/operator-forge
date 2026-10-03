/**
 * The Shift Supervisor on the other end of Day 3's assistant.
 *
 * Same decision as Day 1's coach, for the same reasons: a curated knowledge
 * base rather than a model call. A model that improvises what PPI means
 * teaches the improvisation, and somebody fourteen minutes into building a
 * roster has no way to tell which half was real. It also answers instantly,
 * which matters more than variety when the peak is in ninety minutes.
 *
 * `answer()` is the seam. Swap its body for a call to a rate-limited endpoint
 * and nothing else changes.
 *
 * Every number quoted here is this store's, taken from `workforce.ts` and
 * `forecast.ts` rather than retyped — so the assistant cannot drift away from
 * the simulation it is explaining.
 */

import { FLEX_BUDGET, PLANNED_ASSOCIATES } from "./workforce";

export interface CoachReply {
  text: string;
  /** Tappable follow-ups, so nobody has to know what to ask. */
  suggestions?: string[];
}

interface Entry {
  match: RegExp;
  reply: CoachReply;
}

const ENTRIES: Entry[] = [
  {
    match: /\b(ppi|pick.?rate|picking per item|seconds per|how fast)\b/i,
    reply: {
      text: "PPI is picking-per-item — the seconds a picker takes per line. Lower is faster. For this store 10 to 15 seconds is the healthy band. Be careful with it, though: fast is not automatically good. Someone at 9 seconds with 98.4% accuracy costs more in mispicks and returns than someone at 13 with 99.6%, so never read PPI without reading accuracy beside it.",
      suggestions: ["What does accuracy mean here?", "What is coverage?", "Who should go where?"],
    },
  },
  {
    match: /\b(accuracy|mispick|accurate)\b/i,
    reply: {
      text: "Pick accuracy is the share of lines picked correctly; pack accuracy is the same thing at the bench. A mispick does not just cost the item — it costs the customer's order, a return, and the time to put it right during a peak. Someone slow and accurate is usually worth more on a festival evening than someone fast and careless.",
      suggestions: ["What is PPI?", "What does cross-trained mean?"],
    },
  },
  {
    match: /\b(coverage|covered|capacity|enough people)\b/i,
    reply: {
      text: "Coverage is whether the people you have assigned can actually clear the orders forecast for that hour, station by station. Picking coverage at 100% means picking can keep up; packing at 70% means packing is where the queue will build. Coverage is per station, not for the store — a store at 95% overall with packing at 60% still falls over, because the slowest stage sets the pace.",
      suggestions: ["Where will the bottleneck be?", "What is flex labour?"],
    },
  },
  {
    match: /\b(bottleneck|slowest|queue build|where will it break)\b/i,
    reply: {
      text: "The bottleneck is whichever station the work cannot get through fast enough. Look for the stage whose coverage is lowest at peak, not the one with fewest people — three people packing can be the constraint when six are picking, because picking output arrives at the bench faster than it leaves. Fixing anything other than the constraint moves no orders.",
      suggestions: ["What is coverage?", "Should I move people between stations?"],
    },
  },
  {
    match: /\b(cross.?train|trained|skill|stars?|★)\b/i,
    reply: {
      text: "The stars are how trained someone is at a station: three is expert, one is passable, none means not trained there at all. Cross-trained means they can work more than one station — that flexibility is what lets you rebalance when the evening turns. Putting someone on a station they have no stars in does not quietly go slower; it goes wrong.",
      suggestions: ["Should I move people between stations?", "What is PPI?"],
    },
  },
  {
    match: /\b(flex|agency|temp|temporary|hire|book)\b/i,
    reply: {
      text: `Flex workers are hired by the hour from an agency for tonight only. You have a budget of ₹${FLEX_BUDGET.toLocaleString("en-IN")} and they cost against it. They are real capacity, not a penalty — but they do not know your floor, their skills are narrower, and booking them late means they arrive after the hour you needed them. Spending nothing is a decision too, and so is spending it all at 4:30.`,
      suggestions: ["What is coverage?", "What happens at peak?"],
    },
  },
  {
    match: /\b(attendance|reliab|turn up|show up)\b/i,
    reply: {
      text: "Attendance is the share of rostered shifts that person has actually turned up for. It is context, not a verdict — 95% on a four-year tenure reads differently from 95% on someone eleven days in. Use it when you are deciding who to depend on for the hour you cannot afford to lose.",
      suggestions: ["Who should go where?", "What is OT?"],
    },
  },
  {
    match: /\b(ot|overtime|extend|stay late|incentive|payout|bonus)\b/i,
    reply: {
      text: "Overtime is asking somebody to stay past their rostered end. It is capacity you can have tonight, and it is a favour you are spending — especially from somebody who is already owed an incentive and has not been paid it. Ask, do not assume: a person who agrees to stay works differently from a person who was told they are staying.",
      suggestions: ["What should I say to someone asking about pay?", "What is coverage?"],
    },
  },
  {
    match: /\b(peak|busy|rush|forecast|demand|onam)\b/i,
    reply: {
      text: `Peak is the evening window when orders arrive fastest — tonight it starts at 6 PM, and the forecast is well above a normal evening because it is Onam eve. The forecast is also revised upward partway through the shift, so a plan that is exactly enough at 4:30 is not enough later. ${PLANNED_ASSOCIATES} associates were rostered; five are not coming.`,
      suggestions: ["What is coverage?", "What is flex labour?"],
    },
  },
  {
    match: /\b(high.?value|electronics|secure|cage)\b/i,
    reply: {
      text: "High-value means that person is cleared to handle the secure lines — electronics and anything else kept in the cage. It is an authorisation, not a skill level: someone can be your fastest picker and still not be cleared for it, and a high-value vehicle arriving with nobody cleared on the floor is a problem you created earlier in the evening.",
      suggestions: ["Who should go where?", "What is the receiving window?"],
    },
  },
  {
    match: /\b(receiv|inbound|vehicle|unload|dock)\b/i,
    reply: {
      text: "Receiving is taking a vehicle off the dock and getting its stock onto the floor. It needs people, and those people come out of the same pool you are staffing the peak with. A vehicle that arrives mid-peak with nobody assigned to it sits there, and so does the stock on it.",
      suggestions: ["What is coverage?", "Should I move people between stations?"],
    },
  },
  {
    match: /\b(audit|cycle count|stock count)\b/i,
    reply: {
      text: "The stock audit is scheduled work, not an emergency — it is on the calendar for tonight and it costs you associates for the time it runs. Holding it protects the peak and leaves the count undone; running it on time costs capacity in the hour you may need most. Either is defensible. Doing it by accident, because you never looked at it, is not.",
      suggestions: ["What is coverage?", "What happens at peak?"],
    },
  },
  {
    match: /\b(move|reassign|swap|station|where should|who should)\b/i,
    reply: {
      text: "Move people toward the station that is short, and prefer the ones with stars there. Two things worth holding onto: moving your strongest picker to packing solves packing and creates a picking problem, and every move has a travel cost — somebody walking between stations is producing nothing while they walk. Rebalance before the hour needs it, not during.",
      suggestions: ["Where will the bottleneck be?", "What does cross-trained mean?"],
    },
  },
  {
    match: /\b(rider|delivery|dispatch|last mile)\b/i,
    reply: {
      text: "Riders take finished orders out of the door. If dispatch is under-covered, picked and packed orders sit on the staging rack getting later while the floor looks busy and productive. Rider capacity is the one stage where the customer is already waiting before the problem is visible inside the store.",
      suggestions: ["What is coverage?", "What is CTD?"],
    },
  },
  {
    match: /\b(ctd|click.?to.?dispatch|dispatch time)\b/i,
    reply: {
      text: "Click-to-dispatch is the time from a customer placing an order to it leaving the store. It is the number a dark store is judged on. Everything you do tonight either protects it or costs it — staffing, the audit, the vehicle and who you ask to stay.",
      suggestions: ["What is coverage?", "Where will the bottleneck be?"],
    },
  },
  {
    match: /\b(pay|salary|owed|money|complain|unhappy|upset|conflict)\b/i,
    reply: {
      text: "Say what is true and say what you will do. If you do not know whether something has been paid, check before you answer — a confident wrong answer to somebody about their own money costs more trust than saying you will find out. Promising what you cannot deliver buys you tonight and costs you the next month.",
      suggestions: ["What is OT?", "What is attendance?"],
    },
  },
];

const FALLBACK: CoachReply = {
  text: "I do not have that one. Ask me about any term on the screen — PPI, coverage, cross-training, flex labour, attendance, high-value clearance — or about where to put people.",
  suggestions: ["What is PPI?", "What is coverage?", "What is flex labour?"],
};

const OPENING: CoachReply = {
  text: "Shift Supervisor here. I am not building your roster, but I will tell you what anything on that screen means. Ask before you guess — it costs you nothing.",
  suggestions: ["What is PPI?", "What is coverage?", "What is flex labour?"],
};

export function openingMessage(): CoachReply {
  return OPENING;
}

export function answer(question: string): CoachReply {
  const found = ENTRIES.find((entry) => entry.match.test(question));
  return found ? found.reply : FALLBACK;
}
