import { at } from "./forecast";
import type { FlexWindow, FlexWorker, RiderSource, Worker } from "./types";

/**
 * Tonight's people, and everyone else who can be found.
 *
 * The regulars are the same floor Day 1 ran — Arjun, Nikhil, Faisal, Akhil,
 * Sneha, Manu and Rahul — plus the rest of the evening crew. Nobody is
 * "Worker 3": each person differs in a way that should change where they go.
 * Five of the eighteen on the rota are out for Onam.
 */

export const STORE = "Dark Store 114";

export const PLANNED_ASSOCIATES = 18;

export const ON_LEAVE: { name: string; reason: string }[] = [
  { name: "Rakesh", reason: "Onam leave" },
  { name: "Meera", reason: "Onam leave" },
  { name: "Shibu", reason: "Onam leave" },
  { name: "Anand", reason: "Travelling home" },
  { name: "Thomas", reason: "Unwell" },
];

const EVENING = { start: 0, end: 330 };

export const REGULARS: Worker[] = [
  {
    id: "arjun",
    name: "Arjun",
    initials: "AR",
    level: "Expert Picker",
    kind: "regular",
    skills: { picking: 3, packing: 2, dispatch: 1 },
    ppi: 9.8,
    accuracy: 99.5,
    accuracyLabel: "Pick accuracy",
    attendance: 97,
    highValue: true,
    ...EVENING,
    tenure: "4 years",
  },
  {
    id: "nikhil",
    name: "Nikhil",
    initials: "NK",
    level: "Pro Picker",
    kind: "regular",
    skills: { picking: 3, packing: 2, dispatch: 0 },
    ppi: 12.4,
    accuracy: 98.9,
    accuracyLabel: "Pick accuracy",
    attendance: 95,
    highValue: false,
    ...EVENING,
    tenure: "2 years",
  },
  {
    id: "akhil",
    name: "Akhil",
    initials: "AK",
    level: "Pro Picker",
    kind: "regular",
    skills: { picking: 3, packing: 0, dispatch: 2 },
    ppi: 11.6,
    accuracy: 98.8,
    accuracyLabel: "Pick accuracy",
    attendance: 94,
    highValue: false,
    ...EVENING,
    tenure: "18 months",
    note: "Cross-trained on dispatch",
  },
  {
    id: "divya",
    name: "Divya",
    initials: "DV",
    level: "Pro Picker",
    kind: "regular",
    skills: { picking: 3, packing: 2, dispatch: 0 },
    ppi: 12.1,
    accuracy: 99.2,
    accuracyLabel: "Pick accuracy",
    attendance: 96,
    highValue: false,
    ...EVENING,
    tenure: "14 months",
    note: "Cross-trained on packing",
  },
  {
    id: "priya",
    name: "Priya",
    initials: "PR",
    level: "Picker",
    kind: "regular",
    skills: { picking: 2, packing: 2, dispatch: 0 },
    ppi: 14.2,
    accuracy: 99.0,
    accuracyLabel: "Pick accuracy",
    attendance: 98,
    highValue: false,
    start: 0,
    end: at(21),
    tenure: "1 year",
    note: "Leaves at 9:00 PM",
  },
  {
    id: "varun",
    name: "Varun",
    initials: "VR",
    level: "Picker · New",
    kind: "regular",
    skills: { picking: 2, packing: 0, dispatch: 0 },
    ppi: 14.8,
    accuracy: 96.4,
    accuracyLabel: "Pick accuracy",
    attendance: 88,
    highValue: false,
    ...EVENING,
    tenure: "6 weeks",
    note: "Accuracy below store average",
  },
  {
    id: "faisal",
    name: "Faisal",
    initials: "FS",
    level: "Good Picker",
    kind: "regular",
    skills: { picking: 2, packing: 0, dispatch: 0 },
    ppi: 18.6,
    accuracy: 99.7,
    accuracyLabel: "Pick accuracy",
    attendance: 99,
    highValue: false,
    ...EVENING,
    tenure: "3 years",
    note: "Not trained on packing",
  },
  {
    id: "sneha",
    name: "Sneha",
    initials: "SN",
    level: "Expert Packer",
    kind: "regular",
    skills: { picking: 1, packing: 3, dispatch: 0 },
    ppi: null,
    accuracy: 99.8,
    accuracyLabel: "Packing accuracy",
    attendance: 98,
    highValue: false,
    ...EVENING,
    tenure: "3 years",
  },
  {
    id: "manu",
    name: "Manu",
    initials: "MN",
    level: "Pro Packer",
    kind: "regular",
    skills: { picking: 0, packing: 3, dispatch: 2 },
    ppi: null,
    accuracy: 99.2,
    accuracyLabel: "Packing accuracy",
    attendance: 93,
    highValue: false,
    ...EVENING,
    tenure: "2 years",
    note: "Cross-trained on dispatch",
  },
  {
    id: "lakshmi",
    name: "Lakshmi",
    initials: "LK",
    level: "Senior Packer",
    kind: "regular",
    skills: { picking: 1, packing: 3, dispatch: 1 },
    ppi: null,
    accuracy: 99.6,
    accuracyLabel: "Packing accuracy",
    attendance: 99,
    highValue: true,
    ...EVENING,
    tenure: "5 years",
  },
  {
    id: "imran",
    name: "Imran",
    initials: "IM",
    level: "Packer · Dispatch",
    kind: "regular",
    skills: { picking: 1, packing: 2, dispatch: 2 },
    ppi: null,
    accuracy: 98.9,
    accuracyLabel: "Packing accuracy",
    attendance: 92,
    highValue: false,
    ...EVENING,
    tenure: "1 year",
    note: "Cross-trained on dispatch",
  },
  {
    id: "rahul",
    name: "Rahul",
    initials: "RH",
    level: "Dispatch Expert",
    kind: "regular",
    skills: { picking: 1, packing: 0, dispatch: 3 },
    ppi: null,
    accuracy: 99.8,
    accuracyLabel: "Handover accuracy",
    attendance: 96,
    highValue: true,
    ...EVENING,
    tenure: "3 years",
  },
  {
    id: "joseph",
    name: "Joseph",
    initials: "JS",
    level: "Dispatch",
    kind: "regular",
    skills: { picking: 0, packing: 1, dispatch: 2 },
    ppi: null,
    accuracy: 99.1,
    accuracyLabel: "Handover accuracy",
    attendance: 90,
    highValue: false,
    start: at(17, 30),
    end: 330,
    tenure: "8 months",
    note: "Starts 5:30 PM",
  },
];

/**
 * The manager. Available all evening, but only ever on a station through a
 * cover they choose — and while they are, nobody is running the floor.
 */
export const YOU: Worker = {
  id: "you",
  name: "You",
  initials: "YOU",
  level: "Store Manager",
  kind: "manager",
  skills: { picking: 1, packing: 2, dispatch: 1 },
  ppi: null,
  accuracy: 99.5,
  accuracyLabel: "Accuracy",
  highValue: true,
  ...EVENING,
};

/* ── The flex picker market ───────────────────────────────────────────── */

export const FLEX_BUDGET = 1200;

export const FLEX: FlexWorker[] = [
  {
    id: "akash",
    name: "Akash",
    initials: "AS",
    level: "On-demand · 8 months",
    kind: "flex",
    skills: { picking: 2, packing: 0, dispatch: 0 },
    ppi: 13.8,
    accuracy: 98.7,
    accuracyLabel: "Pick accuracy",
    highValue: false,
    start: at(18),
    end: at(22),
    rate: 120,
    rating: 4.6,
    experience: "8 months picking",
    newJoiner: false,
    windows: [
      { id: "akash-peak", start: at(19), end: at(21) },
      { id: "akash-evening", start: at(18), end: at(22) },
    ],
  },
  {
    // On today's afternoon booking already, which is why the floor lead can
    // raise her at 5:52. Her hours to 7 PM are paid for; anything past that is
    // an extension the operator chooses and pays for.
    id: "riya",
    name: "Riya",
    initials: "RY",
    level: "On-demand · 11 days",
    kind: "flex",
    skills: { picking: 1, packing: 0, dispatch: 0 },
    ppi: 22.4,
    accuracy: 99.7,
    accuracyLabel: "Pick accuracy",
    attendance: 100,
    highValue: false,
    start: 0,
    end: at(22),
    tenure: "11 days",
    note: "On the afternoon booking until 7 PM",
    rate: 95,
    rating: null,
    experience: "11 days · picking",
    newJoiner: false,
    prepaidUntil: at(19),
    windows: [
      { id: "riya-day", start: 0, end: at(19) },
      { id: "riya-peak", start: 0, end: at(21) },
      { id: "riya-late", start: 0, end: at(22) },
    ],
  },
  {
    id: "manoj",
    name: "Manoj",
    initials: "MJ",
    level: "On-demand · 2 years",
    kind: "flex",
    skills: { picking: 3, packing: 2, dispatch: 0 },
    ppi: 11.9,
    accuracy: 99.1,
    accuracyLabel: "Pick accuracy",
    highValue: false,
    start: at(17),
    end: at(21),
    rate: 145,
    rating: 4.8,
    experience: "Picking + packing",
    newJoiner: false,
    windows: [
      { id: "manoj-peak", start: at(19), end: at(21) },
      { id: "manoj-long", start: at(17), end: at(21) },
    ],
  },
  {
    id: "sandeep",
    name: "Sandeep",
    initials: "SD",
    level: "On-demand · Pro",
    kind: "flex",
    skills: { picking: 3, packing: 0, dispatch: 0 },
    ppi: 10.8,
    accuracy: 99.3,
    accuracyLabel: "Pick accuracy",
    highValue: false,
    start: at(18),
    end: at(20),
    rate: 155,
    rating: 4.9,
    experience: "Pro picker",
    newJoiner: false,
    windows: [{ id: "sandeep-early", start: at(18), end: at(20) }],
  },
  {
    id: "kavya",
    name: "Kavya",
    initials: "KV",
    level: "On-demand · 1 year",
    kind: "flex",
    skills: { picking: 1, packing: 2, dispatch: 0 },
    ppi: null,
    accuracy: 99.0,
    accuracyLabel: "Packing accuracy",
    highValue: false,
    start: at(19),
    end: at(22),
    rate: 130,
    rating: 4.5,
    experience: "Packing",
    newJoiner: false,
    windows: [
      { id: "kavya-peak", start: at(19), end: at(21) },
      { id: "kavya-late", start: at(19), end: at(22) },
    ],
  },
];

export function flexWindow(worker: FlexWorker, id: string): FlexWindow | undefined {
  return worker.windows.find((window) => window.id === id);
}

/** Minutes of a window the store actually pays for tonight. */
export function paidMinutes(worker: FlexWorker, window: FlexWindow): number {
  return Math.max(0, window.end - Math.max(window.start, worker.prepaidUntil ?? 0));
}

export function windowCost(worker: FlexWorker, window: FlexWindow): number {
  return Math.round((paidMinutes(worker, window) / 60) * worker.rate);
}

/* ── Riders ───────────────────────────────────────────────────────────── */

/** Riders rostered for 7–9 PM. */
export const SCHEDULED_RIDERS = 18;

/**
 * Riders on the rota. The afternoon shift overlaps the evening from six and
 * goes home at seven — which is exactly when the peak arrives.
 */
export function scheduledRidersAt(t: number): number {
  if (t < 30) return 12;
  if (t < 90) return 16;
  if (t < 150) return 22;
  return SCHEDULED_RIDERS;
}

export const RIDER_SOURCES: RiderSource[] = [
  {
    id: "nearby",
    name: "Nearby Store 117",
    detail: "2.1 km · excess riders tonight",
    max: 6,
    arrive: at(18, 45),
    until: at(20, 45),
    costPerRider: 60,
    effectiveness: 1,
  },
  {
    id: "morning",
    name: "Morning shift recall",
    detail: "Your own riders, back for the evening",
    max: 5,
    arrive: at(19),
    until: at(21, 30),
    costPerRider: 140,
    effectiveness: 0.85,
    warning: "Already completed morning shift.",
  },
  {
    id: "local",
    name: "Local rider pool",
    detail: "Freelance riders · higher incentive",
    max: 4,
    arrive: at(18, 30),
    until: at(22),
    costPerRider: 210,
    effectiveness: 1,
  },
];

/* ── What lands on the evening ────────────────────────────────────────── */

export const RECEIVING = {
  start: at(18, 5),
  end: at(18, 25),
  label: "High-value receiving",
  vehicle: "High-value electronics vehicle",
};

export const AUDIT = {
  planned: at(19, 30),
  duration: 45,
  crew: 2,
  earliest: at(18, 45),
  latest: at(24, 30),
  step: 15,
};

/** Whoever is late cannot be on the floor before 7:15. */
export const LATE_ARRIVAL = at(19, 15);

export const FAISAL = {
  id: "faisal",
  /** What his card said at 4:30. */
  cardPpi: 18.6,
  today: 21.4,
  trend: [17.8, 18.1, 18.9, 19.2, 18.4, 20.1, 21.4],
  benchmark: "10–15 sec",
  /** Left alone, the peak makes him slower still. */
  peakIfIgnored: 23.0,
  zone: 16.8,
  zonePair: 16.2,
  paired: 19.0,
  afterPair: 17.9,
  // Raised with Riya at 5:52, so anything decided takes effect from 6.
  alertAt: at(18),
  pairFrom: at(18, 30),
  pairTo: at(19),
};

/**
 * The floor lead's 5:52 PM message. Two pickers, the same complaint, and two
 * completely different reasons behind it — which is the whole point of hearing
 * them together rather than an hour apart.
 */
export const PICKER_REVIEW = {
  alertAt: at(17, 52),
  lead: [
    "Faisal's at 21.4 seconds and Riya's at 22.4.",
    "Others are covering for both of them.",
    "Do you want me to pull them off picking?",
  ],
};

/* ── The two people problems ──────────────────────────────────────────── */

/**
 * Arjun's overtime.
 *
 * His rota ends at 8. The 8–10 PM block was pencilled in by the floor lead
 * last week and never confirmed with him, which is why the board shows it and
 * he does not consider it agreed. The incentive he is owed is real, approved,
 * and sitting in tomorrow's payout — the gap is that nobody told him.
 */
export const ARJUN = {
  id: "arjun",
  /** 8:00 PM — the end of his rostered shift. */
  rotaEnd: at(20),
  /** 10:00 PM — the end of the pencilled-in overtime. */
  otEnd: at(22),
  alertAt: at(17, 46),
  incentive: 600,
  lines: [
    "Last Sunday we were told we'd get ₹600 for hitting the target.",
    "I still haven't got mine.",
    "Now you're asking me to stay two more hours?",
    "Why should I?",
  ],
  status: {
    period: "Last Sunday · store target",
    target: "Achieved · 1,240 picks against 1,100",
    submission: "Completed · Monday 9:12 AM",
    approval: "Approved · Area Manager, Wednesday",
    payment: "Pending",
    expected: "Tomorrow's payout run",
  },
  performance: {
    targetsHit: "4 of the last 4 weekly targets",
    lateDays: "No unplanned absence in 90 days",
  },
};

/**
 * Riya. Eleven days in, slow on the store's average and improving every shift.
 * Her whole problem sits in one zone: the aisle where the packs look alike,
 * where she double-checks rather than risk a wrong pick. Slow is not bad.
 */
export const RIYA = {
  id: "riya",
  dayWindow: "riya-day",
  prepaidUntil: at(19),
  alertAt: at(17, 52),
  /** Interventions take effect from 6 PM. */
  applyAt: at(18),
  pairFrom: at(18),
  pairTo: at(18, 30),
  tenure: "11 days",
  today: 22.4,
  benchmark: "10–15 sec",
  accuracy: 99.7,
  scanCompliance: 100,
  attendance: 100,
  /** Her last five shifts, oldest first. */
  trend: [31.2, 28.1, 25.7, 23.8, 22.4],
  zones: [
    { id: "A", ppi: 15.8, label: "Festival essentials", note: "Fast-moving, large packs, one face per shelf." },
    { id: "B", ppi: 17.1, label: "Dairy & bakery", note: "Short aisle, few lookalikes." },
    {
      id: "C",
      ppi: 29.6,
      label: "Personal care",
      note: "High concentration of visually similar SKUs — same brand, four sizes, one shelf.",
    },
    { id: "D", ppi: 18.4, label: "Snacks & beverages", note: "Busy, but the packs are distinct." },
  ],
  quote: [
    "I know I'm slower there.",
    "I keep double-checking similar products because I don't want to pick the wrong one.",
  ],
  /** Projected pace, by what the manager does. */
  zone: 17.8,
  paired: 20.2,
  afterPair: 19.2,
  zonePair: 17.4,
  afterZonePair: 16.9,
};

export const MANAGER_LINES = ["Peak begins at 6.", "Build me a team that can handle it."];

export const DAY_THREE_BRIEF = {
  title: "Onam Eve",
  subtitle: "Build the Shift",
  tagline: "Five people are out. Peak begins in 90 minutes.",
  store: STORE,
};

/** Shown at the end of Day 2, so the next day is already in view. */
export const DAY_THREE_TEASER = {
  eyebrow: "Day 3 · Onam Eve",
  headline: "Five people are out. Peak begins in 90 minutes.",
  body: "A festival evening, a rota with holes in it, a flex market and a rider gap. You build the shift — then the evening starts changing it.",
  hook: "Unlocks when you're ready. Eighteen minutes.",
};
