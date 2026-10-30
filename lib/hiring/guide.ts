/**
 * The assistant a candidate can ask.
 *
 * It explains the screen: what a word means, what a number measures, how the
 * controls work, how the thirty minutes run. It does not say what to do with
 * any of it. A candidate who does not know what dispatch time is should not be
 * scored on that, and a candidate who asks which option is best should get a
 * polite no — from the same assistant, in the same words, for everybody.
 *
 * That last part is why this is a written set of answers and not a model
 * call. An assessment has to treat every candidate identically, and a model
 * that can be talked round by one candidate and not another does not. It also
 * means nothing here can leak a scoring rule, because none is in it.
 *
 * The answers are in very simple English: short sentences, everyday words.
 * Each one still knows the older store words (CTD, nil pick, exception tote,
 * auditing…), so a candidate who uses them is understood too.
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
  "You must decide that yourself. That is what the test checks. I can explain anything on the screen: what a number means, what a record shows, or what a button does.";

const ENTRIES: Entry[] = [
  /* The Floor Lead's question. Ahead of the decline below, because "what do I tell him" is the label being asked about. */
  {
    topic: "floor_lead_reply",
    match: /\b(tell him|answer to (him|the floor lead)|floor lead (says?|said|thinks?|means?|is (wrong|right))|his read|what he thinks|store (is |actually )?stuck|nothing is stuck|it.?s holding|not sure yet)\b/i,
    text: "The Floor Lead tells you what he thinks is wrong. He says what he can see. He may be right or wrong. The tiles under “Check the store” show what each part of the store is doing now. Your answer tells him where you think the store is stuck: picking (not enough people picking), putaway (shelf bins are empty), riders (packed bags are waiting), Aisle C (it is blocked), nothing (the store is keeping up), or not sure yet. You can change your answer before you move on.",
    suggestions: ["What do the percentages mean?", "What is pick speed?"],
  },
  /* Asked for the answer. Checked first, so "what should I do about the nil pick" is a no, not a definition. */
  {
    topic: "asked_for_answer",
    match: /\b(what (should|do|would) (i|you)|which (one|option|is (best|right|correct))|best (option|answer|choice|move)|right (answer|option|choice)|correct (answer|option)|tell me (the answer|what to)|what is the answer|should i\b|is it (ok|okay|right|better) to|recommend|advi[cs]e|hint)\b/i,
    text: DECLINE,
    suggestions: ["How does the test work?", "What is dispatch time?", "How do I move someone?"],
  },
  {
    topic: "scoring",
    match: /\b(scor\w*|marks?|(?<!pickup )points?|graded?|judged|evaluat\w*|assess\w*|pass(ed|ing)?|fail\w*|result)\b/i,
    text: "You are scored on what you do in the store: your choices, and what they lead to later. The test does not tell you if a choice is right or wrong. I cannot tell you what scores well. How fast you tap is not measured. You see your profile when the shift ends.",
    suggestions: ["How does the time work?", "What happens if I run out of time?"],
  },
  {
    topic: "store_clock",
    match: /\b(store (time|clock)|05:\d\d|06:\d\d|clock (jump|moves?|skip)\w*|why did (the )?time|stuck|frozen|freez\w*|hang\w*|not moving|nothing (is )?happen\w*|still (counting|searching)|waiting for|back at|wait button)\b/i,
    text: "The clock next to “Store 114” is the store’s own time. It starts at 05:55. It moves only when you do something: open a record, count stock, make a choice. It does not move by itself. If someone is counting or searching for you, tap Wait. The clock moves to the time they come back. Doing other things can also move the clock past that time. This clock is not your timer. Your timer is real time and does not stop.",
    suggestions: ["How does the time work?", "What is dispatch time?"],
  },
  /* Before "time", which would otherwise answer "what is dispatch time". */
  {
    topic: "ctd",
    match: /\b(ctd|click.?to.?dispatch|dispatch( time)?)\b/i,
    text: "Dispatch time (CTD) is the seconds from when a customer orders to when the packed bag leaves with a rider. The target is 180 seconds. It goes up when orders wait: waiting to be picked, or packed and waiting for a rider.",
    suggestions: ["What is “Waiting”?", "What is pick speed?", "What do the percentages mean?"],
  },
  {
    topic: "time",
    match: /\b(how long|time (left|limit|remaining)|timer|30 min\w*|thirty|countdown|run out|runs? out|expire\w*|pace|pacing|too slow|hurry|behind|time)\b/i,
    text: "Your timer is real time. It is at the top right, and it does not stop. The bar at the top shows the 6 parts of the shift. Yellow is the part you are in. The white mark shows where your time is. If the mark is ahead of the yellow, you are slower than the suggested pace. A rough guide for 30 minutes: Start 2 minutes, Team 8, Stock 6, Rush 9, After rush 2, Final plan 3. If the time ends first, the shift ends with the choices you made. Parts you did not reach count as zero, so keep moving.",
    suggestions: ["What is the store clock?", "What if I lose connection?"],
  },
  {
    topic: "connection",
    match: /\b(refresh\w*|reload\w*|connection|internet|offline|network|disconnect\w*|close(d)? the (tab|page)|battery|crash\w*|resume)\b/i,
    text: "Your work is saved as you go. If the page reloads or the internet stops, open the same link again. Use the same browser on the same phone or computer. You come back to the same place. If you signed in with email, signing in again does the same on any device. The timer keeps running while you are away.",
    suggestions: ["How does the time work?"],
  },
  {
    topic: "final_call",
    match: /\b(do now|lock (shift )?plan|final (call|plan)|open tasks|tasks still open|confirm the plan|max(imum)? ?3|three (at most|max))\b/i,
    text: "In the final plan, each open task goes in one of three places. Do it myself: you do it (3 at most). Hand over: you name a person (3 at most). After rush: it waits. Every task needs a place before you can confirm the plan. After you confirm, the store runs until 06:50 with that plan. You cannot change it.",
    suggestions: ["How does delegating work?", "What is “load”?"],
  },
  {
    topic: "device_lock",
    match: /\b(unlock\w*|lock\w*|devices?|handhelds?|hht|spikes?)\b/i,
    text: "Every worker uses a handheld device. You can lock a device to one job: putaway or checking. Then it gets only that work. An unlocked device on putaway or checking gets customer orders from the app when too many orders are waiting. Its own work stops while it picks. A picker’s device always gets orders. On the team board, tap a person on putaway or checking. Use “Device” to lock or unlock. When you move someone to a new job, their device becomes unlocked.",
    suggestions: ["What are backup people?", "What are the three kinds of work?"],
  },
  {
    topic: "promise",
    match: /\b(sla|promise\w*|ten minutes|10 min\w*|delivery (time|radius)|radius)\b/i,
    text: "Customers are promised delivery in about 10 minutes. The app works this out from two things: how long the store takes to pick and pack, and how long the ride takes. The store’s part is the dispatch time.",
    suggestions: ["What is dispatch time?", "What are extra riders?"],
  },
  {
    topic: "ppi",
    match: /\b(ppi|pick speed|seconds (per|an) item|per item|16.?sec\w*|sixteen)\b/i,
    text: "Pick speed (PPI) is the seconds to pick one item. Lower is faster. The store target is 16 seconds per item, so an order of 10 items gets about 160 seconds. The number at the top is for all pickers right now. It gets worse when pickers walk further or find an empty bin, not only when someone is slow.",
    suggestions: ["What is dispatch time?", "What are the three kinds of work?"],
  },
  {
    topic: "staged",
    match: /\b(staged|staging|bags? waiting|rider shelf)\b/i,
    text: "A bag waiting for a rider is an order that is picked and packed. It sits on the rider shelf (staging) until a rider takes it. A few bags waiting is normal.",
    suggestions: ["What is dispatch time?", "What are extra riders?"],
  },
  {
    topic: "orders_waiting",
    match: /\b(orders? waiting|waiting\b|backlog|orders? (are )?(backing|piling))\b/i,
    text: "“Waiting” is the number of orders in the store that have not left yet. It counts orders being worked on and orders in the queue. Some are always being worked on, so it is never zero.",
    suggestions: ["What is dispatch time?", "What is pick speed?"],
  },
  {
    topic: "coverage",
    match: /(\d ?%|\b(percent\w*|coverage|capacity|forecast|bars?|projected|enough people)\b)/i,
    text: "Each percentage compares the people on a job to the work needed. 100% means just enough. Below 100% means not enough. Picking counts the pickers, plus the time the app takes from unlocked devices. Putaway counts the people filling bins, minus the time the app takes from unlocked ones. Riders counts riders logged in against bags going out. So if you move a picker to putaway and leave the device unlocked, it changes less than you expect: in the rush, the app sends that person orders again. The line under each bar explains the number. On the team board, the numbers are for 06:30, the busiest time. Later in the shift, they are for right now.",
    suggestions: ["What are the three kinds of work?", "What are backup people?", "What is “load”?"],
  },
  {
    topic: "load",
    match: /\bload\b/i,
    text: "Load shows how busy a job is compared to what its people can do. Over 100% means work comes in faster than it goes out.",
    suggestions: ["What do the percentages mean?"],
  },
  {
    topic: "reserve",
    match: /\b(flex\w*( reserve)?|reserve|backup( people)?|cross.?train\w*|spare)\b/i,
    text: "Backup people are workers on putaway or checking whose device is unlocked and whose own work can wait. If the rush is bigger than expected, the app sends them orders.",
    suggestions: ["What does “unlocked” mean?", "What do “Strong” and “Trained” mean?"],
  },
  {
    topic: "skill_words",
    match: /\b(strong|trained|can cover|not trained|skill\w*|authori[sz]ed|allowed|capab\w*|good fit|poor fit)\b/i,
    text: "Under each name you see how good that person is at their job: Strong, Trained, Can cover, or Not trained. Tap a person to see all three jobs, what they are allowed to do, and a short note about them.",
    suggestions: ["How do I move someone?", "What are the three kinds of work?"],
  },
  {
    topic: "move_people",
    match: /\b(how (do|can) i (move|assign|change|reassign)|move (some(one|body)|a (person|worker)|people|staff)|reassign|drag)\b/i,
    text: "Tap a person on the team board. Their card opens. Under “Move to”, tap the job to send them to. Under “Device”, lock or unlock their device. The percentages change straight away. Later in the shift, “Move a worker…” and “Lock or unlock a device…” do the same from a list.",
    suggestions: ["What do the percentages mean?", "Why can’t I move Riya?"],
  },
  {
    topic: "riya_fixed",
    match: /\b(riya|induction|new joiners?|training plan)\b/i,
    text: "Riya joined yesterday through the agency. New workers do only putaway for the first day or two. They learn the racks, the bins and the scanner. They have no picking target. After that, they move to picking and checking. You cannot move her on the team board. You will meet her later in the shift.",
    suggestions: ["What is pick speed?", "What does “unlocked” mean?"],
  },
  {
    topic: "nil_pick",
    match: /\b(nil.?pick|item not found|not found|inf\b|empty (bin|shelf|face)|bin (is )?(0|empty)|not available)\b/i,
    text: "“Item not found” (a nil pick) means a picker went to the shelf bin and the item was not there, but the system says there is stock. “Mark it as not available” sends the order without that item and refunds it. “Stop selling the item” takes it off sale in the app.",
    suggestions: ["What is the extra stock area?", "What is the receiving area?"],
  },
  {
    topic: "stock_locations",
    match: /\b(overstock|extra stock|receiving( area)?|inward dock|dock|adjacent bin|bin next|inbound|inward\w*|crates?|goods receipt|grn|recent (transactions|stock records)|bins?|mother warehouse|main warehouse|back ?room)\b/i,
    text: "Stock can be in more than one place. The shelf bin is where pickers take items from. The extra stock area holds more of the same item. The receiving area is where crates from the main warehouse wait to go on the shelves. The bin next to it is where an item may be put by mistake. Recent stock records show what was received, moved and sold.",
    suggestions: ["What does item not found mean?", "What is putaway?"],
  },
  {
    topic: "putaway",
    match: /\b(put.?away|replenish\w*|threshold|refill)\b/i,
    text: "Putaway means taking new stock from the main warehouse and putting it in its shelf bin. When a bin gets low, the system makes a putaway task by itself. If putaway is too slow, bins become empty and pickers find nothing.",
    suggestions: ["What is the receiving area?", "What does “unlocked” mean?"],
  },
  {
    topic: "auditing",
    match: /\b(audit\w*|checking|stock checks?|stock count|cycle count|full store count|wall.?to.?wall|w2w|perishable\w*|fresh food|expiry|short.?dated|fresh lines?)\b/i,
    text: "Checking means comparing the stock on the shelves with the system, using the handheld scanner. It checks the quantity, the right bin, damage and dates. The fresh food check is done every morning before the rush: the dates and quality of milk, bread, eggs, fruit and vegetables. A stock count covers some bins each day. A full store count covers the whole store.",
    suggestions: ["What does “Missing” mean?", "What does “unlocked” mean?"],
  },
  {
    topic: "riders",
    match: /\b(riders?|standby|batch\w*|handover point|pickup point|by lane|group nearby)\b/i,
    text: "Riders take packed bags and deliver them. 9 riders are planned this morning. The start screen shows how many logged in. You can call 2 extra riders from the rider company for ₹300. “Group nearby orders” gives one rider two orders that are close together. Putting someone at the rider pickup point means they organise riders and bags there. They leave their own work to do it.",
    suggestions: ["What is dispatch time?", "What do the percentages mean?"],
  },
  {
    topic: "stations",
    match: /\b(stations?|workflows?|jobs?|picking|pickers?|pack(ing|er|ers)?|three kinds of work)\b/i,
    text: "There are three jobs. Picking is the whole order: take the items from the bins, pack the bag, and put it out for a rider. One person does all of it. Putaway moves new stock from crates into the shelf bins. Checking compares stock with the system, starting with the fresh food check. Putaway and checking do not do orders, unless their device is unlocked and the app sends them orders.",
    suggestions: ["What does “unlocked” mean?", "What do the percentages mean?"],
  },
  {
    topic: "exception",
    match: /\b(totes?|problem box|box e.?2|e.?2|exception (area|tote)|restow\w*|put back|cancel\w*)\b/i,
    text: "Problem box E-2 (the exception tote) is a separate box for items that were picked but could not be sent, like a cancelled order or a damaged pack. These items should be put back on the shelf so they can be sold again.",
    suggestions: ["What do the records show?", "What does item not found mean?"],
  },
  {
    topic: "delist",
    match: /\b(de.?list\w*|off sale|unlist\w*|stop selling)\b/i,
    text: "“Stop selling the item” (de-list) takes it off sale in the app. Customers cannot order it from this store until it is put back on sale.",
    suggestions: ["What does item not found mean?"],
  },
  {
    topic: "high_value",
    match: /\b(high.?value|expensive|cage|alert)\b/i,
    text: "Expensive items are kept in a locked cage. Only allowed workers can go in. “In the system” is what the records say is there. “In the cage” is what is really there. Nobody knows that number until someone counts.",
    suggestions: ["What does “Missing” mean?", "What do the records show?"],
  },
  {
    topic: "variance",
    match: /\b(varianc\w*|exposure|value missing|missing\b|system (count|number|says)|in the system|physical|mismatch|discrepan\w*|short(age)?)\b/i,
    text: "“Missing” is the cage count minus the system count. −3 means 3 fewer items in the cage than the records say. “Value missing” is that number times the price of one item: the money it is worth.",
    suggestions: ["What do the records show?", "What do the five groups mean?"],
  },
  {
    topic: "unit_piles",
    match: /\b(explained( by records)?|records explain|recovered|found it|unresolved|still missing|stolen|write.?off|write it off|place each unit|five groups|which group|account for)\b/i,
    text: "When you close the case, you put each missing item in one of five groups. The records explain it: the records show where it went. Found it: someone has found it. Still missing: nobody knows yet. Write it off: remove it from stock as a loss. Stolen: record it as theft. Use + and − to place them. Every missing item must go in a group.",
    suggestions: ["What does “Missing” mean?", "What do the records show?"],
  },
  {
    topic: "records",
    match: /\b(records?|movement log|scan log|access log|cage entry log|orders (tab|list|record)|logs?)\b/i,
    text: "There are five records. The stock movement log lists every stock change for the item since the last count. Orders lists customer orders with the item. The scan log shows each scan when the item was picked and packed. The cage entry log shows who opened the cage and when. Problem box E-2 shows what is inside that box now. Opening a record takes a little store time. You can open them yourself, or ask someone to get all five.",
    suggestions: ["What is the problem box?", "What does “Missing” mean?"],
  },
  {
    topic: "delegation",
    match: /\b(handle myself|do it myself|assign to|give it to|hand over|delegat\w*|owner|given to|strong fit|weak fit|good fit|poor fit|possible, slower|can do it, slower|fit\b|while away)\b/i,
    text: "You can do most work yourself, or give it to someone. “Do it myself” uses your own time; it shows how many minutes you are away from the floor. Under “Or give it to”, each person shows how good they are at this job, and what happens to their own work while they are away. “Part of their current job” means it does not take them away.",
    suggestions: ["Why can I do only one myself?", "What do the percentages mean?"],
  },
  {
    topic: "attention_slot",
    match: /\b(attention( slot)?|personal slot|handle\b|after (the )?(peak|rush)|three problems|only one( of them)?( myself| yourself)?)\b/i,
    text: "At one point, three problems come at the same time. For each one, choose: Do it myself, Hand over (name a person), or After rush (it waits). You can only be in one place. The first one you do yourself gets done. Any other one you mark “Do it myself” waits until you are free.",
    suggestions: ["How does delegating work?"],
  },
  {
    topic: "absence",
    match: /\b(agency|on.?demand|temp(orary)?|booking|₹ ?640|₹ ?160|by the hour|hourly|call in|extra staff|additional staff|extend|stay longer|overtime|operate short|fewer people|reallocat\w*|absen\w*|missing staff)\b/i,
    text: "Agency workers are extra pickers from the agency. Each one costs ₹160 an hour, for at least 4 hours, so ₹640. You can call up to 2, from the team board or when two staff are missing. They come at 06:20. They can only pick, because they do not know the racks. When staff are missing, there are three other choices, and you can pick more than one. Move your own people: opens the team board. Ask someone to stay longer: ask Arjun, whose night shift ends at 06:30, to stay until 08:30. Work with fewer people: run with the 12 you have.",
    suggestions: ["What do the percentages mean?", "How do I move someone?"],
  },
  {
    topic: "bottleneck_controls",
    match: /\b(fast lines?|fast.?selling|slow (order )?release|slow down|order release|pause the (cycle )?count|stop the stock count|run 3 minutes|let 3 minutes pass|run the system|check the (floor|store)|aisle)\b/i,
    text: "On this screen you can make changes, then let 3 minutes pass to see what happens. You can move a worker, or lock or unlock a device. “Fast-selling items first” puts only fast-selling items on the shelves. “Group nearby orders” gives one rider two close orders. “Stop the stock count” stops the usual counts for now. You can put someone at the rider pickup point, or call the extra riders. “Clear Aisle C” moves the crates that block it. “Slow down new orders” holds new orders for 10 minutes, so customers see a longer delivery time. After 3 minutes, “Check the store” shows the numbers before and after.",
    suggestions: ["What is dispatch time?", "What does “unlocked” mean?"],
  },
  {
    topic: "liner",
    match: /\b(liner|inner bag|secondary|extra bag|other bag|bag 1|move (it|an item)|repack\w*|pack(ed)? (it )?again)\b/i,
    text: "On the bag screen, tap an item to move it between Bag 1 and the extra bag. An inner bag is a sealed bag that goes around one item. “If packed again” shows what this order’s dispatch time becomes if you change the bag.",
    suggestions: ["What is dispatch time?"],
  },
  {
    topic: "people",
    match: /\b(floor lead|assistant store manager|asm|who is|who are|arjun|manu|rahul|sneha|farhan|deepa|kiran|lakshmi|vishnu|anjali|joseph|team)\b/i,
    text: "You are the Assistant Store Manager for the morning shift. The night-shift manager hands the store to you. The Floor Lead runs the floor and reports to you. 12 workers are here, the same 12 all morning. Most come through an agency. Tap anyone on the team board to see what they are good at.",
    suggestions: ["What do “Strong” and “Trained” mean?", "How do I move someone?"],
  },
  {
    topic: "dark_store",
    match: /\b(dark store|store 114|quick commerce|what is this (store|place))\b/i,
    text: "A dark store is a small warehouse that only handles app orders. No customers walk in. Each order is picked from the bins, packed, and given to a rider within a few minutes. Stock comes in crates from a main warehouse. Store 114 is the store you run this morning.",
    suggestions: ["What are the three kinds of work?", "What is dispatch time?"],
  },
  {
    topic: "how_it_works",
    match: /\b(how (does|do) (this|the test|it) work|what is this|what do i do here|instructions?|help|explain|get started|confused|don.?t understand|stuck)\b/i,
    text: "You run one dark store for one morning. Each screen needs a choice. Read the screen. Open anything you want to check. Then use the yellow button. Your choices stay, and they change what happens next. The bar at the top shows which of the 6 parts you are in. I can explain any word or number on the screen.",
    suggestions: ["How does the time work?", "What is dispatch time?", "How am I assessed?"],
  },
];

const FALLBACK: GuideReply = {
  topic: "no_match",
  text: "I do not have an answer for that. I can explain what is on the screen: dispatch time, pick speed, the percentages, device locks, item not found, the records, how to move or give work to people, and how the time works. I cannot tell you what to choose.",
  suggestions: ["What is dispatch time?", "What does “unlocked” mean?", "How does the time work?"],
};

const OPENING: GuideReply = {
  topic: "opening",
  text: "Ask me what anything on the screen means: a word, a number, a button, or how the time works. I will not tell you what to choose. Your timer keeps running while you read.",
  suggestions: ["How does the test work?", "What is dispatch time?", "How does the time work?"],
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
