/**
 * The FC Executive assistant.
 *
 * Explains words and screens in plain English. It never says what to decide:
 * the same written answers for every candidate, so the test treats everybody
 * the same and nothing here can give away a scoring rule. Only the topic of a
 * question is logged, never its words, and nothing asked here is scored.
 */

export interface FcGuideReply {
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

const DECLINE: Entry = {
  topic: "asked_for_answer",
  match:
    /\b((right|correct|best|wrong|good|better) (answer|option|choice|one|move|dock|slot)|which (option|one|choice|dock|truck|vendor|line|message|reply|bucket|person)s? (should|do|is|to)|should i\b|shall i\b|what would you|(give|any) (me )?(a )?hints?|\bhint\b|tell me what to|what do i (choose|pick|select|do)|is it better|recommend|what.?s the answer|am i right|is this right|cheat)/i,
  text: "That one is your call — it is what the test is finding out. I can explain any word or screen: what GRN means, how the dock board works, what a button does.",
  suggestions: ["How does the dock board work?", "What is a GRN?", "What do the four buckets mean?"],
};

const ENTRIES: Entry[] = [
  { topic: "grn", match: /\bgrn\b|goods receiv/i, text: "GRN = Goods Received Note. It is the entry in the system that says “we have received this stock”. After the GRN, the stock counts as ours and can be stored and sold. It should match what was really received and passed QC.", suggestions: ["What is a DN?", "What is QC?"] },
  { topic: "asn", match: /\basn\b|advance(d)? ship/i, text: "ASN = Advance Shipping Notice. The vendor's note of what is on the truck: how many cartons or crates, on how many pallets.", suggestions: ["What is a PO?", "What is an invoice?"] },
  { topic: "po", match: /\bpo\b|purchase order/i, text: "PO = Purchase Order. Our order to the vendor: what we asked for and how much.", suggestions: ["What is an ASN?"] },
  { topic: "invoice", match: /invoice|challan/i, text: "The tax invoice is the vendor's bill for what is on the truck. It comes in two copies. A delivery challan is a list that travels with the goods." },
  { topic: "dn", match: /\bdn\b|discrepancy note|shortage note|credit note/i, text: "DN = Discrepancy Note. When less stock arrives than the vendor billed, a DN records the gap so the vendor gives credit (a credit note) for it.", suggestions: ["What is RTV?"] },
  { topic: "rtv", match: /\brtv\b|return(ed)? to vendor|return to supplier/i, text: "RTV = Return To Vendor. Stock we will not keep — damaged, failed QC, or wrong — is set aside and sent back to the vendor, who gives credit for it.", suggestions: ["What is quarantine?"] },
  { topic: "quarantine", match: /quarantin|defective cage|damage area/i, text: "Quarantine is a separate, marked area for stock that must not be sold — damaged, failed QC or waiting for a decision. Stock there is kept out of the system's available stock." },
  { topic: "hht", match: /\bhht\b|hand.?held|scanner|scanning|barcode|\bean\b/i, text: "HHT = Hand-Held Terminal: the scanner people use to scan every carton's barcode. The scan count is what the system thinks arrived.", suggestions: ["What is a GRN?"] },
  { topic: "qc", match: /\bqc\b|quality check|quality control/i, text: "QC = Quality Check. Before stock is accepted someone checks dates, damage, labels and, for chilled goods, temperature.", suggestions: ["What is the shelf-life rule?"] },
  { topic: "shelf_life", match: /shelf.?life|best before|expiry|70 ?%|percent/i, text: "Shelf life is how long a product stays good. Our rule: when we receive stock it must have at least 70% of its shelf life left. Example: milk good for 10 days must have at least 7 days left when it reaches us." },
  { topic: "fefo", match: /\bfefo\b|\bfifo\b|first.?expir/i, text: "FEFO = First Expiry, First Out. Stock that expires soonest is sent out first." },
  { topic: "fssai", match: /fssai|food safety/i, text: "FSSAI is India's food safety authority. Food packs must show a valid 14-digit FSSAI licence number." },
  { topic: "mrp", match: /\bmrp\b|retail price/i, text: "MRP = Maximum Retail Price, printed on every pack." },
  { topic: "putaway", match: /put.?away|backlog/i, text: "Putaway means moving received stock from the dock to its storage place — racks, the cold room or quarantine. A putaway backlog is stock still waiting at the dock to be moved.", suggestions: ["What is MHE?"] },
  { topic: "mhe", match: /\bmhe\b|forklift|reach truck|pallet truck|bopt/i, text: "MHE = Material Handling Equipment: forklifts, reach trucks and battery pallet trucks (BOPT). Only licensed drivers may use them." },
  { topic: "cold_chain", match: /cold|chill|reefer|temperature|°c|frozen|dairy/i, text: "Chilled goods like milk and curd must stay between 0 and 4 °C all the way. Dock 3 is the cold dock: it has power for a chilled truck. The truck's temperature recorder shows if the goods stayed cold on the road. The cold room is the chilled store inside the FC.", suggestions: ["What is the shelf-life rule?"] },
  { topic: "seal", match: /\bseal\b/i, text: "The seal is a numbered tag on the truck door. If its number matches the invoice and it is not broken, nobody opened the truck on the way." },
  { topic: "board", match: /dock board|the board|place a truck|how.*(place|move|drag)|slot|tray|grid/i, text: "The dock board shows the 4 docks (rows) and the morning in half-hours (columns). Tap a truck, then tap a dock and time to place it. Tap a placed truck to move it or take it off. A truck can't start before it is at the gate. The line under the board shows how many trucks are being unloaded in each half-hour.", suggestions: ["What is a crew?", "What is the cold dock?"] },
  { topic: "crew", match: /\bcrews?\b|how many trucks/i, text: "An unloading crew is 2 loaders and 1 scanner. Each truck being unloaded needs one crew. With the full team you have 3 crews, so 3 trucks can be unloaded at the same time." },
  { topic: "team", match: /team board|assign|staff|loader|receiver|who can/i, text: "On the team screen each person has the jobs they are trained for. Tap a job under a name to move them. The top shows how many people each activity needs for your plan and how many it has." },
  { topic: "unscheduled", match: /unbook|unschedul|no booking|appointment|booking|off.?peak|quiet slot|turn.?away/i, text: "Trucks book a time to unload. A truck with no booking, or more than 30 minutes late, can be given a free slot, asked to wait for a quiet slot, or turned away to book again." },
  { topic: "tat", match: /\btat\b|turnaround|dock time|detention/i, text: "Turnaround time (TAT) is how long a truck spends at the FC, from the gate to leaving empty. Detention is when a truck is kept waiting too long." },
  { topic: "sto", match: /\bsto\b|stock transfer|dark store/i, text: "An STO (Stock Transfer Order) is a dark store's order for stock from the FC. Tonight's STOs are what the dark stores need for tomorrow." },
  { topic: "fc", match: /\bfc\b|fulfil+ment|mother warehouse|warehouse/i, text: "An FC (fulfilment centre) is the big warehouse that receives stock from vendors and sends it on to the dark stores." },
  { topic: "procurement", match: /procurement|pooja|buyer/i, text: "Procurement is the team that buys from vendors. They follow up shortages, credit notes and vendor reviews." },
  { topic: "inventory", match: /inventory team|sanjay|stock team/i, text: "The Inventory team keeps the stock records right. They need to know about shortages, returns and anything held in quarantine." },
  { topic: "tracker", match: /tracker|spreadsheet|sheet|column|total|duplicate|repeated/i, text: "The inbound tracker lists each vendor's planned quantity, what was accepted, damaged or rejected, and short, the GRN status and the time at the dock. Use the two check buttons above it to check the sheet." },
  { topic: "buckets", match: /bucket|do now|delegate|reschedule|escalat/i, text: "Do now: you deal with it yourself, now (2 at most). Delegate: give it to the person named. Reschedule: move it later. Escalate: pass it to your Operations Manager." },
  { topic: "timer", match: /time left|how (much|long)|timer|minutes|clock|hurry/i, text: "You have 30 minutes. The timer at the top counts down and does not pause. The time beside the FC name is the shift clock (07:00 to 12:00); it moves on as the shift does." },
  { topic: "scoring", match: /scor|marks|pass|fail|graded|results?/i, text: "Your choices are scored by fixed rules after the shift. Nobody tells you during the test if a choice was right. Nothing you ask me is scored." },
];

const FALLBACK = {
  topic: "unknown",
  text: "I can explain words like GRN, ASN, RTV, DN, HHT, QC, putaway or cold chain, and how the dock board, the team screen and the buckets work.",
  suggestions: ["What is a GRN?", "How does the dock board work?", "What is RTV?"],
};

export function answerFc(question: string): FcGuideReply {
  const q = question.trim();
  if (!q) return FALLBACK;
  if (DECLINE.match.test(q)) return { topic: DECLINE.topic, text: DECLINE.text, suggestions: DECLINE.suggestions };
  const hit = ENTRIES.find((entry) => entry.match.test(q));
  return hit ? { topic: hit.topic, text: hit.text, suggestions: hit.suggestions } : FALLBACK;
}

export function fcOpening(): FcGuideReply {
  return {
    topic: "opening",
    text: "Hi — I explain words and screens. Ask me what any term means (GRN, ASN, RTV, HHT…). I won't tell you what to choose.",
    suggestions: ["What is a GRN?", "How does the dock board work?", "What is a crew?"],
  };
}

/** Every answer the assistant can give, for checks. */
export function allFcText(): string[] {
  return [DECLINE.text, FALLBACK.text, ...ENTRIES.map((e) => e.text)];
}
