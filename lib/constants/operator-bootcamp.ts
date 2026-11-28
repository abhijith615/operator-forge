/**
 * The Startup Operator Bootcamp landing page (/operator-bootcamp).
 *
 * The single source of truth for the page: every variable and every line of
 * copy lives here, and the components only lay it out. Anything still in
 * [brackets] renders as written and is listed in one console warning in
 * development, so nothing unfinished ships unnoticed.
 */

import { whatsappUrl } from "./offer";

/* ── Variables ─────────────────────────────────────────────────────────── */

export const COHORT = "January 2027";

/**
 * Every "Apply" button opens a WhatsApp chat with +91 80895 08891, with a
 * short message already typed so the enquiry is easy to recognise.
 */
export const APPLY_URL = whatsappUrl(
  `Hi, I'd like to apply for the Startup Operator Bootcamp (${COHORT} cohort).`,
);
/** A typical day: live sessions in the morning, missions in the afternoon. */
export const SCHEDULE = {
  morningHours: "2–3",
  afternoonHours: "3–4",
  daysPerWeek: 5,
} as const;
export const SEATS = 20;
export const FEE = {
  advance: 10000,
  afterPlacement: 20000,
  total: 30000,
} as const;
/** Assured for every participant who completes the bootcamp. */
export const INTERNSHIP = { months: 3, minStipend: 15000 } as const;
/** The best performers in the selection interview pay nothing for the programme. */
export const SCHOLARSHIP = { winners: 2 } as const;

export interface Mentor {
  name: string;
  /** Current role and company, e.g. "Business Head @ Kolo". */
  role: string;
  /** Past companies and schools, shown as small tags. */
  background: string[];
  /** A path under /public, or null to show initials. */
  photo: string | null;
}

export const MENTORS: Mentor[] = [
  {
    name: "Vishnu Satis",
    role: "CTO & Co-Founder @ rootflo.ai",
    background: ["Ex-Truecaller", "2x Entrepreneur", "NIT Calicut"],
    photo: "/bootcamp/mentors/vishnu-satis.webp",
  },
  {
    name: "Anand S Kumar",
    role: "Senior Director @ FTI Consulting",
    background: ["FMS Delhi"],
    photo: "/bootcamp/mentors/anand-s-kumar.webp",
  },
  {
    name: "Anjanayan A R",
    role: "Business Head @ Kolo",
    background: ["Ex-Unacademy", "Ex-Swiggy", "IIM Calcutta"],
    photo: "/bootcamp/mentors/anjanayan-a-r.webp",
  },
  {
    name: "Sabarish V",
    role: "Product Manager @ PayU",
    background: ["Ex-Swiggy", "Ex-Paytm", "IIM Calcutta"],
    photo: "/bootcamp/mentors/sabarish-v.webp",
  },
  {
    name: "Abhijith P Vijay",
    role: "Founder @ Operator Forge",
    background: ["Ex-BPCL", "NIT Calicut"],
    photo: "/bootcamp/mentors/abhijith-p-vijay.webp",
  },
];

/** ₹10,000 — Indian digit grouping. */
export function inr(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

/* ── Copy ──────────────────────────────────────────────────────────────── */

/** A headline split so one or two words can be emphasised: [before, emphasised, after, …]. */
export type Emphasised = { text: string; em?: boolean }[];

export const BOOTCAMP = {
  meta: {
    title:
      "Operator Forge — 6-Week Startup Operator Bootcamp for Fresh Graduates",
    description:
      "Live online bootcamp for fresh graduates. Solve real startup problems, build a proof-of-work portfolio, and complete it to step into an assured 3-month paid startup internship (₹15,000+ a month). 20 seats, January 2027.",
    ogAlt:
      "The Startup Operator Bootcamp — Become the graduate startups want to hire.",
  },

  brand: {
    name: "Operator Forge",
    product: "Operator Bootcamp",
    homeLabel: "Operator Forge home",
  },

  nav: {
    label: "Bootcamp sections",
    links: [
      { label: "Curriculum", href: "#curriculum" },
      { label: "Pathway", href: "#pathway" },
      { label: "Fee", href: "#fee" },
      { label: "FAQ", href: "#faq" },
    ],
    cta: "Apply now",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    menuTitle: "Menu",
  },

  hero: {
    id: "top",
    title: "The Startup Operator Bootcamp",
    eyebrow: `${COHORT} Cohort · Applications open`,
    h1: [
      { text: "Become the graduate " },
      { text: "startups want to hire.", em: true },
    ] as Emphasised,
    subhead:
      "A 6-week live bootcamp where you solve real startup problems, build a portfolio of proof, and step into a paid startup internship.",
    assurance: {
      strong: "100% internship assurance",
      rest: `on completion: ${INTERNSHIP.months} months, paid, ${inr(INTERNSHIP.minStipend)}+/month.`,
    },
    scholarship: {
      strong: "100% scholarship",
      rest: `for the top ${SCHOLARSHIP.winners} in the selection interview.`,
    },
    chips: [
      { icon: "calendar", label: "6 weeks" },
      { icon: "live", label: "Live online" },
      { icon: "seats", label: `${SEATS} seats` },
      { icon: "interview", label: "Admission by interview" },
    ],
    cta: "Apply for the selection interview",
    secondary: { label: "See how it works ↓", href: "#curriculum" },
    microcopy: `Pay ${inr(FEE.advance)} to start. The remaining ${inr(FEE.afterPlacement)} only after you're placed.`,
  },

  proof: {
    id: "proof",
    heading: "The bootcamp in numbers",
    stats: [
      {
        value: "100%",
        label: "Internship assurance when you complete the bootcamp",
        highlight: true,
      },
      {
        value: `${inr(INTERNSHIP.minStipend)}+`,
        label: `Monthly stipend in a ${INTERNSHIP.months}-month paid startup internship`,
        highlight: true,
      },
      { value: "6", label: "Weeks of hands-on training" },
      { value: "6", label: "Startup-style team missions" },
      { value: "6", label: "Live AMAs with founders and operators" },
      { value: "1", label: "Proof-of-work portfolio you keep" },
    ],
  },

  fit: {
    id: "fit",
    h2: [
      { text: "Built for " },
      { text: "ambitious", em: true },
      { text: " fresh graduates." },
    ] as Emphasised,
    yesTitle: "This is for you if you:",
    yes: [
      "Want a role in business operations, growth, Founder's Office or a generalist team",
      "Are curious about how businesses actually work",
      "Learn fast, take ownership and don't mind hard work",
      "Want proof of your ability — not another certificate",
    ],
    noTitle: "This is not for you if you:",
    no: [
      "Prefer watching lectures to doing the work",
      "Are looking for a guaranteed job without effort",
    ],
    line: "No startup experience needed. Just the drive to become capable.",
    cta: "Apply now",
  },

  curriculum: {
    id: "curriculum",
    h2: [
      { text: "One capability a week. " },
      { text: "Practised", em: true },
      { text: ", not just taught." },
    ] as Emphasised,
    weekLabel: "Week",
    weeks: [
      {
        week: "01",
        title: "Learn anything, fast",
        outcome:
          "Get productive in an unfamiliar area within a day or two, using the right questions and AI",
      },
      {
        week: "02",
        title: "Solve messy problems",
        outcome:
          "Break down an unclear business problem, find the cause and recommend a fix",
      },
      {
        week: "03",
        title: "Understand the business",
        outcome:
          "Read business models, unit economics and the metrics startups decide by",
      },
      {
        week: "04",
        title: "Understand customers",
        outcome:
          "Run customer conversations and turn what you hear into clear recommendations",
      },
      {
        week: "05",
        title: "Execute with AI",
        outcome:
          "Prioritise, build workflows and use AI to deliver better work, faster",
      },
      {
        week: "06",
        title: "Persuade and present",
        outcome:
          "Present your recommendation, handle objections and win stakeholders over",
      },
    ],
  },

  method: {
    id: "how-you-learn",
    h2: [
      { text: "Less watching. " },
      { text: "More doing.", em: true },
    ] as Emphasised,
    intro:
      "Forget textbook assignments. Step into the shoes of a startup operator and solve challenges inspired by real businesses.",
    cards: [
      {
        icon: "challenge",
        title: "Real startup challenges",
        body: "Team missions built on real business problems in growth, operations and customers — with no textbook answer.",
      },
      {
        icon: "simulation",
        title: "Simulation-based learning",
        body: "Practise in live simulations, get scored on your decisions and get feedback on every mission.",
      },
      {
        icon: "ama",
        title: "Live AMA sessions",
        body: "A weekly LIVE AMA with startup leaders and founders. Ask what it really takes.",
        badge: "Weekly · Live",
      },
    ],
    challenges: {
      title: "Real startups. Real challenges. Can you crack them?",
      items: [
        {
          number: "01",
          company: "Wispr Flow",
          name: "The Growth Challenge",
          hook: "An incredible AI product. But how do you get people to actually use it?",
          body: "You're the Growth Intern at Wispr Flow. Find the right audience, create a compelling campaign and convince students to try AI-powered voice typing.",
          question: "Can you turn a great product into real users?",
        },
        {
          number: "02",
          company: "Snabbit",
          name: "The 10-Minute Challenge",
          hook: "6 customer requests. 5 service professionals. A 10-minute arrival promise.",
          body: "You're running operations at Snabbit. Assign the right professionals, manage competing requests and handle an unexpected disruption — all while keeping customers happy.",
          question:
            "Can you make the right decisions when every minute counts?",
        },
      ],
      challengeLabel: "Challenge",
      note: "Challenges are inspired by real businesses and designed by Operator Forge for learning.",
    },
    schedule: {
      label: "A typical day",
      blocks: [
        {
          time: "Morning",
          hours: `${SCHEDULE.morningHours} hrs`,
          what: "Live sessions",
        },
        {
          time: "Afternoon",
          hours: `${SCHEDULE.afternoonHours} hrs`,
          what: "Missions",
        },
      ],
      days: `${SCHEDULE.daysPerWeek} days a week`,
    },
  },

  pathway: {
    id: "pathway",
    h2: [
      { text: "Bootcamp → Internship → " },
      { text: "Career.", em: true },
    ] as Emphasised,
    steps: [
      {
        number: "01",
        title: "Bootcamp (6 weeks)",
        body: "Build real skills through missions and simulations. Leave with a proof-of-work portfolio that shows how you think and execute.",
      },
      {
        number: "02",
        title: `Paid internship (${INTERNSHIP.months} months)`,
        body: `Complete the bootcamp and you're assured a paid internship with a promising startup, at ${inr(INTERNSHIP.minStipend)}+ a month — where you apply what you've learned on the job.`,
      },
      {
        number: "03",
        title: "Full-time role",
        body: "Strong internships can turn into full-time offers.",
      },
    ],
    line: "We don't just get you interview-ready. We get you work-ready — and an assured paid internship to prove it.",
    smallPrint:
      "The internship assurance applies to every participant who completes the bootcamp. Full-time roles depend on your internship performance and the startup's hiring needs.",
  },

  mentors: {
    id: "mentors",
    h2: [
      { text: "Learn from people who've " },
      { text: "done the work.", em: true },
    ] as Emphasised,
    sub: "Founders, operators and product leaders from Swiggy, Unacademy, Truecaller, Paytm, PayU and FTI Consulting.",
  },

  simulation: {
    id: "simulations",
    eyebrow: "Simulation-based learning and assessment",
    title: "Practise the job before you get it.",
    body: "You learn inside live simulations of real businesses. A clock is running, the data is messy and a team is waiting on your call. You read the records, make decisions and see what happens next.",
    assessment:
      "Every simulation is also an assessment. You're scored on how you decide, not on what you remember, and you get clear feedback on your strengths and gaps.",
    points: [
      "Real-time scenarios with a clock running",
      "Logs, orders and a team to work with",
      "Scored on decisions, with feedback after every run",
    ],
    image: {
      src: "/bootcamp/simulation.webp",
      width: 960,
      height: 877,
      alt: "A live store simulation: an expensive smartwatch is missing, with the system count, the cage count and the records to check.",
    },
    caption:
      "Inside a simulation: an expensive item is missing. Count it, check the logs, decide.",
  },

  fee: {
    id: "fee",
    h2: [
      { text: "Pay most of your fee only " },
      { text: "after you're placed.", em: true },
    ] as Emphasised,
    rows: [
      {
        label: "On selection (to confirm your seat)",
        amount: inr(FEE.advance),
      },
      { label: "After placement", amount: inr(FEE.afterPlacement) },
    ],
    totalLabel: "Total",
    total: inr(FEE.total),
    included: {
      label: "When you complete",
      value: `100% internship assurance · ${INTERNSHIP.months}-month paid internship · ${inr(INTERNSHIP.minStipend)}+ monthly stipend`,
    },
    scholarship: {
      label: "Scholarship",
      value: `The top ${SCHOLARSHIP.winners} performers in the selection interview get a 100% scholarship. They pay nothing for the programme.`,
    },
    line: "We only earn the larger share when you do.",
    smallPrint:
      "Placement means a full-time role after your internship. Full payment terms are shared before enrolment.",
    cta: "Apply for the selection interview",
  },

  admissions: {
    id: "apply",
    h2: [
      { text: "Three steps. Selection by " },
      { text: "interview", em: true },
      { text: " only." },
    ] as Emphasised,
    steps: [
      {
        number: "01",
        title: "Apply",
        body: "Tell us about yourself and what you want to build.",
      },
      {
        number: "02",
        title: "Interview",
        body: "We look for curiosity, ambition and commitment — not just grades.",
      },
      {
        number: "03",
        title: "Confirm your seat",
        body: `Pay ${inr(FEE.advance)} and start in ${COHORT}.`,
      },
    ],
    cta: "Apply now",
  },

  faq: {
    id: "faq",
    h2: [
      { text: "Questions, " },
      { text: "answered.", em: true },
    ] as Emphasised,
    items: [
      {
        q: "Do I need startup or work experience?",
        a: "No. The programme is built for fresh graduates.",
      },
      {
        q: "Is the internship guaranteed?",
        a: `Yes. Every participant who completes the bootcamp is assured a ${INTERNSHIP.months}-month paid internship with a promising startup. A full-time job after the internship is not guaranteed — it depends on your performance.`,
      },
      {
        q: "What counts as completing the bootcamp?",
        a: "Completing all the live sessions, all the missions and all the live AMAs.",
      },
      {
        q: `What does "placement" mean for the ${inr(FEE.afterPlacement)} payment?`,
        a: "A full-time role after your internship. You pay the remaining amount only once you're placed in a full-time role.",
      },
      {
        q: "What roles does this prepare me for?",
        a: "Business operations, growth, Founder's Office and generalist roles in startups.",
      },
      {
        q: "Is it fully online?",
        a: "Yes. All sessions and missions are live and online.",
      },
      {
        q: "How many hours a week will this take?",
        a: `${SCHEDULE.morningHours} hours of live sessions every morning and ${SCHEDULE.afternoonHours} hours of missions every afternoon, ${SCHEDULE.daysPerWeek} days a week.`,
      },
      {
        q: "Can I do this alongside a job or studies?",
        a: "No. This is a full-time bootcamp.",
      },
      {
        q: "Are the internships paid?",
        a: `Yes. Internships run for ${INTERNSHIP.months} months with a stipend of ${inr(INTERNSHIP.minStipend)} or more a month.`,
      },
      {
        q: "What happens in the selection interview?",
        a: "A conversation about your background, your ambitions and how you approach problems. No case prep needed.",
      },    ],
  },

  final: {
    id: "final",
    h2: [
      { text: "You don't need everything figured out. You need to be " },
      { text: "willing to figure it out.", em: true },
    ] as Emphasised,
    sub: `${SEATS} seats. ${COHORT}. Live online.`,
    cta: "Apply for the selection interview",
    microcopy: `Applications close when all ${SEATS} seats are filled.`,
  },

  footer: {
    name: "Operator Forge",
    tagline: "Beyond resumes. Built on capability.",
    disclaimer:
      "The internship assurance applies to participants who complete the bootcamp: all live sessions, missions and live AMAs. Full-time roles are not guaranteed and depend on performance, role fit and employer hiring decisions.",
    copyright: `© ${new Date().getFullYear()} Operator Forge`,
  },

  mobileBar: { text: `${inr(FEE.advance)} to start`, cta: "Apply now" },

  placeholderWarning:
    "[Operator Bootcamp] Unfilled placeholders in lib/constants/operator-bootcamp.ts:",
} as const;

/** Plain text of an emphasised headline, for aria-labels and metadata. */
export function plain(parts: Emphasised): string {
  return parts.map((part) => part.text).join("");
}

/**
 * Every value still in [brackets], with where it is. Read in development to
 * warn once in the console; never shown on the page.
 */
export function unfilledPlaceholders(): string[] {
  const found = new Set<string>();
  const walk = (value: unknown, path: string) => {
    if (typeof value === "string") {
      for (const match of value.match(/\[[^\]]+\]/g) ?? [])
        found.add(`${match} (${path})`);
    } else if (Array.isArray(value)) {
      value.forEach((entry, index) => walk(entry, `${path}[${index}]`));
    } else if (value && typeof value === "object") {
      for (const [key, entry] of Object.entries(value))
        walk(entry, path ? `${path}.${key}` : key);
    }
  };
  walk({ MENTORS, faq: BOOTCAMP.faq.items }, "");
  return [...found];
}
