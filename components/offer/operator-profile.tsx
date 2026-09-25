import { ArrowRight, BarChart3, Fingerprint, Star, TrendingUp } from "lucide-react";

import { RegisterButton } from "@/components/offer/offer-client";
import { OFFER, inr } from "@/lib/constants/offer";

/**
 * The Operator Profile, shown rather than described.
 *
 * The profile is the thing people actually leave with, and it is hard to
 * picture from a sentence — so the page shows the screen itself, with the
 * parts named beside it. Two crops are provided because the profile is a
 * two-column layout on a desktop and a stacked one on a phone; the browser
 * picks, and only downloads, the one it needs.
 *
 * The example is from the Day 2 inventory audit and is labelled as an
 * example: nobody's real results are published here.
 */

const PARTS = [
  {
    icon: BarChart3,
    title: "A score, and what it makes you",
    body: "A readiness score out of 100 and the operator signature behind it — in this run, a Methodical Investigator who follows the evidence before committing.",
  },
  {
    icon: Fingerprint,
    title: "Competencies, scored from your decisions",
    body: "Inventory reasoning, root-cause thinking, evidence discipline, prioritisation and loss-prevention judgement — each one read from what you actually did, not a questionnaire.",
  },
  {
    icon: Star,
    title: "Where you were strong, in your own moments",
    body: "The profile quotes your run back to you: the missing scan you kept chasing, the stock the system had given up on, the difference you held between presence and proof.",
  },
  {
    icon: TrendingUp,
    title: "One thing to work on next",
    body: "A single key area to develop, with the evidence for it — the sort of note a good manager would give you after the shift.",
  },
];

export function OperatorProfile() {
  return (
    <section aria-labelledby="operator-profile" className="bg-[#0B0B0B] text-white">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:py-20">
        <p className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.24em] text-ember-500 uppercase">
          <Fingerprint className="size-4" aria-hidden />
          Day 6 · Your Operator Profile
        </p>
        <h2
          id="operator-profile"
          className="mt-3 max-w-3xl text-[clamp(1.9rem,5vw,3.1rem)] leading-[1.03] font-bold tracking-[-0.045em] text-balance"
        >
          The part you keep: how you actually decide.
        </h2>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-white/70">
          Every decision you make in the simulations is recorded — what you chose, how long you took, and what was
          waiting behind it. On Day 6 that becomes a profile of how you work under pressure. This is a real screen
          from the product, not a mock-up.
        </p>

        <div className="mt-9 grid items-start gap-9 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
          <figure className="min-w-0">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-2.5 sm:p-3">
              {/*
                Art direction, not just resizing: the phone crop is the stacked
                layout, the wide crop the two-column one. <picture> lets the
                browser fetch exactly one of them.
              */}
              <picture>
                <source media="(min-width: 640px)" srcSet="/operator-profile-desktop.webp" width={1440} height={1080} />
                <img
                  src="/operator-profile-mobile.webp"
                  alt="An Operator Profile: a readiness score of 79 out of 100 titled Methodical Investigator, a decision signature, five scored competencies, three moments where the operator was strong, and one area to develop."
                  width={900}
                  height={1599}
                  loading="lazy"
                  decoding="async"
                  className="h-auto w-full rounded-[16px]"
                />
              </picture>
            </div>
            <figcaption className="mt-3 text-[12.5px] leading-relaxed text-white/50">
              An example profile from the Day 2 inventory audit. Yours is written from your own decisions, and is a
              practice assessment — not an employment certification.
            </figcaption>
          </figure>

          <div className="min-w-0">
            <ul className="divide-y divide-white/10 border-y border-white/10 sm:divide-y-0 sm:border-0 sm:space-y-3">
              {PARTS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="py-4 sm:rounded-[20px] sm:border sm:border-white/10 sm:bg-white/[0.03] sm:p-5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ember-500 text-[#0B0B0B] sm:size-9">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <h3 className="text-[15.5px] leading-tight font-bold tracking-[-0.02em] sm:text-[16px]">{title}</h3>
                  </div>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-white/70 sm:mt-2.5 sm:text-[14px]">{body}</p>
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <RegisterButton size="md">
                Register · {inr(OFFER.price)}
                <ArrowRight />
              </RegisterButton>
              <p className="text-[13px] text-white/60">Five simulations, then your profile on Day 6.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
