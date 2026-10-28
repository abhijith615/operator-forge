/**
 * FC Executive — the inbound shift, in words.
 *
 * Everything the candidate reads lives here: the people, the trucks, the docks,
 * the papers and the spreadsheet. Plain, short English: many candidates read
 * English as a second language, and the test is about running a dock, not
 * about reading. The scoring never reads these strings — it reads ids.
 */

export const FC_TITLE = "FC Executive";
export const FC_SITE = "FC Hoskote";
export const HIRING_CONTACT = "hello@operatorforge.in";

/* ── Time ─────────────────────────────────────────────────────────────── */

/** The shift clock is minutes after 07:00. */
export function clockLabel(minutes: number): string {
  const total = 7 * 60 + Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** The dock board runs in half-hour slots from 07:30. */
export const SLOTS = 10;
export const slotStart = (slot: number) => 30 + slot * 30;
export const slotLabel = (slot: number) => clockLabel(slotStart(slot));

/* ── Docks ────────────────────────────────────────────────────────────── */

export type DockId = "D1" | "D2" | "D3" | "D4";
export const DOCKS: DockId[] = ["D1", "D2", "D3", "D4"];

export const DOCK_INFO: Record<DockId, { label: string; note: string }> = {
  D1: { label: "Dock 1", note: "Normal dock" },
  D2: { label: "Dock 2", note: "Normal dock" },
  D3: { label: "Dock 3", note: "Cold dock · has power for chilled trucks" },
  D4: { label: "Dock 4", note: "Normal dock" },
};

export const COLD_DOCK: DockId = "D3";
/** Unloading crews: two loaders and one scanner each. */
export const CREWS_AT_FULL_TEAM = 3;
/** Dock 2's leveler is repaired from 09:00 to 10:00 (slots 3 and 4). Known from 07:45. */
export const D2_DOWN = [3, 4];

/* ── Trucks ───────────────────────────────────────────────────────────── */

export type VehicleId = "spice" | "dairy" | "bright" | "crunchy" | "mega" | "quickbev";

export interface Vehicle {
  id: VehicleId;
  vendor: string;
  load: string;
  chilled: boolean;
  /** Booked start slot. Null for a truck with no booking. */
  booked: number | null;
  /** Slots it takes to unload. */
  length: number;
  /** First slot it can start: when it is at the gate. */
  arrives: number;
}

export const VEHICLES: Record<VehicleId, Vehicle> = {
  spice: { id: "spice", vendor: "Spice Route Foods", load: "Rice, dal & spices · 18 pallets", chilled: false, booked: 1, length: 2, arrives: 1 },
  dairy: { id: "dairy", vendor: "FreshFarm Dairy", load: "Milk & curd · 240 crates · chilled", chilled: true, booked: 1, length: 2, arrives: 1 },
  bright: { id: "bright", vendor: "BrightHome Cleaning", load: "Detergents & cleaners · 14 pallets", chilled: false, booked: 2, length: 2, arrives: 2 },
  crunchy: { id: "crunchy", vendor: "Crunchy Snacks", load: "Chips & namkeen · 480 cartons · 32-ft truck", chilled: false, booked: 3, length: 3, arrives: 3 },
  mega: { id: "mega", vendor: "Mega Mart Staples", load: "Atta, oil & sugar · 26 pallets · 32-ft truck", chilled: false, booked: 6, length: 3, arrives: 6 },
  quickbev: { id: "quickbev", vendor: "QuickBev Drinks", load: "Soft drinks · 12 pallets · no booking", chilled: false, booked: null, length: 2, arrives: 1 },
};

/** On the board at 07:10. QuickBev is not: nobody knows it is coming. */
export const BOOKED: VehicleId[] = ["spice", "dairy", "bright", "crunchy", "mega"];
/** Booked trucks that the replan must not push back without reason. */
export const CONFIRMED: VehicleId[] = ["spice", "bright", "crunchy", "mega"];
/** FreshFarm's new time once the 07:45 update lands: slot 3 (09:00). */
export const DAIRY_LATE_ARRIVES = 3;

/* ── People ───────────────────────────────────────────────────────────── */

export type TaskId = "unload" | "scan" | "qc" | "putaway" | "grn";

export const TASK_LABEL: Record<TaskId, string> = {
  unload: "Unloading",
  scan: "Scanning",
  qc: "Quality check",
  putaway: "Putaway",
  grn: "GRN desk",
};

export const TASK_NOTE: Record<TaskId, string> = {
  unload: "Takes cartons and pallets off the truck. Two per working dock.",
  scan: "Scans every carton with a handheld. One per working dock.",
  qc: "Checks dates, damage and temperature before stock is accepted.",
  putaway: "Moves accepted pallets to the racks and cold room.",
  grn: "Enters the GRN in the system once the count and QC are done.",
};

export type PersonId =
  | "ravi" | "salim" | "ganesh" | "mohan" | "pradeep" | "ajay"
  | "divya" | "imran" | "meena" | "neha" | "babu" | "suresh" | "arif";

export interface Person {
  id: PersonId;
  name: string;
  role: string;
  skills: TaskId[];
  note: string;
}

export const TEAM: Person[] = [
  { id: "ravi", name: "Ravi", role: "Loader · dock lead", skills: ["unload", "putaway"], note: "Leads the loaders. Six years here." },
  { id: "salim", name: "Salim", role: "Loader", skills: ["unload", "putaway"], note: "Strong and steady." },
  { id: "ganesh", name: "Ganesh", role: "Loader", skills: ["unload", "putaway"], note: "Contract staff, second month." },
  { id: "mohan", name: "Mohan", role: "Loader", skills: ["unload", "putaway"], note: "Contract staff." },
  { id: "pradeep", name: "Pradeep", role: "Loader", skills: ["unload", "putaway"], note: "Contract staff." },
  { id: "ajay", name: "Ajay", role: "Loader · scanner trained", skills: ["unload", "putaway", "scan"], note: "Trained on the handheld scanner last month." },
  { id: "divya", name: "Divya", role: "Receiver", skills: ["scan", "unload"], note: "Fast and accurate with the scanner." },
  { id: "imran", name: "Imran", role: "Receiver", skills: ["scan", "unload"], note: "Knows every vendor's cartons." },
  { id: "meena", name: "Meena", role: "QC checker", skills: ["qc", "scan"], note: "Trained for QC and cold-chain checks." },
  { id: "neha", name: "Neha", role: "GRN & data", skills: ["grn", "scan"], note: "Runs the GRN desk and the inbound tracker." },
  { id: "babu", name: "Babu", role: "Reach-truck driver", skills: ["putaway", "unload"], note: "Licensed for the reach truck and forklift." },
  { id: "suresh", name: "Suresh", role: "Pallet-truck driver", skills: ["putaway", "unload"], note: "Licensed for the battery pallet truck." },
  { id: "arif", name: "Arif", role: "Forklift driver", skills: ["putaway", "unload"], note: "Licensed for the forklift." },
];

export const PERSON = Object.fromEntries(TEAM.map((p) => [p.id, p])) as Record<PersonId, Person>;
export const nameOf = (id: string) => (id === "me" ? "you" : (PERSON[id as PersonId]?.name ?? id));

/** How the night shift left the floor. Meena is still on scanning from last night, so nobody is on QC. */
export const HANDOVER_TEAM: Record<PersonId, TaskId> = {
  ravi: "unload", salim: "unload", ganesh: "unload", mohan: "unload", pradeep: "unload", ajay: "unload",
  divya: "scan", imran: "scan", meena: "scan", neha: "grn",
  babu: "putaway", suresh: "putaway", arif: "putaway",
};

/** Work that somebody on the team can do. "Fit" is for the candidate's eye; the scorer reads `suited`. */
export type JobId = "recountCrates" | "qcCheck" | "grnEntry" | "recountPallet" | "relabel" | "putawayBacklog" | "spiceGrn" | "tempLog";

export const JOB_LABEL: Record<JobId, string> = {
  recountCrates: "Recount the crates",
  qcCheck: "Do the quality check",
  grnEntry: "Enter the GRN",
  recountPallet: "Recount the short pallets",
  relabel: "Check and relabel 4 cartons",
  putawayBacklog: "Clear the putaway backlog",
  spiceGrn: "Finish Spice Route's GRN",
  tempLog: "Cold-room temperature check",
};

export const SUITED: Record<JobId, PersonId[]> = {
  recountCrates: ["divya", "imran", "ajay"],
  qcCheck: ["meena"],
  grnEntry: ["neha"],
  recountPallet: ["divya", "imran", "ajay"],
  relabel: ["divya", "imran", "neha"],
  putawayBacklog: ["babu", "suresh", "arif"],
  spiceGrn: ["neha"],
  tempLog: ["meena"],
};

/** Who can be offered for a job: the suited, and a few who are not, so the choice is real. */
export const OFFERED: Record<JobId, PersonId[]> = {
  recountCrates: ["divya", "imran", "ajay", "ravi", "neha"],
  qcCheck: ["meena", "divya", "ravi", "neha"],
  grnEntry: ["neha", "divya", "imran"],
  recountPallet: ["divya", "imran", "ajay", "ravi", "salim"],
  relabel: ["divya", "imran", "neha", "ravi"],
  putawayBacklog: ["babu", "suresh", "arif", "ravi"],
  spiceGrn: ["neha", "imran"],
  tempLog: ["meena", "divya"],
};

/* ── 07:00 Handover ───────────────────────────────────────────────────── */

export const HANDOVER_PANELS: { id: string; title: string; detail: string; rows: string[] }[] = [
  {
    id: "docks",
    title: "Docks",
    detail: "4 docks · 1 is cold",
    rows: [
      "Docks 1, 2 and 4 are normal docks.",
      "Dock 3 is the only cold dock. Chilled trucks need it to keep the cold chain.",
      "We have 3 unloading crews. A crew is 2 loaders and 1 scanner. So at most 3 trucks can be unloaded at the same time.",
    ],
  },
  {
    id: "trucks",
    title: "Trucks booked today",
    detail: "5 bookings",
    rows: [
      "08:00 · Spice Route Foods · rice, dal & spices · about 1 hour",
      "08:00 · FreshFarm Dairy · milk & curd, chilled · about 1 hour",
      "08:30 · BrightHome Cleaning · detergents · about 1 hour",
      "09:00 · Crunchy Snacks · 480 cartons, 32-ft truck · about 1½ hours",
      "10:30 · Mega Mart Staples · 26 pallets, 32-ft truck · about 1½ hours",
    ],
  },
  {
    id: "team",
    title: "Team today",
    detail: "13 present · 1 absent",
    rows: [
      "Kavitha (receiver) is off sick today.",
      "Meena is still on scanning. Night shift moved her there to cover.",
      "Ajay was trained on the handheld scanner last month.",
      "Babu, Suresh and Arif hold MHE licences (reach truck, pallet truck, forklift).",
    ],
  },
  {
    id: "backlog",
    title: "Left from the night",
    detail: "30 pallets · 1 open issue",
    rows: [
      "30 pallets from last night are waiting for putaway.",
      "Yesterday Spice Route was short on 2 deliveries. Procurement is watching them.",
      "Dark stores need fresh milk and curd for tonight's orders (STOs).",
    ],
  },
];

export const NIGHT_LEAD = { who: "Sunil", role: "Night shift lead" };
export const NIGHT_LEAD_LINES = [
  "Morning. Busy day — five trucks booked, and the dairy truck matters most. Dark stores need that milk tonight.",
  "The board and the team are yours now. I'm going home.",
];

/* ── 07:45 Replan ─────────────────────────────────────────────────────── */

export const REPLAN_UPDATES: { id: string; title: string; text: string }[] = [
  { id: "dairy", title: "FreshFarm Dairy is late", text: "Stuck in traffic. New time at the gate: 09:00. The truck is chilled." },
  { id: "quickbev", title: "QuickBev Drinks is at the gate", text: "No booking. 12 pallets of soft drinks, about 1 hour to unload. The driver wants to unload now." },
  { id: "d2", title: "Dock 2 repair", text: "Maintenance will fix the Dock 2 leveler from 09:00 to 10:00. No truck can use Dock 2 then." },
];

export const QUICKBEV_OPTIONS: { id: "board" | "offpeak" | "turnaway"; label: string; detail: string }[] = [
  { id: "board", label: "Give it a slot on the board", detail: "Place QuickBev on a dock and time that is free." },
  { id: "offpeak", label: "Ask it to wait for a quiet slot", detail: "The driver waits; QuickBev unloads after 12:00." },
  { id: "turnaway", label: "Turn it away", detail: "No booking, no unloading today. The vendor must book again." },
];

/* ── 09:00 Receive: FreshFarm Dairy ───────────────────────────────────── */

export type GateCheckId = "appointment" | "seal" | "documents" | "temperature";

export const GATE_CHECKS: { id: GateCheckId; label: string; detail: string; result: string[] }[] = [
  {
    id: "appointment",
    label: "Booking",
    detail: "Is this truck booked for now?",
    result: ["Booking moved to 09:00 this morning. The truck is on time for the new booking."],
  },
  {
    id: "seal",
    label: "Truck seal",
    detail: "Does the door seal match the invoice?",
    result: ["Seal on the door: FF-20931.", "Seal number on the invoice: FF-20931.", "The seal is not broken."],
  },
  {
    id: "documents",
    label: "Documents",
    detail: "Invoice, ASN and PO",
    result: ["Tax invoice: 2 copies, 240 crates.", "ASN (vendor's shipping note): 240 crates.", "PO (our order): 240 crates."],
  },
  {
    id: "temperature",
    label: "Temperature",
    detail: "Read the truck's temperature recorder",
    result: ["Temperature recorder: 3.6 °C for the whole trip.", "Inside the truck now: 3.9 °C.", "Chilled stock must stay between 0 and 4 °C."],
  },
];

export const COUNT_OPTIONS: { id: "recount" | "close" | "invoice" | "driver"; label: string; detail: string }[] = [
  { id: "recount", label: "Recount the crates physically", detail: "Somebody counts what is on the dock." },
  { id: "close", label: "Close the count at 238", detail: "Raise a shortage note (DN) to the vendor for 2 crates." },
  { id: "invoice", label: "Accept 240, as the invoice says", detail: "Go with the vendor's paperwork." },
  { id: "driver", label: "Ask the driver", detail: "He was there when it was loaded." },
];

export const QC_RESULT = [
  "228 crates (batch B-2214): best before in 9 days. That is 85% of shelf life left.",
  "12 crates of curd (batch B-2210): best before in 4 days. That is 60% of shelf life left.",
  "Our rule: chilled stock needs at least 70% shelf life left when we receive it.",
  "No damage. Labels and FSSAI numbers are fine.",
];

export const QC_DECISIONS: { id: "rejectNoted" | "reject" | "acceptAll" | "holdAll"; label: string; detail: string }[] = [
  { id: "rejectNoted", label: "Reject the 12 crates and write down why", detail: "Reason: 60% shelf life, below the 70% rule." },
  { id: "reject", label: "Reject the 12 crates", detail: "Set them aside." },
  { id: "acceptAll", label: "Accept all 240", detail: "Dark stores need curd tonight. It will sell in 4 days." },
  { id: "holdAll", label: "Hold the whole truck", detail: "Accept nothing until the vendor calls back." },
];

export const PUTAWAY_OPTIONS: { id: "split" | "allCold" | "dockAside" | "ambient"; label: string; detail: string }[] = [
  { id: "split", label: "Good stock to the cold room. Rejected crates to cold quarantine with an RTV note.", detail: "RTV = return to vendor." },
  { id: "allCold", label: "Everything to the cold room. Sort it out later.", detail: "Fastest way off the dock." },
  { id: "dockAside", label: "Good stock to the cold room. Leave rejected crates by the dock.", detail: "Decide about them later." },
  { id: "ambient", label: "Everything to normal storage for now.", detail: "The cold room is busy." },
];

/* ── 10:00 Discrepancy: Crunchy Snacks ────────────────────────────────── */

export const DISC_EXPECTED = 480;
export const DISC_SCANNED = 468;

export type EvidenceId = "asn" | "scan" | "qcnote" | "log" | "cctv" | "vendor";

export const DISC_EVIDENCE: { id: EvidenceId; label: string; detail: string; result: string[] }[] = [
  { id: "asn", label: "PO and ASN", detail: "What we ordered and what was sent", result: ["PO: 480 cartons.", "ASN: 480 cartons on 12 pallets of 40."] },
  { id: "scan", label: "Scanner history", detail: "Scans pallet by pallet", result: ["468 cartons scanned.", "Pallet 3: 34 scanned.", "Pallet 7: 38 scanned.", "Pallet 9: 36 scanned.", "All other pallets: 40 each."] },
  { id: "qcnote", label: "QC note", detail: "From Meena", result: ["6 cartons from pallet 3 are crushed. The chips packets inside are burst.", "They are set aside in the damage area by Dock 1."] },
  { id: "log", label: "Receiving log", detail: "From Divya", result: ["4 cartons on pallet 9 have smudged barcodes. The scanner cannot read them.", "Product, MRP and dates look fine. Kept aside."] },
  { id: "cctv", label: "Dock camera", detail: "Video of the truck being opened", result: ["When the truck door opened, pallet 3 was already crushed at the bottom.", "The vendor had stacked pallets two high inside the truck."] },
  { id: "vendor", label: "Vendor's driver", detail: "What he says", result: ["“We loaded all 480. Your team must have lost them.”"] },
];

export const RECOUNT_RESULT = [
  "Pallet 3: 34 cartons, plus 6 set aside in the damage area.",
  "Pallet 7: 38 cartons. 2 are not on the dock or in the truck.",
  "Pallet 9: 36 cartons, plus 4 set aside by receiving.",
];

export const DAMAGED_FATES: { id: "rtv" | "scrap" | "accept"; label: string; detail: string }[] = [
  { id: "rtv", label: "Quarantine and return to vendor (RTV)", detail: "Kept out of stock. Vendor gets a credit claim." },
  { id: "scrap", label: "Throw them away now", detail: "Clears the dock." },
  { id: "accept", label: "Accept into stock", detail: "Only the outer cartons look bad." },
];

export const UNSCANNABLE_FATES: { id: "relabel" | "reject" | "short"; label: string; detail: string }[] = [
  { id: "relabel", label: "Check product and MRP, relabel, then accept", detail: "They are good stock with bad labels." },
  { id: "reject", label: "Reject them to the vendor", detail: "Unreadable labels are not accepted." },
  { id: "short", label: "Count them as short", detail: "If it can't be scanned, it isn't received." },
];

export const CAUSE_OPTIONS: { id: "vendorStacking" | "ourUnloading" | "transport" | "unsure"; label: string }[] = [
  { id: "vendorStacking", label: "The vendor loaded pallets two high, and the bottom one was crushed" },
  { id: "ourUnloading", label: "Our team dropped them while unloading" },
  { id: "transport", label: "Bad roads on the way" },
  { id: "unsure", label: "Not sure yet" },
];

export const PREVENT_OPTIONS: { id: "gateCheck" | "review" | "remind" | "nothing"; label: string }[] = [
  { id: "gateCheck", label: "Ask Crunchy Snacks to stop stacking pallets two high, and check pallets at the truck door before unloading" },
  { id: "review", label: "Raise it with the vendor at the monthly review" },
  { id: "remind", label: "Remind the team to unload carefully" },
  { id: "nothing", label: "Nothing — it was a one-off" },
];

/* ── 11:00 Data ───────────────────────────────────────────────────────── */

export interface SheetRow {
  id: string;
  vendor: string;
  plan: number;
  accepted: number;
  damaged: number;
  short: number;
  grn: "Done" | "Pending";
  dockMinutes: number;
  duplicate?: boolean;
}

/** The tracker Neha sends at 11:00. Spice Route has been pasted twice. */
export const SHEET: SheetRow[] = [
  { id: "spice", vendor: "Spice Route Foods", plan: 1200, accepted: 1180, damaged: 8, short: 12, grn: "Done", dockMinutes: 75 },
  { id: "quickbev", vendor: "QuickBev Drinks", plan: 600, accepted: 600, damaged: 0, short: 0, grn: "Done", dockMinutes: 60 },
  { id: "bright", vendor: "BrightHome Cleaning", plan: 850, accepted: 850, damaged: 0, short: 0, grn: "Pending", dockMinutes: 140 },
  { id: "dairy", vendor: "FreshFarm Dairy", plan: 240, accepted: 228, damaged: 12, short: 0, grn: "Done", dockMinutes: 70 },
  { id: "crunchy", vendor: "Crunchy Snacks", plan: 480, accepted: 472, damaged: 6, short: 2, grn: "Pending", dockMinutes: 95 },
  { id: "spice2", vendor: "Spice Route Foods", plan: 1200, accepted: 1180, damaged: 8, short: 12, grn: "Done", dockMinutes: 75, duplicate: true },
];

/** What was booked and arrived today, from the dock schedule: the number the totals must match. */
export const SCHEDULE_PLAN_TOTAL = 3370;

export const SHEET_TOOLS: { id: "totals" | "duplicates"; label: string; detail: string }[] = [
  { id: "totals", label: "Check totals against the dock schedule", detail: "Does the plan total match today's trucks?" },
  { id: "duplicates", label: "Check for repeated rows", detail: "Is any vendor listed twice?" },
];

export const SIGNALS: { id: string; label: string; real: boolean }[] = [
  { id: "brightGrn", label: "BrightHome: GRN still pending after 140 minutes at the dock", real: true },
  { id: "spiceLoss", label: "Spice Route: 20 cartons short or damaged — the most of any vendor", real: true },
  { id: "crunchyOpen", label: "Crunchy Snacks: GRN pending, with 2 short and 6 damaged", real: true },
  { id: "quickbevFull", label: "QuickBev: delivered in full", real: false },
  { id: "dairyDock", label: "FreshFarm: 70 minutes at the dock", real: false },
  { id: "bigTotal", label: "Total accepted today is 4,510 units", real: false },
];

export const DRIVER_OPTIONS: { id: "spice" | "grocery" | "spread" | "crunchy" | "dairy"; label: string }[] = [
  { id: "spice", label: "Spice Route Foods" },
  { id: "grocery", label: "The grocery vendors in general" },
  { id: "spread", label: "It is spread evenly across vendors" },
  { id: "crunchy", label: "Crunchy Snacks" },
  { id: "dairy", label: "FreshFarm Dairy" },
];

export const REPORT_LINES: { id: string; text: string; kind: "volume" | "exceptions" | "status" | "action" | "misleading" | "filler" }[] = [
  { id: "volume", text: "Inbound: 5 vendors. 3,330 units accepted of 3,370 planned (98.8%).", kind: "volume" },
  { id: "volumeWrong", text: "Inbound: 4,510 units accepted of 4,570 planned.", kind: "misleading" },
  { id: "exceptions", text: "Exceptions: 26 damaged or rejected and 14 short — Spice Route 8 + 12, Crunchy Snacks 6 + 2, FreshFarm 12 rejected for shelf life.", kind: "exceptions" },
  { id: "grnPending", text: "GRN pending: BrightHome (850 units) and Crunchy Snacks (472 units).", kind: "status" },
  { id: "dockDelay", text: "Dock delay: BrightHome at the dock for 140 minutes; GRN still pending.", kind: "status" },
  { id: "actions", text: "Action: Procurement to take up Spice Route shortages. DN raised for Crunchy Snacks (2). RTV for the 26 damaged or rejected units.", kind: "action" },
  { id: "allGood", text: "All vendors delivered well today.", kind: "misleading" },
  { id: "teamWell", text: "The team worked hard and the morning went smoothly.", kind: "filler" },
];

export const ESCALATIONS: { id: "evidence" | "partial" | "vague" | "hide" | "wrong"; text: string }[] = [
  { id: "evidence", text: "Spice Route: 20 of 1,200 cartons short or damaged today (1.7%) — half of today's losses. Please ask Procurement to raise it at this week's vendor review." },
  { id: "partial", text: "Spice Route had 12 cartons short today. Please check." },
  { id: "vague", text: "Some vendors are giving us problems. Please look into it." },
  { id: "wrong", text: "Spice Route was short 40 cartons today. This has to stop." },
  { id: "hide", text: "Nothing to raise today — the losses are small." },
];

/* ── 11:30 Peak ───────────────────────────────────────────────────────── */

export type PeakItemId = "overrun" | "megaLate" | "backlog" | "spiceGrn" | "tempLog";
export type Bucket = "now" | "delegate" | "reschedule" | "escalate";

export const BUCKET_LABEL: Record<Bucket, string> = {
  now: "Do now",
  delegate: "Delegate",
  reschedule: "Reschedule",
  escalate: "Escalate",
};

export const BUCKET_NOTE: Record<Bucket, string> = {
  now: "You deal with it yourself, now. You can do 2 things yourself.",
  delegate: "Give it to someone on your team.",
  reschedule: "Move it to a later time.",
  escalate: "Pass it to your Operations Manager.",
};

export const DO_NOW_LIMIT = 2;

export const PEAK_ITEMS: { id: PeakItemId; title: string; text: string; delegateTo: string }[] = [
  { id: "overrun", title: "A dock is running over", text: "BrightHome is still on its dock, 40 minutes past its slot. The next truck on that dock is waiting.", delegateTo: "Ravi (dock lead)" },
  { id: "megaLate", title: "Mega Mart is late", text: "The 32-ft Mega Mart truck was booked for 10:30. It reached the gate at 11:30, an hour late. Every dock is busy until 12:30.", delegateTo: "Gate security" },
  { id: "backlog", title: "Putaway backlog", text: "46 pallets are waiting at the docks for putaway. Unloading is quieter now.", delegateTo: "Babu, Suresh and 2 loaders" },
  { id: "spiceGrn", title: "Spice Route GRN", text: "Spice Route's GRN needs its final entry in the system.", delegateTo: "Neha (GRN desk)" },
  { id: "tempLog", title: "Cold-room temperature check", text: "The 2-hourly cold-room temperature check is due now.", delegateTo: "Meena (QC)" },
];

export const VENDOR_LINE = "“Those 6 cartons were fine when they left our warehouse. Accept them, or we will stop sending trucks to you.”";

export const VENDOR_REPLIES: { id: "facts" | "later" | "angry" | "threat"; text: string }[] = [
  { id: "facts", text: "The dock camera shows pallet 3 already crushed when your truck door opened — the pallets were stacked two high. The 6 cartons go back on an RTV with photos. Can your team confirm the credit note by tomorrow?" },
  { id: "later", text: "There is a problem with 6 cartons. We will send you the details later." },
  { id: "angry", text: "Your deliveries are always a problem. Sort it out on your side." },
  { id: "threat", text: "Your driver must have damaged them. Accept it, or we stop your bookings." },
];

export const PROCUREMENT_LINE = "“Will FreshFarm's milk and curd be ready for tonight's dark-store orders? And what happened with Crunchy Snacks?”";

export const PROCUREMENT_MESSAGES: { id: "full" | "brief" | "broadcast" | "allFine"; to: string; text: string }[] = [
  {
    id: "full",
    to: "Pooja (Procurement), copy Sanjay (Inventory)",
    text: "FreshFarm: 228 crates accepted, GRN done, in the cold room — ready for tonight. 12 crates rejected (shelf life below 70%), RTV raised. Crunchy Snacks: DN for 2 short; 6 crushed cartons on RTV with camera proof. Pooja, please follow up the credit note.",
  },
  { id: "brief", to: "Pooja (Procurement)", text: "Milk is received. Some issues with snacks." },
  { id: "broadcast", to: "All FC staff group", text: "Lots of problems today with vendors. Please help." },
  { id: "allFine", to: "Pooja (Procurement)", text: "All fine. Everything was received in full." },
];

/* ── Before and after ─────────────────────────────────────────────────── */

export const PHASES = ["Handover", "Dock plan", "Receive", "Discrepancy", "Data", "Peak"] as const;
export type Phase = (typeof PHASES)[number];

export const POSITIONING = [
  "You are the FC Executive for inbound at a busy fulfilment centre.",
  "You plan the docks, lead the team, receive trucks, fix problems and report the numbers.",
  "Your choices change what happens later in the shift.",
  "Nobody tells you if a choice was right or wrong during the test.",
  "You do not need to know this exact screen. Tap “Ask” for any word you don't know.",
];

/**
 * Bump when DATA_NOTICE changes. The version a candidate agreed to is stored
 * with their attempt.
 */
export const FC_CONSENT_VERSION = "fc-2026-10-28";

export const DATA_NOTICE: { title: string; text: string }[] = [
  {
    title: "What we record",
    text: "The name and WhatsApp number you enter; every choice you make in the test and when you made it; whether you are on a phone, tablet or computer; when the page was hidden, reloaded or lost its connection; and the topics you ask the assistant about (not the words you type).",
  },
  {
    title: "What it is used for",
    text: "To produce your profile and an assessment of how you ran the shift, for hiring, and to contact you on WhatsApp about this assessment. It is scored by fixed rules. No AI model scores you, and nothing rejects you automatically — a person decides.",
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
