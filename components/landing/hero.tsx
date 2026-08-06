"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";

import { HeroConsole } from "@/components/landing/hero-console";
import { Button } from "@/components/ui/button";
import { Aurora, GridField } from "@/components/visuals/aurora";
import { easing } from "@/lib/motion";
import { FIRST_SHIFT } from "@/lib/constants/mission";

const lineOne = "Become an Operator.";
const lineTwo = "Not a Graduate.";

function Line({ text, delay, accent }: { text: string; delay: number; accent?: boolean }) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span
        initial={{ y: "108%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 1.15, ease: easing.outExpo, delay }}
        className={
          accent
            ? "block bg-linear-to-br from-ember-200 via-ember-500 to-ember-700 bg-clip-text text-transparent"
            : "block text-gradient"
        }
      >
        {text}
      </motion.span>
    </span>
  );
}

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pt-36 pb-24 sm:pt-44 sm:pb-32">
      <Aurora />
      <GridField />

      <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: easing.outExpo, delay: 0.15 }}
          className="mx-auto inline-flex items-center gap-2.5 rounded-full border border-line-strong bg-white/[0.035] py-1.5 pr-4 pl-1.5 backdrop-blur-sm"
        >
          <span className="rounded-full bg-ember-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.14em] text-ember-400">
            {FIRST_SHIFT.codename}
          </span>
          <span className="text-[12.5px] text-mid">
            {FIRST_SHIFT.name} · {FIRST_SHIFT.durationMinutes} minutes ·{" "}
            {FIRST_SHIFT.industry}
          </span>
        </motion.div>

        <h1 className="mt-8 text-[clamp(2.9rem,8.4vw,6.5rem)] leading-[0.94] font-semibold tracking-[-0.045em]">
          <span className="sr-only">
            {lineOne} {lineTwo}
          </span>
          <span aria-hidden>
            <Line text={lineOne} delay={0.25} />
            <Line text={lineTwo} delay={0.36} accent />
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: easing.outExpo, delay: 0.55 }}
          className="mx-auto mt-7 max-w-[38rem] text-[16.5px] leading-relaxed text-mid text-balance sm:text-[17.5px]"
        >
          Sixty minutes running a ten-minute delivery hub. Orders arrive whether
          or not you are ready. Three colleagues answer in real time. There is no
          multiple choice — only what you decide to do next.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: easing.outExpo, delay: 0.66 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Button asChild variant="primary" size="lg" className="w-full sm:w-auto">
            <Link href="/login">
              Start Mission
              <ArrowRight className="transition-transform duration-300 ease-out-expo group-hover/btn:translate-x-1" />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
            <a href="#shift">Read the handover</a>
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.9 }}
          className="mt-5 font-mono text-[11px] tracking-[0.1em] text-faint uppercase"
        >
          No prep. No syllabus. One shift.
        </motion.p>
      </div>

      <HeroConsole />

      <motion.a
        href="#shift"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
        className="mx-auto mt-16 flex w-fit flex-col items-center gap-2 text-faint transition-colors hover:text-mid"
        aria-label="Scroll to the handover"
      >
        <span className="font-mono text-[10px] tracking-[0.22em] uppercase">Scroll</span>
        <motion.span
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="size-4" />
        </motion.span>
      </motion.a>
    </section>
  );
}
