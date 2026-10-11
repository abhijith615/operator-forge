"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { COMPETENCIES, COMPETENCY_LABEL, assessmentWeights } from "@/lib/hiring/weights";

/**
 * The Hiring Test, on the homepage.
 *
 * The one section here that is not for the person doing the shift. It sits in
 * a black panel on the cream page so it reads as a different product for a
 * different reader, which it is. The bars are the real weights the profile is
 * built from — nothing on this panel is a made-up score.
 */
export function HiringSection() {
  return (
    <section id="hiring-test" aria-labelledby="hiring-test-heading" className="scroll-mt-16 border-t border-black/[0.07]">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 lg:py-28">
        <Reveal>
          <div className="grid gap-10 rounded-[28px] bg-[#0B0B0B] p-7 text-white sm:p-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14 lg:p-14">
            <div>
              <p className="font-mono text-[10.5px] tracking-[0.24em] text-ember-500 uppercase">For employers</p>
              <p className="mt-3 font-mono text-[12px] tracking-[0.2em] text-white/60 uppercase">Hiring Test</p>
              <h2
                id="hiring-test-heading"
                className="mt-3 text-[clamp(2rem,5.6vw,3.2rem)] leading-[1.02] font-bold tracking-[-0.045em] text-balance"
              >
                See How Candidates Actually Operate
              </h2>
              <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-white/70">
                Screen ASM and Store Manager candidates through a 30-minute dark-store work simulation. See how they
                build teams, control inventory, prioritise problems, solve bottlenecks and protect customer outcomes.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/hiring-test/assessment"
                  className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-ember-500 px-7 text-[13.5px] font-bold tracking-[0.08em] text-[#0B0B0B] uppercase transition-[filter] hover:brightness-105 focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0B] focus-visible:outline-none"
                >
                  Take hiring test
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
                <Link
                  href="/hiring-test/results/sample"
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-white/25 px-7 text-[13.5px] font-bold tracking-[0.08em] text-white uppercase transition-colors hover:border-white/50 hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0B] focus-visible:outline-none"
                >
                  View sample profile
                </Link>
              </div>
            </div>

            <div className="self-center">
              <p className="font-mono text-[10.5px] tracking-[0.24em] text-white/50 uppercase">What the profile weighs</p>
              <ul className="mt-5 space-y-4">
                {COMPETENCIES.map((id) => {
                  const weight = Math.round(assessmentWeights[id] * 100);
                  return (
                    <li key={id}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[15px] font-semibold">{COMPETENCY_LABEL[id]}</span>
                        <span className="font-mono text-[14px] font-semibold text-ember-500 tabular-nums">{weight}%</span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-ember-500" style={{ width: `${(weight / 30) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-5 text-[12.5px] leading-relaxed text-white/50">
                Scored from what the candidate does in the store, by fixed rules. Every number opens into the moments
                it came from.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
