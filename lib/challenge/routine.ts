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

export const ROUTINE_TASKS: RoutineTask[] = [
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
];
