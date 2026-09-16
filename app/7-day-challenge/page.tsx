import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Kalam } from "next/font/google";
import {
  ArrowRight,
  BarChart3,
  Box,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Cog,
  FileSearch,
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
import { MetaPixelEvent } from "@/components/offer/meta-pixel";
import {
  CohortBadge,
  FloatingWhatsApp,
  LightCanvas,
  RegisterButton,
  RegistrationForm,
  StickyRegisterBar,
  WhatsAppButton,
} from "@/components/offer/offer-client";
import { OFFER, OFFER_DAYS, OFFER_ROUTE, inr } from "@/lib/constants/offer";
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
 */

const hand = Kalam({ weight: ["400", "700"], subsets: ["latin"], display: "swap" });

const DESCRIPTION = `From classrooms to control rooms. Run a live dark store, fix what breaks and learn live from a state operations head — a 7-day online Q-Com operations challenge, ${OFFER.dateLabel}. ${inr(OFFER.price)}.`;

export const metadata: Metadata = {
  title: `${OFFER.name} · ${OFFER.dateLabel}`,
  description: DESCRIPTION,
  alternates: { canonical: OFFER_ROUTE },
  openGraph: {
    title: "From Classrooms to Control Rooms",
    description: DESCRIPTION,
    url: OFFER_ROUTE,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "From Classrooms to Control Rooms",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF7F0",
  colorScheme: "light",
};

/* ── Content ──────────────────────────────────────────────────────────── */

const FEATURES: { icon: LucideIcon; label: string }[] = [
  { icon: Laptop, label: "Online, simulation-based learning" },
  { icon: Box, label: "Real-world scenarios" },
  { icon: UsersRound, label: "Learn from industry operators" },
];

const DAY_ICON: LucideIcon[] = [Store, FileSearch, UsersRound, Cog, PackageCheck, BarChart3, MessagesSquare];

type Tone = "yellow" | "cream" | "black";
const DAY_TONE: Tone[] = ["yellow", "cream", "black", "cream", "black", "cream", "yellow"];

const TONE: Record<Tone, { card: string; body: string; meta: string }> = {
  yellow: { card: "bg-ember-500 text-[#0B0B0B]", body: "text-[#0B0B0B]/75", meta: "text-[#0B0B0B]/60" },
  cream: { card: "bg-[#F1ECE1] text-[#0B0B0B]", body: "text-[#3D3D3D]", meta: "text-[#6B6B6B]" },
  black: { card: "bg-[#0B0B0B] text-white", body: "text-white/70", meta: "text-white/55" },
};

const VERBS = ["Observe", "Think", "Decide", "Collaborate", "Communicate", "Solve", "Lead"];

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ShieldCheck,
    title: `Register for ${inr(OFFER.price)}`,
    body: `Enter your name, phone and email, then pay securely on Razorpay for the cohort that starts ${OFFER_DAYS[0]?.date}.`,
  },
  {
    icon: Smartphone,
    title: "One real problem a day",
    body: "Days 1 to 5 are live simulations of about 15 minutes each. You decide; the store answers.",
  },
  {
    icon: Mic,
    title: "Your profile, then the live AMA",
    body: "Day 6 reads back how you decide. Day 7 puts your questions to an operations leader.",
  },
];

const INCLUDED = [
  "Five live operations simulations — Days 1 to 5",
  "A scorecard after every day, built from what you actually decided",
  "Your personalised Operator profile and key strengths — Day 6",
  `Live AMA with the ${OFFER.speaker.role} — Day 7`,
  "A cohort that starts the same week as you",
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
    a: "About 15 minutes a day for Days 1 to 5, time with your operator profile on Day 6, and the live AMA on Day 7.",
  },
  {
    q: "What do I need?",
    a: "A phone or a laptop and a stable internet connection. The simulations run in your browser — there is nothing to install.",
  },
  {
    q: "Is this a certification?",
    a: "Your scorecards and operator profile are a practice assessment built from simulated shifts. They show how you think under pressure; they are not an employment certification.",
  },
  {
    q: "How do I register and pay?",
    a: `Enter your name, phone and email in the registration form, and you go straight to a secure Razorpay payment page. The offer price is ${inr(OFFER.price)} for all seven days.`,
  },
  {
    q: "Can I get a refund?",
    a: `${OFFER.refundNote} Message us on WhatsApp at ${OFFER.whatsapp.display}.`,
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
      <p className="flex items-center gap-1.5 text-[13px] font-medium text-[#0B0B0B]">
        <ShieldCheck className="size-4 shrink-0 text-[#128C7E]" aria-hidden />
        {OFFER.refundNote}
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
        {/* ── Hero ── */}
        <section className="overflow-x-clip">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 pt-9 pb-14 sm:px-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:gap-12 lg:pt-14 lg:pb-20">
            <div className="min-w-0">
              <p className="font-mono text-[10.5px] tracking-[0.28em] text-balance text-[#6B6B6B] uppercase">
                Real operations · Real decisions · A brighter you
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#0B0B0B] px-3 py-1.5 text-[12.5px] font-medium text-white">
                  <CalendarDays className="size-3.5 text-ember-500" aria-hidden />
                  {OFFER.dateLabel}
                </span>
                <CohortBadge />
              </div>

              <h1 className="mt-6 text-[clamp(2.45rem,10.4vw,5.6rem)] leading-[0.94] font-bold tracking-[-0.055em]">
                <span className="block">From</span>
                <span className="block">Classrooms to</span>
                <span className="relative inline-block">
                  <span
                    aria-hidden
                    className="absolute -inset-x-[0.06em] top-[0.3em] bottom-[0.02em] -skew-y-1 rounded-[0.1em] bg-ember-500"
                  />
                  <span className="relative">Control Rooms.</span>
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-[#3D3D3D] sm:text-[18px]">
                A 7-day <strong className="font-semibold text-[#0B0B0B]">Operations Leader Challenge</strong> in the
                Q-Com industry. Run a live dark store, fix what breaks, and learn from someone who does it for real.
              </p>

              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2.5">
                {FEATURES.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-2 text-[13.5px] text-[#3D3D3D]">
                    <Icon className="size-[18px] text-[#0B0B0B]" aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>

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
                    Save {inr(OFFER.listPrice - OFFER.price)}
                  </span>
                </div>
                <p className="mt-2 text-[13px] text-[#6B6B6B]">Offer price · all seven days included</p>
                <OfferNotes className="mt-3" />

                <div className="mt-5 border-t border-black/10 pt-5">
                  <h2 className="text-[17px] font-bold tracking-[-0.02em]">Reserve your seat</h2>
                  <div className="mt-3.5">
                    <RegistrationForm />
                  </div>
                </div>
                <WhatsAppButton className="mt-3 w-full" />

                <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-[#6B6B6B]">
                  <li className="flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5" aria-hidden />
                    Secure payment via Razorpay
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Laptop className="size-3.5" aria-hidden />
                    100% online
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Smartphone className="size-3.5" aria-hidden />
                    Works on a phone
                  </li>
                </ul>
              </div>
            </div>

            {/* The operator panel */}
            <aside
              aria-label="What the challenge builds"
              className="relative flex min-h-[360px] flex-col justify-end overflow-hidden rounded-[28px] bg-[#0B0B0B] p-7 text-white lg:sticky lg:top-24 lg:min-h-[600px] lg:self-start"
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
              <ul className="relative mt-24 space-y-1.5">
                {VERBS.map((verb, index) => (
                  <li
                    key={verb}
                    className={cn(
                      "font-mono text-[14px] tracking-[0.22em] uppercase",
                      index === VERBS.length - 1 ? "text-ember-500" : "text-white/85",
                    )}
                  >
                    {verb}
                  </li>
                ))}
              </ul>
              <p className="relative mt-6 border-t border-white/15 pt-4 text-[13px] leading-relaxed text-white/65">
                Seven days of the calls an operations manager makes before lunch.
              </p>
            </aside>
          </div>
        </section>

        {/* ── Inspired by ── */}
        <section className="border-y border-black/[0.07] bg-white/60">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-7 sm:px-6 lg:flex-row lg:items-center">
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
          <p className="mx-auto max-w-6xl px-5 pb-5 text-[11px] leading-relaxed text-[#6B6B6B] sm:px-6">
            Operator Forge is independent and is not affiliated with, or endorsed by, the companies named above. Their
            names describe the kind of operations the simulations are modelled on.
          </p>
        </section>

        {/* ── The seven days ── */}
        <section id="days" className="mx-auto max-w-6xl px-5 py-16 sm:px-6 lg:py-24">
          <p className="font-mono text-[10.5px] tracking-[0.24em] text-[#6B6B6B] uppercase">
            The 7 days · {OFFER.dateLabel}
          </p>
          <h2 className="mt-3 max-w-3xl text-[clamp(2rem,5.6vw,3.4rem)] leading-[1.02] font-bold tracking-[-0.045em]">
            Seven days. Seven real operating problems.
          </h2>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-[#3D3D3D]">
            Five live simulations where you decide and the store answers, a read on how you think, and a live session
            with someone who runs this for real.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {OFFER_DAYS.map((entry, index) => {
              const Icon = DAY_ICON[index] ?? Store;
              const tone = TONE[DAY_TONE[index] ?? "cream"];
              return (
                <article key={entry.day} className={cn("flex flex-col rounded-[22px] p-5", tone.card)}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[15px] font-bold">Day {entry.day}</p>
                    <p className={cn("font-mono text-[11px]", tone.meta)}>{entry.date}</p>
                  </div>
                  <Icon className="mt-5 size-10" strokeWidth={1.6} aria-hidden />
                  <h3 className="mt-4 text-[19px] leading-[1.15] font-bold tracking-[-0.02em]">{entry.title}</h3>
                  <p className={cn("mt-2 text-[14px] leading-relaxed", tone.body)}>{entry.body}</p>
                </article>
              );
            })}
            <div className="flex items-center justify-center rounded-[22px] border-2 border-dashed border-black/15 p-6">
              <p className={cn(hand.className, "-rotate-6 text-center text-[26px] leading-[1.15]")}>
                Real situations.
                <br />
                Real skills.
                <br />
                <span className="relative inline-block">
                  Real opportunities.
                  <span aria-hidden className="absolute inset-x-0 -bottom-1 h-1 rounded-full bg-ember-500" />
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="border-y border-black/[0.07] bg-white/60">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:py-20">
            <h2 className="text-[clamp(1.7rem,4.4vw,2.6rem)] leading-[1.05] font-bold tracking-[-0.04em]">
              How it works
            </h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, body }, index) => (
                <li key={title} className="rounded-[22px] border border-black/10 bg-white p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-full bg-[#0B0B0B] font-mono text-[14px] font-semibold text-ember-500">
                      {index + 1}
                    </span>
                    <Icon className="size-5 text-[#6B6B6B]" aria-hidden />
                  </div>
                  <h3 className="mt-4 text-[18px] font-bold tracking-[-0.02em]">{title}</h3>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#3D3D3D]">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── The AMA ── */}
        <section className="bg-[#0B0B0B] text-white">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
            <div>
              <p className="font-mono text-[10.5px] tracking-[0.24em] text-ember-500 uppercase">
                Day 7 · Live AMA · {OFFER_DAYS[6]?.date}
              </p>
              <h2 className="mt-3 text-[clamp(2rem,5.4vw,3.2rem)] leading-[1.02] font-bold tracking-[-0.045em]">
                Ask the person who actually runs it.
              </h2>
              <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-white/70">
                Learn from a seasoned operations leader who has built and scaled high-performing teams across the
                Q-Com industry. Bring the questions a job description never answers.
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

        {/* ── Who it's for, and what you get ── */}
        <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:py-24">
          <div>
            <p className={cn(hand.className, "-rotate-2 text-[30px] leading-tight")}>
              Same degree.{" "}
              <span className="relative inline-block">
                A bigger you.
                <span aria-hidden className="absolute inset-x-0 -bottom-0.5 h-1 rounded-full bg-ember-500" />
              </span>
            </p>
            <h2 className="mt-5 text-[clamp(1.8rem,4.6vw,2.8rem)] leading-[1.04] font-bold tracking-[-0.04em]">
              Built for the people who want in.
            </h2>
            <ul className="mt-6 space-y-3">
              {FOR_WHO.map((line) => (
                <li key={line} className="flex items-start gap-3 text-[16px] leading-relaxed text-[#3D3D3D]">
                  <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-ember-500">
                    <Check className="size-3 text-[#0B0B0B]" aria-hidden />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-8 flex items-center gap-2 text-[14px] text-[#6B6B6B]">
              <Clock className="size-4" aria-hidden />
              About 15 minutes a day · {OFFER.dateLabel}
            </p>
          </div>

          <div className="rounded-[28px] border-2 border-[#0B0B0B] bg-white p-6 shadow-[8px_8px_0_0_#0B0B0B] sm:p-8">
            <p className="font-mono text-[10.5px] tracking-[0.24em] text-[#6B6B6B] uppercase">{OFFER.name}</p>
            <p className="mt-4 flex flex-wrap items-baseline gap-3">
              <span className="sr-only">Regular price</span>
              <span className="text-[20px] text-[#6B6B6B] line-through">{inr(OFFER.listPrice)}</span>
              <span className="sr-only">Offer price</span>
              <span className="text-[60px] leading-none font-bold tracking-[-0.04em]">{inr(OFFER.price)}</span>
              <span className="rounded-full bg-ember-500 px-2.5 py-1 text-[12px] font-semibold">
                Save {inr(OFFER.listPrice - OFFER.price)}
              </span>
            </p>
            <p className="mt-2 text-[13px] text-[#6B6B6B]">One payment · all seven days · {OFFER.dateLabel}</p>
            <OfferNotes className="mt-3" />

            <ul className="mt-6 space-y-3 border-t border-black/10 pt-6">
              {INCLUDED.map((line) => (
                <li key={line} className="flex items-start gap-3 text-[15px] leading-relaxed">
                  <Check className="mt-1 size-4 shrink-0 text-[#0B0B0B]" strokeWidth={2.5} aria-hidden />
                  {line}
                </li>
              ))}
            </ul>

            <RegisterButton className="mt-7 w-full">
              Register now
              <ArrowRight />
            </RegisterButton>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-[#6B6B6B]">
              <ShieldCheck className="size-3.5" aria-hidden />
              Secure checkout via Razorpay
            </p>
          </div>
        </section>

        {/* ── Questions ── */}
        <section className="border-t border-black/[0.07] bg-white/60">
          <div className="mx-auto max-w-3xl px-5 py-16 sm:px-6 lg:py-20">
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
                    Message us on WhatsApp at {OFFER.whatsapp.display} — a person reads every message.
                  </p>
                  <WhatsAppButton label="Chat on WhatsApp" className="mt-4" />
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* ── Closing call to action ── */}
        <section id="final-cta" className="bg-ember-500">
          <div className="mx-auto max-w-6xl px-5 py-16 text-center sm:px-6 lg:py-20">
            <p className={cn(hand.className, "text-[24px] leading-tight")}>
              Real situations. Real skills. Real opportunities.
            </p>
            <h2 className="mx-auto mt-4 max-w-3xl text-[clamp(2.1rem,6vw,3.8rem)] leading-[1] font-bold tracking-[-0.05em]">
              Step into your first control room.
            </h2>
            <p className="mt-4 text-[16px] text-[#0B0B0B]/75">
              {OFFER.dateLabel} · <span className="line-through">{inr(OFFER.listPrice)}</span>{" "}
              <strong className="font-bold text-[#0B0B0B]">{inr(OFFER.price)}</strong>
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

      {/* ── Footer ── */}
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
              <Link href="/" className="mt-1 inline-block underline-offset-4 hover:text-white hover:underline">
                operatorforge.in
              </Link>
            </div>
          </div>
          <p className="mt-10 border-t border-white/10 pt-5 text-[11.5px] leading-relaxed text-white/45">
            Scorecards and operator profiles are a practice assessment from simulated shifts, not an employment
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
