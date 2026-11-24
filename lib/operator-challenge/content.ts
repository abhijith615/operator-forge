/**
 * The Startup Operator Challenge (/operator-challenge): every word a
 * participant reads around the shift.
 *
 * The shift itself is the store-manager simulation, unchanged, so it scores
 * exactly as the Hiring Test does. What changes is everything around it: who
 * it is for, how you get in, what you are asked first and what you get at
 * the end. Plain, short sentences, in the same register as the shift.
 */

export const CHALLENGE_ROUTE = "/operator-challenge";

/** Kept with every attempt. Keeps these attempts apart from the Hiring Test's. */
export const CHALLENGE_CAMPAIGN = "startup-operator";

export const CHALLENGE_NAME = "Startup Operator Challenge";

/** Where somebody writes for extra time, a copy of their data, or its deletion. */
export const CHALLENGE_CONTACT = "hello@operatorforge.in";

/* ── Signing in ───────────────────────────────────────────────────────── */

export const CHALLENGE_INTRO = {
  eyebrow: "Operator Forge · Startup Operator Challenge",
  title: "Can you run a startup's busiest 30 minutes?",
  lede: "Step into a 10-minute delivery startup on its morning rush. Lead the team, fix stock problems and keep orders moving, in a live 30-minute simulation.",
  points: [
    "One live shift, 30 minutes, one try",
    "Free. Works on your phone or laptop",
    "Get your operator scorecard at the end",
  ],
  signInNote: "Sign in with Google to save your progress and your scorecard. You get one try per account.",
  signInButton: "Continue with Google",
} as const;

/* ── Your details ─────────────────────────────────────────────────────── */

export const DETAILS_COPY = {
  title: "A little about you",
  lede: "We need these before you start. They go with your scorecard.",
  name: { label: "Full name", placeholder: "As you want it on your scorecard" },
  phone: {
    label: "WhatsApp number",
    placeholder: "10-digit mobile number",
    note: "An Indian mobile number that has WhatsApp. We send your result here.",
    wrong: "Enter a 10-digit Indian mobile number, for example 98765 43210.",
  },
  city: { label: "City", placeholder: "Where you live now" },
  education: {
    label: "Education",
    options: [
      { value: "student", label: "Student" },
      { value: "graduate", label: "Graduate" },
    ],
  },
  college: { label: "College", placeholder: "Your college or university" },
  gradYear: {
    label: "Graduation year",
    studentLabel: "Expected graduation year",
    placeholder: "For example 2025",
  },
  working: {
    label: "Are you working now?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  submit: "Save and continue",
  saving: "Saving…",
} as const;

/* ── Before the shift ─────────────────────────────────────────────────── */

export const BRIEFING = {
  eyebrow: "Startup Operator Challenge",
  title: "Your shift · 30 minutes",
  lines: [
    "You are the operator on duty at a quick-commerce startup's dark store. On the floor, your title is Assistant Store Manager.",
    "The morning rush is coming. Customers expect their orders in minutes.",
    "You will lead a team of 12, sort out missing stock and handle an unhappy customer.",
    "Every choice changes what happens later. Nothing tells you if a choice was right or wrong.",
    "You do not need to know dark stores or this screen. Read, decide and keep moving.",
  ],
  start: "Start shift",
  starting: "Opening the store…",
} as const;

/**
 * The version of the notice below. Kept with each attempt, so it is always
 * possible to say what somebody agreed to. Change it whenever the notice
 * changes in substance.
 */
export const CHALLENGE_CONSENT_VERSION = "oc-2026-11-24";

/** What is collected and what is done with it. Every line has to stay true of the code. */
export const CHALLENGE_NOTICE: { title: string; text: string }[] = [
  {
    title: "What we record",
    text: "Your Google email and the details you gave us: name, WhatsApp number, city, education, college, graduation year and whether you work now. Every choice you make in the shift, and when. Whether you use a phone, tablet or computer. When the page was hidden, reloaded or lost its connection. The topics you ask the assistant about (not the words you type).",
  },
  {
    title: "What it is used for",
    text: "To make your scorecard. To contact you on WhatsApp about your result and about Operator Forge programmes, like the Startup Operator Bootcamp. Fixed rules give the score. No AI scores you.",
  },
  {
    title: "Who sees it",
    text: "Operator Forge. You see your own scorecard at the end.",
  },
  {
    title: "Your choices",
    text: "Taking part is your choice. At any time, you can ask for a copy of your data, take back your consent, or have your attempt deleted. Write to the address below.",
  },
];

export const CONSENT_LABEL =
  "I have read this. I agree to take the challenge, and I agree that my data is used as written above.";

/* ── The scorecard ────────────────────────────────────────────────────── */

/**
 * The level a participant is shown, one per rung of the Hiring Test's ladder
 * (lowest first). Encouraging, never an employer's verdict: the hiring words
 * ("proceed to interview", "review") stay in the Hiring Test.
 */
export const LEVELS = [
  {
    key: "starting",
    label: "Getting started",
    text: "You have the basics to build on. Most of the shift's big calls are still ahead of you as a skill.",
  },
  {
    key: "promising",
    label: "Promising",
    text: "You made good calls in parts of the shift. A few habits would lift the rest.",
  },
  {
    key: "strong",
    label: "Strong potential",
    text: "You kept most of the shift under control. You think like an operator.",
  },
  {
    key: "standout",
    label: "Standout operator",
    text: "You led the team, handled the stock and kept customers moving. This is how strong operators run a shift.",
  },
] as const;

export const SCORECARD_COPY = {
  eyebrow: "Operator Forge · Startup Operator Challenge",
  title: "Your operator scorecard",
  scoreLabel: "Score",
  levelLabel: "Level",
  strengthsTitle: "What you did well",
  growTitle: "One thing to work on",
  unfinished: (seen: number, all: number) =>
    `You reached ${seen} of ${all} moments before the time ran out. Moments you did not reach count as zero.`,
  bootcamp: {
    title: "Want to do this for real?",
    text: "The Startup Operator Bootcamp is 6 weeks of live sessions, real startup challenges and simulations like this one. Complete it and you are assured a 3-month paid startup internship.",
    cta: "See the Bootcamp",
    href: "/operator-bootcamp",
  },
  oneTry: "You have used your one try. Your scorecard stays here. Sign in again any time to see it.",
} as const;
