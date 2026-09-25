import type { Metadata, Viewport } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BarChart3,
  Box,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Cog,
  CreditCard,
  FileSearch,
  Fingerprint,
  Laptop,
  MessagesSquare,
  Mic,
  PackageCheck,
  ShieldCheck,
  Smartphone,
  Store,
  UsersRound,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { FounderNote } from "@/components/offer/founder-note";
import { MetaPixelEvent } from "@/components/offer/meta-pixel";
import { OperatorProfile } from "@/components/offer/operator-profile";
import { ProductProof } from "@/components/offer/product-proof";
import { Testimonials } from "@/components/offer/testimonials";
import {
  CohortBadge,
  FloatingWhatsApp,
  LightCanvas,
  RegisterButton,
  RegistrationForm,
  StickyRegisterBar,
  WhatsAppButton,
} from "@/components/offer/offer-client";
import { LEGAL_LINKS, TERMS_ROUTE } from "@/lib/constants/legal";
import { OFFER, OFFER_DAYS, OFFER_ROUTE, inr, mailtoUrl } from "@/lib/constants/offer";
import { hand } from "@/lib/fonts";
import { cn } from "@/lib/utils";

/**
 * The paid-challenge landing page, where Meta ads and the homepage hero send
 * people.
 *
 * It deliberately matches the campaign creative rather than the product's dark
 * interface — cream, black and the brand yellow — so the page someone lands on
 * looks like the ad they tapped. Everything factual comes from
 * `lib/constants/offer.ts`; there are no invented numbers, testimonials or
 * countdowns to a deadline that does not exist.
 *
 * Read on a phone, from a cold ad click, so each section earns its place:
 * what it is, proof it is real, what you leave with, who teaches it, who
 * built it, and the answers to the questions that stop people buying.
 */

const DESCRIPTION = `Run realistic Q-Commerce scenarios, make operational decisions and discover how you perform. Five live simulations, a personalised Operator Profile and a live industry AMA — ${OFFER.dateLabel}. ${inr(OFFER.price)}.`;

export const metadata: Metadata = {
  title: `${OFFER.name} · ${OFFER.dateLabel}`,
  description: DESCRIPTION,
  alternates: { canonical: OFFER_ROUTE },
  openGraph: {
    title: "Experience an Operations Job Before Your First Interview",
    description: DESCRIPTION,
    url: OFFER_ROUTE,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Experience an Operations Job Before Your First Interview",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF7F0",
  colorScheme: "light",
};

/* ── Content ──────────────────────────────────────────────────────────── */

/** The hero's proof points. `lead` is the one we want read first. */
const PROOF_POINTS: { icon: LucideIcon; label: string; lead?: boolean }[] = [
  { icon: Box, label: "5 simulations" },
  { icon: Fingerprint, label: "Personalised Operator Profile", lead: true },
  { icon: Mic, label: "Live Industry AMA" },
];

/** The reassurances that used to be scattered through the page, said once. */
const TRUST: { icon: LucideIcon; label: string }[] = [
  { icon: CreditCard, label: "Secure payment via Razorpay — UPI, cards, netbanking" },
  { icon: Laptop, label: "100% online" },
  { icon: Smartphone, label: "Works on a phone" },
  { icon: Award, label: "Certificate of completion" },
];

/**
 * What you leave with, beyond the profile — which has a section of its own
 * further up the page and is not repeated here.
 */
const BENEFITS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Store,
    title: "Real operations experience",
    body: "Five live dark-store simulations. Absences, stockouts, angry customers and a clock that does not wait.",
  },
  {
    icon: Mic,
    title: "Live industry AMA",
    body: `An hour with the ${OFFER.speaker.role}. Ask what the job is really like.`,
  },
  {
    icon: Award,
    title: "Certificate of completion",
    body: "Finish the five simulations and the AMA, and download a certificate with a verification link for LinkedIn.",
  },
];

const DAY_ICON: LucideIcon[] = [Store, FileSearch, UsersRound, Cog, PackageCheck, BarChart3, MessagesSquare];

type Tone = "yellow" | "cream" | "black";
const DAY_TONE: Tone[] = ["yellow", "cream", "black", "cream", "black", "cream", "yellow"];

const TONE: Record<Tone, { card: string; body: string; meta: string }> = {
  yellow: { card: "bg-ember-500 text-[#0B0B0B]", body: "text-[#0B0B0B]/75", meta: "text-[#0B0B0B]/60" },
  cream: { card: "bg-[#F1ECE1] text-[#0B0B0B]", body: "text-[#3D3D3D]", meta: "text-[#6B6B6B]" },
  black: { card: "bg-[#0B0B0B] text-white", body: "text-white/70", meta: "text-white/55" },
};

/** The practical facts that used to need a "How it works" section. */
const SCHEDULE_FACTS = [
  "About 15 minutes a day",
  "Days 1–5 live simulations",
  "Day 6 Operator Profile",
  "Day 7 live AMA",
];

const INCLUDED = [
  "Five live operations simulations — Days 1 to 5",
  "A scorecard after every day, built from what you actually decided",
  "Your personalised Operator Profile and key strengths — Day 6",
  `Live AMA with the ${OFFER.speaker.role} — Day 7`,
  "A cohort that starts the same week as you",
  "A certificate of completion from Operator Forge",
];

const FOR_WHO = [
  "Students and fresh graduates curious about operations roles",
  "Anyone weighing a career in quick commerce, supply chain or logistics",
  "People who would rather try the job before they interview for it",
];

const AMA_POINTS: { icon: LucideIcon; label: string }[] = [
  { icon: Zap, label: "Practical insights" },
  { icon: BarChart3, label: "Real experiences" },
  { icon: UsersRound, label: "Real conversations" },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is Q-Com?",
    a: "Quick commerce — groceries and daily essentials delivered in minutes from small neighbourhood warehouses called dark stores. Someone runs each of those stores. For seven days, that is you.",
  },
  {
    q: "Do I need operations experience?",
    a: "No. Every day opens with a short brief that tells you where you are and what is at stake. The challenge is built for people who want to find out whether operations suits them.",
  },
  {
    q: "How much time does it take?",
    a: "About 15 minutes a day for Days 1 to 5, time with your Operator Profile on Day 6, and the live AMA on Day 7.",
  },
  {
    q: "What do I need?",
    a: "A phone or a laptop and a stable internet connection. The simulations run in your browser — there is nothing to install.",
  },
  {
    q: "What is the Operator Profile?",
    a: "A read of how you work, built from what you actually did in the simulations — every decision, how long you took, and how deep the queue was behind it. It names your strengths, the habits you repeat and where you lose time. It is a practice assessment, not an employment certification, and it is yours to keep.",
  },
  {
    q: "Will I get a certificate?",
    a: "Yes. Complete all five simulations (Days 1 to 5) and attend the live AMA on Day 7, and your certificate of completion unlocks in your account — with your name, the challenge dates and a verification link — ready to download and add to LinkedIn. It shows you completed the programme; your scorecards and Operator Profile are a practice assessment, not an employment certification.",
  },
  {
    q: "How do I register and pay?",
    a: `Enter your name, phone and email in the registration form, and you go straight to a secure Razorpay payment page — UPI, cards or netbanking. The offer price is ${inr(OFFER.price)} for all seven days.`,
  },
  {
    q: "Can I get a refund?",
    a: `${OFFER.refundNote} ${OFFER.refundDetail} Reach us on WhatsApp at ${OFFER.whatsapp.display} or by email at ${OFFER.email}.`,
  },
];

/** A low city skyline for the footer, generated once and deterministically. */
function skyline(): { x: number; w: number; h: number }[] {
  const buildings: { x: number; w: number; h: number }[] = [];
  let x = 0;
  let seed = 7;
  while (x < 1200) {
    seed = (seed * 9301 + 49297) % 233280;
    const r = seed / 233280;
    const w = 16 + Math.round(r * 30);
    const h = 16 + Math.round(((seed * 13) % 97) / 97 * 88);
    buildings.push({ x, w, h });
    x += w + 3;
  }
  return buildings;
}

const SKYLINE = skyline();

/** Seats and refunds, said the same way wherever the price appears. */
function OfferNotes({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#8A5A00]/25 bg-[#FFF4CC] px-2.5 py-1 text-[12px] font-semibold text-[#8A5A00]">
        <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-[#D97706]" />
        {OFFER.seatsNote}
      </span>
      <p className="flex items-start gap-1.5 text-[13px] leading-relaxed font-medium text-[#0B0B0B]">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#128C7E]" aria-hidden />
        <span>
          {OFFER.refundNote}{" "}
          <Link href={`${TERMS_ROUTE}#refunds`} className="font-semibold underline underline-offset-4">
            Refund policy
          </Link>
        </span>
      </p>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function SevenDayChallengePage() {
  return (
    <div className="min-h-dvh bg-[#FAF7F0] text-[#0B0B0B] antialiased">
      <LightCanvas />
      <MetaPixelEvent
        event="ViewContent"
        params={{ content_name: OFFER.name, value: OFFER.price, currency: OFFER.currency }}
      />

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-[#FAF7F0]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5 sm:px-6">
          <Link
            href="/"
            aria-label="Operator Forge home"
            className="flex items-center gap-2.5 rounded-xl focus-visible:ring-2 focus-visible:ring-[#0B0B0B] focus-visible:outline-none"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-[#0B0B0B]">
              <LogoMark className="size-7" />
            </span>
            <span className="text-[17px] font-semibold tracking-[-0.02em]">Operator Forge</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <WhatsAppButton compact />
            <RegisterButton size="sm" className="hidden sm:inline-flex">
              Register · {inr(OFFER.price)}
            </RegisterButton>
          </div>
        </div>
      </header>

      <main id="main">
        {/* ── 1. Hero, with the form ── */}
        <section className="overflow-x-clip">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 pt-8 pb-12 sm:px-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:gap-12 lg:pt-12 lg:pb-16">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#0B0B0B] px-3 py-1.5 text-[12.5px] font-medium text-white">
                  <CalendarDays className="size-3.5 text-ember-500" aria-hidden />
                  {OFFER.dateLabel}
                </span>
                <CohortBadge />
              </div>

              <h1 className="mt-6 text-[clamp(2.1rem,7.4vw,4.3rem)] leading-[1] font-bold tracking-[-0.05em] text-balance">
                <span className="block">Experience an Operations Job</span>
                <span className="relative mt-1 inline-block">
                  <span
                    aria-hidden
                    className="absolute -inset-x-[0.06em] top-[0.28em] bottom-[0.02em] -skew-y-1 rounded-[0.1em] bg-ember-500"
                  />
                  <span className="relative">Before Your First Interview.</span>
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-[#3D3D3D] sm:text-[18px]">
                Run realistic Q-Commerce scenarios, make operational decisions, and discover how you perform.
              </p>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[#0B0B0B]">
                Walk into interviews with real scenarios you&rsquo;ve handled, a profile of how you decide, and a
                certificate you can show.
              </p>

              {/* The three things you leave with, in the order they matter. */}
              <ul className="mt-6 flex flex-wrap items-center gap-2.5">
                {PROOF_POINTS.map(({ icon: Icon, label, lead }) => (
                  <li
                    key={label}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13.5px] font-semibold",
                      lead
                        ? "bg-[#0B0B0B] text-white shadow-[0_10px_26px_-16px_rgba(0,0,0,0.9)]"
                        : "border border-black/12 bg-white text-[#0B0B0B]",
                    )}
                  >
                    <Icon className={cn("size-[18px]", lead ? "text-ember-500" : "text-[#6B6B6B]")} aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>

              {/* The one tagline, where the decorative panel cannot go. */}
              <p className={cn(hand.className, "mt-5 -rotate-1 text-[22px] leading-tight lg:hidden")}>
                Same degree. A bigger you.
              </p>

              {/* Above the fold on a phone: price and the way in. */}
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
                <RegisterButton>
                  Register now · {inr(OFFER.price)}
                  <ArrowRight />
                </RegisterButton>
                <p className="text-[13.5px] text-[#3D3D3D]">
                  <span className="text-[#6B6B6B] line-through">{inr(OFFER.listPrice)}</span>{" "}
                  <strong className="font-bold text-[#0B0B0B]">{inr(OFFER.price)}</strong> · {OFFER.priceLabel}
                </p>
              </div>

              {/* The offer */}
              <div
                id="register"
                className="mt-8 scroll-mt-24 rounded-[24px] border border-black/10 bg-white p-5 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.35)] sm:p-6"
              >
                <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                  <p className="flex items-baseline gap-3">
                    <span className="sr-only">Regular price</span>
                    <span className="text-[18px] text-[#6B6B6B] line-through">{inr(OFFER.listPrice)}</span>
                    <span className="sr-only">Offer price</span>
                    <span className="text-[52px] leading-none font-bold tracking-[-0.04em]">{inr(OFFER.price)}</span>
                  </p>
                  <span className="mb-1.5 rounded-full bg-ember-500 px-2.5 py-1 text-[12px] font-semibold">
                    {OFFER.priceLabel}
                  </span>
                </div>
                <p className="mt-2 text-[13px] text-[#6B6B6B]">All seven days included · {OFFER.dateLabel}</p>
                <OfferNotes className="mt-3" />

                <div className="mt-5 border-t border-black/10 pt-5">
                  <h2 className="text-[17px] font-bold tracking-[-0.02em]">Reserve your seat</h2>
                  <div className="mt-3.5">
                    <RegistrationForm />
                  </div>
                </div>
                <WhatsAppButton className="mt-3 w-full" />

                <p className="mt-4 flex items-center gap-1.5 text-[12px] text-[#6B6B6B]">
                  <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
                  Secure payment via Razorpay — UPI, cards and netbanking
                </p>
              </div>
            </div>

            {/* The operator panel */}
            <aside
              aria-label="What the challenge builds"
              className="relative hidden min-h-[320px] flex-col justify-end overflow-hidden rounded-[28px] bg-[#0B0B0B] p-7 text-white lg:sticky lg:top-24 lg:flex lg:min-h-[520px] lg:self-start"
            >
              <span
                aria-hidden
                className="absolute -top-20 -right-24 h-72 w-80 rotate-[18deg] rounded-[40px] bg-ember-500"
              />
              <p
                className={cn(
                  hand.className,
                  "absolute top-8 right-6 max-w-[11rem] -rotate-6 text-right text-[26px] leading-[1.1] text-[#0B0B0B]",
                )}
              >
                Same degree.
                <br />
                A bigger you.
              </p>
              <p className="relative mt-24 text-[clamp(1.4rem,3vw,1.9rem)] leading-[1.15] font-bold tracking-[-0.03em]">
                Seven days of the calls an operations manager makes before lunch.
              </p>
              <p className="relative mt-4 border-t border-white/15 pt-4 text-[13.5px] leading-relaxed text-white/65">
                You decide. The store answers. Nothing resets while you think.
              </p>
            </aside>
          </div>
        </section>

        {/* ── 2. Trust strip, and where the simulations come from ── */}
        <section aria-label="What is included and where the simulations come from" className="border-y border-black/[0.07] bg-white/60">
          <div className="mx-auto max-w-6xl px-5 py-7 sm:px-6">
            <ul className="flex flex-wrap gap-x-6 gap-y-2.5">
              {TRUST.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-[13px] font-medium text-[#3D3D3D]">
                  <Icon className="size-4 shrink-0 text-[#0B0B0B]" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-3 border-t border-black/[0.07] pt-6 lg:flex-row lg:items-center">
              <p className="font-mono text-[10.5px] tracking-[0.24em] text-[#6B6B6B] uppercase">
                Inspired by real operations in
              </p>
              <ul className="flex flex-wrap gap-2">
                {["Zepto", "Instamart", "Blinkit"].map((name) => (
                  <li
                    key={name}
                    className="rounded-full border border-black/10 bg-white px-4 py-1.5 text-[14px] font-semibold text-[#0B0B0B]"
                  >
                    {name}
                  </li>
                ))}
              </ul>
              <p className={cn(hand.className, "-rotate-2 text-[22px] leading-tight lg:ml-auto")}>
                Different brands. Same real-world challenges.
              </p>
            </div>

            {/* Said once, for the brand names and the speaker together. */}
            <p className="mt-4 text-[11px] leading-relaxed text-[#6B6B6B]">
              Operator Forge is independent: not affiliated with, endorsed by, or in partnership with the companies
              named here. The simulations are modelled on the kind of operations they run, and the Day 7 speaker
              joins in a personal capacity, sharing their own views.
            </p>
          </div>
        </section>

        {/* ── 3. The product, on video ── */}
        <ProductProof />

        {/* ── 4. The Operator Profile, shown ── */}
        <OperatorProfile />

        {/* ── 5. What people who ran it said (renders only with real data) ── */}
        <Testimonials />

        {/* ── 6. The seven days ── */}
        <section id="days" className="mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:py-20">
          <p className="font-mono text-[10.5px] tracking-[0.24em] text-[#6B6B6B] uppercase">
            The 7 days · {OFFER.dateLabel}
          </p>
          <h2 className="mt-3 max-w-3xl text-[clamp(2rem,5.6vw,3.4rem)] leading-[1.02] font-bold tracking-[-0.045em]">
            7 Days. 5 Simulations. 1 Operator Profile. 1 Live AMA.
          </h2>
          <ul className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[14.5px] text-[#3D3D3D]">
            {SCHEDULE_FACTS.map((fact, index) => (
              <li key={fact} className="flex items-center gap-2">
                {index > 0 ? (
                  <span aria-hidden className="text-[#C9C2B4]">
                    ·
                  </span>
                ) : null}
                {fact}
              </li>
            ))}
          </ul>

          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {OFFER_DAYS.map((entry, index) => {
              const Icon = DAY_ICON[index] ?? Store;
              const tone = TONE[DAY_TONE[index] ?? "cream"];
              return (
                <article key={entry.day} className={cn("flex flex-col rounded-[22px] p-5", tone.card)}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[15px] font-bold">Day {entry.day}</p>
                    <p className={cn("font-mono text-[11px]", tone.meta)}>{entry.date}</p>
                  </div>
                  <Icon className="mt-5 hidden size-10 sm:block" strokeWidth={1.6} aria-hidden />
                  <h3 className="mt-4 text-[19px] leading-[1.15] font-bold tracking-[-0.02em]">{entry.title}</h3>
                  <p className={cn("mt-2 text-[14px] leading-relaxed", tone.body)}>{entry.body}</p>
                </article>
              );
            })}
            <div className="hidden items-center justify-center rounded-[22px] border-2 border-dashed border-black/15 p-6 sm:flex">
              <RegisterButton size="md">
                Register · {inr(OFFER.price)}
                <ArrowRight />
              </RegisterButton>
            </div>
          </div>
        </section>

        {/* ── 7. What you leave with, including the certificate ── */}
        <section aria-labelledby="benefits" className="border-t border-black/[0.07] bg-white/60">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:py-20">
            <h2
              id="benefits"
              className="max-w-2xl text-[clamp(1.7rem,4.4vw,2.6rem)] leading-[1.05] font-bold tracking-[-0.04em]"
            >
              What you leave with
            </h2>
            <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-[#3D3D3D]">
              Your Operator Profile, and the rest of what the week leaves you with — enough to answer &ldquo;tell me
              about a time you handled pressure&rdquo; with something you actually did.
            </p>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {BENEFITS.map(({ icon: Icon, title, body }) => (
                <article key={title} className="flex flex-col rounded-[22px] border border-black/10 bg-white p-6">
                  <span className="grid size-11 place-items-center rounded-full bg-[#F1ECE1] text-[#0B0B0B]">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-[19px] leading-[1.15] font-bold tracking-[-0.02em]">{title}</h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-[#3D3D3D]">{body}</p>
                </article>
              ))}
            </div>

            {/* Everything included, beside the certificate it ends with. */}
            <div className="mt-3 grid items-center gap-8 rounded-[28px] bg-[#0B0B0B] p-6 text-white sm:p-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-12">
              <div>
                <p className="font-mono text-[10.5px] tracking-[0.24em] text-ember-500 uppercase">
                  Everything included · {inr(OFFER.price)}
                </p>
                <ul className="mt-5 space-y-3">
                  {INCLUDED.map((line) => (
                    <li key={line} className="flex items-start gap-3 text-[15px] leading-relaxed text-white/85">
                      <Check className="mt-1 size-4 shrink-0 text-ember-500" strokeWidth={2.5} aria-hidden />
                      {line}
                    </li>
                  ))}
                </ul>
                <p className={cn(hand.className, "mt-6 -rotate-2 text-[24px] leading-tight text-ember-500")}>
                  Proof you have done the work, not just read about it.
                </p>
              </div>

              {/* An illustration of the certificate, not the certificate itself. */}
              <div aria-hidden className="relative">
                <div className="absolute -inset-3 rotate-2 rounded-[22px] bg-ember-500" />
                <div className="relative rounded-[18px] border-[6px] border-double border-[#0B0B0B]/80 bg-[#FAF7F0] px-5 py-6 text-center text-[#0B0B0B] sm:px-10 sm:py-8">
                  <div className="mx-auto flex w-fit items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-lg bg-[#0B0B0B]">
                      <LogoMark className="size-5" />
                    </span>
                    <span className="text-[14px] font-semibold tracking-[-0.01em]">Operator Forge</span>
                  </div>
                  <p className="mt-5 font-mono text-[10px] tracking-[0.3em] text-[#6B6B6B] uppercase">
                    Certificate of completion
                  </p>
                  <p className="mt-3 text-[13px] text-[#6B6B6B]">This certifies that</p>
                  <p className={cn(hand.className, "mt-1 text-[28px] leading-tight sm:text-[34px]")}>Your Name</p>
                  <div className="mx-auto mt-1 h-px w-3/4 bg-[#0B0B0B]/20" />
                  <p className="mt-3 text-[13px] leading-relaxed text-[#3D3D3D]">has completed the</p>
                  <p className="text-[18px] leading-tight font-bold tracking-[-0.02em]">{OFFER.name}</p>
                  <p className="mt-1 text-[13px] text-[#3D3D3D]">{OFFER.dateLabel}</p>
                  <div className="mt-6 flex items-end justify-between gap-4 text-left">
                    <div>
                      <div className="h-px w-24 bg-[#0B0B0B]/30" />
                      <p className="mt-1 font-mono text-[9px] tracking-[0.2em] text-[#6B6B6B] uppercase">
                        Operator Forge
                      </p>
                    </div>
                    <span className="grid size-14 place-items-center rounded-full bg-ember-500 ring-4 ring-ember-500/30">
                      <Award className="size-7" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 8. The AMA ── */}
        <section aria-labelledby="ama" className="bg-[#0B0B0B] text-white">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:px-6 lg:grid-cols-2 lg:py-20">
            <div>
              <p className="font-mono text-[10.5px] tracking-[0.24em] text-ember-500 uppercase">
                Day 7 · Live AMA · {OFFER_DAYS[6]?.date}
              </p>
              <h2
                id="ama"
                className="mt-3 text-[clamp(2rem,5.4vw,3.2rem)] leading-[1.02] font-bold tracking-[-0.045em]"
              >
                Ask the person who actually runs it.
              </h2>
              <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-white/70">
                An hour with the {OFFER.speaker.role} — {OFFER.speaker.experience.toLowerCase()}. Bring the questions
                a job description never answers.
              </p>
              <ul className="mt-7 flex flex-wrap gap-2">
                {AMA_POINTS.map(({ icon: Icon, label }) => (
                  <li
                    key={label}
                    className="flex items-center gap-2 rounded-full border border-white/15 px-3.5 py-2 font-mono text-[11px] tracking-[0.16em] uppercase"
                  >
                    <Icon className="size-3.5 text-ember-500" aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>
              <RegisterButton size="md" className="mt-8">
                Register · {inr(OFFER.price)}
                <ArrowRight />
              </RegisterButton>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-7">
              <p className="font-mono text-[10.5px] tracking-[0.24em] text-white/55 uppercase">Your AMA speaker</p>
              <div className="mt-4 flex items-center gap-4">
                <span className="grid size-16 shrink-0 place-items-center rounded-full bg-ember-500 text-[#0B0B0B]">
                  <Mic className="size-7" aria-hidden />
                </span>
                <p className="text-[clamp(1.4rem,3.6vw,1.85rem)] leading-tight font-bold tracking-[-0.03em]">
                  {OFFER.speaker.role}
                </p>
              </div>
              <p className="mt-5 text-[17px] text-ember-500">{OFFER.speaker.experience}</p>
              <ul className="mt-5 space-y-2.5 border-t border-white/10 pt-5">
                {[
                  "Open Q&A — you bring the questions",
                  "What the role is really like, day to day",
                  "How careers in operations are actually built",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-[14.5px] text-white/80">
                    <Check className="mt-0.5 size-4 shrink-0 text-ember-500" aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── 9. Who it is for ── */}
        <section aria-labelledby="who-for" className="mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
            <div>
              <h2
                id="who-for"
                className="text-[clamp(1.8rem,4.6vw,2.8rem)] leading-[1.04] font-bold tracking-[-0.04em]"
              >
                Built for the people who want in.
              </h2>
              <p className="mt-4 flex items-center gap-2 text-[14px] text-[#6B6B6B]">
                <Clock className="size-4" aria-hidden />
                About 15 minutes a day · {OFFER.dateLabel}
              </p>
            </div>
            <ul className="space-y-3">
              {FOR_WHO.map((line) => (
                <li key={line} className="flex items-start gap-3 text-[16px] leading-relaxed text-[#3D3D3D]">
                  <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-ember-500">
                    <Check className="size-3 text-[#0B0B0B]" aria-hidden />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── 10. Who built this ── */}
        <FounderNote />

        {/* ── 11. Questions ── */}
        <section className="border-t border-black/[0.07] bg-white/60">
          <div className="mx-auto max-w-3xl px-5 py-14 sm:px-6 lg:py-20">
            <h2 className="text-[clamp(1.7rem,4.4vw,2.6rem)] leading-[1.05] font-bold tracking-[-0.04em]">
              Questions, answered
            </h2>
            <div className="mt-8 divide-y divide-black/10 border-y border-black/10">
              {FAQS.map((faq) => (
                <details key={faq.q} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[16.5px] font-semibold focus-visible:ring-2 focus-visible:ring-[#0B0B0B] focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <ChevronDown
                      className="size-5 shrink-0 text-[#6B6B6B] transition-transform duration-200 group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <p className="pb-5 text-[15px] leading-relaxed text-[#3D3D3D]">{faq.a}</p>
                </details>
              ))}
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[16.5px] font-semibold focus-visible:ring-2 focus-visible:ring-[#0B0B0B] focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                  I have a different question
                  <ChevronDown
                    className="size-5 shrink-0 text-[#6B6B6B] transition-transform duration-200 group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <div className="pb-5">
                  <p className="text-[15px] leading-relaxed text-[#3D3D3D]">
                    Message us on WhatsApp at {OFFER.whatsapp.display} or email{" "}
                    <a href={mailtoUrl()} className="font-semibold underline underline-offset-4">
                      {OFFER.email}
                    </a>{" "}
                    — a person reads every message.
                  </p>
                  <WhatsAppButton label="Chat on WhatsApp" className="mt-4" />
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* ── 12. Closing call to action ── */}
        <section id="final-cta" className="bg-ember-500">
          <div className="mx-auto max-w-6xl px-5 py-14 text-center sm:px-6 lg:py-20">
            <h2 className="mx-auto max-w-3xl text-[clamp(2.1rem,6vw,3.8rem)] leading-[1] font-bold tracking-[-0.05em]">
              Step into your first control room.
            </h2>
            <p className="mt-4 text-[16px] text-[#0B0B0B]/75">
              {OFFER.dateLabel} · <span className="line-through">{inr(OFFER.listPrice)}</span>{" "}
              <strong className="font-bold text-[#0B0B0B]">{inr(OFFER.price)}</strong> · {OFFER.priceLabel}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <RegisterButton className="w-full bg-none bg-[#0B0B0B] text-white shadow-none hover:shadow-none hover:brightness-125 sm:w-auto">
                Register now · {inr(OFFER.price)}
                <ArrowRight />
              </RegisterButton>
              <WhatsAppButton className="w-full sm:w-auto" />
            </div>
          </div>
        </section>
      </main>

      {/* ── 13. Footer ── */}
      <footer className="relative overflow-hidden bg-[#0B0B0B] text-white">
        <svg
          aria-hidden
          viewBox="0 0 1200 110"
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0 h-20 w-full text-white/[0.06]"
        >
          {SKYLINE.map((b) => (
            <rect key={b.x} x={b.x} y={110 - b.h} width={b.w} height={b.h} fill="currentColor" />
          ))}
        </svg>
        <div className="relative mx-auto max-w-6xl px-5 pt-28 pb-28 sm:px-6 md:pb-12">
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <div className="flex items-center gap-2.5">
                <LogoMark className="size-8" />
                <span className="text-[17px] font-semibold tracking-[-0.02em]">Operator Forge</span>
              </div>
              <p className="mt-5 font-mono text-[11px] tracking-[0.24em] text-white/55 uppercase">
                Operations builds careers
              </p>
              <p className="mt-1.5 text-[22px] font-bold tracking-[-0.03em]">
                Better operators. <span className="text-ember-500">A brighter India.</span>
              </p>
            </div>
            <div className="text-[14px] text-white/70">
              <p className="font-mono text-[10.5px] tracking-[0.24em] text-white/45 uppercase">Talk to us</p>
              <p className="mt-2">WhatsApp {OFFER.whatsapp.display}</p>
              <a href={mailtoUrl()} className="mt-1 block w-fit underline-offset-4 hover:text-white hover:underline">
                {OFFER.email}
              </a>
              <Link href="/" className="mt-1 block w-fit underline-offset-4 hover:text-white hover:underline">
                operatorforge.in
              </Link>
              <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
                {LEGAL_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="underline-offset-4 hover:text-white hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-10 border-t border-white/10 pt-5 text-[11.5px] leading-relaxed text-white/45">
            Scorecards and Operator Profiles are a practice assessment from simulated shifts, not an employment
            certification. Operator Forge is independent and not affiliated with, or endorsed by, Zepto, Swiggy
            Instamart or Blinkit. © 2026 Operator Forge.
          </p>
        </div>
      </footer>

      <StickyRegisterBar />
      <FloatingWhatsApp />
    </div>
  );
}
