"use client";

import {
  BriefcaseBusiness,
  Dna,
  GraduationCap,
  Headset,
  Timer,
  type LucideIcon,
} from "lucide-react";

import { Container, Section, SectionHeading } from "@/components/landing/section";
import { Reveal } from "@/components/motion/reveal";
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
    title: "The Operator Genome",
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

const ACCENT = {
  ember: "text-ember-500",
  flux: "text-flux-400",
  ion: "text-ion-400",
} as const;

function Availability({ state }: { state: Availability }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9.5px] tracking-[0.14em] uppercase",
        state === "live"
          ? "border-ion-500/30 bg-ion-500/[0.08] text-ion-400"
          : "border-line-strong bg-white/[0.04] text-lo",
      )}
    >
      {state === "live" ? "Live now" : "Coming"}
    </span>
  );
}

export function Platform() {
  return (
    <Section id="platform">
      <Container>
        <SectionHeading
          eyebrow="The platform"
          title="Everything here is about how you actually work."
          description="Not a course, not a test bank, and not a certificate mill. You run operations, the record is scored, and the people who do this for a living are on the other end of it."
        />

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {OFFERINGS.map((offering, index) => {
            const Icon = offering.icon;
            return (
              <Reveal key={offering.title} delay={index * 0.05}>
                <article
                  className={cn(
                    "panel sheen h-full p-6",
                    offering.availability === "coming" && "border-dashed",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={cn("mt-0.5 size-4 shrink-0", ACCENT[offering.accent])} />
                    <h3 className="text-[15px] leading-snug font-medium text-hi">
                      {offering.title}
                    </h3>
                    <span className="ml-auto">
                      <Availability state={offering.availability} />
                    </span>
                  </div>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-mid">
                    {offering.body}
                  </p>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.3}>
          <p className="mt-8 text-[12.5px] leading-relaxed text-faint">
            Marked &ldquo;Coming&rdquo; means exactly that — not built, not
            bookable, not priced. Finish a shift and you can join the waitlist
            for all three.
          </p>
        </Reveal>
      </Container>
    </Section>
  );
}
