import type { Metadata, Viewport } from "next";

import { AnchorLink } from "@/components/bootcamp/anchor-link";
import { BootcampHeader } from "@/components/bootcamp/bootcamp-header";
import { Icon, MentorCard, StatCard, Step, WeekCard } from "@/components/bootcamp/cards";
import { CTAButton } from "@/components/bootcamp/cta-button";
import { Faq } from "@/components/bootcamp/faq";
import { MissionStack } from "@/components/bootcamp/mission-stack";
import { PlaceholderWarning } from "@/components/bootcamp/placeholder-warning";
import { Reveal } from "@/components/bootcamp/reveal";
import { CONTAINER, HAIRLINE, Headline, MUTED, Section } from "@/components/bootcamp/section";
import { StickyMobileCTA } from "@/components/bootcamp/sticky-mobile-cta";
import { LightCanvas } from "@/components/offer/offer-client";
import { BOOTCAMP, MENTORS, unfilledPlaceholders } from "@/lib/constants/operator-bootcamp";
import { cn } from "@/lib/utils";

const PATH = "/operator-bootcamp";

export const metadata: Metadata = {
  title: { absolute: BOOTCAMP.meta.title },
  description: BOOTCAMP.meta.description,
  alternates: { canonical: PATH },
  openGraph: { title: BOOTCAMP.meta.title, description: BOOTCAMP.meta.description, url: PATH, type: "website", siteName: BOOTCAMP.brand.name },
  twitter: { card: "summary_large_image", title: BOOTCAMP.meta.title, description: BOOTCAMP.meta.description },
};

export const viewport: Viewport = { themeColor: "#FAFAF7", colorScheme: "light" };

/** FAQPage structured data. Answers still in [brackets] are left out until they are written. */
function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: BOOTCAMP.faq.items
      .filter((item) => !/\[[^\]]+\]/.test(item.a))
      .map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
  };
}

const title = (id: string) => `${id}-title`;

export default function OperatorBootcampPage() {
  const { hero, proof, problem, fit, curriculum, method, pathway, mentors, fee, admissions, faq, final, footer } = BOOTCAMP;

  return (
    <div className="min-h-dvh bg-[#FAFAF7] text-[#111111] antialiased">
      <LightCanvas />
      <PlaceholderWarning heading={BOOTCAMP.placeholderWarning} items={unfilledPlaceholders()} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }} />

      <BootcampHeader />

      <main id="main">
        {/* ── 4.1 Hero ─────────────────────────────────────────────────── */}
        <section id={hero.id} aria-labelledby={title(hero.id)} className="scroll-mt-16 pt-6 pb-16 md:pt-16 md:pb-24">
          <div className={cn(CONTAINER, "grid items-center gap-10 md:grid-cols-12 md:gap-8")}>
            <div className="md:col-span-7">
              <p className="inline-flex items-center gap-2 rounded-full border border-[#111111] px-3 py-1 text-[13px] font-semibold">
                <span aria-hidden className="size-2 rounded-full bg-ember-500 shadow-[0_0_0_3px_rgba(245,196,0,0.25)]" />
                {hero.eyebrow}
              </p>
              <p className="mt-6 hidden font-mono text-[12px] tracking-[0.18em] text-[#5C5C57] uppercase md:block">{hero.title}</p>
              <Headline id={title(hero.id)} as="h1" parts={hero.h1} className="mt-4 max-[439px]:min-h-[3lh] md:mt-3" />
              <p className={cn("mt-4 max-w-[34rem] text-[17px] leading-[1.55] md:mt-6 md:text-[19px]", MUTED)}>{hero.subhead}</p>

              {/* On phones the subhead and the button already say this; the space goes to the internship assurance. */}
              <ul className="mt-5 hidden gap-2 sm:flex sm:flex-wrap">
                {hero.chips.map((chip) => (
                  <li key={chip.label} className={cn("flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-[14px] font-medium", HAIRLINE)}>
                    <Icon name={chip.icon} className="size-4 shrink-0" />
                    {chip.label}
                  </li>
                ))}
              </ul>

              <p className="mt-5 flex max-w-[34rem] items-start gap-2 rounded-xl sm:mt-4 border border-ember-500 bg-ember-500/15 px-3 py-2 text-[14px] leading-snug text-[#111111]">
                <Icon name="assured" className="mt-px size-[18px] shrink-0" />
                <span>
                  <strong className="font-bold">{hero.assurance.strong}</strong> {hero.assurance.rest}
                </span>
              </p>

              <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
                <CTAButton label={hero.cta} location={hero.id} className="w-full sm:w-auto" />
                <AnchorLink
                  href={hero.secondary.href}
                  className="hidden rounded-md text-[15px] font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:outline-none sm:inline"
                >
                  {hero.secondary.label}
                </AnchorLink>
              </div>
              <p className="mt-3 text-[14px] leading-snug font-medium text-[#111111]">{hero.microcopy}</p>
              <AnchorLink
                href={hero.secondary.href}
                className="mt-3 inline-block rounded-md text-[15px] font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:outline-none sm:hidden"
              >
                {hero.secondary.label}
              </AnchorLink>
            </div>

            <div className="md:col-span-5">
              <MissionStack />
            </div>
          </div>
        </section>

        {/* ── 4.2 Proof strip ──────────────────────────────────────────── */}
        <section id={proof.id} aria-labelledby={title(proof.id)} className="pb-16 md:pb-24">
          <h2 id={title(proof.id)} className="sr-only">
            {proof.heading}
          </h2>
          <div className={CONTAINER}>
            <Reveal>
              {/* Scrolls sideways on phones, inside its own box, by design. */}
              <ul className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
                {proof.stats.map((stat) => (
                  <li key={stat.label} className={cn("shrink-0 md:shrink", "highlight" in stat && stat.highlight && "md:col-span-2")}>
                    <StatCard value={stat.value} label={stat.label} highlight={"highlight" in stat && stat.highlight} />
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ── 4.3 The problem ──────────────────────────────────────────── */}
        <Section id={problem.id} labelledBy={title(problem.id)} className={cn("border-t", HAIRLINE)}>
          <div className="grid gap-10 md:grid-cols-12 md:gap-8">
            <Reveal className="md:col-span-7">
              <Headline id={title(problem.id)} parts={problem.h2} />
              {problem.paragraphs.map((paragraph) => (
                <p key={paragraph} className={cn("mt-5 max-w-[36rem] text-[17px] leading-[1.6] md:text-[18px]", MUTED)}>
                  {paragraph}
                </p>
              ))}
            </Reveal>
            <Reveal className="md:col-span-5" delay={100}>
              <figure aria-label={problem.timelineLabel} className={cn("rounded-2xl border bg-white p-6", HAIRLINE)}>
                <figcaption className="font-mono text-[12px] tracking-[0.16em] text-[#5C5C57] uppercase">{problem.timelineLabel}</figcaption>
                <ol className="mt-5 grid gap-0">
                  {problem.timeline.map((entry, index) => (
                    <li key={entry.day} className="relative flex gap-4 pb-6 last:pb-0">
                      {index < problem.timeline.length - 1 ? <span aria-hidden className="absolute top-11 bottom-0 left-[21px] w-px bg-[#E6E4DD]" /> : null}
                      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#111111] text-[14px] font-bold text-white">{entry.day}</span>
                      <span className="pt-2.5 text-[18px] font-semibold tracking-[-0.015em]">{entry.task}</span>
                    </li>
                  ))}
                </ol>
              </figure>
            </Reveal>
          </div>
        </Section>

        {/* ── 4.4 Who it's for ─────────────────────────────────────────── */}
        <Section id={fit.id} labelledBy={title(fit.id)} className={cn("border-t", HAIRLINE)}>
          <Reveal>
            <Headline id={title(fit.id)} parts={fit.h2} className="max-w-3xl" />
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-12">
            <Reveal className="md:col-span-7">
              <div className="h-full rounded-2xl border border-[#111111] bg-white p-6 md:p-8">
                <h3 className="text-[20px] font-bold tracking-[-0.02em]">{fit.yesTitle}</h3>
                <ul className="mt-5 grid gap-4">
                  {fit.yes.map((item) => (
                    <li key={item} className="flex gap-3 text-[17px] leading-snug">
                      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-ember-500">
                        <Icon name="yes" className="size-3.5" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal className="md:col-span-5" delay={100}>
              <div className={cn("h-full rounded-2xl border bg-transparent p-6 md:p-8", HAIRLINE)}>
                <h3 className={cn("text-[20px] font-bold tracking-[-0.02em]", MUTED)}>{fit.noTitle}</h3>
                <ul className="mt-5 grid gap-4">
                  {fit.no.map((item) => (
                    <li key={item} className={cn("flex gap-3 text-[17px] leading-snug", MUTED)}>
                      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-[#C9C6BD]">
                        <Icon name="no" className="size-3.5" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
          <Reveal>
            <div className="mt-8 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[19px] font-semibold tracking-[-0.015em]">{fit.line}</p>
              <CTAButton label={fit.cta} location={fit.id} />
            </div>
          </Reveal>
        </Section>

        {/* ── 4.5 Curriculum ───────────────────────────────────────────── */}
        <Section id={curriculum.id} labelledBy={title(curriculum.id)} className={cn("border-t", HAIRLINE)}>
          <Reveal>
            <Headline id={title(curriculum.id)} parts={curriculum.h2} className="max-w-3xl" />
          </Reveal>
          {/* A vertical timeline on phones; a 3 × 2 grid from tablet up. */}
          <ol className="relative mt-10 grid gap-4 border-l border-[#E6E4DD] pl-5 md:grid-cols-2 md:border-l-0 md:pl-0 lg:grid-cols-3">
            {curriculum.weeks.map((week, index) => (
              <li key={week.week} className="relative">
                <span aria-hidden className="absolute top-8 -left-[25px] size-2.5 rounded-full bg-[#111111] md:hidden" />
                <Reveal delay={(index % 3) * 80} className="h-full">
                  <WeekCard week={week.week} weekLabel={curriculum.weekLabel} title={week.title} outcome={week.outcome} />
                </Reveal>
              </li>
            ))}
          </ol>
        </Section>

        {/* ── 4.6 How you'll learn ─────────────────────────────────────── */}
        <Section id={method.id} labelledBy={title(method.id)} className={cn("border-t", HAIRLINE)}>
          <Reveal>
            <Headline id={title(method.id)} parts={method.h2} />
          </Reveal>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {method.cards.map((card, index) => (
              <li key={card.title}>
                <Reveal delay={index * 70} className="h-full">
                  <div className={cn("h-full rounded-2xl border bg-white p-6", HAIRLINE)}>
                    <span className="grid size-11 place-items-center rounded-xl bg-[#111111] text-ember-500">
                      <Icon name={card.icon} className="size-5" />
                    </span>
                    <h3 className="mt-5 text-[19px] font-bold tracking-[-0.02em]">{card.title}</h3>
                    <p className={cn("mt-2 text-[16px] leading-relaxed", MUTED)}>{card.body}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
          <p className="mt-8 inline-flex rounded-full border border-[#111111] px-4 py-2 text-[15px] font-semibold">{method.weekLine}</p>
        </Section>

        {/* ── 4.7 Pathway ──────────────────────────────────────────────── */}
        <Section id={pathway.id} labelledBy={title(pathway.id)} className={cn("border-t", HAIRLINE)}>
          <Reveal>
            <Headline id={title(pathway.id)} parts={pathway.h2} />
          </Reveal>
          <div className="relative mt-12">
          {/* The connecting line: down the side on phones, across the top from tablet up. */}
          <span aria-hidden className="absolute top-6 bottom-6 left-6 w-px bg-[#111111] md:top-6 md:right-[calc(33.333%_-_2.8rem)] md:bottom-auto md:left-6 md:h-px md:w-auto" />
          <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
            {pathway.steps.map((step, index) => (
              <li key={step.number} className="relative pl-16 md:pl-0">
                <Reveal delay={index * 100}>
                  <div className="absolute top-0 left-0 md:static">
                    <span className="inline-grid size-12 place-items-center rounded-full bg-ember-500 font-mono text-[15px] font-semibold text-[#111111] ring-8 ring-[#FAFAF7]">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="text-[22px] leading-tight font-bold tracking-[-0.02em] md:mt-5">{step.title}</h3>
                  <p className={cn("mt-2 max-w-[22rem] text-[16px] leading-relaxed", MUTED)}>{step.body}</p>
                </Reveal>
              </li>
            ))}
          </ol>
          </div>
          <Reveal>
            <p className="mt-14 max-w-4xl text-[clamp(1.5rem,3.2vw,2.3rem)] leading-[1.2] font-bold tracking-[-0.035em]">{pathway.line}</p>
            <p className={cn("mt-4 text-[14px]", MUTED)}>{pathway.smallPrint}</p>
          </Reveal>
        </Section>

        {/* ── 4.8 Mentors and AMA speakers ─────────────────────────────── */}
        <Section id={mentors.id} labelledBy={title(mentors.id)} className={cn("border-t", HAIRLINE)}>
          <Reveal>
            <Headline id={title(mentors.id)} parts={mentors.h2} />
          </Reveal>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MENTORS.map((mentor) => (
              <li key={`${mentor.name}-${mentor.role}`}>
                <Reveal className="h-full">
                  <MentorCard mentor={mentor} />
                </Reveal>
              </li>
            ))}
          </ul>
          <Reveal>
            <div className={cn("mt-6 rounded-2xl border bg-white p-6 md:p-8", HAIRLINE)}>
              <div className="grid gap-6 md:grid-cols-12 md:items-center">
                <div className="md:col-span-5">
                  <h3 className="text-[22px] font-bold tracking-[-0.02em]">{mentors.amaTitle}</h3>
                  <p className={cn("mt-2 text-[16px] leading-relaxed", MUTED)}>{mentors.amaBody}</p>
                </div>
                <ul className="grid grid-cols-3 gap-3 md:col-span-7 md:grid-cols-6">
                  {Array.from({ length: mentors.amaSlots }, (_, index) => (
                    <li key={index} className="flex flex-col items-center gap-2 text-center">
                      <span aria-hidden className="size-14 rounded-full border border-dashed border-[#C9C6BD] bg-[#F3F1EA]" />
                      <span className="text-[12px] font-medium text-[#6E6E68]">{mentors.amaSlotLabel}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </Section>

        {/* ── 4.9 Fee (the one dark section) ───────────────────────────── */}
        <Section id={fee.id} labelledBy={title(fee.id)} dark>
          <div className="grid gap-10 md:grid-cols-12 md:items-center md:gap-8">
            <Reveal className="md:col-span-6">
              <Headline id={title(fee.id)} parts={fee.h2} dark />
              <p className="mt-6 text-[19px] font-semibold text-white/90">{fee.line}</p>
            </Reveal>
            <Reveal className="md:col-span-6" delay={100}>
              <div className="rounded-[24px] border border-white/15 bg-white/[0.04] p-6 md:p-8">
                <dl>
                  {fee.rows.map((row, index) => (
                    <div key={row.label} className={cn("flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4", index > 0 && "border-t border-white/10")}>
                      <dt className="text-[16px] text-white/80">{row.label}</dt>
                      <dd className={cn("font-bold tracking-[-0.04em] tabular-nums", index === 0 ? "text-[44px] text-ember-500 md:text-[52px]" : "text-[36px] text-white md:text-[44px]")}>
                        {row.amount}
                      </dd>
                    </div>
                  ))}
                  <div className="mt-2 flex items-baseline justify-between border-t border-white/30 pt-4">
                    <dt className="text-[15px] text-white/70">{fee.totalLabel}</dt>
                    <dd className="text-[20px] font-semibold text-white/85 tabular-nums">{fee.total}</dd>
                  </div>
                  <div className="mt-5 flex items-start gap-3 rounded-2xl border border-ember-500/60 bg-ember-500/10 p-4">
                    <Icon name="assured" className="mt-0.5 size-5 shrink-0 text-ember-500" />
                    <div>
                      <dt className="text-[13px] font-semibold tracking-[0.08em] text-ember-500 uppercase">{fee.included.label}</dt>
                      <dd className="mt-1 text-[16px] leading-snug font-semibold text-white">{fee.included.value}</dd>
                    </div>
                  </div>
                </dl>
                <CTAButton label={fee.cta} location={fee.id} variant="onDark" className="mt-7 w-full" />
                <p className="mt-4 text-[13px] leading-snug text-white/65">{fee.smallPrint}</p>
              </div>
            </Reveal>
          </div>
        </Section>

        {/* ── 4.10 Admissions ──────────────────────────────────────────── */}
        <Section id={admissions.id} labelledBy={title(admissions.id)}>
          <Reveal>
            <Headline id={title(admissions.id)} parts={admissions.h2} className="max-w-3xl" />
          </Reveal>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {admissions.steps.map((step, index) => (
              <li key={step.number}>
                <Reveal delay={index * 90}>
                  <Step number={step.number} title={step.title} body={step.body} />
                </Reveal>
              </li>
            ))}
          </ol>
          <Reveal>
            <div className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <CTAButton label={admissions.cta} location={admissions.id} />
              <p className={cn("rounded-full border bg-white px-4 py-2 text-[15px] font-semibold", HAIRLINE)}>{admissions.deadline}</p>
            </div>
          </Reveal>
        </Section>

        {/* ── 4.11 FAQ ─────────────────────────────────────────────────── */}
        <Section id={faq.id} labelledBy={title(faq.id)} className={cn("border-t", HAIRLINE)}>
          <div className="grid gap-10 md:grid-cols-12">
            <Reveal className="md:col-span-4">
              <Headline id={title(faq.id)} parts={faq.h2} />
            </Reveal>
            <div className="md:col-span-8">
              <Faq items={faq.items} />
            </div>
          </div>
        </Section>

        {/* ── 4.12 Final CTA ───────────────────────────────────────────── */}
        <Section id={final.id} labelledBy={title(final.id)} className={cn("border-t text-center", HAIRLINE)}>
          <Reveal>
            <Headline id={title(final.id)} parts={final.h2} className="mx-auto max-w-4xl" />
            <p className={cn("mt-6 text-[18px] font-medium", MUTED)}>{final.sub}</p>
            <CTAButton label={final.cta} location={final.id} className="mt-8 w-full sm:w-auto" />
            <p className={cn("mt-4 text-[14px]", MUTED)}>{final.microcopy}</p>
          </Reveal>
        </Section>
      </main>

      {/* ── 4.13 Footer ────────────────────────────────────────────────── */}
      <footer className={cn("border-t pt-12 pb-28 md:pb-12", HAIRLINE)}>
        <div className={cn(CONTAINER, "grid gap-6 md:grid-cols-12")}>
          <div className="md:col-span-5">
            <p className="text-[20px] font-bold tracking-[-0.02em]">{footer.name}</p>
            <p className={cn("mt-1 text-[15px]", MUTED)}>{footer.tagline}</p>
          </div>
          <div className="md:col-span-7">
            <p className="text-[13px] leading-relaxed text-[#6E6E68]">{footer.disclaimer}</p>
            <p className="mt-3 text-[13px] text-[#6E6E68]">{footer.copyright}</p>
          </div>
        </div>
      </footer>

      <StickyMobileCTA heroId={hero.id} />
    </div>
  );
}
