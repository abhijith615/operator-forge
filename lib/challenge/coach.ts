/**
 * The Senior Store Manager on the other end of the comms panel.
 *
 * Deliberately a curated knowledge base rather than a model call. Three
 * reasons, in order of weight:
 *
 * 1. The challenge is playable with no account, so an AI endpoint behind it
 *    would be an unauthenticated proxy to a paid API key. That is not a thing
 *    to put on a public page.
 * 2. This is a teaching surface. A model that improvises a Nil Pick procedure
 *    teaches the improvisation, and the operator has no way to know which
 *    parts were real.
 * 3. It answers instantly and offline, which matters more than variety when
 *    somebody is fifteen minutes into a shift with a queue building.
 *
 * `answer()` is the seam. Swap its body for a call to a rate-limited endpoint
 * and nothing else in the app changes.
 */

export interface CoachReply {
  text: string;
  /** Shown as tappable follow-ups so nobody has to know what to ask. */
  suggestions?: string[];
}

interface Entry {
  /** Any of these matching the question is enough. */
  match: RegExp;
  reply: CoachReply;
}

const OPENING: CoachReply = {
  text: "Morning. I'm on another site today so you've got the floor — ask me anything, I'd rather you asked than guessed.",
  suggestions: [
    "What is click-to-dispatch?",
    "What should I do about a Nil Pick?",
    "How do I know where the bottleneck is?",
  ],
};

const ENTRIES: Entry[] = [
  {
    match: /\b(ctd|click.?to.?dispatch|180|target)\b/i,
    reply: {
      text: "Click-to-dispatch is the clock from the moment an order lands to the moment a rider leaves with it. Ours has to stay under 180 seconds. It's a whole-chain number — picking, packing, staging and handover all sit inside it, so if it climbs, one of those four is where you look.",
      suggestions: ["How do I know where the bottleneck is?", "What is PPI?"],
    },
  },
  {
    match: /\b(bottleneck|slow(est)?|queue|backlog|where.*problem)\b/i,
    reply: {
      text: "Fulfillment speed is set by the slowest active stage, not the fastest one. Look for the stage where the queue is growing — things arriving faster than they leave. Right now that's usually packing during breakfast: picking output rises, packing capacity doesn't, and the gap turns into CTD about two minutes later.",
      suggestions: ["Should I move people between stations?", "What is click-to-dispatch?"],
    },
  },
  {
    match: /\b(nil.?pick|item not found|out of stock|oos|shelf empty|missing)\b/i,
    reply: {
      text: "An empty pick face doesn't mean the store has no stock. Before anyone confirms an Item Not Found, check the alternate locations — adjacent bins, the overstock rack, and the replenishment pallet at goods-in. Stock waiting to be put away is still your stock. Confirm the Nil Pick only after you've actually looked.",
      suggestions: ["Should I replenish or just take one unit?", "What is PPI?"],
    },
  },
  {
    match: /\b(replenish|one unit|single|pick face|put ?away)\b/i,
    reply: {
      text: "Replenish the pick face properly if you've found stock. Taking a single unit closes this order and leaves the shelf empty, so the next order for the same item raises the same alert and you pay the cost twice. Fixing the face once prevents every repeat for the rest of the hour.",
    },
  },
  {
    match: /\b(ppi|pick.?rate|picking per item|how fast)\b/i,
    reply: {
      text: "PPI is picking-per-item — seconds per line picked. For this store, 10 to 15 seconds is a healthy range. Careful though: fast isn't automatically good. Somebody at 9 seconds with 98.4% accuracy costs you more in mispicks and returns than somebody at 13 with 99.6%. Never judge a picker on speed alone.",
      suggestions: ["Should I move people between stations?"],
    },
  },
  {
    match: /\b(move|station|reallocate|cross.?train|staff|roster|allocation|who should)\b/i,
    reply: {
      text: "Move people to where the queue is, not to where the work looks hardest. Cross-trained staff are the lever — check the secondary skill on each person before you commit. Two things to protect: never strip packing to feed picking during breakfast, and never leave dispatch unstaffed, or picked and packed orders just sit in the bay.",
      suggestions: ["How do I know where the bottleneck is?"],
    },
  },
  {
    match: /\b(pack|bag|segregat|chemical|cleaner|eggs|fragile|curd|chill|cold)\b/i,
    reply: {
      text: "Food and household chemicals never share a bag — that's not a preference, it's the rule. Beyond that: eggs and bakery need fragile protection, and chilled items need cold packaging or they arrive warm. If QC catches a mixed bag it comes back for repacking, which costs far more time than splitting it would have.",
    },
  },
  {
    match: /\b(rider|handover|dispatch|scan|verif|scanner|release)\b/i,
    reply: {
      text: "Verification at handover is not negotiable — it's the only record that the right bag went to the right rider for the right order. But don't freeze the whole bay over one fault either. If a parcel won't scan, give that rider a different verified order and fix the scanner behind it. Protect the check and keep the flow.",
    },
  },
  {
    match: /\b(peak|recovery|behind|crossed|catch up|too many|help)\b/i,
    reply: {
      text: "Three things, in this order. Fix the actual bottleneck first — usually packing. Delegate the Nil Pick escalations to the Floor Lead rather than doing them yourself. Then sort rider capacity for what's coming. What you don't do is pause everything or drop scanning; both feel decisive and both cost you more than they save.",
    },
  },
  {
    match: /\b(delegate|floor lead|myself|should i go|search)\b/i,
    reply: {
      text: "Don't go to the shelves yourself. On a peak you're the only person who can see the whole floor, and the moment you're in an aisle you're looking at one bin. Push the search to the Floor Lead and stay on the board.",
    },
  },
  {
    match: /\b(score|assess|grade|marks|rated|judg)\b/i,
    reply: {
      text: "I'm not scoring you and I won't tell you what the system thinks. What I'll say is this: it reads how you decide, not how fast you click. Getting to the real cause matters more than clearing the board.",
    },
  },
  {
    match: /\b(what do i do|stuck|lost|help me|where do i start|confus)\b/i,
    reply: {
      text: "Start with the board. Find the number moving in the wrong direction, then ask which stage is causing it. Open the task that sits on that stage first and leave the routine ones — you are not expected to clear everything, and choosing what to drop is most of the job.",
      suggestions: ["How do I know where the bottleneck is?", "What is click-to-dispatch?"],
    },
  },
];

const FALLBACK: CoachReply = {
  text: "I don't have anything useful on that one, and I'd rather say so than guess at you mid-shift. Try me on the bottleneck, a Nil Pick, packing rules, rider handover, or how to use the people you've got.",
  suggestions: [
    "How do I know where the bottleneck is?",
    "What should I do about a Nil Pick?",
    "Should I move people between stations?",
  ],
};

export function openingMessage(): CoachReply {
  return OPENING;
}

export function answer(question: string): CoachReply {
  const found = ENTRIES.find((entry) => entry.match.test(question));
  return found ? found.reply : FALLBACK;
}
