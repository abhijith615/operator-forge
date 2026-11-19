/**
 * The Startup Operator Bootcamp landing page (/operator-bootcamp).
 *
 * The single source of truth for the page: every variable and every line of
 * copy lives here, and the components only lay it out. Anything still in
 * [brackets] renders as written and is listed in one console warning in
 * development, so nothing unfinished ships unnoticed.
 */

/* ── Variables ─────────────────────────────────────────────────────────── */

/** TODO: the Google Form / Typeform link. Every "Apply" button points here. */
export const APPLY_URL = "#";
export const APPLICATION_DEADLINE = "[Date]";
export const WEEKLY_HOURS = "[X hours/week]";
export const COHORT = "January 2027";
export const SEATS = 20;
export const FEE = { advance: 10000, afterPlacement: 20000, total: 30000 } as const;
/** Assured for every participant who completes the bootcamp. */
export const INTERNSHIP = { months: 3, minStipend: 15000 } as const;

export interface Mentor {
  name: string;
  role: string;
  bio: string;
  /** A path under /public, or null to show initials. */
  photo: string | null;
}

export const MENTORS: Mentor[] = [{ name: "[Name]", role: "[Role, company]", bio: "[One line]", photo: null }];

/** ₹10,000 — Indian digit grouping. */
export function inr(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

/* ── Copy ──────────────────────────────────────────────────────────────── */

/** A headline split so one or two words can be emphasised: [before, emphasised, after, …]. */
export type Emphasised = { text: string; em?: boolean }[];

export const BOOTCAMP = {
  meta: {
    title: "Operator Forge — 6-Week Startup Operator Bootcamp for Fresh Graduates",
    description:
      "Live online bootcamp for fresh graduates. Solve real startup problems, build a proof-of-work portfolio, and complete it to step into an assured 3-month paid startup internship (₹15,000+ a month). 20 seats, January 2027.",
    ogAlt: "The Startup Operator Bootcamp — Become the graduate startups want to hire.",
  },

  brand: { name: "Operator Forge", product: "Operator Bootcamp", homeLabel: "Operator Forge home" },

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
    h1: [{ text: "Become the graduate " }, { text: "startups want to hire.", em: true }] as Emphasised,
    subhead:
      "A 6-week live bootcamp where you solve real startup problems, build a portfolio of proof, and step into a paid startup internship.",
    assurance: {
      strong: "100% internship assurance",
      rest: `when you complete — ${INTERNSHIP.months} months, paid, ${inr(INTERNSHIP.minStipend)}+ a month.`,
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
    visual: {
      label: "Example mission",
      cards: [
        { tag: "Mission 01", title: "Map a new market in 48 hours", progress: 100, status: "Submitted" },
        { tag: "Mission 02", title: "Diagnose a 20% drop in repeat orders", progress: 62, status: "In progress" },
        { tag: "Mission 03", title: "Pitch the fix to the founder", progress: 0, status: "Up next" },
      ],
      progressLabel: "Progress",
      steps: ["Read the data", "Talk to customers", "Find the cause", "Recommend a fix"],
      currentStep: 2,
    },
  },

  proof: {
    id: "proof",
    heading: "The bootcamp in numbers",
    stats: [
      { value: "100%", label: "Internship assurance when you complete the bootcamp", highlight: true },
      { value: `${inr(INTERNSHIP.minStipend)}+`, label: `Monthly stipend in a ${INTERNSHIP.months}-month paid startup internship`, highlight: true },
      { value: "6", label: "Weeks of hands-on training" },
      { value: "6", label: "Startup-style team missions" },
      { value: "6", label: "Live AMAs with founders and operators" },
      { value: "1", label: "Proof-of-work portfolio you keep" },
    ],
  },

  problem: {
    id: "problem",
    h2: [{ text: "Your degree taught you " }, { text: "what", em: true }, { text: ". Startups hire for " }, { text: "how", em: true }, { text: "." }] as Emphasised,
    paragraphs: [
      "In a startup, you might learn a new business on Monday, talk to customers on Tuesday and ship a solution by Friday. No one hands you a brief.",
      "Most graduates have never practised working this way. Operator Forge gives you six weeks to do exactly that.",
    ],
    timelineLabel: "A week in a startup",
    timeline: [
      { day: "Mon", task: "Learn a new business" },
      { day: "Tue", task: "Talk to customers" },
      { day: "Fri", task: "Ship a solution" },
    ],
  },

  fit: {
    id: "fit",
    h2: [{ text: "Built for " }, { text: "ambitious", em: true }, { text: " fresh graduates." }] as Emphasised,
    yesTitle: "This is for you if you:",
    yes: [
      "Want a role in business operations, growth, Founder's Office or a generalist team",
      "Are curious about how businesses actually work",
      "Learn fast, take ownership and don't mind hard work",
      "Want proof of your ability — not another certificate",
    ],
    noTitle: "This is not for you if you:",
    no: ["Prefer watching lectures to doing the work", "Are looking for a guaranteed job without effort"],
    line: "No startup experience needed. Just the drive to become capable.",
    cta: "Apply now",
  },

  curriculum: {
    id: "curriculum",
    h2: [{ text: "One capability a week. " }, { text: "Practised", em: true }, { text: ", not just taught." }] as Emphasised,
    weekLabel: "Week",
    weeks: [
      { week: "01", title: "Learn anything, fast", outcome: "Get productive in an unfamiliar area within a day or two, using the right questions and AI" },
      { week: "02", title: "Solve messy problems", outcome: "Break down an unclear business problem, find the cause and recommend a fix" },
      { week: "03", title: "Understand the business", outcome: "Read business models, unit economics and the metrics startups decide by" },
      { week: "04", title: "Understand customers", outcome: "Run customer conversations and turn what you hear into clear recommendations" },
      { week: "05", title: "Execute with AI", outcome: "Prioritise, build workflows and use AI to deliver better work, faster" },
      { week: "06", title: "Persuade and present", outcome: "Present your recommendation, handle objections and win stakeholders over" },
    ],
  },

  method: {
    id: "how-you-learn",
    h2: [{ text: "Less watching. " }, { text: "More doing.", em: true }] as Emphasised,
    cards: [
      { icon: "sessions", title: "Live expert sessions", body: "Learn the frameworks from people who use them." },
      { icon: "missions", title: "Team missions", body: "Solve startup-inspired challenges in small groups." },
      { icon: "feedback", title: "Feedback on every mission", body: "Know what's working and what to fix." },
      { icon: "ama", title: "Weekly AMA", body: "Ask founders and operators what it really takes." },
    ],
    weekLine: `Typical week: ${WEEKLY_HOURS}`,
  },

  pathway: {
    id: "pathway",
    h2: [{ text: "Bootcamp → Internship → " }, { text: "Career.", em: true }] as Emphasised,
    steps: [
      { number: "01", title: "Bootcamp (6 weeks)", body: "Build real skills through missions and simulations. Leave with a proof-of-work portfolio that shows how you think and execute." },
      {
        number: "02",
        title: `Paid internship (${INTERNSHIP.months} months)`,
        body: `Complete the bootcamp and you're assured a paid internship with a promising startup, at ${inr(INTERNSHIP.minStipend)}+ a month — where you apply what you've learned on the job.`,
      },
      { number: "03", title: "Full-time role", body: "Strong internships can turn into full-time offers." },
    ],
    line: "We don't just get you interview-ready. We get you work-ready — and an assured paid internship to prove it.",
    smallPrint:
      "The internship assurance applies to every participant who completes the bootcamp. Full-time roles depend on your internship performance and the startup's hiring needs.",
  },

  mentors: {
    id: "mentors",
    h2: [{ text: "Learn from people who've " }, { text: "done the work.", em: true }] as Emphasised,
    amaTitle: "Weekly AMA speakers",
    amaBody:
      "Six live sessions with founders, operators and business leaders. Ask about real mistakes, career calls and what makes an intern indispensable.",
    amaSlots: 6,
    amaSlotLabel: "Announcing soon",
  },

  fee: {
    id: "fee",
    h2: [{ text: "Pay most of your fee only " }, { text: "after you're placed.", em: true }] as Emphasised,
    rows: [
      { label: "On selection (to confirm your seat)", amount: inr(FEE.advance) },
      { label: "After placement", amount: inr(FEE.afterPlacement) },
    ],
    totalLabel: "Total",
    total: inr(FEE.total),
    included: {
      label: "When you complete",
      value: `100% internship assurance · ${INTERNSHIP.months}-month paid internship · ${inr(INTERNSHIP.minStipend)}+ monthly stipend`,
    },
    line: "We only earn the larger share when you do.",
    smallPrint: "The definition of placement and full payment terms are shared before enrolment.",
    cta: "Apply for the selection interview",
  },

  admissions: {
    id: "apply",
    h2: [{ text: "Three steps. Selection by " }, { text: "interview", em: true }, { text: " only." }] as Emphasised,
    steps: [
      { number: "01", title: "Apply", body: "Tell us about yourself and what you want to build." },
      { number: "02", title: "Interview", body: "We look for curiosity, ambition and commitment — not just grades." },
      { number: "03", title: "Confirm your seat", body: `Pay ${inr(FEE.advance)} and start in ${COHORT}.` },
    ],
    deadline: `Application deadline: ${APPLICATION_DEADLINE}`,
    cta: "Apply now",
  },

  faq: {
    id: "faq",
    h2: [{ text: "Questions, " }, { text: "answered.", em: true }] as Emphasised,
    items: [
      { q: "Do I need startup or work experience?", a: "No. The programme is built for fresh graduates." },
      {
        q: "Is the internship guaranteed?",
        a: `Yes. Every participant who completes the bootcamp is assured a ${INTERNSHIP.months}-month paid internship with a promising startup. A full-time job after the internship is not guaranteed — it depends on your performance.`,
      },
      { q: "What counts as completing the bootcamp?", a: "[Define completion, e.g. minimum attendance and every mission submitted]" },
      { q: `What does "placement" mean for the ${inr(FEE.afterPlacement)} payment?`, a: "[Define clearly. Exact terms are shared before enrolment.]" },
      { q: "What roles does this prepare me for?", a: "Business operations, growth, Founder's Office and generalist roles in startups." },
      { q: "Is it fully online?", a: "Yes. All sessions and missions are live and online." },
      { q: "How many hours a week will this take?", a: WEEKLY_HOURS },
      { q: "Can I do this alongside a job or studies?", a: "[Fill in]" },
      { q: "Are the internships paid?", a: `Yes. Internships run for ${INTERNSHIP.months} months with a stipend of ${inr(INTERNSHIP.minStipend)} or more a month.` },
      { q: "What happens in the selection interview?", a: "A conversation about your background, your ambitions and how you approach problems. No case prep needed." },
      { q: "What if I'm not selected?", a: "[Fill in]" },
    ],
  },

  final: {
    id: "final",
    h2: [{ text: "You don't need everything figured out. You need to be " }, { text: "willing to figure it out.", em: true }] as Emphasised,
    sub: `${SEATS} seats. ${COHORT}. Live online.`,
    cta: "Apply for the selection interview",
    microcopy: `Applications close ${APPLICATION_DEADLINE} or when seats fill.`,
  },

  footer: {
    name: "Operator Forge",
    tagline: "Beyond resumes. Built on capability.",
    disclaimer:
      "The internship assurance applies to participants who complete the bootcamp, as per the completion criteria shared before enrolment. Full-time roles are not guaranteed and depend on performance, role fit and employer hiring decisions.",
    copyright: `© ${new Date().getFullYear()} Operator Forge`,
  },

  mobileBar: { text: `${inr(FEE.advance)} to start`, cta: "Apply now" },

  placeholderWarning: "[Operator Bootcamp] Unfilled placeholders in lib/constants/operator-bootcamp.ts:",
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
      for (const match of value.match(/\[[^\]]+\]/g) ?? []) found.add(`${match} (${path})`);
    } else if (Array.isArray(value)) {
      value.forEach((entry, index) => walk(entry, `${path}[${index}]`));
    } else if (value && typeof value === "object") {
      for (const [key, entry] of Object.entries(value)) walk(entry, path ? `${path}.${key}` : key);
    }
  };
  walk({ APPLY_URL, APPLICATION_DEADLINE, WEEKLY_HOURS, MENTORS, faq: BOOTCAMP.faq.items }, "");
  if (APPLY_URL === "#") found.add("APPLY_URL is still \"#\"");
  return [...found];
}
