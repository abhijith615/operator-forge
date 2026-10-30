import { formFor } from "./forms";
import type {
  AbsenceChoice,
  ArjunResponse,
  CaseStep,
  ControlFix,
  FormId,
  LateOrderFix,
  RiyaChoice,
  SceneId,
  UnitCall,
} from "./types";

/**
 * What the candidate reads.
 *
 * Records, not conclusions. A movement log shows movements; it does not say
 * "this unit was never restowed". Finding that is the work, and a screen that
 * does it for the candidate has stopped measuring anything.
 */

/* ── Where in the shift ───────────────────────────────────────────────── */

export const PHASES = ["HANDOVER", "TEAM", "INVENTORY", "PEAK", "RECOVERY", "FINAL CALL"] as const;
export type Phase = (typeof PHASES)[number];

/** What the candidate reads for each part, in plain words. The keys above stay as they are. */
export const PHASE_LABEL: Record<Phase, string> = {
  HANDOVER: "Start",
  TEAM: "Team",
  INVENTORY: "Stock",
  PEAK: "Rush",
  RECOVERY: "After rush",
  "FINAL CALL": "Final plan",
};

export const PHASE_OF: Record<SceneId, Phase> = {
  handover: "HANDOVER",
  floor: "TEAM",
  absence: "TEAM",
  riya: "TEAM",
  arjun: "TEAM",
  case: "INVENTORY",
  nilpick: "INVENTORY",
  triage: "PEAK",
  bottleneck: "PEAK",
  customer: "RECOVERY",
  final: "FINAL CALL",
  outcome: "FINAL CALL",
  done: "FINAL CALL",
};

/**
 * Roughly how long each part is meant to take, in real seconds. Thirty
 * minutes in all. A guide for the candidate and nothing else: no score looks
 * at it.
 */
export const PHASE_SECONDS: Record<Phase, number> = {
  HANDOVER: 120,
  TEAM: 480,
  INVENTORY: 360,
  PEAK: 540,
  RECOVERY: 120,
  "FINAL CALL": 180,
};

/**
 * Where the time is against where the candidate is.
 *
 * `marker` is how far along the six-part bar the elapsed time falls, 0 to 1.
 * `behind` is the seconds by which the part the candidate is still in has
 * overrun its guide, or zero.
 */
export function paceOf(elapsed: number, phaseIndex: number, limit = 1800): { marker: number; behind: number } {
  // Somebody given extra time has every part stretched by the same proportion.
  const stretch = limit / 1800;
  let start = 0;
  let marker = 1;
  let due = 0;
  PHASES.forEach((phase, index) => {
    const length = PHASE_SECONDS[phase] * stretch;
    if (elapsed >= start && elapsed < start + length) marker = (index + (elapsed - start) / length) / PHASES.length;
    start += length;
    if (index === phaseIndex) due = start;
  });
  return { marker: Math.max(0, Math.min(1, marker)), behind: Math.max(0, Math.round(elapsed - due)) };
}

/* ── Handover ─────────────────────────────────────────────────────────── */

export const HANDOVER_LINES = [
  "Two team members have not come to work.",
  "The truck from the main warehouse came at 04:30. Not all the stock is on the shelves yet.",
  "The breakfast rush starts at about 06:30.",
  "The store is yours now.",
];

/**
 * The morning round: what an ASM walks before taking a 06:00 shift. Riders,
 * the floor, the fresh lines, the counts — and the team and its devices.
 */
export const HANDOVER_PANELS = [
  { id: "team", label: "Team and devices" },
  { id: "riders", label: "Riders present" },
  { id: "floorwalk", label: "Walk the store" },
  { id: "perishables", label: "Fresh food" },
  { id: "audits", label: "Checks to do" },
  { id: "demand", label: "Orders expected" },
] as const;

export const FLOOR_WALK = [
  { title: "Receiving area", detail: "420 crates came from the main warehouse at 04:30. 96 are still waiting to go on the shelves (putaway)." },
  { title: "Aisles", detail: "All clear. The crates for Zone C are stacked at the end of Aisle C." },
  { title: "Left from the night", detail: "No orders are left from the night. Problem box E-2 has not been emptied. It holds cancelled and damaged items." },
  { title: "Notice board", detail: "Last week’s incentives: the store has sent them. Finance is working on the payment." },
];

export const PERISHABLES = [
  { item: "Milk", detail: "New crates came at 04:30. Two crates from yesterday are still in the fridge." },
  { item: "Bread", detail: "Came at 04:30. Yesterday’s bread is on the same shelf." },
  { item: "Eggs", detail: "Came at 04:30. Nobody opened the trays to check them." },
  { item: "Fruit and vegetables", detail: "Came at 04:30. Nobody has checked the quality yet." },
];

export const AUDITS = [
  { title: "Fresh food check", detail: "Every morning before the rush: check the dates and quality of milk, bread, eggs, fruit and vegetables." },
  { title: "Stock count · Zone B", detail: "Count 40 bins today. Any time in this shift." },
  { title: "Cage for expensive items", detail: "Last counted yesterday at 06:10. Count it again this morning." },
  { title: "Full store count", detail: "The area office wants every item counted this week." },
];

export const DEMAND_OUTLOOK = [
  { hour: "06:00", index: 102 },
  { hour: "06:15", index: 120 },
  { hour: "06:30", index: 138 },
  { hour: "07:00", index: 136 },
  { hour: "07:30", index: 124 },
  { hour: "08:30", index: 112 },
];

/* ── Absence ──────────────────────────────────────────────────────────── */

export const ABSENCE_OPTIONS: { id: AbsenceChoice; label: string; detail: string }[] = [
  { id: "onDemand", label: "Get an agency worker", detail: "A picker from the agency. ₹160 an hour, at least 4 hours (₹640). Comes at 06:20. Can only pick. First day in this store." },
  { id: "reallocate", label: "Move your own people", detail: "Move the people you have and set their devices. This opens the team board." },
  { id: "extend", label: "Ask someone to stay longer", detail: "Arjun’s night shift ends at 06:30. Ask him to stay until 08:30." },
  { id: "short", label: "Work with fewer people", detail: "Run the morning with the 12 people you have." },
];

/* ── Riya ─────────────────────────────────────────────────────────────── */

export const RIYA = {
  floorLead: ["Riya took 31 seconds for each item this morning.", "She is no help to me in the rush. Should I send her back to the agency?"],
  facts: [
    { label: "Joined", value: "Yesterday · through the agency" },
    { label: "Training plan", value: "Days 1–2: putaway only. No picking target." },
    { label: "Device", value: "Lock removed at 05:10 · open to all work" },
    { label: "Orders sent to her", value: "14 since 05:12" },
    { label: "Wrong items picked", value: "0 of 14" },
  ],
  /** Seconds an item across the fourteen orders, in the order she picked them. */
  ppiTrend: [36.4, 33.8, 31.9, 29.6, 27.3],
  /** Where the seconds went on an average item. */
  breakdown: [
    { part: "Finding the bin", seconds: 18.9 },
    { part: "Walking", seconds: 7.2 },
    { part: "Pick and scan", seconds: 5.1 },
  ],
  breakdownNote: "Store target: 16 seconds for each item. A trained picker takes about 3 seconds to find the bin.",
  putaway: "Crates she put on shelves yesterday: 38. Today so far: 11.",
  quote: "Nobody told me I would be picking. I don’t know where the racks are yet.",
};

export const RIYA_OPTIONS: { id: RiyaChoice; label: string }[] = [
  { id: "lockPutaway", label: "Lock her device to putaway only" },
  { id: "pair", label: "Pair her with a putaway worker to learn the bins" },
  { id: "phaseLater", label: "Plan her first picking shift for after the rush" },
  { id: "keep", label: "Leave things as they are" },
  { id: "target", label: "Keep her on orders with the 16-second target" },
  { id: "returnAgency", label: "Send her back to the agency" },
  { id: "warn", label: "Give her a warning for slow work" },
];

/* ── Arjun ────────────────────────────────────────────────────────────── */

export const ARJUN = {
  lines: ["My incentive from last week has still not come.", "Why should I stay for your rush?"],
  incentiveStatus: [
    { label: "Target", value: "Reached" },
    { label: "Sent by the store", value: "Done" },
    { label: "Approval", value: "Approved" },
    { label: "Payment", value: "Not paid yet" },
    { label: "Expected", value: "Tomorrow" },
  ],
  eligibility: [
    { label: "Shift", value: "Night · 21:30 to 06:30" },
    { label: "Daily limit", value: "11 hours with overtime" },
    { label: "Can stay until", value: "08:30" },
    { label: "Pay", value: "Overtime rate" },
  ],
};

export const ARJUN_ACK: { id: ArjunResponse["ack"]; label: string }[] = [
  { id: "recognise", label: "You reached your target last week. You earned it." },
  { id: "neutral", label: "I hear you." },
  { id: "dismiss", label: "This is not the time for this." },
];

/** `verified` is only on offer once the status has actually been checked. */
export const ARJUN_CLARIFY: { id: ArjunResponse["clarify"]; label: string; needsCheck?: boolean; withoutCheck?: boolean }[] = [
  { id: "verified", label: "It is approved. The payment should come tomorrow.", needsCheck: true },
  { id: "guess", label: "It must be on the way by now.", withoutCheck: true },
  { id: "willCheck", label: "I don’t know yet. I will check and tell you today." },
  { id: "promise", label: "You will get it tomorrow. I promise." },
  { id: "deflect", label: "Payroll handles that, not me." },
];

export const ARJUN_REQUEST: { id: ArjunResponse["request"]; label: string }[] = [
  { id: "respectful", label: "I need you until 08:30 today. Will you stay?" },
  { id: "order", label: "You are staying until 08:30." },
  { id: "threat", label: "If you leave now, it goes on your record." },
  { id: "none", label: "Go at 06:30. We will manage." },
];

/* ── The high-value case ──────────────────────────────────────────────── */

export const CASE_TOOL_LABEL: Record<string, string> = {
  movement: "Stock movement log",
  orders: "Orders",
  scan: "Scan log",
  access: "Cage entry log",
  exception: "Problem box E-2",
};

export interface RecordRow {
  time: string;
  text: string;
  value?: string;
  /** Rows with nothing in them are shown as gaps, not hidden. */
  gap?: boolean;
}

function orderNumbers(form: FormId) {
  const { scanOrder, cancelledOrder } = formFor(form).highValue;
  const base = Number(cancelledOrder.replace("#", ""));
  return { first: `#${base - 3}`, cancelled: cancelledOrder, third: `#${base + 11}`, scan: scanOrder };
}

export function caseRecords(form: FormId): Record<string, { note: string; rows: RecordRow[] }> {
  const { item, system } = formFor(form).highValue;
  const o = orderNumbers(form);
  const opening = system + 2;
  return {
    movement: {
      note: `${item} · every stock change since yesterday’s count at 06:10`,
      rows: [
        { time: "06:10", text: "Stock count", value: `${opening}` },
        { time: "09:42", text: `Picked · order ${o.first}`, value: "−1" },
        { time: "11:15", text: `Picked · order ${o.cancelled}`, value: "−1" },
        { time: "11:22", text: `Order ${o.cancelled} cancelled · item added back to stock`, value: "+1" },
        { time: "11:24", text: "Put in problem box E-2", value: "1 unit" },
        { time: "—", text: "Taken from box E-2 back to the shelf", value: "no entry", gap: true },
        { time: "12:30", text: `Picked · order ${o.third}`, value: "−1" },
        { time: "now", text: "Stock in the system", value: `${system}` },
      ],
    },
    orders: {
      note: `Yesterday’s orders with ${item}`,
      rows: [
        { time: "09:40", text: `${o.first} · 1 × ${item}`, value: "Delivered" },
        { time: "11:12", text: `${o.cancelled} · 1 × ${item}`, value: "Cancelled 11:22" },
        { time: "12:28", text: `${o.third} · 1 × ${item}`, value: "Delivered" },
        { time: "14:41", text: `${o.scan} · 1 × ${item}`, value: "Delivered 14:58" },
      ],
    },
    scan: {
      note: "Scans of expensive items when picked and packed · yesterday",
      rows: [
        { time: "09:43", text: `${o.first} · item scan`, value: "✓" },
        { time: "11:16", text: `${o.cancelled} · item scan`, value: "✓" },
        { time: "12:31", text: `${o.third} · item scan`, value: "✓" },
        { time: "14:44", text: `${o.scan} · bag scan`, value: "✓" },
        { time: "—", text: `${o.scan} · item scan`, value: "missing", gap: true },
        { time: "14:46", text: `${o.scan} · packed and ready for a rider`, value: "✓" },
        { time: "14:49", text: `${o.scan} · given to the rider`, value: "✓" },
      ],
    },
    access: {
      note: "Cage for expensive items · who opened it since yesterday’s count. A CCTV camera covers the cage door.",
      rows: [
        { time: "06:08", text: "Farhan · stock count", value: "allowed" },
        { time: "09:41", text: "Arjun · pick", value: "allowed" },
        { time: "11:14", text: "Arjun · pick", value: "allowed" },
        { time: "12:29", text: "Farhan · pick", value: "allowed" },
        { time: "14:43", text: "Arjun · pick", value: "allowed" },
        { time: "15:20", text: "Assistant Store Manager · check walk", value: "allowed" },
        { time: "16:02", text: "Farhan · pick (a different item)", value: "allowed" },
      ],
    },
    exception: {
      note: "Problem box E-2 · what is inside it now",
      rows: [
        { time: "tag", text: `1 × ${item}, sealed · tag says “order ${o.cancelled} cancelled”`, value: "not put back" },
        { time: "tag", text: "1 × Shampoo 340 ml · leaking", value: "damaged" },
        { time: "tag", text: "1 × Biscuits 800 g · crushed", value: "damaged" },
      ],
    },
  };
}

export const UNIT_CALLS: { id: UnitCall; label: string }[] = [
  { id: "explained", label: "The records explain it" },
  { id: "recovered", label: "Found it" },
  { id: "unresolved", label: "Still missing" },
  { id: "writeoff", label: "Write it off" },
  { id: "theft", label: "Stolen" },
];

export const CASE_STEPS: { id: CaseStep; label: string }[] = [
  { id: "preserve", label: "Keep the CCTV video and logs" },
  { id: "controlAccess", label: "Open the cage only with a supervisor" },
  { id: "escalate", label: "Report it to the loss prevention team" },
  { id: "accuse", label: "Name the worker who took it" },
  { id: "writeOff", label: "Write the item off now" },
  { id: "closeStore", label: "Stop sending orders and search" },
];

export const CONTROL_FIXES: { id: ControlFix; label: string }[] = [
  { id: "scanAtIssue", label: "Scan each expensive item before the bag is sealed" },
  { id: "exceptionRestow", label: "Empty box E-2 every hour and put items back" },
  { id: "remindTeam", label: "Remind the team at tomorrow’s meeting" },
  { id: "fullAudit", label: "Count every item in the store, now" },
];

/* ── Nil pick ─────────────────────────────────────────────────────────── */

export const NIL_SOURCE_LABEL: Record<string, string> = {
  overstock: "Extra stock area",
  replenArea: "Receiving area",
  adjacentBin: "The bin next to it",
  transactions: "Recent stock records",
};

export function nilRecords(form: FormId): Record<string, RecordRow[]> {
  const { item, system } = formFor(form).nilPick;
  return {
    overstock: [
      { time: "O-4", text: `${item}`, value: "0 units" },
      { time: "22:10", text: "Last moved to the shelf bin", value: "12 units" },
    ],
    replenArea: [
      { time: "04:30", text: `${item} · came from the main warehouse, in a crate in the receiving area`, value: `${system} units` },
      { time: "—", text: "Put on the shelf", value: "not done", gap: true },
    ],
    adjacentBin: [
      { time: "bin", text: "Has a different pack size of the same product", value: "not this item" },
      { time: "bin", text: `${item} put here by mistake`, value: "none" },
    ],
    transactions: [
      { time: "22:10", text: "Bin filled", value: "+12" },
      { time: "22:10–06:05", text: "Sold", value: "−12" },
      { time: "04:30", text: "Received from the main warehouse", value: `+${system}` },
      { time: "05:48", text: "Task made: refill the bin (stock is low)", value: "open, nobody given it", gap: true },
    ],
  };
}

/* ── The bag ──────────────────────────────────────────────────────────── */

export const BAG_ITEMS = [
  { id: "cleaner", label: "Toilet cleaner", kind: "chemical" },
  { id: "coriander", label: "Coriander", kind: "food" },
  { id: "apples", label: "Apples", kind: "food" },
] as const;

/* ── The final call ───────────────────────────────────────────────────── */

export const LATE_ORDER_FIXES: { id: LateOrderFix; label: string }[] = [
  { id: "informPriority", label: "Tell the customer now and send a fast rider" },
  { id: "voucher", label: "Send the customer a ₹200 voucher" },
  { id: "cancel", label: "Cancel the order and give a refund" },
];

/* ── Consent ──────────────────────────────────────────────────────────── */

/** Where a candidate writes to ask for extra time, a copy of their data, or its deletion. */
export const HIRING_CONTACT = "hello@operatorforge.in";

/**
 * The version of the notice below. Recorded with each attempt, so it is always
 * possible to say what a given candidate agreed to. Change it whenever the
 * notice changes in substance.
 */
export const CONSENT_VERSION = "2026-10-28";

/**
 * What is collected and what is done with it, in the candidate's terms.
 *
 * Every line here has to stay true of the code. If the simulation starts
 * recording something else, or showing it to somebody else, this changes
 * first and the version above with it.
 */
export const DATA_NOTICE: { title: string; text: string }[] = [
  {
    title: "What we record",
    text: "The name and WhatsApp number you type, or your email if you sign in. Every choice you make in the test, and when you made it. Whether you use a phone, tablet or computer. When the page was hidden, reloaded or lost its connection. The topics you ask the assistant about (not the words you type).",
  },
  {
    title: "What it is used for",
    text: "To make your profile and a report on how you ran the shift, for hiring. To contact you on WhatsApp about this test. Fixed rules give the score. No AI scores you. Nothing rejects you automatically — a person decides.",
  },
  {
    title: "Who sees it",
    text: "Operator Forge, and the employer who asked you to take this test, if there is one. You see your own profile at the end.",
  },
  {
    title: "Your choices",
    text: "Taking the test is your choice. At any time, you can ask for a copy of your data, take back your consent, or have your attempt deleted. Write to the address below.",
  },
];

/* ── Before the shift ─────────────────────────────────────────────────── */

/**
 * The explainer shown before Start Shift, on how a dark store operates. The id is the
 * YouTube video's. It is offered, never required, and the clock is not running
 * while it plays.
 */
export const EXPLAINER_VIDEO = {
  id: "4ZvVCZe5Nlw",
  title: "Dark store operations",
  note: "A short video on how a dark store works. You do not have to watch it. Your time starts only when you press Start Shift.",
};

export const POSITIONING = [
  "You will run a dark store in a practice shift on screen.",
  "You will manage people, stock and problems.",
  "Your choices change what happens later in the shift.",
  "The test will not tell you if a choice is right or wrong.",
  "You do not need to have used this screen before.",
];
