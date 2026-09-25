"use client";

import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Dna,
  GraduationCap,
  Headset,
  Timer,
  type LucideIcon,
} from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { OFFER, OFFER_ROUTE, inr } from "@/lib/constants/offer";
import { cn } from "@/lib/utils";

type Availability = "live" | "coming";

interface Offering {
  title: string;
  body: string;
  icon: LucideIcon;
  availability: Availability;
  accent: "ember" | "flux" | "ion";
}

/**
 * What the platform is, rather than what one mission contains.
 *
 * Two of these run today and three do not, and each says which. Marking the
 * difference costs nothing — nobody has ever refused to sign up because a
 * roadmap was labelled — and the alternative is a stranger arriving for a
 * mentor session that cannot be booked.
 */
const OFFERINGS: Offering[] = [
  {
    title: "30-minute live missions",
    body: "Run a real operation under a real clock. Absences, stockouts, angry customers and head office, arriving faster than anyone can clear them. No multiple choice — only what you get to first.",
    icon: Timer,
    availability: "live",
    accent: "ember",
  },
  {
    title: "The Operator Profile",
    body: "Ten capabilities, scored from what you actually did: every decision, how long you took, how deep the queue was behind it, and every message you sent. Not a questionnaire. Yours to put on a CV.",
    icon: Dna,
    availability: "live",
    accent: "flux",
  },
  {
    title: "1:1 mentor sessions",
    body: "Thirty-minute calls with people who run quick commerce, warehousing, supply chain and logistics for a living. Go through your shift, argue with the calls you made, ask what a bad morning really looks like.",
    icon: Headset,
    availability: "coming",
    accent: "ion",
  },
  {
    title: "Your genome in front of hiring managers",
    body: "Top operators will be able to opt in to have their genome shared with hiring partners for internships and roles. Opt-in, never automatic — your name and number stay yours until you say otherwise.",
    icon: BriefcaseBusiness,
    availability: "coming",
    accent: "ember",
  },
  {
    title: "Webinars and bootcamps",
    body: "Live sessions with operators from the industry, on the things nobody teaches: how a hub actually runs, what gets you promoted, and what the job is like at seven in the morning.",
    icon: GraduationCap,
    availability: "coming",
    accent: "flux",
  },
];

/** Card tones, in the order of OFFERINGS — the same rhythm as the landing page. */
const TONE = {
  ember: { card: "bg-ember-500 border-transparent", icon: "bg-[#0B0B0B] text-ember-500", body: "text-[#0B0B0B]/75" },
  flux: { card: "bg-white border-black/10", icon: "bg-ember-500 text-[#0B0B0B]", body: "text-[#3D3D3D]" },
  ion: { card: "bg-white border-black/10", icon: "bg-ember-500 text-[#0B0B0B]", body: "text-[#3D3D3D]" },
} as const;

function Availability({ state, onYellow }: { state: Availability; onYellow: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        state === "live"
          ? "bg-[#0B0B0B] text-white"
          : onYellow
            ? "border border-[#0B0B0B]/25 text-[#0B0B0B]/75"
            : "border border-black/15 text-[#6B6B6B]",
      )}
    >
      {state === "live" ? <span aria-hidden className="size-1.5 rounded-full bg-ember-500" /> : null}
      {state === "live" ? "Live now" : "Coming soon"}
    </span>
  );
}

export function Platform() {
  return (
    <section id="platform" className="scroll-mt-16 border-t border-black/[0.07] bg-white/60">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 lg:py-28">
        <Reveal>
          <p className="font-mono text-[10.5px] tracking-[0.24em] text-[#6B6B6B] uppercase">The platform</p>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-3 max-w-3xl text-[clamp(2rem,5.6vw,3.4rem)] leading-[1.02] font-bold tracking-[-0.045em] text-balance text-[#0B0B0B]">
            Everything here is about how you actually work.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-[#3D3D3D]">
            Not a course, not a test bank, and not a certificate mill. You run operations, the record is scored, and
            the people who do this for a living are on the other end of it.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {OFFERINGS.map((offering, index) => {
            const Icon = offering.icon;
            const tone = TONE[offering.accent];
            const coming = offering.availability === "coming";
            return (
              <Reveal key={offering.title} delay={index * 0.05}>
                <article
                  className={cn(
                    "flex h-full flex-col rounded-[22px] border p-6",
                    tone.card,
                    coming && offering.accent !== "ember" && "border-dashed border-black/20 bg-transparent",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={cn("grid size-11 place-items-center rounded-full", tone.icon)}>
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <Availability state={offering.availability} onYellow={offering.accent === "ember"} />
                  </div>
                  <h3 className="mt-5 text-[19px] leading-[1.15] font-bold tracking-[-0.02em] text-[#0B0B0B]">
                    {offering.title}
                  </h3>
                  <p className={cn("mt-2 text-[14.5px] leading-relaxed", tone.body)}>{offering.body}</p>
                </article>
              </Reveal>
            );
          })}

          {/* The sixth cell: the challenge that is on sale now. */}
          <Reveal delay={0.25}>
            <Link
              href={OFFER_ROUTE}
              className="group flex h-full flex-col justify-between rounded-[22px] bg-[#0B0B0B] p-6 text-white transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#0B0B0B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F0] focus-visible:outline-none"
            >
              <p className="font-mono text-[10.5px] tracking-[0.24em] text-ember-500 uppercase">
                Cohort · {OFFER.dateLabel}
              </p>
              <div className="mt-6">
                <h3 className="text-[24px] leading-[1.1] font-bold tracking-[-0.03em]">
                  The 7-Day Operations Leader Challenge
                </h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-white/70">
                  Five live dark-store simulations, your operator profile, and a live AMA.
                </p>
                <p className="mt-5 flex items-center gap-2 text-[15px] font-semibold text-ember-500">
                  <span className="text-white/50 line-through">{inr(OFFER.listPrice)}</span>
                  {inr(OFFER.price)} · Register
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </p>
              </div>
            </Link>
          </Reveal>
        </div>

        <Reveal delay={0.3}>
          <p className="mt-8 text-[12.5px] leading-relaxed text-[#6B6B6B]">
            Marked &ldquo;Coming soon&rdquo; means exactly that — not built, not bookable, not priced. Finish a shift
            and you can join the waitlist for all three.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
