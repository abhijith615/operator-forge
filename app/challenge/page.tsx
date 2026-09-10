import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Lock, Mic } from "lucide-react";

import { LandingNav } from "@/components/landing/landing-nav";
import { Footer } from "@/components/landing/footer";
import { Container, Section, SectionHeading } from "@/components/landing/section";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Horizon } from "@/components/visuals/aurora";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "7-Day Dark Store Operations Challenge",
  description:
    "Six 15-minute operations simulations and a live AMA with a Cluster Manager. Run a real dark store, one shift at a time.",
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
    title: "₹18,640 Has Disappeared",
    teaser: "System says the stock exists. The shelf says it doesn't. You find out why.",
    state: "locked",
  },
  {
    day: 3,
    title: "The Shift Nobody Wants",
    teaser: "Two absences, a new joiner and a delivery window that will not move.",
    state: "locked",
  },
  {
    day: 4,
    title: "Cold Chain",
    teaser: "A chiller fails at the worst possible hour, and nobody logged it.",
    state: "locked",
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
        <Section className="pt-32 sm:pt-40">
          <Container>
            <Reveal>
              <p className="font-mono text-[10.5px] tracking-[0.2em] text-ember-500 uppercase">
                Free · Starts when you do
              </p>
            </Reveal>
            <Reveal delay={0.06}>
              <h1 className="mt-4 max-w-3xl text-[clamp(2.2rem,6vw,3.6rem)] leading-[1.03] font-semibold tracking-[-0.04em] text-gradient text-balance">
                The 7-Day Dark Store Operations Challenge
              </h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-mid">
                Six days. Fifteen minutes each. You run a quick-commerce dark
                store through a real shift — allocating people, chasing
                bottlenecks, deciding what to let go of — and the store answers
                back. On day seven you put your questions to someone who does
                this for a living.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="primary" size="lg" className="w-full sm:w-auto">
                  <Link href="/challenge/day-1">
                    Start Day 1
                    <ArrowRight />
                  </Link>
                </Button>
                <span className="self-center font-mono text-[11px] tracking-[0.12em] text-faint uppercase">
                  15 minutes · No signup to play
                </span>
              </div>
            </Reveal>
          </Container>
        </Section>

        <Horizon />

        <Section id="days">
          <Container>
            <SectionHeading
              eyebrow="The seven days"
              title="One shift at a time."
              description="Each day is a continuous simulation, not a quiz. Your decisions move the store's numbers, and the numbers are what you are assessed on."
            />

            <ol className="mt-12 space-y-2.5">
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
                Days 2–6 and the AMA are not built yet. Day 1 is complete and
                playable now — finishing it is how you find out whether the rest
                is worth your week.
              </p>
            </Reveal>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  );
}
