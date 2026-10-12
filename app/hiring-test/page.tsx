import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardCheck, Users } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { COMPETENCIES, COMPETENCY_LABEL, assessmentWeights } from "@/lib/hiring/weights";

export const metadata: Metadata = {
  title: "Hiring Test — Dark Store Manager Simulation",
  description:
    "Screen Assistant Store Manager and Store Manager candidates through a 30-minute dark-store work simulation. See how they build teams, control inventory, prioritise problems, solve bottlenecks and protect customer outcomes.",
};

const MEASURES: Record<(typeof COMPETENCIES)[number], string> = {
  teamManagement: "Covers picking, putaway and riders, decides which devices to lock, looks after a new joiner, handles conflict honestly, delegates — and does not run the shift on their own hands.",
  inventoryManagement: "Counts before concluding, follows the records, separates explained from recovered from unresolved, and closes the gap that caused it.",
  timePrioritisation: "Acts on the forecast before the queue, puts the high-impact problem first, and defers only what is safe to defer.",
  criticalThinking: "Looks at the evidence before accepting a diagnosis, fixes the constraint rather than the symptom, tests the fix and checks it.",
  customerFirst: "Protects product safety and the order the customer was promised when a dispatch target argues the other way.",
};

const JOURNEY = [
  ["05:55", "Morning handover", "The 06:00 round: rider attendance, the floor walk, the fresh lines, the counts. Twelve of fourteen present."],
  ["05:56", "Build and lead the team", "Picking, putaway and auditing, and which devices to lock. Cover the absence, decide about a second-day joiner, answer an unhappy expert."],
  ["06:06", "Control inventory and loss", "A high-value variance and a nil pick on a line the system says is in stock."],
  ["06:14", "Three problems, one manager", "One personal attention slot. Handle, delegate, or leave until after the peak."],
  ["06:18", "Find the real bottleneck", "Orders back up. The Floor Lead has a theory, and the pick speed on the wall seems to agree."],
  ["06:23", "Protect the customer", "A bag that is ready to go and should not."],
  ["06:27", "The manager’s final call", "Lock the plan. Then watch the breakfast peak run on it."],
] as const;

const GETS = [
  ["A readiness score you can open", "Overall and five competencies, each opening into the moments it was scored from: time, state, action, result."],
  ["Cross-scenario evidence", "What an early decision did to a later one — whether the floor built at 05:56 held when the surge arrived at 06:09."],
  ["Team effect", "Peak coverage, delegation quality, flexible reserve, trust, and how much of the shift depended on the manager personally."],
  ["Interview probes", "Questions written from what this candidate did, not from a competency framework."],
  ["Manual review flags", "Control breaches are flagged for a person to look at. Nothing is rejected automatically."],
] as const;

/**
 * The Hiring Test's own front door. Separate from the 7-Day Challenge in every
 * way that matters: different audience, different sign-in destination,
 * different tables, and no path from one into the other.
 */
export default function HiringTestPage() {
  return (
    <div className="min-h-dvh bg-void text-hi">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 pt-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-full" aria-label="Operator Forge home">
          <LogoMark />
          <span className="text-[13.5px] font-semibold tracking-[0.16em] text-hi">
            OPERATOR<span className="text-lo"> FORGE</span>
          </span>
        </Link>
        <Link href="/hiring-test/results/sample" className="text-[13.5px] font-medium text-mid underline-offset-4 hover:text-hi hover:underline">
          Sample profile
        </Link>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-5 pb-24 sm:px-6">
        <section className="pt-14 sm:pt-20">
          <p className="font-mono text-[12px] tracking-[0.24em] text-ember-500 uppercase">For employers · Hiring Test</p>
          <h1 className="mt-4 max-w-3xl text-[clamp(2.4rem,8vw,4.4rem)] leading-[0.98] font-bold tracking-[-0.045em] text-hi text-balance">
            See how candidates actually operate.
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-mid">
            Screen ASM and Store Manager candidates through a 30-minute dark-store work simulation. See how they build
            teams, control inventory, prioritise problems, solve bottlenecks and protect customer outcomes.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/hiring-test/assessment"
              className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-ember-500 px-8 text-[14px] font-bold tracking-[0.08em] text-void uppercase transition-[filter] hover:brightness-110"
            >
              Take hiring test
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/hiring-test/results/sample"
              className="inline-flex min-h-[54px] items-center justify-center rounded-full border border-line-strong bg-white/[0.04] px-8 text-[14px] font-bold tracking-[0.08em] text-hi uppercase transition-colors hover:border-line-bright hover:bg-white/[0.08]"
            >
              View sample profile
            </Link>
          </div>
          <p className="mt-5 max-w-xl text-[13px] leading-relaxed text-lo">
            Not a questionnaire, a personality test or a knowledge quiz. The candidate takes a shift, and what they do
            in it is the evidence.
          </p>
        </section>

        <section className="mt-20">
          <h2 className="font-mono text-[12px] tracking-[0.24em] text-lo uppercase">What it measures</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {COMPETENCIES.map((id, index) => (
              <li key={id} className={`rounded-[20px] border p-5 ${index === 0 ? "border-ember-500/35 bg-ember-500/[0.06] sm:col-span-2" : "border-line bg-surface"}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[18px] font-bold tracking-[-0.01em] text-hi">{COMPETENCY_LABEL[id]}</h3>
                  <span className="tabular font-mono text-[15px] font-semibold text-ember-500">{Math.round(assessmentWeights[id] * 100)}%</span>
                </div>
                <p className="mt-2 text-[14.5px] leading-relaxed text-mid">{MEASURES[id]}</p>
                {index === 0 ? (
                  <p className="mt-3 flex items-start gap-2 text-[13.5px] leading-snug text-hi">
                    <Users className="mt-0.5 size-4 shrink-0 text-ember-500" aria-hidden />
                    Managers do not run stores by doing everything themselves. The same twelve people stay on the floor
                    for the whole shift, and every later problem is met by the team the candidate built.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12.5px] leading-relaxed text-lo">
            Weights are a provisional judgement by subject-matter experts. They have not yet been validated against job
            performance, and the profile says so.
          </p>
        </section>

        <section className="mt-20">
          <h2 className="font-mono text-[12px] tracking-[0.24em] text-lo uppercase">Thirty minutes, one store</h2>
          <ol className="mt-5 divide-y divide-line rounded-[20px] border border-line bg-surface">
            {JOURNEY.map(([time, title, detail]) => (
              <li key={time} className="flex gap-4 px-5 py-4">
                <span className="tabular w-12 shrink-0 pt-0.5 font-mono text-[13px] text-ember-500">{time}</span>
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold text-hi">{title}</p>
                  <p className="mt-0.5 text-[14px] leading-snug text-mid">{detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[13px] leading-relaxed text-lo">
            One store, not seven exercises. A device left unlocked at 05:56 is a device the app sends orders to when
            the rush comes; how an associate was spoken to at 06:04 is how willingly they cover other work at 06:18.
            The store runs the way a quick-commerce dark store does: three kinds of work, a sixteen-second item, crates
            from the mother warehouse, and riders who have to turn up.
          </p>
        </section>

        <section className="mt-20">
          <h2 className="font-mono text-[12px] tracking-[0.24em] text-lo uppercase">What you get</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {GETS.map(([title, detail]) => (
              <li key={title} className="rounded-[20px] border border-line bg-surface p-5">
                <ClipboardCheck className="size-5 text-ember-500" aria-hidden />
                <h3 className="mt-3 text-[16.5px] font-semibold text-hi">{title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-mid">{detail}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-20 rounded-[24px] border border-line-strong bg-surface p-6 sm:p-8">
          <h2 className="text-[clamp(1.5rem,4.5vw,2.1rem)] leading-tight font-bold tracking-[-0.03em] text-hi">Sit the shift yourself.</h2>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-mid">
            It takes thirty minutes and an email address. The timer starts when you press Start Shift, not before.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/hiring-test/assessment"
              className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-ember-500 px-8 text-[14px] font-bold tracking-[0.08em] text-void uppercase transition-[filter] hover:brightness-110"
            >
              Take hiring test
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/hiring-test/results/sample"
              className="inline-flex min-h-[54px] items-center justify-center rounded-full border border-line-strong bg-white/[0.04] px-8 text-[14px] font-bold tracking-[0.08em] text-hi uppercase transition-colors hover:border-line-bright hover:bg-white/[0.08]"
            >
              View sample profile
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
