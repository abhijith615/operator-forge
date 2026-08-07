import { Quote } from "lucide-react";

import { Container, Section } from "@/components/landing/section";
import { Marquee } from "@/components/motion/marquee";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";

/**
 * Placeholder copy until the first cohort finishes. Attribution is by role and
 * cohort only, and the section carries a visible placeholder badge so nothing
 * here can be mistaken for a verified account.
 */
const QUOTES = [
  {
    quote:
      "Twenty minutes in I stopped thinking about being scored. I was just trying to get the rain orders out.",
    role: "Assistant Store Manager",
    cohort: "Cohort 01",
  },
  {
    quote:
      "It let me be wrong. Then it showed me exactly where the wrongness started.",
    role: "Operations Trainee",
    cohort: "Cohort 01",
  },
  {
    quote:
      "The inventory lead pushed back on me. I did not expect to have to persuade anyone.",
    role: "Graduate Operator",
    cohort: "Cohort 01",
  },
  {
    quote:
      "I have done six case studies. This is the first one where I felt the consequence.",
    role: "Supply Chain Analyst",
    cohort: "Cohort 01",
  },
  {
    quote:
      "The debrief did not tell me my grade. It told me what I do under pressure.",
    role: "Assistant Store Manager",
    cohort: "Cohort 01",
  },
] as const;

function QuoteCard({ item }: { item: (typeof QUOTES)[number] }) {
  return (
    <figure className="panel sheen mx-3 flex w-[21rem] shrink-0 flex-col justify-between p-6 sm:w-[24rem]">
      <Quote className="size-4 text-ember-500/60" />
      <blockquote className="mt-4 text-[15px] leading-relaxed text-hi text-balance">
        {item.quote}
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-2.5 border-t border-line pt-4">
        <span className="size-1.5 rounded-full bg-ember-500/60" />
        <span className="text-[12.5px] text-mid">{item.role}</span>
        <span className="ml-auto font-mono text-[10.5px] tracking-[0.12em] text-faint uppercase">
          {item.cohort}
        </span>
      </figcaption>
    </figure>
  );
}

export function Testimonials() {
  return (
    <Section className="py-20 sm:py-28">
      <Container className="mb-12">
        <Reveal className="flex flex-wrap items-center justify-center gap-3 text-center">
          <h2 className="text-[15px] font-medium tracking-[-0.01em] text-mid">
            Word from the floor
          </h2>
          <Badge tone="neutral">Placeholder copy</Badge>
        </Reveal>
      </Container>

      <Reveal>
        <Marquee speed={52} className="py-2">
          {QUOTES.map((item) => (
            <QuoteCard key={item.quote} item={item} />
          ))}
        </Marquee>
      </Reveal>
    </Section>
  );
}
