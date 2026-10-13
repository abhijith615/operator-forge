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
  /* The Floor Lead's question. Ahead of the decline below, because "what do I tell him" is the label being asked about. */
  {
    topic: "floor_lead_reply",
    match: /\b(tell him|answer to (him|the floor lead)|floor lead (says?|said|thinks?|means?|is (wrong|right))|his read|store (is |actually )?stuck|nothing is stuck|it.?s holding|not sure yet)\b/i,
    text: "The Floor Lead is giving you his read of why orders are backing up. It is what he can see from where he stands, and it may or may not be the reason. The panels under “Look at the floor” show what each part of the store is doing right now. Your answer tells him where you think the store is stuck: picking (not enough hands on orders), putaway (bins running empty), the riders (packed bags waiting to leave), Aisle C (blocked), nothing (the floor is keeping up), or that you are not sure yet. You can change your answer until you move on.",
    suggestions: ["What do the percentages mean?", "What is pick speed?"],
  },
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
    match: /\b(store (time|clock)|05:\d\d|06:\d\d|clock (jump|moves?|skip)\w*|why did (the )?time)\b/i,
    text: "The clock next to “Store 114” is the store's own time, starting at 05:55. It moves when you do something that takes a manager's time — opening a record, counting stock, waiting for someone to report back. It is separate from your timer, which is real time.",
    suggestions: ["How does the time work?", "What is CTD?"],
  },
  {
    topic: "time",
    match: /\b(how long|time (left|limit|remaining)|timer|30 min\w*|thirty|countdown|run out|runs? out|expire\w*|pace|pacing|too slow|hurry|behind|time)\b/i,
    text: "Your time is real time, shown top right; it does not pause. The shift has six parts, shown in the bar at the top: yellow is the part you are in, and the white mark is where the time is. If the mark is ahead of the yellow, you are behind the suggested pace. As a rough guide for a thirty-minute sitting: handover 2 minutes, team 8, inventory 6, peak 9, recovery 2, final call 3. If the time ends first, the shift closes on the decisions you have already made — the parts you did not reach are left out, not scored against you.",
    suggestions: ["What is the store clock?", "What if I lose connection?"],
  },
  {
    topic: "connection",
    match: /\b(refresh\w*|reload\w*|connection|internet|offline|network|disconnect\w*|close(d)? the (tab|page)|battery|crash\w*|resume)\b/i,
    text: "Your progress is saved as you go. If the page reloads or the connection drops, open the same link again in the same browser on the same device: you come back to where you were. If you signed in with an email address, signing in with it again does the same from any device. The timer keeps running while you are away.",
    suggestions: ["How does the time work?"],
  },
  {
    topic: "final_call",
    match: /\b(do now|lock (shift )?plan|final call|open tasks|max(imum)? ?3|three (at most|max))\b/i,
    text: "At the final call every open task goes into one of three places: Do now (you, personally — three at most), Delegate (a named owner — three at most), or After peak. Every task needs a place before the plan can be locked. Once it is locked, the store runs to 06:50 on that plan and you cannot change it.",
    suggestions: ["How does delegating work?", "What is “load”?"],
  },
  {
    topic: "device_lock",
    match: /\b(unlock\w*|lock\w*|devices?|handhelds?|hht|spikes?)\b/i,
    text: "Every associate works from a handheld. A manager can lock a device to a role — putaway or auditing — and it then gets only that work. An unlocked device on putaway or auditing is sent customer orders by the app whenever more orders are waiting than the pickers can clear, and its own work stops while it picks. A picker's device is always on orders. On the floor board, tap a person on putaway or auditing and use “Device” to lock or unlock. A device that changes role comes up unlocked.",
    suggestions: ["What is the flexible reserve?", "What are the three kinds of work?"],
  },
  {
    topic: "ctd",
    match: /\b(ctd|click.?to.?dispatch|dispatch time)\b/i,
    text: "CTD is click-to-dispatch: the seconds from a customer placing an order to the packed bag leaving the store with a rider. The target is 180 seconds. It rises when orders queue — waiting to be picked, or packed and waiting for a rider.",
    suggestions: ["What is “Waiting”?", "What is pick speed?", "What do the percentages mean?"],
  },
  {
    topic: "promise",
    match: /\b(sla|promise\w*|ten minutes|10 min\w*|delivery (time|radius)|radius)\b/i,
    text: "The customer is promised delivery in about ten minutes. The app works that out from two things: how long the store takes to pick and pack, and the rider's trip, which depends on how far away the customer is. The store's part of it is CTD.",
    suggestions: ["What is CTD?", "What are standby riders?"],
  },
  {
    topic: "ppi",
    match: /\b(ppi|pick speed|seconds (per|an) item|per item|16.?sec\w*|sixteen)\b/i,
    text: "Pick speed, or PPI, is the seconds it takes to pick one item — lower is faster. The store standard is 16 seconds an item, so a ten-item order is given about 160 seconds. The figure in the header is across everybody picking right now. It gets worse when pickers have further to walk or reach an empty bin, as well as when somebody is slow.",
    suggestions: ["What is CTD?", "What are the three kinds of work?"],
  },
  {
    topic: "staged",
    match: /\b(staged|staging|bags? waiting)\b/i,
    text: "A staged bag is an order that has been picked and packed and is sitting on the staging shelf, waiting for a rider to take it. A few is normal.",
    suggestions: ["What is CTD?", "What are standby riders?"],
  },
  {
    topic: "orders_waiting",
    match: /\b(orders? waiting|waiting\b|backlog|orders? (are )?backing)\b/i,
    text: "“Waiting” is the number of orders in the store that have not left yet — those being worked on plus any queueing. Some are always in progress, so it is never zero.",
    suggestions: ["What is CTD?", "What is pick speed?"],
  },
  {
    topic: "coverage",
    match: /(\d ?%|\b(percent\w*|coverage|capacity|forecast|bars?|projected)\b)/i,
    text: "Each percentage is capacity measured against the work being asked for. 100% is exactly enough. Picking counts the pickers, plus the share of their time the app will take from unlocked devices. Putaway is the people filling bins against what is selling, less the time the app takes from any of them whose device is unlocked. Riders is riders logged in against bags going out. So moving a picker to putaway with their device unlocked changes less than it looks as if it should: in the rush the app sends that person orders again. The line under each bar says how the number is made up. On the floor board the figures are for 06:30, the forecast peak, with the floor as it is now. In the panels during the shift they are right now.",
    suggestions: ["What are the three kinds of work?", "What is the flexible reserve?", "What is “load”?"],
  },
  {
    topic: "load",
    match: /\bload\b/i,
    text: "Load is the same thing as coverage, seen from the other side: how hard a kind of work is being asked to run against what its people can do. Over 100% means work is arriving faster than it is leaving.",
    suggestions: ["What do the percentages mean?"],
  },
  {
    topic: "reserve",
    match: /\b(flex\w*( reserve)?|reserve|cross.?train\w*|spare)\b/i,
    text: "The flexible reserve counts unlocked devices on putaway or auditing whose own work can spare them. They are who the app sends orders to if the rush turns out bigger than the forecast.",
    suggestions: ["What does “unlocked” mean?", "What do “Strong” and “Trained” mean?"],
  },
  {
    topic: "skill_words",
    match: /\b(strong|trained|can cover|not trained|skill\w*|authori[sz]ed|capab\w*)\b/i,
    text: "Under each name is how well that person does the work they are on: Strong, Trained, Can cover, or Not trained. Tap a person to see all three kinds of work, what they are authorised for, and a note about them.",
    suggestions: ["How do I move someone?", "What are the three kinds of work?"],
  },
  {
    topic: "move_people",
    match: /\b(how (do|can) i (move|assign|change|reassign)|move (some(one|body)|a (person|worker)|people|staff)|reassign|drag)\b/i,
    text: "Tap a person on the floor board. Their card opens with what they are trained for; under “Move to” you tap the work to send them to, and under “Device” you lock or unlock their handheld. The percentages update straight away. Later in the shift, “Move a worker…” and “Lock or unlock a device…” do the same from a list.",
    suggestions: ["What do the percentages mean?", "Why can’t I move Riya?"],
  },
  {
    topic: "riya_fixed",
    match: /\b(riya|induction|new joiners?)\b/i,
    text: "Riya joined yesterday through the staffing agency. A new joiner spends the first day or two on putaway only — learning the racks, the bin codes and the scanner — with no picking target, and moves on to picking and auditing after that. The floor board does not move her. What happens with her comes up during the shift.",
    suggestions: ["What is pick speed?", "What does “unlocked” mean?"],
  },
  {
    topic: "nil_pick",
    match: /\b(nil.?pick|item not found|inf\b|empty (bin|shelf|face)|bin (is )?(0|empty))\b/i,
    text: "A nil pick is an item the picker went to collect and did not find in its bin, even though the system shows stock. Authorising it sends the order without that item and refunds the line. De-listing takes the item off sale in the app altogether.",
    suggestions: ["What is overstock?", "What is the inward dock?"],
  },
  {
    topic: "stock_locations",
    match: /\b(overstock|inward dock|dock|adjacent bin|inbound|inward\w*|crates?|goods receipt|grn|recent transactions|bins?|mother warehouse|back ?room)\b/i,
    text: "Stock can be in more than one place. The bin is the rack slot pickers take from. The overstock bay is the reserve for the same item. The inward dock is where crates from the mother warehouse wait to be put away. An adjacent bin is the neighbouring slot, where something may have been put by mistake. Recent transactions lists what was received, moved and sold.",
    suggestions: ["What is a nil pick?", "What is putaway?"],
  },
  {
    topic: "putaway",
    match: /\b(put.?away|replenish\w*|threshold)\b/i,
    text: "Putaway is taking stock that has arrived from the mother warehouse and shelving it into its bin. The system raises a putaway task by itself when a bin drops below its threshold. If putaway falls behind, bins run empty and pickers arrive to find nothing there.",
    suggestions: ["What is the inward dock?", "What does “unlocked” mean?"],
  },
  {
    topic: "auditing",
    match: /\b(audit\w*|cycle count|wall.?to.?wall|w2w|perishable\w*|expiry|short.?dated|fresh lines?)\b/i,
    text: "Auditing is checking the physical stock against the system with the handheld scanner: the quantity, that it is in the right bin, damage, and dates. The perishables check is done every morning before the rush — milk, bread, eggs, fruit and vegetables, for date and quality. A cycle count covers some bins each day. A wall-to-wall count covers the whole store.",
    suggestions: ["What is variance?", "What does “unlocked” mean?"],
  },
  {
    topic: "riders",
    match: /\b(riders?|standby|batch\w*|handover point|by lane)\b/i,
    text: "Riders collect staged bags and deliver them. Nine are rostered this morning, and the handover screen shows how many have logged in. Two standby riders can be called from the rider partner for ₹300. Batching by lane gives one rider two nearby orders. Putting somebody on the rider handover means they sequence riders and bags at the handover point, and leave their own work to do it.",
    suggestions: ["What is CTD?", "What do the percentages mean?"],
  },
  {
    topic: "stations",
    match: /\b(stations?|workflows?|picking|pickers?|pack(ing|er|ers)?|three kinds of work)\b/i,
    text: "Three kinds of work. Picking is the whole order: collect the items from the bins, pack the bag and stage it for a rider — one person does all of it. Putaway gets the crates from the mother warehouse into bins. Auditing checks stock against the system, starting with the morning perishables check. Putaway and auditing do not touch orders, unless a device is unlocked and the app sends it some.",
    suggestions: ["What does “unlocked” mean?", "What do the percentages mean?"],
  },
  {
    topic: "exception",
    match: /\b(totes?|exception (area|tote)|restow\w*|cancel\w*)\b/i,
    text: "The exception tote is a separate crate for items that were picked but could not be sent — a cancelled order, a damaged pack. Restowing means putting such an item back in its bin so it is sellable stock again.",
    suggestions: ["What do the records show?", "What is a nil pick?"],
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
    text: "High-value items are kept in a locked cage and only authorised associates can go in. An alert means the system's count of an item needs checking. “System” is what the records say is there; “Physical” is what is actually in the cage, which nobody knows until it is counted.",
    suggestions: ["What is variance?", "What do the records show?"],
  },
  {
    topic: "variance",
    match: /\b(varianc\w*|exposure|system (count|number|says)|physical|mismatch|discrepan\w*|short(age)?)\b/i,
    text: "Variance is physical count minus system count: −3 means three fewer in the cage than the records say. Exposure is that number times the unit value — the money the difference represents.",
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
    text: "Five records. The movement log lists every stock movement for the item since it was last counted. Orders lists customer orders containing it. The scan log shows each scan at issue and at pack. The access log shows who entered the cage and when. The exception area shows what is physically in the exception tote. Opening one takes a little store time; you can open them yourself or have somebody pull all five.",
    suggestions: ["What is the exception tote?", "What is variance?"],
  },
  {
    topic: "delegation",
    match: /\b(handle myself|assign to|delegat\w*|owner|strong fit|weak fit|possible, slower|fit\b|while away)\b/i,
    text: "Most work can be done by you or given to somebody. “Handle myself” takes your own time, shown as minutes off the floor. Under “Assign to”, each person shows how well suited they are to that job and what their own work drops to while they are away from it. “Part of the job where they stand” means it does not take them away at all.",
    suggestions: ["What is the attention slot?", "What do the percentages mean?"],
  },
  {
    topic: "attention_slot",
    match: /\b(attention( slot)?|personal slot|handle\b|after peak|three problems)\b/i,
    text: "At one point three things need dealing with at once. For each you choose Handle (do it yourself), Delegate (name an owner) or After peak (leave it until later). You can only be in one place: the first thing you choose to handle personally gets done, and any others you mark Handle wait until you are free.",
    suggestions: ["How does delegating work?"],
  },
  {
    topic: "absence",
    match: /\b(agency|on.?demand|temp(orary)?|booking|₹ ?640|₹ ?160|by the hour|hourly|call in|extra staff|additional staff|extend|overtime|operate short|reallocat\w*|absen\w*)\b/i,
    text: "Agency staff are extra pickers from the staffing agency, paid by the hour: ₹160 an hour each with a four-hour minimum, so ₹640 each. Up to two can be called in, from the floor board or when the absence comes up. They arrive at 06:20 and can only pick, because they do not know the racks. The absence has three other answers, and they can be combined: internal reallocation opens the floor board so you can move the people you have and set their devices; asking an associate to extend means asking Arjun, whose overnight shift ends at 06:30, to stay to 08:30; operating short means running with the twelve present.",
    suggestions: ["What do the percentages mean?", "How do I move someone?"],
  },
  {
    topic: "bottleneck_controls",
    match: /\b(fast lines?|slow (order )?release|order release|pause the (cycle )?count|run 3 minutes|run the system|check the floor|aisle)\b/i,
    text: "On the floor screen you can change things and then run the store for three minutes to see what happens. You can move a worker, or lock or unlock a device. Fast lines first puts away only what is selling. Batch by lane gives one rider two nearby orders. Pause the cycle count stops the routine counts for now. You can put somebody on the rider handover, or call the standby riders. Clear Aisle C moves the crates blocking it. Slow order release holds new orders back for ten minutes, which customers see as a longer delivery promise. After running, “Check the floor” shows the numbers before and after.",
    suggestions: ["What is CTD?", "What does “unlocked” mean?"],
  },
  {
    topic: "liner",
    match: /\b(liner|secondary|extra bag|bag 1|move (it|an item)|repack\w*)\b/i,
    text: "On the bag screen, tap an item to move it between Bag 1 and the extra bag. The secondary liner is a sealed inner bag that goes around one item. “If repacked” shows what this order's dispatch time becomes if the bag is changed.",
    suggestions: ["What is CTD?"],
  },
  {
    topic: "people",
    match: /\b(floor lead|assistant store manager|asm|who is|who are|arjun|manu|rahul|sneha|farhan|deepa|kiran|lakshmi|vishnu|anjali|joseph|team)\b/i,
    text: "You are the Assistant Store Manager taking the morning shift, 06:00 to 15:00. The night-shift ASM is handing over to you. The Floor Lead supervises the floor and reports to you. Twelve associates are on the floor — the same twelve all morning; most come through a staffing agency. Tap any of them on the floor board to see what they are trained for.",
    suggestions: ["What do “Strong” and “Trained” mean?", "How do I move someone?"],
  },
  {
    topic: "dark_store",
    match: /\b(dark store|store 114|quick commerce|what is this (store|place))\b/i,
    text: "A dark store is a small warehouse that only fulfils app orders — no walk-in customers. An order is picked from the bins, packed, and handed to a rider within a few minutes. Stock arrives in crates from a mother warehouse. Store 114 is the one you are running this morning.",
    suggestions: ["What are the three kinds of work?", "What is CTD?"],
  },
  {
    topic: "how_it_works",
    match: /\b(how (does|do) (this|the test|it) work|what is this|what do i do here|instructions?|help|explain|get started|confused|don.?t understand|stuck)\b/i,
    text: "You are running one dark store through a morning. Each screen is something that needs a decision: read what is there, open anything you want to look at, then act with the yellow button. What you decide stays decided and shapes what comes next. The bar at the top shows which of the six parts you are in, and I can explain any word or number on the screen.",
    suggestions: ["How does the time work?", "What is CTD?", "How am I assessed?"],
  },
];

const FALLBACK: GuideReply = {
  topic: "no_match",
  text: "I do not have an answer for that. I can explain what is on the screen — CTD, pick speed, the percentages, device locks, a nil pick, the records, how to move or assign people, how the time works. I cannot say what you should decide.",
  suggestions: ["What is CTD?", "What does “unlocked” mean?", "How does the time work?"],
};

const OPENING: GuideReply = {
  topic: "opening",
  text: "Ask me what anything on the screen means: a word, a number, a button, how the time works. I will not tell you what to decide. The timer keeps running while you read.",
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
