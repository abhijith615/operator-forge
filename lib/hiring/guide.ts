/**
 * The assistant a candidate can ask.
 *
 * It explains the screen: what a word means, what a number measures, how the
 * controls work, how the thirty minutes run. It does not say what to do with
 * any of it. A candidate who does not know what CTD stands for should not be
 * scored on that, and a candidate who asks which option is best should get a
 * polite no — from the same assistant, in the same words, for everybody.
 *
 * That last part is why this is a written set of answers and not a model
 * call. An assessment has to treat every candidate identically, and a model
 * that can be talked round by one candidate and not another does not. It also
 * means nothing here can leak a scoring rule, because none is in it.
 *
 * Only the topic of a question is logged, never its text, and nothing asked
 * here is scored.
 */

export interface GuideReply {
  /** Logged as the topic. Not shown. */
  topic: string;
  text: string;
  suggestions?: string[];
}

interface Entry {
  topic: string;
  match: RegExp;
  text: string;
  suggestions?: string[];
}

const DECLINE =
  "That one is yours to decide — it is what the shift is finding out. I can explain anything on the screen: what a number means, what a record shows, what a button does.";

const ENTRIES: Entry[] = [
  /* Asked for the answer. Checked first, so "what should I do about the nil pick" is a no, not a definition. */
  {
    topic: "asked_for_answer",
    match: /\b(what (should|do|would) (i|you)|which (one|option|is (best|right|correct))|best (option|answer|choice|move)|right (answer|option|choice)|correct (answer|option)|tell me (the answer|what to)|what is the answer|should i\b|is it (ok|okay|right|better) to|recommend|advi[cs]e|hint)\b/i,
    text: DECLINE,
    suggestions: ["How does the test work?", "What is CTD?", "How do I move someone?"],
  },
  {
    topic: "scoring",
    match: /\b(scor\w*|marks?|points?|graded?|judged|evaluat\w*|assess\w*|pass(ed|ing)?|fail\w*|result)\b/i,
    text: "You are assessed on what you do in the store — the decisions, and what they lead to later in the shift. You are not shown correct or incorrect answers while it runs, and I cannot tell you what scores well. How fast you tap is not measured. You see your profile when the shift ends.",
    suggestions: ["How does the time work?", "What happens if I run out of time?"],
  },
  {
    topic: "store_clock",
    match: /\b(store (time|clock)|17:\d\d|18:\d\d|clock (jump|moves?|skip)\w*|why did (the )?time)\b/i,
    text: "The clock next to “Store 114” is the store's own time, starting at 17:25. It moves when you do something that takes a manager's time — opening a record, counting stock, waiting for someone to report back. It is separate from your thirty-minute timer, which is real time.",
    suggestions: ["How does the time work?", "What is CTD?"],
  },
  {
    topic: "time",
    match: /\b(how long|time (left|limit|remaining)|timer|30 min\w*|thirty|countdown|run out|runs? out|expire\w*|pace|pacing|too slow|hurry|behind|time)\b/i,
    text: "You have thirty minutes of real time, shown top right; it does not pause. The shift has six parts, shown in the bar at the top: yellow is the part you are in, and the white mark is where the time is. If the mark is ahead of the yellow, you are behind the suggested pace. As a rough guide: handover 2 minutes, team 8, inventory 6, peak 9, recovery 2, final call 3. If the thirty minutes end first, the shift closes on the decisions you have already made — the parts you did not reach are left out, not scored against you.",
    suggestions: ["What is the store clock?", "What if I lose connection?"],
  },
  {
    topic: "connection",
    match: /\b(refresh\w*|reload\w*|connection|internet|offline|network|disconnect\w*|close(d)? the (tab|page)|battery|crash\w*|resume)\b/i,
    text: "Your progress is saved as you go. If the page reloads or the connection drops, open the same link and sign in with the same email: you come back to where you were. The thirty-minute timer keeps running while you are away.",
    suggestions: ["How does the time work?"],
  },
  {
    topic: "ctd",
    match: /\b(ctd|click.?to.?dispatch|dispatch time)\b/i,
    text: "CTD is click-to-dispatch: the seconds from a customer placing an order to the sealed bag leaving the store with a rider. The target is 180 seconds. It rises when orders queue at any stage — waiting to be picked, packed, or handed over.",
    suggestions: ["What is “Waiting”?", "What is the pack queue?", "What do the percentages mean?"],
  },
  {
    topic: "orders_waiting",
    match: /\b(orders? waiting|waiting\b|backlog|orders? (are )?backing)\b/i,
    text: "“Waiting” is the number of orders in the store that have not been dispatched yet — those being worked on plus any queueing at a stage. Some are always in progress, so it is never zero.",
    suggestions: ["What is CTD?", "What is the pack queue?"],
  },
  {
    topic: "pack_queue",
    match: /\b(pack(ing)? queue|totes? waiting)\b/i,
    text: "The pack queue is picked orders sitting in totes, waiting for a packing bench to be free. A few is normal.",
    suggestions: ["What is CTD?", "What is a tote?"],
  },
  {
    topic: "coverage",
    match: /(\d ?%|\b(percent\w*|coverage|capacity|forecast|bars?|projected)\b)/i,
    text: "Each station's percentage is the people on it measured against the work it will be asked for. 100% is exactly enough. On the floor board the figure is for 18:00, the forecast peak, with people standing where they are now. In the floor panels during the shift it is right now.",
    suggestions: ["What are the four stations?", "What is the flexible reserve?", "What is “load”?"],
  },
  {
    topic: "load",
    match: /\bload\b/i,
    text: "Load is the same thing as coverage, seen from the station's side: how hard it is being asked to work against what its people can do. Over 100% means work is arriving faster than it is leaving.",
    suggestions: ["What do the percentages mean?"],
  },
  {
    topic: "reserve",
    match: /\b(flex\w*( reserve)?|reserve|cross.?train\w*|spare)\b/i,
    text: "The flexible reserve counts people who are trained for a second station and whose own station would still be running without them. It tells you how many people could be moved later if something changed.",
    suggestions: ["How do I move someone?", "What do “Strong” and “Trained” mean?"],
  },
  {
    topic: "skill_words",
    match: /\b(strong|trained|can cover|not trained|skill\w*|authori[sz]ed|capab\w*)\b/i,
    text: "Under each name is how well that person does the job where they are standing: Strong, Trained, Can cover, or Not trained. Tap a person to see all four stations, what they are authorised for, and a note about them.",
    suggestions: ["How do I move someone?", "What are the four stations?"],
  },
  {
    topic: "move_people",
    match: /\b(how (do|can) i (move|assign|change|reassign)|move (some(one|body)|a (person|worker)|people|staff)|reassign|drag)\b/i,
    text: "Tap a person on the floor board. Their card opens with what they are trained for, and under “Move to” you tap the station to send them to. The percentages update straight away. Later in the shift, “Move a worker…” does the same thing from a list.",
    suggestions: ["What do the percentages mean?", "Why can’t I move Riya?"],
  },
  {
    topic: "riya_fixed",
    match: /\b(riya|induction|lock(ed)?)\b/i,
    text: "Riya is in her induction week, which is on picking, so the floor board will not move her. What happens with her assignment is a separate decision that comes up during the shift.",
    suggestions: ["What is PPI?", "How do I move someone?"],
  },
  {
    topic: "stock_locations",
    match: /\b(overstock|replenishment area|adjacent bin|inbound|inward\w*|pallet|goods receipt|grn|recent transactions|pick face|back ?room)\b/i,
    text: "Stock can be in more than one place. The pick face is the shelf pickers take from. Overstock is the reserve bay for the same item. The replenishment area is where received goods wait to be put away. An adjacent bin is the neighbouring shelf slot, where something may have been put by mistake. Recent transactions lists what was received, moved and sold.",
    suggestions: ["What is a nil pick?", "What are the four stations?"],
  },
  {
    topic: "stations",
    match: /\b(stations?|picking|pickers?|dispatch|replenish\w*|putaway|put.?away|floor station)\b/i,
    text: "Four stations. Picking collects an order's items from the shelves into a tote. Packing checks and bags it at a bench. Dispatch hands sealed bags to riders. Replenishment / floor keeps the shelves stocked from inbound and overstock and keeps the aisles clear — it does not touch orders, but pickers cannot pick from an empty shelf.",
    suggestions: ["What do the percentages mean?", "What is a tote?"],
  },
  {
    topic: "packing",
    match: /\b(pack(ing|er|ers)?|bench(es)?|P[123]\b|seal\w*)\b/i,
    text: "Packing is where a picker's tote becomes the customer's bag: items are checked against the order, bagged and sealed at a bench. Benches are numbered P1, P2, P3.",
    suggestions: ["What is the pack queue?", "What is a secondary liner?"],
  },
  {
    topic: "tote",
    match: /\b(tote|crate|basket)\b/i,
    text: "A tote is the plastic crate a picker carries. Everything for one order goes into it and it travels to the packing bench as one unit. An exception tote is a separate crate where items that could not go out — cancelled, damaged — are put until somebody deals with them.",
    suggestions: ["What is the exception area?", "What is a nil pick?"],
  },
  {
    topic: "nil_pick",
    match: /\b(nil.?pick|item not found|inf\b|empty (shelf|face)|shelf (is )?0)\b/i,
    text: "A nil pick is an item the picker went to collect and did not find on its shelf, even though the system shows stock. Authorising it sends the order without that item and refunds the line. De-listing takes the item off sale in the app altogether.",
    suggestions: ["What is overstock?", "What is the replenishment area?"],
  },
  {
    topic: "delist",
    match: /\b(de.?list\w*|off sale|unlist\w*)\b/i,
    text: "De-listing takes an item off sale in the app, so customers can no longer order it from this store until it is listed again.",
    suggestions: ["What is a nil pick?"],
  },
  {
    topic: "high_value",
    match: /\b(high.?value|cage|alert)\b/i,
    text: "High-value items are kept in a locked cage and only authorised associates can go in. An alert means the system's count of an item needs checking. “System” is what the records say is there; “Physical” is what is actually on the shelf, which nobody knows until it is counted.",
    suggestions: ["What is variance?", "What do the records show?"],
  },
  {
    topic: "variance",
    match: /\b(varianc\w*|exposure|system (count|number|says)|physical|mismatch|discrepan\w*|short(age)?)\b/i,
    text: "Variance is physical count minus system count: −3 means three fewer on the shelf than the records say. Exposure is that number times the unit value — the money the difference represents.",
    suggestions: ["What do the records show?", "What does “Explained by records” mean?"],
  },
  {
    topic: "unit_piles",
    match: /\b(explained( by records)?|recovered|unresolved|write.?off|place each unit|account for)\b/i,
    text: "When you close the case you place each missing unit in one of five piles. Explained by records: the paperwork shows where it went. Recovered: it has been physically found. Unresolved: not yet accounted for. Write off: removed from the books as a loss. Theft: recorded as stolen. Use + and − to place them; all of them must be placed.",
    suggestions: ["What is variance?", "What do the records show?"],
  },
  {
    topic: "records",
    match: /\b(records?|movement log|scan log|access log|orders (tab|list|record)|logs?)\b/i,
    text: "Five records. The movement log lists every stock movement for the item today. Orders lists customer orders containing it. The scan log shows each scan at issue and at packing. The access log shows who entered the cage and when. The exception area shows what is physically in the exception tote. Opening one takes a little store time; you can open them yourself or have somebody pull all five.",
    suggestions: ["What is the exception area?", "What is variance?"],
  },
  {
    topic: "exception",
    match: /\b(exception (area|tote)|restow\w*|cancel\w*)\b/i,
    text: "The exception tote holds items that were picked but could not be sent — a cancelled order, a damaged pack. Restowing means putting such an item back on its shelf so it is sellable stock again.",
    suggestions: ["What do the records show?", "What is a tote?"],
  },
  {
    topic: "delegation",
    match: /\b(handle myself|assign to|delegat\w*|owner|strong fit|weak fit|possible, slower|fit\b|while away)\b/i,
    text: "Most work can be done by you or given to somebody. “Handle myself” takes your own time, shown as minutes off the floor. Under “Assign to”, each person shows how well suited they are to that job and what their station drops to while they are away from it. “Part of the job where they stand” means it does not take them away at all.",
    suggestions: ["What is the attention slot?", "What do the percentages mean?"],
  },
  {
    topic: "attention_slot",
    match: /\b(attention( slot)?|personal slot|handle\b|after peak|three problems)\b/i,
    text: "At one point three things need dealing with at once. For each you choose Handle (do it yourself), Delegate (name an owner) or After peak (leave it until later). You can only be in one place: the first thing you choose to handle personally gets done, and any others you mark Handle wait until you are free.",
    suggestions: ["How does delegating work?"],
  },
  {
    topic: "on_demand",
    match: /\b(on.?demand|temp(orary)?|booking|₹ ?640|extend|overtime|operate short|reallocat\w*|absen\w*)\b/i,
    text: "Four ways to cover the absence, and you can combine them. An on-demand picker is a four-hour booking through an app: it costs ₹640, arrives at 17:50, and can only pick. Internal reallocation opens the floor board so you can move the people you have. Asking an associate to extend means asking Arjun, whose shift ends at 18:00, to stay to 20:00. Operating short means running with the twelve present.",
    suggestions: ["What do the percentages mean?", "How do I move someone?"],
  },
  {
    topic: "ppi",
    match: /\b(ppi|seconds per item|per item|zone ?[abcd]?|zones)\b/i,
    text: "PPI is seconds per item picked — lower is faster. The store's shelves are divided into zones A to D, and a picker's PPI can be shown for each. Accuracy is the share of items picked correctly; scan compliance is the share scanned as required.",
    suggestions: ["What are the four stations?"],
  },
  {
    topic: "bottleneck_controls",
    match: /\b(handover lane|second lane|fast lines?|slow (order )?release|order release|bench p3|third bench|run 3 minutes|run the system|check the floor|aisle)\b/i,
    text: "On the floor screen you can change things and then run the store for three minutes to see what happens. Open packing bench P3 adds a third bench. A second handover lane lets riders collect in two lines. Fast lines first puts away only what is selling. Clear Aisle C removes the cage blocking it. Slow order release holds new orders back for ten minutes, which customers see as a longer delivery promise. After running, “Check the floor” shows the numbers before and after.",
    suggestions: ["What is CTD?", "How do I move someone?"],
  },
  {
    topic: "liner",
    match: /\b(liner|secondary|extra bag|bag 1|move (it|an item)|repack\w*)\b/i,
    text: "On the bag screen, tap an item to move it between Bag 1 and the extra bag. The secondary liner is a sealed inner bag that goes around one item. “If repacked” shows what this order's dispatch time becomes if the bag is changed.",
    suggestions: ["What is CTD?"],
  },
  {
    topic: "final_call",
    match: /\b(do now|after peak|lock (shift )?plan|final call|open tasks|max(imum)? ?3|three (at most|max))\b/i,
    text: "At the final call every open task goes into one of three places: Do now (you, personally — three at most), Delegate (a named owner — three at most), or After peak. Every task needs a place before the plan can be locked. Once it is locked, the store runs to 18:20 on that plan and you cannot change it.",
    suggestions: ["How does delegating work?", "What is “load”?"],
  },
  {
    topic: "people",
    match: /\b(floor lead|assistant store manager|who is|who are|arjun|manu|rahul|sneha|farhan|deepa|kiran|lakshmi|vishnu|anjali|joseph|team)\b/i,
    text: "You are the manager taking the evening shift. The Assistant Store Manager is handing over to you. The Floor Lead supervises the floor and reports to you. Twelve associates are on shift — the same twelve all evening. Tap any of them on the floor board to see what they are trained for.",
    suggestions: ["What do “Strong” and “Trained” mean?", "How do I move someone?"],
  },
  {
    topic: "dark_store",
    match: /\b(dark store|store 114|quick commerce|what is this (store|place)|riders?)\b/i,
    text: "A dark store is a small warehouse that only fulfils app orders — no walk-in customers. An order is picked from the shelves, packed, and handed to a rider within a few minutes. Store 114 is the one you are running tonight.",
    suggestions: ["What are the four stations?", "What is CTD?"],
  },
  {
    topic: "how_it_works",
    match: /\b(how (does|do) (this|the test|it) work|what is this|what do i do here|instructions?|help|explain|get started|confused|don.?t understand|stuck)\b/i,
    text: "You are running one dark store through an evening. Each screen is something that needs a decision: read what is there, open anything you want to look at, then act with the yellow button. What you decide stays decided and shapes what comes next. The bar at the top shows which of the six parts you are in, and I can explain any word or number on the screen.",
    suggestions: ["How does the time work?", "What is CTD?", "How am I assessed?"],
  },
];

const FALLBACK: GuideReply = {
  topic: "no_match",
  text: "I do not have an answer for that. I can explain what is on the screen — CTD, the percentages, the stations, a nil pick, the records, how to move or assign people, how the time works. I cannot say what you should decide.",
  suggestions: ["What is CTD?", "What do the percentages mean?", "How does the time work?"],
};

const OPENING: GuideReply = {
  topic: "opening",
  text: "Ask me what anything on the screen means: a word, a number, a button, how the time works. I will not tell you what to decide. The thirty-minute timer keeps running while you read.",
  suggestions: ["How does the test work?", "What is CTD?", "How does the time work?"],
};

export function openingMessage(): GuideReply {
  return OPENING;
}

export function answer(question: string): GuideReply {
  const asked = question.slice(0, 240);
  const entry = ENTRIES.find((candidate) => candidate.match.test(asked));
  return entry ? { topic: entry.topic, text: entry.text, suggestions: entry.suggestions } : FALLBACK;
}

/** Every suggestion offered anywhere, so a check can prove each one has an answer. */
export function allSuggestions(): string[] {
  return [...new Set([OPENING, FALLBACK, ...ENTRIES].flatMap((entry) => entry.suggestions ?? []))];
}
