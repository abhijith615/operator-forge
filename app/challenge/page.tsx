import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Lock, Mic, Users } from "lucide-react";

import { HeroConsole } from "@/components/landing/hero-console";
import { LandingNav } from "@/components/landing/landing-nav";
import { Footer } from "@/components/landing/footer";
import { Container, Section, SectionHeading } from "@/components/landing/section";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Aurora, GridField, Horizon } from "@/components/visuals/aurora";
import { DAY_TWO_TOTAL_VARIANCE, rupees } from "@/lib/challenge/day-two/ledger";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "7-Day Challenge",
  description:
    "A cohort-based challenge. Try the job before you interview for it — seven days of real operations problems, then decide whether the career is yours.",
};

interface Day {
  day: number;
  title: string;
  teaser: string;
  href?: string;
  state: "live" | "locked" | "ama";
}

const DAYS: Day[] = [
  {
    day: 1,
    title: "The 180-Second Shift",
    teaser:
      "Breakfast peak. One person short. Click-to-dispatch is drifting towards target and the packing queue is climbing.",
    href: "/challenge/day-1",
    state: "live",
  },
  {
    day: 2,
    title: `${rupees(DAY_TWO_TOTAL_VARIANCE)} Is Missing`,
    teaser:
      "01:47 AM. A lean-shift inventory audit turns up a variance nobody can explain. You establish what is actually on the shelf, rebuild the movement trail, and find out how much of it is really loss.",
    href: "/challenge/day-2",
    state: "live",
  },
  {
    day: 3,
    title: "Onam Eve · Build the Shift",
    teaser:
      "4:30 PM. Five people are out and the festival peak begins in ninety minutes. You build the team — then keep it standing while the evening changes it.",
    href: "/challenge/day-3",
    state: "live",
  },
  {
    day: 4,
    title: "Clear the Floor",
    teaser:
      "10:18 AM. Three vehicles have arrived, staging is nearly full and pickers are walking round Aisle C. Find the real bottleneck and get the store ready before lunch.",
    href: "/challenge/day-4",
    state: "live",
  },
  {
    day: 5,
    title: "The Rating Slide",
    teaser: "Four stars becomes three point six over one week. The cause is not where you think.",
    state: "locked",
  },
  {
    day: 6,
    title: "Peak Day",
    teaser: "Everything you learned in five days, in one sustained rush.",
    state: "locked",
  },
  {
    day: 7,
    title: "Live AMA",
    teaser:
      "One hour with an experienced Operations Cluster Manager. Ask what the job is really like.",
    state: "ama",
  },
];

export default function ChallengePage() {
  return (
    <>
      <LandingNav />
      <main id="main" className="relative overflow-x-clip">
        {/* ── Hero: what the challenge is for ── */}
        <section className="relative isolate overflow-hidden pt-36 pb-20 sm:pt-44 sm:pb-24">
          <Aurora />
          <GridField />

          <Container className="relative text-center">
            <Reveal>
              <span className="mx-auto inline-flex items-center gap-2.5 rounded-full border border-line-strong bg-white/[0.035] py-1.5 pr-4 pl-1.5 backdrop-blur-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ember-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.14em] text-ember-400">
                  <Users className="size-3" aria-hidden />
                  COHORT
                </span>
                <span className="text-[12.5px] text-mid">
                  7 days · You and everyone else who started this week
                </span>
              </span>
            </Reveal>

            <Reveal delay={0.06}>
              <h1 className="mx-auto mt-8 max-w-4xl text-[clamp(2.4rem,6.6vw,4.4rem)] leading-[1.02] font-semibold tracking-[-0.045em] text-gradient text-balance">
                Try the job before you interview for it.
              </h1>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="mx-auto mt-7 max-w-2xl text-[16.5px] leading-relaxed text-mid text-balance">
                Most people choose a career from a job description and find out
                what it actually involves eighteen months later. This is seven
                days of the real thing — the problems an operations manager
                handles on an ordinary morning, put in front of you while the
                decision is still yours to make.
              </p>
            </Reveal>

            <Reveal delay={0.18}>
              <p className="mx-auto mt-5 max-w-xl text-[14px] leading-relaxed text-lo text-balance">
                You run it alongside a cohort that started the same week. Six
                fifteen-minute simulations, one live session with someone who
                does this for a living, and an honest read on how you actually
                think under pressure.
              </p>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild variant="primary" size="lg" className="w-full sm:w-auto">
                  <Link href="/challenge/day-1">
                    Start Day 1
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
                  <Link href="/challenge/leaderboard">Leaderboard</Link>
                </Button>
              </div>
            </Reveal>

            <Reveal delay={0.3}>
              <p className="mt-5 font-mono text-[11px] tracking-[0.1em] text-faint uppercase">
                15 minutes a day · Free · One account, seven days
              </p>
            </Reveal>
          </Container>
        </section>

        <Horizon />

        {/* ── Section 1: the challenge itself ── */}
        <Section id="dark-store">
          <Container>
            <SectionHeading
              eyebrow="Challenge 01"
              title="The 7-Day Dark Store Manager Challenge"
              description="A dark store is the ten-minute delivery warehouse behind your grocery app. Somebody runs it. For seven days, that is you — and this is the board you run it from."
            />

            {/* First subsection: the live store, moved off the home page. */}
            <div className="mt-12">
              <HeroConsole />
            </div>

            <Reveal delay={0.1}>
              <p className="mx-auto mt-8 max-w-2xl text-center text-[13.5px] leading-relaxed text-mid">
                Every number on that board moves because of something you did.
                Click-to-dispatch is the one the store is judged on — under 180
                seconds, from the moment an order lands to the moment a rider
                leaves with it. Everything else is what makes that number
                possible.
              </p>
            </Reveal>

            <div className="mt-16">
              <SectionHeading
                eyebrow="Seven days"
                title="One shift at a time."
                description="Each day is a continuous simulation, not a quiz. Your decisions move the store's numbers, and the numbers are what you are assessed on."
              />
            </div>

            <ol className="mt-10 space-y-2.5">
              {DAYS.map((entry, index) => {
                const live = entry.state === "live";
                const body = (
                  <div
                    className={cn(
                      "flex items-start gap-4 rounded-card border p-5 transition-colors duration-200",
                      live
                        ? "border-ember-500/35 bg-elevated hover:border-ember-500/60"
                        : "border-line border-dashed bg-surface",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-9 shrink-0 place-items-center rounded-full border font-mono text-[13px] font-semibold tabular-nums",
                        live
                          ? "border-ember-500 bg-ember-500 text-void"
                          : "border-line-strong text-faint",
                      )}
                    >
                      {entry.day}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[16px] font-semibold text-hi">{entry.title}</h3>
                        {entry.state === "locked" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-line-strong px-2 py-0.5 font-mono text-[9.5px] tracking-[0.12em] text-lo uppercase">
                            <Lock className="size-2.5" aria-hidden />
                            Coming
                          </span>
                        ) : null}
                        {entry.state === "ama" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-flux-500/30 bg-flux-500/10 px-2 py-0.5 font-mono text-[9.5px] tracking-[0.12em] text-flux-400 uppercase">
                            <Mic className="size-2.5" aria-hidden />
                            Live AMA
                          </span>
                        ) : null}
                        {live ? (
                          <span className="rounded-full border border-ion-500/30 bg-ion-500/10 px-2 py-0.5 font-mono text-[9.5px] tracking-[0.12em] text-ion-400 uppercase">
                            Live now
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-[13.5px] leading-relaxed text-mid">
                        {entry.teaser}
                      </p>
                    </div>

                    {live ? (
                      <ArrowRight className="mt-1 size-4 shrink-0 text-ember-500" aria-hidden />
                    ) : null}
                  </div>
                );

                return (
                  <li key={entry.day}>
                    <Reveal delay={index * 0.04}>
                      {entry.href ? <Link href={entry.href}>{body}</Link> : body}
                    </Reveal>
                  </li>
                );
              })}
            </ol>

            <Reveal delay={0.3}>
              <p className="mt-8 text-[12.5px] leading-relaxed text-faint">
                Days 5–6 and the AMA are not built yet. Days 1 to 4 are complete
                and playable now — finishing them is how you find out whether
                the rest is worth your week.
              </p>
            </Reveal>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  );
}
