import type {
  BagId,
  BasketItemId,
  CaseId,
  ControlId,
  CustomerId,
  IncidentId,
  MilkBatchId,
  PackItemId,
  ResourceId,
  ShelfSlot,
  SubstituteId,
} from "./types";

/**
 * Day 5's content, kept entirely out of the engine.
 *
 * The four cases below are one deal from a larger bank — near-expiry
 * perishables, interdependent baskets, food/chemical segregation, cold chain,
 * batch defects, transit damage, stated dietary preference, platform priority
 * orders, substandard produce, last-mile access. `CASE_BANK` names all ten so a
 * later run can deal a different four without touching the engine, the scoring
 * or the UI: each case type has its own state slice and its own reader, and
 * the ones not dealt simply never enter a phase.
 *
 * Every threshold is this fictional platform's operating rule, not an industry
 * standard: a 24-hour minimum remaining shelf life, a 180-second working CTD
 * target, a ₹250 discretionary recovery budget.
 */

export const STORE = "Dark Store 114";

/** 6:42 PM, in minutes after midnight. */
const START = 18 * 60 + 42;

export function clockAt(t: number): string {
  const total = START + Math.round(t);
  const h24 = Math.floor(total / 60) % 24;
  const m = total % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h24 >= 12 ? "PM" : "AM"}`;
}

/** When each case opens, in minutes after 6:42 PM. */
export const CASE_CLOCK: Record<CaseId | "finale" | "loop", number> = {
  milk: 2,
  baking: 5,
  packing: 9,
  batch: 12,
  finale: 17,
  loop: 22,
};

/* ── The bank ─────────────────────────────────────────────────────────── */

export interface CaseSpec {
  id: string;
  /** Only the built four are playable today; the rest are declared, not dealt. */
  built: boolean;
  title: string;
  question: string;
  competency: string;
  /** The single dominant object on screen. */
  subject: string;
}

export const CASE_BANK: CaseSpec[] = [
  {
    id: "milk",
    built: true,
    title: "Would you send this milk?",
    question: "Technically sellable. Practically usable?",
    competency: "Customer usability vs technical compliance",
    subject: "The refrigerated shelf",
  },
  {
    id: "baking",
    built: true,
    title: "Five items. One actual task.",
    question: "What is this customer trying to complete?",
    competency: "Customer need recognition",
    subject: "The ingredient tote",
  },
  {
    id: "packing",
    built: true,
    title: "180 seconds or zero contamination?",
    question: "Which number is the customer holding?",
    competency: "Customer safety vs performance metric",
    subject: "The open delivery bag",
  },
  {
    id: "batch",
    built: true,
    title: "One defect. 24 more units.",
    question: "Who finds the next one?",
    competency: "Preventing the next customer failure",
    subject: "The batch bin",
  },
  { id: "coldChain", built: false, title: "Frozen in 42°C", question: "", competency: "Cold-chain protection", subject: "The thermal staging bay" },
  { id: "damagedStaples", built: false, title: "Dropped at the door", question: "", competency: "Transit damage recovery", subject: "The dented carton" },
  { id: "dietary", built: false, title: "The stated preference", question: "", competency: "Explicit customer preference", subject: "The order note" },
  { id: "priorityEssential", built: false, title: "Priority essential order", question: "", competency: "Authorised escalation policy", subject: "The priority queue" },
  { id: "produce", built: false, title: "Substandard fresh produce", question: "", competency: "Quality orientation", subject: "The produce crate" },
  { id: "access", built: false, title: "The blocked gate", question: "", competency: "Last-mile accessibility", subject: "The delivery map" },
];

/* ── Opening ──────────────────────────────────────────────────────────── */

/** The five journeys the opening plays. Four break; one is the control. */
export const OPENING_ORDERS = [
  { id: "8419", label: "Order #8419", breaksAt: null, note: "Delivered" },
  { id: "8423", label: "Order #8423", breaksAt: "picking", note: "Held at picking" },
  { id: "8426", label: "Order #8426", breaksAt: "packing", note: "Flagged at packing" },
  { id: "8431", label: "Order #8431", breaksAt: "use", note: "Reported after delivery" },
  { id: "8434", label: "Order #8434", breaksAt: "handover", note: "Stopped at quality control" },
] as const;

export const OPENING_MESSAGES = {
  manager: ["Don't optimise the ticket.", "Protect what the customer came to us for."],
  sub: "Every order is technically recoverable.",
};

/* ── Case 1 · milk ────────────────────────────────────────────────────── */

export const MILK = {
  /** This platform's floor for putting a perishable on the pick face. */
  minimumSellableHours: 24,
  household: "Typical 1L household consumption: 2–3 days",
  demand: "High",
  policy: "FEFO · oldest sellable batch forward",
  batches: {
    fresh36: {
      id: "fresh36" as MilkBatchId,
      name: "Fresh Cow Milk 1L",
      batch: "FCM-2209-B",
      received: "06:00",
      hours: 36,
      units: 18,
      note: "On the pick face now",
    },
    fresh72: {
      id: "fresh72" as MilkBatchId,
      name: "Fresh Cow Milk 1L",
      batch: "FCM-2309-A",
      received: "17:40",
      hours: 72,
      units: 24,
      note: "Inbound, chilled room",
    },
  },
  slots: {
    pickface: { label: "Primary pick face", detail: "What tonight's orders pick from" },
    markdown: { label: "Controlled markdown", detail: "Sold short-dated, priced accordingly" },
    hold: { label: "Return / hold", detail: "Off sale, back to the supplier line" },
    back: { label: "Back stock", detail: "Chilled room, not picked from" },
  } as Record<ShelfSlot, { label: string; detail: string }>,
  /** What a 36-hour bottle does in a normal household week. */
  useTimeline: [
    { label: "Delivered tonight", state: "clear" as const, note: "6:58 PM" },
    { label: "Breakfast tomorrow", state: "clear" as const, note: "Fine" },
    { label: "Day 2", state: "risk" as const, note: "Nearing expiry" },
    { label: "Day 3", state: "broken" as const, note: "Expired, unused" },
  ],
};

/* ── Case 2 · baking ──────────────────────────────────────────────────── */

export const BAKING = {
  order: "#8426",
  picked: 4,
  total: 5,
  refundValue: 142,
  items: [
    { id: "flour" as BasketItemId, name: "Refined flour", detail: "1 kg", picked: true, links: ["sugar", "butter", "eggs", "vanilla"] },
    { id: "butter" as BasketItemId, name: "Butter", detail: "200 g · unsalted", picked: true, links: ["flour", "sugar"] },
    { id: "sugar" as BasketItemId, name: "Castor sugar", detail: "500 g", picked: true, links: ["flour", "butter", "vanilla"] },
    { id: "eggs" as BasketItemId, name: "Eggs", detail: "6 · medium", picked: true, links: ["flour", "vanilla"] },
    { id: "vanilla" as BasketItemId, name: "Vanilla extract", detail: "30 ml", picked: false, links: ["sugar", "eggs"] },
  ],
  /** Enough taps for the shape of the basket to be obvious. */
  dependencyAt: 3,
  substitutes: {
    paste: {
      id: "paste" as SubstituteId,
      name: "Vanilla bean paste",
      detail: "20 ml · same shelf",
      price: "+₹40",
      fit: "Direct baking substitute",
      strength: 1,
    },
    essence: {
      id: "essence" as SubstituteId,
      name: "Vanilla essence",
      detail: "50 ml",
      price: "−₹15",
      fit: "Weaker, but works in baking",
      strength: 0.75,
    },
  },
  customerSetting: "Substitutions: allowed",
  /** Deterministic — the customer takes the closest baking-usable option offered. */
  reply: {
    paste: "Vanilla bean paste is fine. Thanks for checking.",
    essence: "Essence works. Go ahead.",
    continue: "I'm making a cake — without vanilla there's no point. Can you check for anything else?",
    cancel: "Cancel it then. I'll get everything somewhere else.",
  } as Record<string, string>,
};

/* ── Case 3 · packing ─────────────────────────────────────────────────── */

export const PACKING = {
  station: "Packing station P3",
  rate: "40+ orders/min",
  ctd: 176,
  target: 180,
  repackSeconds: 18,
  separators: 0,
  items: [
    { id: "cleaner" as PackItemId, name: "Toilet cleaner", detail: "500 ml · acidic", kind: "chemical" as const },
    { id: "coriander" as PackItemId, name: "Fresh coriander", detail: "100 g · unwrapped", kind: "openFood" as const },
    { id: "apples" as PackItemId, name: "Apples", detail: "4 · loose", kind: "openFood" as const },
    { id: "snacks" as PackItemId, name: "Packaged snacks", detail: "2 packs · sealed", kind: "sealedFood" as const },
  ],
  bags: { bag1: "Bag 1", bag2: "Bag 2" } as Record<BagId, string>,
  extras: {
    liner: { label: "Secondary liner", detail: "Seals the chemical", seconds: 8, cost: 4 },
    extraBag: { label: "Extra bag", detail: "A second carrier", seconds: 10, cost: 6 },
  },
  transit: "Two-drop route · 14 minutes · bag travels upright in a side box",
};

/* ── Case 4 · infant food ─────────────────────────────────────────────── */

export const BATCH = {
  product: "Infant food · 200 g glass jar",
  batchCode: "BF-0911-A",
  report: [
    "Jar arrived with a hairline crack.",
    "Vacuum button appears compromised.",
  ],
  evidence: "Customer photo · crack across the shoulder of the jar, seal button raised",
  units: 24,
  activeWaves: 3,
  ordersAffected: 3,
  actions: {
    freeze: { label: "Freeze the bin", detail: "No further picks from BF-0911-A", contains: true },
    pausePicks: { label: "Pause affected picks", detail: "Three live orders holding this batch", contains: true },
    inspect: { label: "Inspect the batch", detail: "Check the remaining 24 jars", contains: false },
    escalate: { label: "Escalate quality issue", detail: "Raise with the quality desk and the supplier", contains: false },
    removeOne: { label: "Remove the reported unit only", detail: "Pull the single jar, keep selling", contains: false },
    continue: { label: "Continue selling", detail: "One report, one jar", contains: false },
    wait: { label: "Wait for formal instruction", detail: "Hold until the quality desk replies", contains: false },
  },
};

/* ── The finale ───────────────────────────────────────────────────────── */

export const CUSTOMERS: Record<
  CustomerId,
  {
    id: CustomerId;
    name: string;
    order: string;
    headline: string;
    detail: string[];
    /** What the customer is actually holding at the end of this. */
    need: string;
    basket: string;
  }
> = {
  iceCream: {
    id: "iceCream",
    name: "Customer A",
    order: "#8462",
    headline: "Gourmet ice cream · 42°C outside",
    detail: [
      "Two-drop rider route · 14 minutes projected",
      "Ice cream and popsicles, no other frozen",
      "Thermal pouch and gel pads in stock",
    ],
    need: "Frozen dessert that is still frozen",
    basket: "Ice cream · popsicles",
  },
  breakfast: {
    id: "breakfast",
    name: "Customer B",
    order: "#8467",
    headline: "Bag dropped during loading",
    detail: [
      "Egg carton dented, bread bruised",
      "Already dispatch-scanned",
      "Rider: “If I take this back in, my delivery will be late.”",
    ],
    need: "Breakfast tomorrow that is usable",
    basket: "Eggs · bread · butter",
  },
  elderly: {
    id: "elderly",
    name: "Customer C",
    order: "#8471",
    headline: "Complex road access blocked",
    detail: [
      "Rider cannot bring the bike in",
      "Elderly resident · fourth-floor walk-up",
      "Rider proposes marking the customer unavailable",
    ],
    need: "The order at the door, not at the gate",
    basket: "Weekly groceries · 6 kg",
  },
};

/** Money is assigned in fixed steps so the board stays a puzzle, not a slider. */
export const FUND_STEP = 50;
export const FUND_TOTAL = 250;

export const RESOURCES: Record<
  ResourceId,
  { id: ResourceId; label: string; detail: string; scarce: boolean }
> = {
  manager: { id: "manager", label: "Manager escalation", detail: "One slot · your own authority", scarce: true },
  associate: { id: "associate", label: "Floor associate", detail: "One person, free for 45 seconds", scarce: true },
  thermal: { id: "thermal", label: "Thermal kit", detail: "Insulated pouch and gel pads", scarce: false },
  route: { id: "route", label: "Route change", detail: "Split the drop, deliver direct", scarce: false },
  fund: { id: "fund", label: "₹250 recovery fund", detail: "Discretionary, in ₹50 steps", scarce: true },
  rider: { id: "rider", label: "Normal rider", detail: "The rider already assigned", scarce: false },
};

/* ── Close the loop ───────────────────────────────────────────────────── */

export const INCIDENTS: Record<IncidentId, { label: string; failure: string }> = {
  milk: { label: "Near-expiry milk", failure: "Sellable stock, unusable week" },
  baking: { label: "Baking basket OOS", failure: "Four items, no task" },
  packing: { label: "Chemical with produce", failure: "One bag, two risks" },
  batch: { label: "Infant food defect", failure: "One report, 24 units live" },
};

export const CONTROLS: Record<ControlId, { label: string; detail: string }> = {
  shelfLife: { label: "Remaining shelf-life control", detail: "Minimum usable life at the pick face, not at the sale" },
  markdownPath: { label: "Controlled markdown path", detail: "Short-dated stock sold as short-dated" },
  nilPickEscalation: { label: "Nil-pick escalation", detail: "A missing line stops the tote before packing" },
  contextSubstitution: { label: "Context-aware substitution", detail: "Basket read before the refund is raised" },
  segregation: { label: "Food / non-food segregation", detail: "Chemicals never share a bag with open food" },
  packagingBackup: { label: "Secondary packaging backup", detail: "Separator stockout has a fallback" },
  batchContainment: { label: "Batch containment", detail: "One defect freezes the batch, not the jar" },
  qualityEscalation: { label: "Quality escalation", detail: "Defects reach the quality desk the same shift" },
  damageCheck: { label: "Packing damage check", detail: "Dropped bags are re-picked, not re-taped" },
  thermalStaging: { label: "Thermal staging control", detail: "Frozen waits in cold, not on the bench" },
};

/** The controls that actually answer each failure. Two per incident count. */
export const CONTROL_FIT: Record<IncidentId, ControlId[]> = {
  milk: ["shelfLife", "markdownPath"],
  baking: ["nilPickEscalation", "contextSubstitution"],
  packing: ["segregation", "packagingBackup"],
  batch: ["batchContainment", "qualityEscalation"],
};

/* ── Copy the UI leans on ─────────────────────────────────────────────── */

export const DAY_FIVE_BRIEF = {
  title: "Protect the Promise",
  subtitle: "The system says the order is fine. Would the customer agree?",
  tagline: "4 customer promises at risk.",
  store: STORE,
};

/** Shown at the end of Day 4. */
export const DAY_FIVE_TEASER = {
  eyebrow: "Day 5 · Protect the Promise",
  headline: "Four orders are fine. None of them are.",
  body: "On time, in policy, inside target — and every one of them fails the person who ordered it. Find what the customer actually came for, and protect that.",
};

export const CLOSING = {
  title: "Customer-first is not “say yes to everything.”",
  lines: ["Understand the outcome.", "Own the failure.", "Protect the promise."],
};
