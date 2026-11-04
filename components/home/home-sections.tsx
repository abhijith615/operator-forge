import Link from "next/link";
import { ArrowRight, Building2, Compass, GraduationCap, Layers3, Scale, Sparkles, Target, UserRound } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { CONTACT_EMAIL, DEMO_EMAIL_URL, DEMO_URL, PARTNER_URL, PILOT_URL } from "@/lib/constants/home";
import { OFFER_ROUTE } from "@/lib/constants/offer";
import { hand } from "@/lib/fonts";
import { cn } from "@/lib/utils";

/*
 * Sections 2 to 5 of the homepage, and its closing band. The words are the
 * agreed homepage copy; the layout is the cream, black and yellow of the rest
 * of the site. No link here leads to a hiring test.
 */

/** The same focus ring as the nav; defined here because this file renders on the server. */
const HOME_FOCUS =
  "focus-visible:ring-2 focus-visible:ring-[#0B0B0B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F0] focus-visible:outline-none";

const EYEBROW = "font-mono text-[11px] tracking-[0.22em] uppercase";
const H2 = "text-[clamp(2rem,5.4vw,3.3rem)] leading-[1.02] font-bold tracking-[-0.045em] text-balance";

function Pill({ href, children, dark = false, external = false }: { href: string; children: React.ReactNode; dark?: boolean; external?: boolean }) {
  const className = cn(
    "group inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-[15px] font-semibold transition-colors",
    dark ? "bg-[#0B0B0B] text-white hover:bg-[#262626]" : "border-2 border-[#0B0B0B] text-[#0B0B0B] hover:bg-[#0B0B0B] hover:text-white",
    HOME_FOCUS,
  );
  const inner = (
    <>
      {children}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    );
  }
  if (href.startsWith("#")) {
    return (
      <a href={href} className={className}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}

/** A word with the yellow marker behind it, as in the hero. */
function Marked({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span aria-hidden className="absolute -inset-x-[0.06em] top-[0.32em] bottom-[0.04em] -skew-y-1 rounded-[0.1em] bg-ember-500" />
      <span className="relative">{children}</span>
    </span>
  );
}

/* ── 2 · The problem ──────────────────────────────────────────────────── */

const QUESTIONS = [
  "Can they solve unfamiliar problems?",
  "Can they make sound decisions with incomplete information?",
  "Can they prioritize when everything seems urgent?",
  "Can they take ownership when things go wrong?",
  "Can they deliver results in challenging situations?",
];

export function ProblemSection() {
  return (
    <section id="problem" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <Reveal>
          <p className={cn(EYEBROW, "text-[#6B6B6B]")}>The problem</p>
          <h2 className={cn(H2, "mt-3 max-w-4xl text-[#0B0B0B]")}>Great Resumes. Impressive Interviews. Uncertain Hires.</h2>
        </Reveal>
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Reveal delay={0.06}>
            <p className="text-[18px] font-semibold text-[#0B0B0B]">Hiring the right person isn&rsquo;t easy.</p>
            <p className="mt-3 text-[16px] leading-relaxed text-[#3D3D3D]">
              A candidate may communicate confidently in an interview but struggle with ambiguity, competing priorities, or
              real-world execution.
            </p>
            <p className="mt-3 text-[16px] leading-relaxed text-[#3D3D3D]">
              Traditional hiring processes often leave critical questions unanswered:
            </p>
          </Reveal>
          <ul className="grid gap-2.5">
            {QUESTIONS.map((question, index) => (
              <li key={question}>
                <Reveal delay={0.08 + index * 0.04}>
                <div className="flex items-center gap-4 rounded-[18px] border border-black/10 bg-white px-5 py-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#0B0B0B] text-[16px] font-bold text-ember-500">?</span>
                  <span className="text-[16px] font-medium text-[#0B0B0B]">{question}</span>
                </div>
              </Reveal>
              </li>
            ))}
          </ul>
        </div>
        <Reveal delay={0.1}>
          <p className="mt-12 max-w-4xl text-[clamp(1.5rem,3.6vw,2.3rem)] leading-[1.15] font-bold tracking-[-0.035em] text-[#0B0B0B]">
            The problem isn&rsquo;t always a lack of talent. It&rsquo;s a lack of <Marked>evidence.</Marked>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ── 3 · The solution ─────────────────────────────────────────────────── */

const STEPS = [
  {
    title: "Simulate Real Work",
    body: "Candidates experience role-relevant scenarios inspired by actual workplace challenges, from operational disruptions to business decisions and customer escalations.",
  },
  {
    title: "Assess Real Capabilities",
    body: "Go beyond conventional aptitude tests. Evaluate candidates through their actions, decisions, problem-solving approaches, and work outputs.",
  },
  {
    title: "Hire With Better Evidence",
    body: "Gain structured insights into candidate capabilities, strengths, and development areas to support more informed shortlisting and interviews.",
  },
];

export function SolutionSection() {
  return (
    <section id="solution" className="scroll-mt-20 border-t border-black/[0.07] py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <Reveal>
          <p className={cn(EYEBROW, "text-[#6B6B6B]")}>The solution</p>
          <h2 className={cn(H2, "mt-3 max-w-4xl text-[#0B0B0B]")}>
            Don&rsquo;t Just Ask What They Would Do. <Marked>Let Them Show You.</Marked>
          </h2>
          <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-[#3D3D3D]">
            Operator Forge puts candidates inside realistic workplace situations where they must make decisions, solve problems,
            and navigate competing priorities.
          </p>
          <p className={cn(hand.className, "mt-5 text-[23px] leading-tight text-[#0B0B0B]")}>
            Realistic Challenges. Observable Decisions. Actionable Insights.
          </p>
        </Reveal>

        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title}>
                <Reveal delay={0.06 + index * 0.06}>
              <div className={cn("flex h-full flex-col rounded-[22px] border p-6", index === 2 ? "border-[#0B0B0B] bg-[#0B0B0B] text-white" : "border-black/10 bg-white")}>
                <span className={cn("font-mono text-[13px] font-semibold", index === 2 ? "text-ember-500" : "text-[#8a6d00]")}>0{index + 1}</span>
                <h3 className={cn("mt-3 text-[21px] font-bold tracking-[-0.025em]", index === 2 ? "text-white" : "text-[#0B0B0B]")}>{step.title}</h3>
                <p className={cn("mt-2 text-[15px] leading-relaxed", index === 2 ? "text-white/75" : "text-[#3D3D3D]")}>{step.body}</p>
              </div>
            </Reveal>
              </li>
          ))}
        </ol>

        <Reveal delay={0.1}>
          <div className="mt-9">
            <Pill href="#assessments">Explore How It Works</Pill>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── 4 · Role-specific assessments ────────────────────────────────────── */

const PILLARS = [
  { icon: Target, title: "Role-Specific Competencies", body: "Assess the skills, behaviours, and judgment relevant to the responsibilities of the job." },
  { icon: Layers3, title: "Realistic Workplace Challenges", body: "Evaluate how candidates respond to situations that reflect the actual problems they’ll encounter at work." },
  { icon: Scale, title: "Evidence of Capability", body: "Understand how candidates approach problems, make trade-offs, communicate, prioritize, and execute." },
];

export function AssessmentsSection() {
  return (
    <section id="assessments" className="scroll-mt-20 px-3 sm:px-4">
      <div className="mx-auto max-w-[76rem] overflow-hidden rounded-[32px] bg-[#0B0B0B] text-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <Reveal>
            <p className={cn(EYEBROW, "text-ember-500")}>Role-specific assessments</p>
            <h2 className={cn(H2, "mt-3 max-w-4xl")}>Every Role Is Different. So Is Our Assessment.</h2>
          </Reveal>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Reveal delay={0.06}>
              <p className="text-[18px] font-semibold">Great performance looks different in every role.</p>
              <p className="mt-3 text-[16px] leading-relaxed text-white/70">
                A Store Manager needs different capabilities than a Founder&rsquo;s Office Associate. A Customer Success Manager
                faces different challenges than an Operations Executive.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-[16px] leading-relaxed text-white/70">
                That&rsquo;s why we don&rsquo;t believe in one-size-fits-all assessments.
              </p>
              <p className="mt-3 text-[16px] leading-relaxed text-white/70">
                Operator Forge focuses on the competencies, decisions, and challenges that matter for each role.
              </p>
            </Reveal>
          </div>

          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {PILLARS.map((pillar, index) => (
              <li key={pillar.title}>
                <Reveal delay={0.08 + index * 0.06}>
                <div className="flex h-full flex-col rounded-[22px] border border-white/12 bg-white/[0.04] p-6">
                  <span className="grid size-11 place-items-center rounded-[14px] bg-ember-500 text-[#0B0B0B]">
                    <pillar.icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-[19px] font-bold tracking-[-0.02em]">{pillar.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-white/70">{pillar.body}</p>
                </div>
              </Reveal>
              </li>
            ))}
          </ul>

          <Reveal delay={0.1}>
            <p className="mt-12 max-w-3xl text-[clamp(1.35rem,3vw,1.9rem)] leading-[1.2] font-bold tracking-[-0.03em]">
              The right talent isn&rsquo;t defined by a universal score.{" "}
              <span className="text-ember-500">It&rsquo;s defined by what the role demands.</span>
            </p>
            <a
              href="#who"
              className="group mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ember-500 px-7 text-[15px] font-semibold text-[#0B0B0B] transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0B] focus-visible:outline-none"
            >
              Explore Assessments
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ── 5 · Who we help ──────────────────────────────────────────────────── */

export function WhoWeHelpSection() {
  return (
    <section id="who" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <Reveal>
          <p className={cn(EYEBROW, "text-[#6B6B6B]")}>Who we help</p>
          <h2 className={cn(H2, "mt-3 max-w-4xl text-[#0B0B0B]")}>
            Unlocking Potential. <Marked>Connecting Capability</Marked> With Opportunity.
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {/* Employers: the primary audience, so the dark card and the widest call to action. */}
          <Reveal delay={0.06}>
            <article className="flex h-full flex-col rounded-[24px] bg-[#0B0B0B] p-7 text-white">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-ember-500">
                <Building2 className="size-4" aria-hidden /> For Employers
              </p>
              <h3 className="mt-4 text-[24px] leading-[1.12] font-bold tracking-[-0.03em]">Your Next Great Hire May Not Have the Best Resume.</h3>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-white/72">
                Discover talent beyond credentials and interview performance. Use realistic job simulations and competency insights
                to make better-informed hiring decisions.
              </p>
              <a
                href={PILOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ember-500 px-6 text-[15px] font-semibold text-[#0B0B0B] transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0B] focus-visible:outline-none"
              >
                Start a Hiring Pilot
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </a>
            </article>
          </Reveal>

          <Reveal delay={0.1}>
            <article className="flex h-full flex-col rounded-[24px] border border-black/10 bg-white p-7">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-[#8a6d00]">
                <UserRound className="size-4" aria-hidden /> For Students &amp; Job Seekers
              </p>
              <h3 className="mt-4 text-[24px] leading-[1.12] font-bold tracking-[-0.03em] text-[#0B0B0B]">Your Resume Tells Your Story. Your Skills Should Prove It.</h3>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-[#3D3D3D]">
                Step into realistic workplace challenges. Discover your strengths, identify areas to improve, and demonstrate what
                you&rsquo;re capable of beyond your academic qualifications.
              </p>
              <div className="mt-7 grid gap-2">
                <p className="text-[12.5px] font-medium text-[#6B6B6B]">Start with the 7-Day Operations Leader Challenge</p>
                <Pill href={OFFER_ROUTE} dark>
                  Explore Simulations
                </Pill>
                <Link
                  href="/brief"
                  className={cn("inline-flex h-11 items-center justify-center gap-1.5 rounded-full text-[14.5px] font-semibold text-[#0B0B0B] underline-offset-4 hover:underline", HOME_FOCUS)}
                >
                  <Sparkles className="size-4" aria-hidden /> Or start a free Trial Mission
                </Link>
              </div>
            </article>
          </Reveal>

          <Reveal delay={0.14}>
            <article className="flex h-full flex-col rounded-[24px] border border-black/10 bg-white p-7">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-[#8a6d00]">
                <GraduationCap className="size-4" aria-hidden /> For Colleges &amp; Institutions
              </p>
              <h3 className="mt-4 text-[24px] leading-[1.12] font-bold tracking-[-0.03em] text-[#0B0B0B]">Go Beyond Grades. Build Real-World Readiness.</h3>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-[#3D3D3D]">
                Bridge the gap between classroom learning and workplace expectations through simulation-based assessments, practical
                skill evaluation, and actionable student development insights.
              </p>
              <div className="mt-7">
                <Pill href={PARTNER_URL} external>
                  Partner With Us
                </Pill>
              </div>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ── Closing band ─────────────────────────────────────────────────────── */

export function ClosingSection() {
  return (
    <section id="demo" className="scroll-mt-20 bg-ember-500 text-[#0B0B0B]">
      <div className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-6 lg:py-24">
        <Reveal>
          <p className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] uppercase">
            <Compass className="size-4" aria-hidden /> Talent Is Everywhere. Evidence Isn&rsquo;t.
          </p>
        </Reveal>
        <Reveal delay={0.06}>
          <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-balance text-[#0B0B0B]/80">
            We believe opportunities should be shaped by what people are capable of doing, not just how convincingly they present
            themselves.
          </p>
          <p className={cn(hand.className, "mt-3 text-[24px] leading-tight")}>The future of hiring is about seeing capability in action.</p>
        </Reveal>
        <Reveal delay={0.12}>
          <h2 className="mx-auto mt-8 max-w-3xl text-[clamp(2.2rem,6vw,3.9rem)] leading-[1] font-bold tracking-[-0.05em] text-balance">
            Stop Guessing. Start Seeing Capability.
          </h2>
        </Reveal>
        <Reveal delay={0.18}>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0B0B0B] px-7 text-[15px] font-semibold text-white transition-colors hover:bg-[#262626] focus-visible:ring-2 focus-visible:ring-[#0B0B0B] focus-visible:ring-offset-2 focus-visible:ring-offset-ember-500 focus-visible:outline-none sm:w-auto"
            >
              Book an Employer Demo
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </a>
          </div>
          <p className="mt-4 text-[13.5px] text-[#0B0B0B]/70">
            Opens WhatsApp with your request ready to send · or write to{" "}
            <a href={DEMO_EMAIL_URL} className="font-semibold underline underline-offset-4">
              {CONTACT_EMAIL}
            </a>
          </p>
        </Reveal>
        <Reveal delay={0.22}>
          <p className="mt-14 font-mono text-[12px] tracking-[0.2em] uppercase">Real Work. Real Decisions. Real Capability.</p>
        </Reveal>
      </div>
    </section>
  );
}
