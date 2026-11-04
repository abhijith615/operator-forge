"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";

import { HOME_FOCUS } from "@/components/home/home-nav";
import { YouTubeFacade } from "@/components/offer/youtube-facade";
import { DEMO_URL, HOME_ROLES, HOME_VIDEO } from "@/lib/constants/home";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

const lineOne = "See How They Work.";
const lineTwo = "Before You Hire.";

function Line({ text, delay, accent }: { text: string; delay: number; accent?: boolean }) {
  return (
    <span className="block overflow-hidden pb-[0.1em]">
      <motion.span initial={{ y: "108%" }} animate={{ y: "0%" }} transition={{ duration: 1.15, ease: easing.outExpo, delay }} className="block">
        {accent ? (
          <span className="relative inline-block">
            <span aria-hidden className="absolute -inset-x-[0.06em] top-[0.3em] bottom-[0.02em] -skew-y-1 rounded-[0.1em] bg-ember-500" />
            <span className="relative">{text}</span>
          </span>
        ) : (
          text
        )}
      </motion.span>
    </span>
  );
}

function rise(delay: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 1, ease: easing.outExpo, delay },
  };
}

/**
 * The space for the product video. With an id in HOME_VIDEO it plays the video
 * (nothing loads from YouTube until it is pressed); without one it holds the
 * space so the layout does not change when the video arrives.
 */
function HeroVideo() {
  if (HOME_VIDEO.id) {
    return <YouTubeFacade id={HOME_VIDEO.id} title={HOME_VIDEO.title} className="rounded-[22px] shadow-[0_30px_60px_-30px_rgba(11,11,11,0.55)]" />;
  }
  return (
    <div
      role="img"
      aria-label="Product video, coming soon"
      className="relative isolate aspect-video w-full overflow-hidden rounded-[22px] bg-[#0B0B0B] shadow-[0_30px_60px_-30px_rgba(11,11,11,0.55)]"
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-10 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_75%_70%_at_50%_45%,black,transparent_85%)]"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-ember-500 text-[#0B0B0B] sm:size-20">
          <Play className="ml-0.5 size-7 fill-current sm:size-9" aria-hidden />
        </span>
        <span className="font-mono text-[11px] tracking-[0.22em] text-white/60 uppercase">See a simulation in action · video coming soon</span>
      </div>
    </div>
  );
}

/** Homepage hero: for employers first, with room for the product video. */
export function HomeHero() {
  return (
    <section className="relative isolate overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [background-image:linear-gradient(rgba(11,11,11,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(11,11,11,0.05)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent_78%)]"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14">
        <div>
          <motion.p {...rise(0.1)} className="inline-flex items-center gap-2 rounded-full bg-[#0B0B0B] py-1.5 pr-3.5 pl-1.5 text-[12.5px] font-medium text-white">
            <span className="rounded-full bg-ember-500 px-2 py-0.5 text-[11px] font-bold text-[#0B0B0B]">HIRING</span>
            <span className="sm:hidden">Simulation-based hiring</span>
            <span className="hidden sm:inline">Simulation-based hiring &amp; skills assessment</span>
          </motion.p>

          <h1 className="mt-7 text-[clamp(2.6rem,7.4vw,4.9rem)] leading-[0.95] font-bold tracking-[-0.05em] text-[#0B0B0B]">
            <span className="sr-only">
              {lineOne} {lineTwo}
            </span>
            <span aria-hidden>
              <Line text={lineOne} delay={0.2} />
              <Line text={lineTwo} delay={0.32} accent />
            </span>
          </h1>

          <motion.div {...rise(0.5)} className="mt-7 max-w-[36rem] space-y-3 text-[17px] leading-relaxed text-[#3D3D3D]">
            <p>
              Resumes tell you what candidates have done. Interviews tell you what they say they can do.{" "}
              <strong className="font-semibold text-[#0B0B0B]">We help you discover what they can actually do.</strong>
            </p>
            <p>
              Operator Forge helps companies evaluate talent through realistic, role-specific job simulations that reveal how
              candidates think, solve problems, make decisions, and execute.
            </p>
          </motion.div>

          <motion.p {...rise(0.58)} className="mt-5 text-[15px] font-semibold text-[#0B0B0B]">
            Go beyond resumes and interviews. Hire with evidence.
          </motion.p>

          <motion.div {...rise(0.66)} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0B0B0B] px-7 text-[15px] font-semibold text-white transition-colors hover:bg-[#262626]",
                HOME_FOCUS,
              )}
            >
              Book a Demo
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </a>
            <a
              href="#who"
              className={cn(
                "inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 border-[#0B0B0B] px-7 text-[15px] font-semibold text-[#0B0B0B] transition-colors hover:bg-[#0B0B0B] hover:text-white",
                HOME_FOCUS,
              )}
            >
              Try a Simulation
            </a>
          </motion.div>
        </div>

        <motion.div {...rise(0.4)}>
          <HeroVideo />
        </motion.div>
      </div>

      <motion.div {...rise(0.85)} className="relative mx-auto mt-14 max-w-6xl px-5 sm:px-6">
        <p className="font-mono text-[11px] tracking-[0.22em] text-[#6B6B6B] uppercase">Built for</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {HOME_ROLES.map((role) => (
            <li key={role} className="rounded-full border border-black/15 bg-white/70 px-3.5 py-1.5 text-[13.5px] font-medium text-[#0B0B0B]">
              {role}
            </li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}
