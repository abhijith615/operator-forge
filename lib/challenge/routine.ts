import type { SceneChoice, TaskPriority, TaskStream } from "./types";

/**
 * The rest of the job.
 *
 * Six scored scenarios across fifteen minutes leaves roughly ten minutes of
 * empty queue, which reads as a quiz with pauses rather than a shift. This is
 * what fills them: the small, constant, unglamorous traffic a store manager
 * actually handles between the decisions anyone would remember.
 *
 * Deliberately low-stakes in scoring terms — a couple of signal points at
 * most. The six scored tasks stay the assessment; these are texture, and
 * loading them with weight would quietly re-calibrate the whole instrument.
 * What they do carry is real metric consequence: ignore the routine work and
 * the board degrades, which is exactly how a real floor punishes it.
 */

export interface RoutineTask {
  id: string;
  stream: TaskStream;
  priority: TaskPriority;
  title: string;
  detail: string;
  source: string;
  /** Short — these should be answerable in a glance. */
  ttl: number;
  choices: SceneChoice[];
}

const quick = (
  id: string,
  label: string,
  outcome: { tone: SceneChoice["outcome"]["tone"]; headline: string; body: string },
  signals: SceneChoice["signals"] = {},
  metricEffect: SceneChoice["metricEffect"] = {},
): SceneChoice => ({
  id,
  label,
  signals,
  tags: [],
  metricEffect,
  outcome,
});

const AUTHORED: RoutineTask[] = [
  {
    id: "r-goods-in",
    stream: "operations",
    priority: "normal",
    title: "Goods-in delivery at the dock",
    detail: "Dairy crate, 40 units. Driver needs a signature to leave.",
    source: "Dock",
    ttl: 70,
    choices: [
      quick(
        "sign-now",
        "Sign it in and put it away now",
        {
          tone: "healthy",
          headline: "Delivery accepted",
          body: "Stock is on the pick face rather than blocking the dock.",
        },
        { priority: 1 },
        { packingQueue: -1 },
      ),
      quick(
        "sign-park",
        "Sign it and park the crate for later",
        {
          tone: "warning",
          headline: "Crate parked",
          body: "The driver leaves. The crate is now in the way of the next one.",
        },
        {},
        { ordersWaiting: 1 },
      ),
    ],
  },
  {
    id: "r-break",
    stream: "people",
    priority: "normal",
    title: "Sneha is asking for five minutes",
    detail: "She has been on the pack bench since six.",
    source: "Sneha",
    ttl: 60,
    choices: [
      quick(
        "grant",
        "Give her the five minutes",
        {
          tone: "healthy",
          headline: "Break granted",
          body: "Packing slows for five minutes. She comes back at full speed.",
        },
        { team: 1 },
        { packingQueue: 1 },
      ),
      quick(
        "after-peak",
        "Ask her to hold until the peak passes",
        {
          tone: "warning",
          headline: "Break deferred",
          body: "She keeps going. Accuracy at the bench starts drifting.",
        },
        { team: -1 },
        { ctd: 2 },
      ),
    ],
  },
  {
    id: "r-temperature",
    stream: "operations",
    priority: "normal",
    title: "Chiller temperature log is due",
    detail: "Hourly reading, and nobody has signed the sheet.",
    source: "Compliance",
    ttl: 65,
    choices: [
      quick(
        "log-now",
        "Have it read and logged now",
        {
          tone: "healthy",
          headline: "Log signed",
          body: "4.1°C, inside range. The record stays clean.",
        },
        { priority: 1 },
      ),
      quick(
        "skip",
        "Skip this hour, catch up later",
        {
          tone: "critical",
          headline: "Gap in the log",
          body: "An hour with no reading is an hour nobody can vouch for.",
        },
        { priority: -1, customer: -1 },
      ),
    ],
  },
  {
    id: "r-order-note",
    stream: "customers",
    priority: "normal",
    title: "Customer note on #4863",
    detail: "“Please don't ring the bell, baby asleep.”",
    source: "App note",
    ttl: 55,
    choices: [
      quick(
        "pass-on",
        "Flag it to the rider before handover",
        {
          tone: "healthy",
          headline: "Note passed on",
          body: "Thirty seconds of your time. The customer notices this one.",
        },
        { customer: 1 },
      ),
      quick(
        "ignore",
        "Leave it — the note is on the app",
        {
          tone: "warning",
          headline: "Note left in the app",
          body: "The rider may or may not read it at the door.",
        },
        { customer: -1 },
      ),
    ],
  },
  {
    id: "r-handheld",
    stream: "people",
    priority: "normal",
    title: "Nikhil's handheld is at 6%",
    detail: "Twenty minutes of picking left in it, at best.",
    source: "Nikhil",
    ttl: 60,
    choices: [
      quick(
        "swap",
        "Swap it for a charged unit now",
        {
          tone: "healthy",
          headline: "Device swapped",
          body: "Ninety seconds lost. He does not go dark mid-pick.",
        },
        { priority: 1 },
      ),
      quick(
        "ride-it",
        "Let him finish the run on it",
        {
          tone: "warning",
          headline: "Running it down",
          body: "If it dies mid-order the pick has to be reassigned from scratch.",
        },
        {},
        { ctd: 3 },
      ),
    ],
  },
  {
    id: "r-trolleys",
    stream: "operations",
    priority: "normal",
    title: "No trolleys at the pick face",
    detail: "All six are sitting full at packing.",
    source: "Floor",
    ttl: 55,
    choices: [
      quick(
        "clear",
        "Send someone to clear and return them",
        {
          tone: "healthy",
          headline: "Trolleys back in circulation",
          body: "Picking stops queueing for equipment.",
        },
        { priority: 1 },
        { pickingCapacity: 3 },
      ),
      quick(
        "wait",
        "They will free up on their own",
        {
          tone: "warning",
          headline: "Pickers waiting",
          body: "Two pickers are stood still holding baskets.",
        },
        { priority: -1 },
        { pickingCapacity: -4, ctd: 3 },
      ),
    ],
  },
  {
    id: "r-damaged",
    stream: "operations",
    priority: "normal",
    title: "Bread crate arrived crushed",
    detail: "Six loaves flattened. Three orders want bread this hour.",
    source: "Goods-in",
    ttl: 60,
    choices: [
      quick(
        "quarantine",
        "Quarantine the damaged units and flag the supplier",
        {
          tone: "healthy",
          headline: "Damaged stock pulled",
          body: "Nobody picks a crushed loaf into a customer's bag.",
        },
        { customer: 1, inventory: 1 },
      ),
      quick(
        "sell-through",
        "Put them out — they are still edible",
        {
          tone: "critical",
          headline: "Damaged stock on the face",
          body: "It will go into somebody's breakfast order looking like that.",
        },
        { customer: -2 },
      ),
    ],
  },
  {
    id: "r-duplicate",
    stream: "customers",
    priority: "normal",
    title: "Two identical orders, same address",
    detail: "#4866 and #4867, ninety seconds apart, same basket.",
    source: "Order desk",
    ttl: 60,
    choices: [
      quick(
        "call",
        "Have someone call the customer before picking both",
        {
          tone: "healthy",
          headline: "Duplicate confirmed",
          body: "A double tap, not a double order. One cancelled cleanly.",
        },
        { customer: 1, reasoning: 1 },
        { ordersWaiting: -1 },
      ),
      quick(
        "pick-both",
        "Pick both — they may have meant it",
        {
          tone: "warning",
          headline: "Both orders picked",
          body: "If it was a double tap, that is a refund and a return trip.",
        },
        { customer: -1 },
        { ordersWaiting: 1 },
      ),
    ],
  },
  {
    id: "r-rider-parking",
    stream: "customers",
    priority: "normal",
    title: "Riders double-parked at the ramp",
    detail: "Three bikes across the loading bay. The next van cannot get in.",
    source: "Security",
    ttl: 55,
    choices: [
      quick(
        "move",
        "Move them to the marked bays",
        {
          tone: "healthy",
          headline: "Ramp cleared",
          body: "Two minutes now, or a blocked delivery in ten.",
        },
        { priority: 1 },
      ),
      quick(
        "leave",
        "Leave it, they will be gone shortly",
        {
          tone: "warning",
          headline: "Ramp still blocked",
          body: "The inbound van waits, and so does everything on it.",
        },
        {},
        { ordersWaiting: 2 },
      ),
    ],
  },
  {
    id: "r-zone-swap",
    stream: "people",
    priority: "normal",
    title: "Faisal wants to move off Zone D",
    detail: "Says the layout is slowing him down and he knows Zone B better.",
    source: "Faisal",
    ttl: 65,
    choices: [
      quick(
        "swap",
        "Swap him into the zone he knows",
        {
          tone: "healthy",
          headline: "Zone reassigned",
          body: "His pick rate improves. Somebody else takes the unfamiliar aisles.",
        },
        { team: 1 },
        { pickingCapacity: 2 },
      ),
      quick(
        "hold",
        "Keep him where he is for this peak",
        {
          tone: "warning",
          headline: "Left in place",
          body: "Consistency has value. So does a picker who is not fighting the layout.",
        },
        {},
      ),
    ],
  },
  {
    id: "r-short-pick",
    stream: "operations",
    priority: "normal",
    title: "Order #4870 is one item short",
    detail: "Everything else picked. Waiting on a decision to move.",
    source: "Packing",
    ttl: 50,
    choices: [
      quick(
        "hold-brief",
        "Hold ninety seconds for the last item",
        {
          tone: "healthy",
          headline: "Order completed",
          body: "It goes out whole, a minute and a half late.",
        },
        { customer: 1 },
        { ctd: 2 },
      ),
      quick(
        "ship-short",
        "Ship short and refund the line",
        {
          tone: "warning",
          headline: "Shipped incomplete",
          body: "Fast, and the customer opens a bag missing something they wanted.",
        },
        { customer: -1, priority: 1 },
        { ctd: -3 },
      ),
    ],
  },
  {
    id: "r-new-joiner",
    stream: "people",
    priority: "normal",
    title: "New joiner has no login",
    detail: "Started today. Standing at the pick face with nothing to scan with.",
    source: "Floor Lead",
    ttl: 60,
    choices: [
      quick(
        "sort-now",
        "Get him a device and a login now",
        {
          tone: "healthy",
          headline: "New joiner working",
          body: "Slow for an hour, useful for the rest of the shift.",
        },
        { team: 1 },
        { pickingCapacity: 3 },
      ),
      quick(
        "shadow",
        "Have him shadow someone until it is sorted",
        {
          tone: "warning",
          headline: "Shadowing",
          body: "Two people doing one person's job during a peak.",
        },
        { team: -1 },
        { pickingCapacity: -2 },
      ),
    ],
  },

  {
    id: "r-aisle-block",
    stream: "operations",
    priority: "normal",
    title: "Pallet left blocking aisle C",
    detail: "Two pickers are walking the long way round to reach the dairy face.",
    source: "Floor",
    ttl: 55,
    choices: [
      quick("move-pallet", "Get it moved now", { tone: "healthy", headline: "Aisle clear", body: "Thirty seconds of walking saved on every dairy pick for the rest of the hour." }, { priority: 1 }, { pickingCapacity: 2 }),
      quick("after-peak", "Leave it until after the peak", { tone: "warning", headline: "Still blocked", body: "Every dairy pick this hour takes the long way round." }, {}, { pickingCapacity: -3 }),
    ],
  },
  {
    id: "r-label-jam",
    stream: "operations",
    priority: "normal",
    title: "Label printer jammed at pack bench 2",
    detail: "Manu is hand-writing labels to keep moving.",
    source: "Manu",
    ttl: 55,
    choices: [
      quick("clear-jam", "Clear the jam properly", { tone: "healthy", headline: "Printer back", body: "Two minutes down, and labels scan again at the bay." }, { priority: 1 }),
      quick("handwrite", "Let him keep hand-writing", { tone: "critical", headline: "Hand-written labels", body: "They will not scan at handover, which pushes the problem to dispatch." }, { customer: -1 }, { ctd: 4 }),
    ],
  },
  {
    id: "r-allergy-note",
    stream: "customers",
    priority: "normal",
    title: "Allergy note on #4879",
    detail: "“Severe nut allergy — please keep separate.”",
    source: "App note",
    ttl: 55,
    choices: [
      quick("separate", "Bag it separately and flag the packer", { tone: "healthy", headline: "Handled properly", body: "This is the note you never want to be wrong about." }, { customer: 2 }),
      quick("normal", "Pack as normal, it is only a note", { tone: "critical", headline: "Note not actioned", body: "An allergy note is not a preference." }, { customer: -3 }),
    ],
  },
  {
    id: "r-rider-late",
    stream: "customers",
    priority: "normal",
    title: "Rider 204 is 12 minutes overdue back",
    detail: "Phone unanswered. His next two orders are staged and waiting.",
    source: "Fleet",
    ttl: 60,
    choices: [
      quick("reassign", "Reassign his staged orders now", { tone: "healthy", headline: "Orders reassigned", body: "Two customers stop waiting on a rider nobody can reach." }, { priority: 1, customer: 1 }, { ridersWaiting: -1 }),
      quick("wait-rider", "Hold them for him", { tone: "warning", headline: "Still holding", body: "Two promises are now riding on one unanswered phone." }, { customer: -1 }, { ctd: 5 }),
    ],
  },
  {
    id: "r-stock-count",
    stream: "operations",
    priority: "normal",
    title: "Cycle count due on Zone B",
    detail: "Scheduled for this hour. Nobody has started it.",
    source: "Inventory schedule",
    ttl: 65,
    choices: [
      quick("count-now", "Run it now", { tone: "healthy", headline: "Count started", body: "Discrepancies get found while they are still small." }, { inventory: 1 }),
      quick("defer", "Push it to the next shift", { tone: "warning", headline: "Count deferred", body: "Defensible during a peak. It is how gaps go unnoticed for a week." }, { inventory: -1 }),
    ],
  },
  {
    id: "r-bag-shortage",
    stream: "operations",
    priority: "normal",
    title: "Down to the last sleeve of large bags",
    detail: "About twenty orders worth at the current rate.",
    source: "Packing",
    ttl: 55,
    choices: [
      quick("restock", "Send someone to the store room now", { tone: "healthy", headline: "Bags restocked", body: "Packing does not stop mid-peak for want of a bag." }, { priority: 1 }),
      quick("double-up", "Double up small bags when they run out", { tone: "warning", headline: "Improvising", body: "Two small bags is slower to pack and worse to carry." }, {}, { packingQueue: 2 }),
    ],
  },
  {
    id: "r-wrong-address",
    stream: "customers",
    priority: "normal",
    title: "#5012 — flat number missing",
    detail: "Rider is at the gate. The customer is not picking up.",
    source: "Rider 219",
    ttl: 50,
    choices: [
      quick("call-support", "Get support to reach them on the app", { tone: "healthy", headline: "Address confirmed", body: "Flat 3B. The rider is moving again inside a minute." }, {}, { ctd: -2 }),
      quick("return-it", "Bring it back and mark it undelivered", { tone: "critical", headline: "Order returned", body: "Chilled goods, a round trip, and a customer who was home the whole time." }, {}, { ordersWaiting: 2 }),
    ],
  },
  {
    id: "r-fridge-alarm",
    stream: "operations",
    priority: "high",
    title: "Chiller 2 is reading 9°C",
    detail: "Door seal looks fine. It has been climbing for ten minutes.",
    source: "Temperature alarm",
    ttl: 45,
    choices: [
      quick("move-stock", "Move the stock to Chiller 1 and log it", { tone: "healthy", headline: "Stock protected", body: "Dairy is back under 5°C and the fault is written down for maintenance." }, {}, { pickingCapacity: -2 }),
      quick("reset-unit", "Reset the unit and carry on", { tone: "critical", headline: "Still climbing", body: "A reset is not a repair. Every minute above 8°C is stock you cannot sell." }, {}, { ctd: 3 }),
    ],
  },
  {
    id: "r-double-scan",
    stream: "operations",
    priority: "normal",
    title: "Same crate scanned twice at goods-in",
    detail: "System now shows 80 units of curd. The dock has 40.",
    source: "Inventory alert",
    ttl: 55,
    choices: [
      quick("correct-now", "Correct it before anyone picks against it", { tone: "healthy", headline: "Count corrected", body: "Forty phantom units removed before they turn into forty Nil Picks." }, {}, {}),
      quick("fix-later", "Leave it for the evening count", { tone: "warning", headline: "Phantom stock live", body: "Pickers will be sent to a shelf that cannot fill the order." }, {}, { nilPicks: 1 }),
    ],
  },
  {
    id: "r-vip-waiting",
    stream: "customers",
    priority: "high",
    title: "#4990 has been waiting 19 minutes",
    detail: "Picked and packed. It is sitting on the staging rack with nobody assigned.",
    source: "Fulfilment board",
    ttl: 45,
    choices: [
      quick("assign-now", "Put it on the next rider out", { tone: "healthy", headline: "On its way", body: "Nineteen minutes is recoverable. Twenty-five is a refund." }, {}, { ridersWaiting: -1, ctd: -3 }),
      quick("batch-it", "Wait and batch it with the next one for that block", { tone: "warning", headline: "Still on the rack", body: "Batching saves a trip and costs this customer another eight minutes." }, {}, { ctd: 4 }),
    ],
  },
  {
    id: "r-new-sku",
    stream: "operations",
    priority: "normal",
    title: "New SKU has no pick-face location",
    detail: "Forty units of a protein bar nobody has slotted. Orders are already dropping for it.",
    source: "Picker",
    ttl: 60,
    choices: [
      quick("slot-it", "Slot it into the gap in Zone A and tell the floor", { tone: "healthy", headline: "Slotted", body: "It can be picked like anything else, by anyone." }, {}, {}),
      quick("bulk-only", "Leave it in bulk and let pickers ask", { tone: "warning", headline: "Pick on request", body: "Every order for it now costs a conversation and a walk to the back." }, {}, { pickingCapacity: -2 }),
    ],
  },
  {
    id: "r-phone-ringing",
    stream: "people",
    priority: "normal",
    title: "Store phone has rung out four times",
    detail: "Nobody near the desk. It is almost certainly a customer.",
    source: "Front desk",
    ttl: 40,
    choices: [
      quick("answer-it", "Pick it up yourself", { tone: "healthy", headline: "Answered", body: "A missed item on an order that went out ten minutes ago. Now fixable." }, {}, {}),
      quick("let-ring", "Let it go to the support line", { tone: "warning", headline: "Rang out", body: "Support will call back in an hour. The order leaves in six minutes." }, {}, {}),
    ],
  },
  {
    id: "r-spill",
    stream: "people",
    priority: "high",
    title: "Oil spill in the dry aisle",
    detail: "Half a litre across the walkway. Two pickers are stepping around it.",
    source: "Floor",
    ttl: 40,
    choices: [
      quick("clean-now", "Stop and get it cleaned and coned", { tone: "healthy", headline: "Aisle made safe", body: "Ninety seconds of picking lost. Nobody goes to hospital." }, {}, { pickingCapacity: -2 }),
      quick("step-around", "Cone it and clean after the peak", { tone: "critical", headline: "Still wet", body: "A coned spill in a peak is a fall waiting for the person not looking down." }, {}, {}),
    ],
  },
  {
    id: "r-rider-argument",
    stream: "people",
    priority: "normal",
    title: "Two riders arguing over a batch",
    detail: "Both say the three-drop run was assigned to them. It is getting loud at the bay.",
    source: "Dispatch bay",
    ttl: 50,
    choices: [
      quick("decide-fast", "Decide it on the spot and move them both on", { tone: "healthy", headline: "Settled", body: "Thirty seconds, one decision, and the bay is working again." }, {}, {}),
      quick("let-sort", "Let them sort it out between themselves", { tone: "warning", headline: "Still arguing", body: "Three orders sit on the rack while two adults negotiate." }, {}, { ctd: 3 }),
    ],
  },
];

/**
 * The third option.
 *
 * Every routine task was authored as a pair: the right thing, and the thing
 * that costs you. Shuffling two options puts the right answer first half the
 * time, which is exactly what it looked like — and a coin flip is not a
 * decision. Worse, a pair is answerable without reading it: one option sounds
 * diligent and the other sounds lazy, so the operator is pattern-matching
 * rather than running a store.
 *
 * So each gains a middle: delegate it, do half of it, or buy time. On a real
 * floor that is the option most managers actually take, and it is the one that
 * is genuinely hard to judge — sometimes the best answer available, sometimes
 * how a small problem survives the morning. A few are as good as doing it
 * yourself, so "the diligent-sounding one" stops being a reliable tell.
 *
 * Metric consequences only. Routine work is texture, and the signals are
 * stripped from every option below along with the rest.
 */
const MIDDLE: Record<string, SceneChoice> = {
  "r-goods-in": quick("delegate-receipt", "Have the Floor Lead receive it while you stay on the board",
    { tone: "healthy", headline: "Delegated", body: "Signed, counted and put away by somebody who is not you. The board never loses your eyes." }, {}, {}),
  "r-break": quick("two-now", "Give her two minutes now, the rest after the peak",
    { tone: "warning", headline: "Half a break", body: "She takes it, and comes back still tired. Nobody is sure whether that counted." }, {}, { packingQueue: 1 }),
  "r-temperature": quick("nearest-reads", "Ask whoever is nearest the chiller to read it",
    { tone: "healthy", headline: "Logged on time", body: "Thirty seconds from somebody already standing there. That is what the sheet is for." }, {}, {}),
  "r-order-note": quick("note-on-bag", "Write the note on the bag itself",
    { tone: "warning", headline: "Note on the bag", body: "It reaches the door. The rider reads it after he has knocked." }, {}, {}),
  "r-handheld": quick("finish-order", "Let him finish this order, then swap at the bench",
    { tone: "healthy", headline: "Swapped between runs", body: "Six per cent covers one order. Nothing is dropped mid-aisle." }, {}, {}),
  "r-trolleys": quick("pull-two", "Pull two back yourself",
    { tone: "warning", headline: "Two trolleys", body: "The face can move again, and you spent ninety seconds off the board to do it." }, {}, { pickingCapacity: 1 }),
  "r-damaged": quick("quarantine-only", "Quarantine them, skip the supplier claim",
    { tone: "warning", headline: "Written off quietly", body: "Nobody eats a flattened loaf. Nobody pays for them either, because nothing was filed." }, {}, {}),
  "r-duplicate": quick("pick-one-hold", "Pick one, hold the second until somebody answers",
    { tone: "healthy", headline: "One out, one held", body: "The customer gets what they almost certainly wanted, and nobody pays twice." }, {}, {}),
  "r-rider-parking": quick("ask-next-rider", "Ask the next rider out to move them",
    { tone: "warning", headline: "One bike moved", body: "He moves his own and leaves the other two. The van still cannot get in." }, {}, {}),
  "r-zone-swap": quick("swap-after-wave", "Swap him after this wave, not mid-pick",
    { tone: "healthy", headline: "Swapped cleanly", body: "He finishes what he is holding, then moves. Nothing is abandoned in an aisle." }, {}, {}),
  "r-short-pick": quick("substitute", "Substitute the nearest equivalent",
    { tone: "warning", headline: "Substituted", body: "Some customers are delighted by that. This one chose the brand on purpose." }, {}, { ctd: -2 }),
  "r-new-joiner": quick("borrow-login", "Borrow a device from dispatch and sort the login later",
    { tone: "warning", headline: "Picking on somebody else's login", body: "He is working in two minutes, and every pick he makes is recorded as another person's." }, {}, { pickingCapacity: 2 }),
  "r-aisle-block": quick("next-picker", "Ask whoever passes it next to move it",
    { tone: "warning", headline: "Left to somebody", body: "Everyone assumes somebody else will. It is still there in ten minutes." }, {}, { pickingCapacity: -1 }),
  "r-label-jam": quick("move-bench", "Move his orders to bench 1 and fix the printer after",
    { tone: "healthy", headline: "Packing keeps scanning", body: "Labels scan at handover. The jam waits for somebody who is not mid-peak." }, {}, {}),
  "r-allergy-note": quick("call-customer", "Call the customer to confirm what they need",
    { tone: "warning", headline: "Four minutes spent confirming", body: "Careful, and the note was already unambiguous. The order was ready to go." }, {}, { ctd: 3 }),
  "r-rider-late": quick("fleet-chases", "Have the fleet lead chase him, five more minutes",
    { tone: "healthy", headline: "Chased, with a limit", body: "Somebody else is on the phone, and five minutes is a real deadline rather than a hope." }, {}, {}),
  "r-stock-count": quick("fast-movers", "Count the fast movers only",
    { tone: "warning", headline: "Partial count", body: "The lines that move get checked. Shrink lives in the ones that do not." }, {}, {}),
  "r-bag-shortage": quick("ask-driver", "Ask the next delivery driver to bring a sleeve up",
    { tone: "warning", headline: "Waiting on a favour", body: "He might. Packing is now betting on somebody else's errand." }, {}, {}),
  "r-wrong-address": quick("try-next-block", "Have the rider try the neighbouring block",
    { tone: "warning", headline: "Guessing at doors", body: "Twelve minutes of a rider knocking, and the chilled items warming in the box." }, {}, { ctd: 4 }),
  "r-fridge-alarm": quick("move-dairy", "Move the dairy out and watch the unit",
    { tone: "warning", headline: "Dairy out, the rest still in", body: "What you moved is safe. Everything you left is still climbing through 9 degrees." }, {}, { pickingCapacity: -1 }),
  "r-double-scan": quick("block-sku", "Block picking on that SKU until it is recounted",
    { tone: "warning", headline: "SKU held", body: "No phantom picks. No real ones either, on a line customers are ordering right now." }, {}, {}),
  "r-vip-waiting": quick("warn-customer", "Ask support to tell the customer it is running late",
    { tone: "warning", headline: "Told, and still waiting", body: "Now they know it is late. It is still sitting on the rack with nobody carrying it." }, {}, { ctd: 2 }),
  "r-new-sku": quick("trolley-at-face", "Put it on a trolley at the face and slot it tonight",
    { tone: "warning", headline: "On a trolley at the face", body: "Reachable, and one more thing in the walkway. Tonight is when somebody remembers to slot it." }, {}, {}),
  "r-phone-ringing": quick("newest-answers", "Send the newest person to answer it",
    { tone: "warning", headline: "Answered, not handled", body: "He is polite and cannot help with a single thing they ask him." }, {}, {}),
  "r-spill": quick("cone-and-mop", "Cone it and send the nearest picker for a mop",
    { tone: "healthy", headline: "Cleared in two minutes", body: "Dealt with by somebody whose eyes are not needed on the board." }, {}, { pickingCapacity: -1 }),
  "r-rider-argument": quick("whoever-loaded", "Give it to whichever of them is loaded and ready",
    { tone: "healthy", headline: "Settled on something neutral", body: "Nobody wins the argument, and the bay is moving inside thirty seconds." }, {}, {}),
};

/**
 * What the board actually deals.
 *
 * The authored signals above record which way each option leans, and they used
 * to be scored — which is how a shift reached 100 on all five dimensions. The
 * scale in `scoring.ts` is calibrated against the six scored scenarios alone;
 * routine work is dealt continuously and recycles when the pool runs dry, so
 * its contribution has no ceiling. Twenty answered deliveries and break
 * requests were worth more raw signal than the entire assessment, and every
 * dimension clamped at the top.
 *
 * So routine work is exactly what this file always claimed it was: texture.
 * It carries its metric effects — ignore the small stuff and the board
 * degrades, which is how a real floor punishes it, and the degraded board is
 * what the peak and the recovery plan are scored against. It no longer moves
 * a dimension directly.
 */
export const ROUTINE_TASKS: RoutineTask[] = AUTHORED.map((task) => ({
  ...task,
  choices: [...task.choices, MIDDLE[task.id]]
    .filter((choice): choice is SceneChoice => Boolean(choice))
    .map((choice) => ({ ...choice, signals: {} })),
}));
