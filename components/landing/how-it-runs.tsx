"use client";

import * as React from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import {
  CloudRain,
  Dna,
  MessagesSquare,
  PlayCircle,
  Radar,
  type LucideIcon,
} from "lucide-react";

import { Container, Section, SectionHeading } from "@/components/landing/section";
import { Reveal } from "@/components/motion/reveal";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface Beat {
  stamp: string;
  title: string;
  body: string;
  icon: LucideIcon;
  accent: "ember" | "flux" | "ion" | "warn";
}

const BEATS: Beat[] = [
  {
    stamp: "T−00:30",
    title: "The handover",
    body: "A message, a short video from the hub manager, and a five-second countdown. No tutorial, no tooltips tour. The doors open.",
    icon: PlayCircle,
    accent: "ember",
  },
  {
    stamp: "00:00",
    title: "The floor comes up",
    body: "Three columns: your colleagues on the left, the live floor in the middle, the task queue on the right. Orders, pickers, riders, stock, weather and a rating you did not earn but now own — all moving on their own.",
    icon: Radar,
    accent: "ion",
  },
  {
    stamp: "09:02",
    title: "The queue never empties",
    body: "A new task lands every twenty to forty seconds — absences, a stockout, a supplier at the dock, head office wanting a report. Three to eight are always waiting. Some expire while you are dealing with others.",
    icon: CloudRain,
    accent: "warn",
  },
  {
    stamp: "Live",
    title: "You are not alone, exactly",
    body: "Your manager, the inventory lead and an actual customer are one message away. They have opinions, moods, and incomplete information — like everyone at work.",
    icon: MessagesSquare,
    accent: "flux",
  },
  {
    stamp: "30:00",
    title: "The Genome",
    body: "No score out of a hundred. A portrait of how you operated — what you reached for first, what you let expire, and how fast you were still deciding at minute twenty-five.",
    icon: Dna,
    accent: "ember",
  },
];

const ACCENT = {
  ember: { text: "text-ember-500", ring: "ring-ember-500/30", glow: "bg-ember-500" },
  ion: { text: "text-ion-400", ring: "ring-ion-500/30", glow: "bg-ion-500" },
  warn: { text: "text-warn-500", ring: "ring-warn-500/30", glow: "bg-warn-500" },
  flux: { text: "text-flux-400", ring: "ring-flux-500/30", glow: "bg-flux-500" },
} as const;

function BeatRow({ beat, index }: { beat: Beat; index: number }) {
  const accent = ACCENT[beat.accent];

  return (
    <motion.li
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.55 }}
      transition={{ duration: 0.7, ease: easing.outExpo }}
      className="group relative grid grid-cols-[auto_1fr] gap-6 pb-14 last:pb-0"
    >
      <div className="relative flex w-12 flex-col items-center">
        <div
          className={cn(
            "relative z-10 grid size-12 shrink-0 place-items-center rounded-full",
            "border border-line-strong bg-obsidian ring-4 ring-void",
            "transition-[border-color,transform] duration-500 ease-out-expo",
            "group-hover:-translate-y-0.5",
            accent.ring,
          )}
        >
          <beat.icon className={cn("size-[18px]", accent.text)} />
          <span
            className={cn(
              "absolute inset-0 -z-10 rounded-full opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-40",
              accent.glow,
            )}
          />
        </div>
      </div>

      <div className="min-w-0 pt-1.5">
        <div className="flex items-baseline gap-3">
          <span
            data-readout
            className={cn("font-mono text-[11px] tracking-[0.14em]", accent.text)}
          >
            {beat.stamp}
          </span>
          <span className="font-mono text-[10.5px] text-faint">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
        <h3 className="mt-2 text-[19px] font-medium tracking-[-0.02em] text-hi">
          {beat.title}
        </h3>
        <p className="mt-2.5 max-w-lg text-[14.5px] leading-relaxed text-mid">
          {beat.body}
        </p>
      </div>
    </motion.li>
  );
}

export function HowItRuns() {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 65%", "end 60%"],
  });
  const scaleY = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.4 });
  const opacity = useTransform(scrollYProgress, [0, 0.04], [0, 1]);

  return (
    <Section id="how" className="scroll-mt-24">
      <Container>
        <div className="grid gap-16 lg:grid-cols-[0.85fr_1.15fr] lg:gap-24">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <SectionHeading
              eyebrow="How it runs"
              title="Thirty minutes, in the order they actually happen."
              description="The mission is not a set of questions. It is a morning that keeps moving faster than you can, and a record of what you chose to get to."
            />
            <Reveal delay={0.16} className="mt-8">
              <div className="inline-flex items-center gap-3 rounded-full border border-line bg-white/[0.03] px-4 py-2.5">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping-slow rounded-full bg-ember-500" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-ember-500" />
                </span>
                <span className="text-[12.5px] text-mid">
                  One attempt. The clock does not pause.
                </span>
              </div>
            </Reveal>
          </div>

          <div ref={ref} className="relative">
            {/* rail */}
            <div className="absolute top-6 bottom-6 left-6 w-px -translate-x-1/2 bg-line" />
            <motion.div
              style={{ scaleY, opacity }}
              className="absolute top-6 bottom-6 left-6 w-px -translate-x-1/2 origin-top bg-linear-to-b from-ember-500 via-ember-500/60 to-transparent"
            />
            <ol className="relative">
              {BEATS.map((beat, index) => (
                <BeatRow key={beat.title} beat={beat} index={index} />
              ))}
            </ol>
          </div>
        </div>
      </Container>
    </Section>
  );
}
