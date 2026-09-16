"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, ChevronDown } from "lucide-react";

import { HOME_FOCUS } from "@/components/home/home-nav";
import { buttonVariants } from "@/components/ui/button";
import { OFFER, OFFER_ROUTE, inr } from "@/lib/constants/offer";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

const lineOne = "Become an Operator.";
const lineTwo = "Not a Graduate.";

function Line({ text, delay, accent }: { text: string; delay: number; accent?: boolean }) {
  return (
    <span className="block overflow-hidden pb-[0.1em]">
      <motion.span
        initial={{ y: "108%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 1.15, ease: easing.outExpo, delay }}
        className="block"
      >
        {accent ? (
          <span className="relative inline-block">
            <span
              aria-hidden
              className="absolute -inset-x-[0.06em] top-[0.3em] bottom-[0.02em] -skew-y-1 rounded-[0.1em] bg-ember-500"
            />
            <span className="relative">{text}</span>
          </span>
        ) : (
          text
        )}
      </motion.span>
    </span>
  );
}

/** Homepage hero, in the challenge campaign's cream, black and yellow. */
export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
      {/* A faint drafting grid, fading out towards the edges. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [background-image:linear-gradient(rgba(11,11,11,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(11,11,11,0.05)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent_78%)]"
      />

      <div className="relative mx-auto max-w-6xl px-5 text-center sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: easing.outExpo, delay: 0.1 }}
        >
          <Link
            href={OFFER_ROUTE}
            className={cn(
              "group mx-auto inline-flex max-w-full items-center gap-2.5 rounded-full bg-[#0B0B0B] py-1.5 pr-3.5 pl-1.5 text-white transition-colors hover:bg-[#262626]",
              HOME_FOCUS,
            )}
          >
            <span className="rounded-full bg-ember-500 px-2 py-0.5 text-[11px] font-bold text-[#0B0B0B]">NEW</span>
            <span className="truncate text-[13px] font-medium">
              <span className="sm:hidden">7-Day Challenge · starts {OFFER.liveLabel}</span>
              <span className="hidden sm:inline">7-Day Operations Leader Challenge · {OFFER.dateLabel}</span>
            </span>
            <ArrowRight className="size-3.5 shrink-0 text-ember-500 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>

        <h1 className="mt-8 text-[clamp(2.8rem,9vw,6.4rem)] leading-[0.94] font-bold tracking-[-0.055em] text-[#0B0B0B]">
          <span className="sr-only">
            {lineOne} {lineTwo}
          </span>
          <span aria-hidden>
            <Line text={lineOne} delay={0.2} />
            <Line text={lineTwo} delay={0.32} accent />
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: easing.outExpo, delay: 0.5 }}
          className="mx-auto mt-7 max-w-[38rem] text-[17px] leading-relaxed text-balance text-[#3D3D3D] sm:text-[18px]"
        >
          Thirty-minute live operations missions, an assessment built from what you actually did rather than what
          you claim, and the people who do this work for a living. Nobody is grading an essay here.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: easing.outExpo, delay: 0.62 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link
            href={OFFER_ROUTE}
            className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full sm:w-auto", HOME_FOCUS)}
          >
            7-Day Challenge · {inr(OFFER.price)}
            <ArrowRight className="transition-transform duration-300 ease-out-expo group-hover/btn:translate-x-1" />
          </Link>
          <a
            href="#platform"
            className={cn(
              buttonVariants({ size: "lg" }),
              "w-full rounded-full border-2 border-[#0B0B0B] bg-transparent text-[#0B0B0B] shadow-none hover:border-[#0B0B0B] hover:bg-[#0B0B0B] hover:text-white sm:w-auto",
              HOME_FOCUS,
            )}
          >
            See what is inside
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.85 }}
          className="mt-5 flex items-center justify-center gap-2 text-[13px] text-[#6B6B6B]"
        >
          <CalendarDays className="size-4" aria-hidden />
          Simulations go live on {OFFER.liveLabel}
        </motion.p>
      </div>

      <motion.a
        href="#platform"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 1 }}
        className={cn(
          "mx-auto mt-14 flex w-fit flex-col items-center gap-2 rounded-full p-1 text-[#6B6B6B] transition-colors hover:text-[#0B0B0B]",
          HOME_FOCUS,
        )}
        aria-label="Scroll to the platform"
      >
        <span className="font-mono text-[10px] tracking-[0.22em] uppercase">Scroll</span>
        <motion.span animate={{ y: [0, 5, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>
          <ChevronDown className="size-4" />
        </motion.span>
      </motion.a>
    </section>
  );
}
