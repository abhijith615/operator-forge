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
  "Two associates haven’t reported.",
  "The mother warehouse truck came at 04:30. Putaway isn’t finished.",
  "The breakfast rush builds from about half past six.",
  "I’m handing over.",
];

/**
 * The morning round: what an ASM walks before taking a 06:00 shift. Riders,
 * the floor, the fresh lines, the counts — and the team and its devices.
 */
export const HANDOVER_PANELS = [
  { id: "team", label: "Team & devices" },
  { id: "riders", label: "Rider attendance" },
  { id: "floorwalk", label: "Floor walk" },
  { id: "perishables", label: "Perishables" },
  { id: "audits", label: "Audits assigned" },
  { id: "demand", label: "Demand outlook" },
] as const;

export const FLOOR_WALK = [
  { title: "Inward dock", detail: "420 crates received from the mother warehouse at 04:30. 96 are still on the dock, waiting for putaway." },
  { title: "Aisles", detail: "All clear. The crates for Zone C are stacked at the end of Aisle C." },
  { title: "Carried over", detail: "No orders left from the night. Exception tote E-2 has not been emptied." },
  { title: "Notice board", detail: "Last week’s incentives: submitted by the store. Finance is processing." },
];

export const PERISHABLES = [
  { item: "Milk", detail: "Fresh crates in at 04:30. Two crates from yesterday are still in the chiller." },
  { item: "Bread", detail: "In at 04:30. Yesterday’s loaves are on the same shelf." },
  { item: "Eggs", detail: "In at 04:30. Trays not opened at receiving." },
  { item: "Fruit & vegetables", detail: "In at 04:30. Not yet looked at for quality." },
];

export const AUDITS = [
  { title: "Perishables check", detail: "Every morning before the rush: dates and quality on milk, bread, eggs, fruit and vegetables." },
  { title: "Cycle count · Zone B", detail: "Forty bins due today. Any time this shift." },
  { title: "High-value cage", detail: "Last counted yesterday at 06:10. Due again this morning." },
  { title: "Wall-to-wall count", detail: "Cluster office wants a full count this week." },
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
  { id: "onDemand", label: "Agency staff, by the hour", detail: "A picker from the staffing agency: ₹160 an hour, 4-hour minimum (₹640). Arrives 06:20. Picking only, first shift here." },
  { id: "reallocate", label: "Internal reallocation", detail: "Move the people you have, and set their devices. Opens the floor board." },
  { id: "extend", label: "Ask an associate to extend", detail: "Arjun’s overnight shift ends at 06:30. Ask him to stay to 08:30." },
  { id: "short", label: "Operate short", detail: "Run the morning with the twelve on the floor." },
];

/* ── Riya ─────────────────────────────────────────────────────────────── */

export const RIYA = {
  floorLead: ["Riya did thirty-one seconds an item this morning.", "She’s no use to me in the rush. Should I send her back to the agency?"],
  facts: [
    { label: "Joined", value: "Yesterday · through the agency" },
    { label: "Induction plan", value: "Days 1–2: putaway only, no pick target" },
    { label: "Device", value: "Role lock removed 05:10 · unlocked" },
    { label: "Orders sent to her", value: "14 since 05:12" },
    { label: "Mis-picks", value: "0 of 14" },
  ],
  /** Seconds an item across the fourteen orders, in the order she picked them. */
  ppiTrend: [36.4, 33.8, 31.9, 29.6, 27.3],
  /** Where the seconds went on an average item. */
  breakdown: [
    { part: "Finding the bin", seconds: 18.9 },
    { part: "Walking", seconds: 7.2 },
    { part: "Pick and scan", seconds: 5.1 },
  ],
  breakdownNote: "Store standard: 16 seconds an item. A trained picker spends about 3 of them finding the bin.",
  putaway: "Putaway yesterday: 38 crates. Today so far: 11.",
  quote: "Nobody told me I’d be picking. I don’t know where the racks are yet.",
};

export const RIYA_OPTIONS: { id: RiyaChoice; label: string }[] = [
  { id: "lockPutaway", label: "Lock her device to Putaway" },
  { id: "pair", label: "Pair her with a putaway hand to learn the bins" },
  { id: "phaseLater", label: "Plan her first picking shift for after the rush" },
  { id: "keep", label: "Leave things as they are" },
  { id: "target", label: "Keep her on orders, with the 16-second target" },
  { id: "returnAgency", label: "Send her back to the agency" },
  { id: "warn", label: "Issue a performance warning" },
];

/* ── Arjun ────────────────────────────────────────────────────────────── */

export const ARJUN = {
  lines: ["Last week’s incentive still hasn’t come.", "Why should I stay on for your rush?"],
  incentiveStatus: [
    { label: "Target", value: "Achieved" },
    { label: "Submission", value: "Completed" },
    { label: "Approval", value: "Approved" },
    { label: "Payment", value: "Pending" },
    { label: "Expected", value: "Tomorrow" },
  ],
  eligibility: [
    { label: "Shift", value: "Overnight · 21:30 to 06:30" },
    { label: "Daily limit", value: "11h with overtime" },
    { label: "Extension", value: "Eligible to 08:30" },
    { label: "Rate", value: "Overtime applies" },
  ],
};

export const ARJUN_ACK: { id: ArjunResponse["ack"]; label: string }[] = [
  { id: "recognise", label: "You hit your target last week. You earned that." },
  { id: "neutral", label: "I hear you." },
  { id: "dismiss", label: "This isn’t the time for this." },
];

/** `verified` is only on offer once the status has actually been checked. */
export const ARJUN_CLARIFY: { id: ArjunResponse["clarify"]; label: string; needsCheck?: boolean; withoutCheck?: boolean }[] = [
  { id: "verified", label: "It’s approved. Payment is pending, expected tomorrow.", needsCheck: true },
  { id: "guess", label: "It must be on its way by now.", withoutCheck: true },
  { id: "willCheck", label: "I don’t know yet. I’ll check and tell you today." },
  { id: "promise", label: "You’ll have it tomorrow. I guarantee it." },
  { id: "deflect", label: "That’s with payroll, not me." },
];

export const ARJUN_REQUEST: { id: ArjunResponse["request"]; label: string }[] = [
  { id: "respectful", label: "I need you till 08:30 this morning. Will you stay?" },
  { id: "order", label: "You’re staying till 08:30." },
  { id: "threat", label: "Leaving now goes on your record." },
  { id: "none", label: "Go at 06:30. We’ll manage." },
];

/* ── The high-value case ──────────────────────────────────────────────── */

export const CASE_TOOL_LABEL: Record<string, string> = {
  movement: "Movement log",
  orders: "Orders",
  scan: "Scan log",
  access: "Access log",
  exception: "Exception area",
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
      note: `${item} · stock movements since yesterday’s 06:10 count`,
      rows: [
        { time: "06:10", text: "Cycle count", value: `${opening}` },
        { time: "09:42", text: `Pick · order ${o.first}`, value: "−1" },
        { time: "11:15", text: `Pick · order ${o.cancelled}`, value: "−1" },
        { time: "11:22", text: `Cancellation reversal · order ${o.cancelled}`, value: "+1" },
        { time: "11:24", text: "Moved to exception tote E-2", value: "1 unit" },
        { time: "—", text: "Restow from exception tote", value: "no entry", gap: true },
        { time: "12:30", text: `Pick · order ${o.third}`, value: "−1" },
        { time: "now", text: "System balance", value: `${system}` },
      ],
    },
    orders: {
      note: `Orders yesterday containing ${item}`,
      rows: [
        { time: "09:40", text: `${o.first} · 1 × ${item}`, value: "Delivered" },
        { time: "11:12", text: `${o.cancelled} · 1 × ${item}`, value: "Cancelled 11:22" },
        { time: "12:28", text: `${o.third} · 1 × ${item}`, value: "Delivered" },
        { time: "14:41", text: `${o.scan} · 1 × ${item}`, value: "Delivered 14:58" },
      ],
    },
    scan: {
      note: "High-value scans at issue and pack · yesterday",
      rows: [
        { time: "09:43", text: `${o.first} · item scan`, value: "✓" },
        { time: "11:16", text: `${o.cancelled} · item scan`, value: "✓" },
        { time: "12:31", text: `${o.third} · item scan`, value: "✓" },
        { time: "14:44", text: `${o.scan} · bag scan`, value: "✓" },
        { time: "—", text: `${o.scan} · item scan`, value: "missing", gap: true },
        { time: "14:46", text: `${o.scan} · packed and staged`, value: "✓" },
        { time: "14:49", text: `${o.scan} · handed to rider`, value: "✓" },
      ],
    },
    access: {
      note: "High-value cage · entries since yesterday’s count. CCTV covers the cage door.",
      rows: [
        { time: "06:08", text: "Farhan · cycle count", value: "authorised" },
        { time: "09:41", text: "Arjun · pick", value: "authorised" },
        { time: "11:14", text: "Arjun · pick", value: "authorised" },
        { time: "12:29", text: "Farhan · pick", value: "authorised" },
        { time: "14:43", text: "Arjun · pick", value: "authorised" },
        { time: "15:20", text: "Assistant Store Manager · audit walk", value: "authorised" },
        { time: "16:02", text: "Farhan · pick (other line)", value: "authorised" },
      ],
    },
    exception: {
      note: "Exception tote E-2 · physical contents",
      rows: [
        { time: "tag", text: `1 × ${item}, sealed · “order ${o.cancelled} cancelled”`, value: "not restowed" },
        { time: "tag", text: "1 × Shampoo 340 ml · leaking", value: "damaged" },
        { time: "tag", text: "1 × Biscuits 800 g · crushed", value: "damaged" },
      ],
    },
  };
}

export const UNIT_CALLS: { id: UnitCall; label: string }[] = [
  { id: "explained", label: "Explained by records" },
  { id: "recovered", label: "Recovered" },
  { id: "unresolved", label: "Unresolved" },
  { id: "writeoff", label: "Write off" },
  { id: "theft", label: "Theft" },
];

export const CASE_STEPS: { id: CaseStep; label: string }[] = [
  { id: "preserve", label: "Preserve CCTV and logs" },
  { id: "controlAccess", label: "Supervised cage access only" },
  { id: "escalate", label: "Escalate to loss prevention" },
  { id: "accuse", label: "Name the associate responsible" },
  { id: "writeOff", label: "Write the unit off now" },
  { id: "closeStore", label: "Stop order release and search" },
];

export const CONTROL_FIXES: { id: ControlFix; label: string }[] = [
  { id: "scanAtIssue", label: "Item scan before a high-value bag is sealed" },
  { id: "exceptionRestow", label: "Clear and restow the exception tote hourly" },
  { id: "remindTeam", label: "Remind the team in tomorrow’s briefing" },
  { id: "fullAudit", label: "Wall-to-wall count, now" },
];

/* ── Nil pick ─────────────────────────────────────────────────────────── */

export const NIL_SOURCE_LABEL: Record<string, string> = {
  overstock: "Overstock bay",
  replenArea: "Inward dock",
  adjacentBin: "Adjacent bin",
  transactions: "Recent transactions",
};

export function nilRecords(form: FormId): Record<string, RecordRow[]> {
  const { item, system } = formFor(form).nilPick;
  return {
    overstock: [
      { time: "O-4", text: `${item}`, value: "0 units" },
      { time: "22:10", text: "Last moved to the bin", value: "12 units" },
    ],
    replenArea: [
      { time: "04:30", text: `${item} · received from the mother warehouse, in a crate on the dock`, value: `${system} units` },
      { time: "—", text: "Putaway", value: "not done", gap: true },
    ],
    adjacentBin: [
      { time: "bin", text: "Holds a different pack size of the same line", value: "not this SKU" },
      { time: "bin", text: `${item} mis-slotted here`, value: "none" },
    ],
    transactions: [
      { time: "22:10", text: "Bin fill", value: "+12" },
      { time: "22:10–06:05", text: "Sold", value: "−12" },
      { time: "04:30", text: "Goods receipt", value: `+${system}` },
      { time: "05:48", text: "Putaway task raised · bin below threshold", value: "open, unassigned", gap: true },
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
  { id: "informPriority", label: "Tell the customer now, priority rider" },
  { id: "voucher", label: "Send a ₹200 voucher" },
  { id: "cancel", label: "Cancel and refund" },
];

/* ── Consent ──────────────────────────────────────────────────────────── */

/** Where a candidate writes to ask for extra time, a copy of their data, or its deletion. */
export const HIRING_CONTACT = "hello@operatorforge.in";

/**
 * The version of the notice below. Recorded with each attempt, so it is always
 * possible to say what a given candidate agreed to. Change it whenever the
 * notice changes in substance.
 */
export const CONSENT_VERSION = "2026-10-12";

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
    text: "Your email address; every decision you make in the simulation and when you made it; whether you are on a phone, tablet or computer; when the page was hidden, reloaded or lost its connection; and the topics you ask the assistant about (not the words you type).",
  },
  {
    title: "What it is used for",
    text: "To produce your profile and an assessment of how you ran the shift, for hiring. It is scored by fixed rules. No AI model scores you, and nothing rejects you automatically — a person decides.",
  },
  {
    title: "Who sees it",
    text: "Operator Forge, and the employer who asked you to take this test, if one did. You see your own profile when the shift ends.",
  },
  {
    title: "Your choices",
    text: "Taking the test is your choice. You can ask for a copy of your data, withdraw your consent or have your attempt deleted at any time by writing to the address below.",
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
  note: "An introduction to how a dark store operates. Watching is optional, and your time does not start until you press Start Shift.",
};

export const POSITIONING = [
  "You will take charge of a live simulated dark store.",
  "You will manage people, inventory and operational problems.",
  "Your actions change what happens later in the shift.",
  "You will not be shown correct or incorrect answers during the simulation.",
  "You do not need experience with this exact interface.",
];
