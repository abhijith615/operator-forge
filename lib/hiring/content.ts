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

/* ── Handover ─────────────────────────────────────────────────────────── */

export const HANDOVER_LINES = [
  "Two associates haven’t reported.",
  "Peak starts in about 35 minutes.",
  "Grocery inwarding is still being cleared.",
  "I’m handing over.",
];

export const HANDOVER_PANELS = [
  { id: "team", label: "Team" },
  { id: "metrics", label: "Store metrics" },
  { id: "pending", label: "Pending work" },
  { id: "demand", label: "Demand outlook" },
] as const;

export const PENDING_WORK = [
  { title: "Grocery inward", detail: "14 cartons received at 16:40. Putaway in progress." },
  { title: "High-value cage", detail: "Last cycle count 06:10 today. Next due tonight." },
  { title: "Last week’s incentives", detail: "Submitted by the store. Finance is processing." },
  { title: "Cluster audit", detail: "Wall-to-wall inventory count requested for this week." },
];

export const DEMAND_OUTLOOK = [
  { hour: "17:00", index: 100 },
  { hour: "17:30", index: 108 },
  { hour: "18:00", index: 138 },
  { hour: "18:30", index: 136 },
  { hour: "19:00", index: 124 },
  { hour: "20:00", index: 112 },
];

/* ── Absence ──────────────────────────────────────────────────────────── */

export const ABSENCE_OPTIONS: { id: AbsenceChoice; label: string; detail: string }[] = [
  { id: "onDemand", label: "On-demand picker", detail: "4-hour booking, ₹640. Arrives 17:50. Picking only, first shift here." },
  { id: "reallocate", label: "Internal reallocation", detail: "Move the people you have. Opens the floor board." },
  { id: "extend", label: "Ask an associate to extend", detail: "Arjun’s shift ends at 18:00. Ask him to stay to 20:00." },
  { id: "short", label: "Operate short", detail: "Run the evening with the twelve on the floor." },
];

/* ── Riya ─────────────────────────────────────────────────────────────── */

export const RIYA = {
  floorLead: ["Riya is slow again.", "Should I pull her?"],
  tenure: "11 days",
  ppiTrend: [31.2, 28.0, 25.1, 23.3, 21.4],
  accuracy: "99.7%",
  scanCompliance: "100%",
  zonePpi: [
    { zone: "A", ppi: 15.9 },
    { zone: "B", ppi: 17.4 },
    { zone: "C", ppi: 29.2 },
    { zone: "D", ppi: 18.1 },
  ],
  zoneNote: "Zone C: high concentration of visually similar SKUs.",
  quote: "I double-check there because I don’t want to pick the wrong item.",
};

export const RIYA_OPTIONS: { id: RiyaChoice; label: string }[] = [
  { id: "moveAB", label: "Move to Zones A/B for peak" },
  { id: "pair", label: "Pair with an expert" },
  { id: "coachLater", label: "Coach Zone C after peak" },
  { id: "keep", label: "Keep current assignment" },
  { id: "removePicking", label: "Remove from picking" },
  { id: "moveToPacking", label: "Move to packing" },
  { id: "warn", label: "Issue performance warning" },
];

/* ── Arjun ────────────────────────────────────────────────────────────── */

export const ARJUN = {
  lines: ["Last week’s incentive still hasn’t come.", "Why should I extend tonight?"],
  incentiveStatus: [
    { label: "Target", value: "Achieved" },
    { label: "Submission", value: "Completed" },
    { label: "Approval", value: "Approved" },
    { label: "Payment", value: "Pending" },
    { label: "Expected", value: "Tomorrow" },
  ],
  eligibility: [
    { label: "Hours today", value: "7h 30m" },
    { label: "Daily limit", value: "10h" },
    { label: "Extension", value: "Eligible to 20:00" },
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
  { id: "respectful", label: "I need you till 20:00 tonight. Will you stay?" },
  { id: "order", label: "You’re staying till 20:00." },
  { id: "threat", label: "Leaving now goes on your record." },
  { id: "none", label: "Go at 18:00. We’ll manage." },
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
      note: `${item} · stock movements today`,
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
      note: `Orders today containing ${item}`,
      rows: [
        { time: "09:40", text: `${o.first} · 1 × ${item}`, value: "Delivered" },
        { time: "11:12", text: `${o.cancelled} · 1 × ${item}`, value: "Cancelled 11:22" },
        { time: "12:28", text: `${o.third} · 1 × ${item}`, value: "Delivered" },
        { time: "14:41", text: `${o.scan} · 1 × ${item}`, value: "Delivered 14:58" },
      ],
    },
    scan: {
      note: "High-value scans at issue and pack",
      rows: [
        { time: "09:43", text: `${o.first} · item scan`, value: "✓" },
        { time: "11:16", text: `${o.cancelled} · item scan`, value: "✓" },
        { time: "12:31", text: `${o.third} · item scan`, value: "✓" },
        { time: "14:44", text: `${o.scan} · bag scan`, value: "✓" },
        { time: "—", text: `${o.scan} · item scan`, value: "missing", gap: true },
        { time: "14:46", text: `${o.scan} · packing confirmed`, value: "✓" },
        { time: "14:49", text: `${o.scan} · dispatch confirmed`, value: "✓" },
      ],
    },
    access: {
      note: "High-value cage · entries today. CCTV covers the cage door.",
      rows: [
        { time: "06:08", text: "Farhan · cycle count", value: "authorised" },
        { time: "09:41", text: "Arjun · pick", value: "authorised" },
        { time: "11:14", text: "Arjun · pick", value: "authorised" },
        { time: "12:29", text: "Farhan · pick", value: "authorised" },
        { time: "14:43", text: "Arjun · pick", value: "authorised" },
        { time: "15:20", text: "Deputy Manager · audit walk", value: "authorised" },
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
  { id: "fullAudit", label: "Full inventory audit, now" },
];

/* ── Nil pick ─────────────────────────────────────────────────────────── */

export const NIL_SOURCE_LABEL: Record<string, string> = {
  overstock: "Overstock",
  replenArea: "Replenishment area",
  adjacentBin: "Adjacent bin",
  transactions: "Recent transactions",
};

export function nilRecords(form: FormId): Record<string, RecordRow[]> {
  const { item, system } = formFor(form).nilPick;
  return {
    overstock: [
      { time: "O-4", text: `${item}`, value: "0 units" },
      { time: "15:10", text: "Last moved to shelf", value: "12 units" },
    ],
    replenArea: [
      { time: "16:40", text: `${item} · received, on the inbound pallet`, value: `${system} units` },
      { time: "—", text: "Putaway", value: "not done", gap: true },
    ],
    adjacentBin: [
      { time: "bin", text: "Holds a different pack size of the same line", value: "not this SKU" },
      { time: "bin", text: `${item} mis-slotted here`, value: "none" },
    ],
    transactions: [
      { time: "15:10", text: "Shelf fill", value: "+12" },
      { time: "15:10–17:20", text: "Sold", value: "−12" },
      { time: "16:40", text: "Goods receipt", value: `+${system}` },
      { time: "16:40", text: "Putaway task", value: "open, unassigned", gap: true },
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

/* ── Before the shift ─────────────────────────────────────────────────── */

export const POSITIONING = [
  "You will take charge of a live simulated dark store.",
  "You will manage people, inventory and operational problems.",
  "Your actions change what happens later in the shift.",
  "You will not be shown correct or incorrect answers during the simulation.",
  "You do not need experience with this exact interface.",
];
