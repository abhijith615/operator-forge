/**
 * The Floor Lead on the other end of Day 4's assistant.
 *
 * Day 4 has the densest vocabulary of the five days and the least room to
 * explain it: GRN, QC gate, staging, putaway, pick-ready, safe lane,
 * quarantine, route seconds, cold-chain exposure — all on one diagram, on a
 * clock. Somebody who does not know what "pick-ready" means cannot tell
 * whether 0% is a crisis or the normal start of a morning. It is 0% at the
 * start of every run, and it is normal.
 *
 * Curated rather than a model call, for the reasons in Day 1's coach, and
 * `answer()` is the same seam if that ever changes.
 */

import { LUNCH_AT, RECOVERY_AT, clockAt } from "./scenario";

export interface CoachReply {
  text: string;
  suggestions?: string[];
}

interface Entry {
  match: RegExp;
  reply: CoachReply;
}

const ENTRIES: Entry[] = [
  {
    match: /\b(pick.?ready|ready to pick|pickable)\b/i,
    reply: {
      text: "Pick-ready means stock has finished receiving and is on the shelf where a picker can actually reach it. It starts at 0% every morning — that is not a fault, it is the job. Nothing a vehicle brings counts until it has been through the gate, booked in and put away. A lunch peak against 0% pick-ready is a peak with nothing to sell.",
      suggestions: ["What is putaway?", "What is GRN?", "What is the floor percentage?"],
    },
  },
  {
    match: /\b(grn|goods receipt|book.?in|booked in)\b/i,
    reply: {
      text: "GRN is goods receipt note — the record that says the store has formally accepted a load and now owns it. Until a batch is GRN'd the system does not believe the stock exists, so nobody can be sent to pick it. The two scan slots are the only way batches get through it, which is why they are usually the queue.",
      suggestions: ["What is the QC gate?", "What is putaway?"],
    },
  },
  {
    match: /\b(qc|quality|check|gate|quarantine)\b/i,
    reply: {
      text: "The QC gate is where a load is checked before it is accepted: temperature and shelf life on chilled, condition on everything else. One gate, one load at a time. Quarantine is where a load goes if it fails — out of the flow, back to the supplier, and not on your shelf. Waving something through the gate is fast and is the kind of fast that comes back.",
      suggestions: ["What is GRN?", "What is the safe lane?"],
    },
  },
  {
    match: /\b(putaway|put away|store it|shelf it)\b/i,
    reply: {
      text: "Putaway is moving accepted stock from staging onto the pick face. It is the step that turns a received load into something sellable, and it is the one people skip when the floor is busy — which is how you end up with a full staging lane, an empty pick face and a peak arriving.",
      suggestions: ["What is pick-ready?", "What is staging?"],
    },
  },
  {
    match: /\b(staging|grn staging|lane|safe lane)\b/i,
    reply: {
      text: "Staging is the floor space where a load waits between the dock and the shelf. It has 70 positions and that is the hard limit — once it is full, nothing else can come off a vehicle, however many docks are free. The safe lane is 24 temporary positions out of the picker routes: somewhere to put stock that is not in anybody's way.",
      suggestions: ["What is the floor percentage?", "What is the aisle percentage?"],
    },
  },
  {
    match: /\b(floor %|floor percent|floor\b|congestion|congested)\b/i,
    reply: {
      text: "Floor is how much of your usable floor space is occupied by stock that has not been put away. High is bad. At the start it is already 86%, which is why unloading everything immediately feels decisive and is the one plan that cannot work — pickers need to walk through what you just unloaded.",
      suggestions: ["What is staging?", "What is the aisle percentage?"],
    },
  },
  {
    match: /\b(aisle|route|blocked|61s|seconds per)\b/i,
    reply: {
      text: "Aisle shows how clear the picker routes are, and the route time beside the map is what a pick actually costs right now — 38 seconds is normal for this store. When cartons are left in Aisle C that climbs, and every pick for the rest of the morning pays it. A blocked aisle is a tax on every order, not a one-off.",
      suggestions: ["What is the floor percentage?", "What is CTD?"],
    },
  },
  {
    match: /\b(ctd|click.?to.?dispatch|dispatch time)\b/i,
    reply: {
      text: "Click-to-dispatch is the time from a customer ordering to the order leaving the store. It is the number the store is judged on, and it is the one that moves last — by the time CTD is climbing, the cause was twenty minutes ago on this floor.",
      suggestions: ["What is the aisle percentage?", "When does lunch start?"],
    },
  },
  {
    match: /\b(dock|unload|vehicle|now.*next.*hold|lane)\b/i,
    reply: {
      text: "Two docks, three vehicles. Now puts a vehicle on a dock immediately, Next queues it for the first dock that frees, Hold leaves it in the yard. A vehicle on a dock is unloading into your staging space, so the question is not which to unload — it is what your floor can absorb and in what order.",
      suggestions: ["What is staging?", "What is cold chain?"],
    },
  },
  {
    match: /\b(cold.?chain|chilled|frozen|temperature|exposure)\b/i,
    reply: {
      text: "Chilled and frozen stock can only be out of temperature for so long — this store works to a 15-minute exposure limit. Holding a frozen vehicle in the yard is safe; unloading it and leaving it in staging is not. Cold chain is the constraint that does not wait for your plan to be convenient.",
      suggestions: ["What is the QC gate?", "Which vehicle should come off first?"],
    },
  },
  {
    match: /\b(bottleneck|choking|constraint|slowest)\b/i,
    reply: {
      text: "The bottleneck is the one place the work cannot get through fast enough — and relieving anything else moves nothing. Look for where stock is arriving faster than it leaves, not where it looks busiest. Busy and blocked are different things, and only one of them is your problem.",
      suggestions: ["What is staging?", "What is pick-ready?"],
    },
  },
  {
    match: /\b(lunch|peak|demand|11|how long)\b/i,
    reply: {
      text: `Lunch demand starts building at ${clockAt(LUNCH_AT)}, and the floor stops being yours to arrange at ${clockAt(RECOVERY_AT)} — that is when you plan the final recovery. Everything before that is preparation for a peak that arrives whether or not you are ready.`,
      suggestions: ["What is pick-ready?", "What is CTD?"],
    },
  },
  {
    match: /\b(run|3 minutes|advance|clock|time)\b/i,
    reply: {
      text: "Running three minutes moves the floor forward: vehicles unload, the gate processes, teams put away — but only the work you set up actually happens. Running the clock without deciding anything is how a morning disappears. Set the floor up, then run it.",
      suggestions: ["What moves first?", "What is putaway?"],
    },
  },
  {
    match: /\b(what should i|what first|where do i start|how do i)\b/i,
    reply: {
      text: "Find where stock is piling up rather than where people look busy, relieve that, and keep the picker routes clear while you do it. Beyond that there is no single right sequence — you are judged on the floor your plan produces at lunch, not on matching an answer.",
      suggestions: ["What is the bottleneck?", "What is pick-ready?"],
    },
  },
];

const FALLBACK: CoachReply = {
  text: "I do not have that one. Ask me about anything on the screen — pick-ready, GRN, the QC gate, staging, putaway, the floor and aisle numbers, or the docks.",
  suggestions: ["What is pick-ready?", "What is GRN?", "What is the bottleneck?"],
};

const OPENING: CoachReply = {
  text: "Floor Lead. I am not going to tell you what to unload, but I will tell you what anything on that diagram means. Ask before you guess — the clock is the same either way.",
  suggestions: ["What is pick-ready?", "What is GRN?", "What is the bottleneck?"],
};

export function openingMessage(): CoachReply {
  return OPENING;
}

export function answer(question: string): CoachReply {
  const found = ENTRIES.find((entry) => entry.match.test(question));
  return found ? found.reply : FALLBACK;
}
