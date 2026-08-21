"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Award } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { easing, settle } from "@/lib/motion";
import { playMessageSound } from "@/lib/sound";
import { useMissionStore } from "@/stores/mission-store";
import { useShellStore } from "@/stores/shell-store";
import { cn } from "@/lib/utils";

const DWELL_MS = 5200;

/** Earned marks, kept small. They acknowledge a way of working, not a score. */
export function AchievementStrip({ className }: { className?: string }) {
  const achievements = useMissionStore((state) => state.achievements);
  if (achievements.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {achievements.map((achievement) => (
        <Tooltip key={achievement.id}>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "inline-flex cursor-default items-center gap-1.5 rounded-full border px-2 py-1",
                "border-ember-500/25 bg-ember-500/[0.08] text-[10.5px] text-ember-400",
              )}
            >
              <Award className="size-3" />
              {achievement.name}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-56 font-normal text-mid">
            {achievement.blurb}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

/**
 * The moment one is earned.
 *
 * This is the only unambiguously good news in thirty minutes of triage, so it
 * is allowed to be the loudest thing on screen — but it is still an instrument
 * panel, not a slot machine. The celebration is carried by timing rather than
 * ornament: a bloom behind the card, the medallion landing on a spring with a
 * ring going out from under it, one sheen across the surface, then the text.
 * Nothing loops, nothing bounces twice, and it never covers the floor.
 */
export function AchievementToast() {
  const achievements = useMissionStore((state) => state.achievements);
  const soundEnabled = useShellStore((state) => state.soundEnabled);
  const reduced = useReducedMotion();
  const [showing, setShowing] = React.useState<string | null>(null);
  const seen = React.useRef(new Set<string>());

  const latest = achievements[achievements.length - 1];

  React.useEffect(() => {
    if (!latest || seen.current.has(latest.id)) return;
    seen.current.add(latest.id);
    setShowing(latest.id);
    if (soundEnabled) playMessageSound();
    const timer = window.setTimeout(() => setShowing(null), DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [latest, soundEnabled]);

  const active = achievements.find((achievement) => achievement.id === showing);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-8 z-70 flex justify-center px-4">
      <AnimatePresence>
        {active ? (
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: reduced ? 0 : 28, scale: reduced ? 1 : 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: reduced ? 0 : 12,
              scale: reduced ? 1 : 0.97,
              transition: { duration: 0.28, ease: easing.inOutQuart },
            }}
            transition={reduced ? { duration: 0.2 } : settle}
            className="relative"
          >
            {/* Bloom. Sits behind the card and is gone in a second. */}
            {!reduced ? (
              <motion.span
                aria-hidden
                initial={{ opacity: 0.55, scale: 0.55 }}
                animate={{ opacity: 0, scale: 1.7 }}
                transition={{ duration: 1.1, ease: easing.outExpo }}
                className="absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle,rgba(245,196,0,0.55)_0%,rgba(245,196,0,0)_70%)]"
              />
            ) : null}

            <div className="overlay-surface relative flex items-center gap-3.5 overflow-hidden rounded-2xl border-ember-500/35 py-3 pr-6 pl-3.5">
              {/* One sheen across the surface, then never again. */}
              {!reduced ? (
                <motion.span
                  aria-hidden
                  initial={{ x: "-130%" }}
                  animate={{ x: "230%" }}
                  transition={{ duration: 0.95, ease: easing.outQuint, delay: 0.18 }}
                  className="absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/[0.09] to-transparent"
                />
              ) : null}

              <span className="relative grid size-10 shrink-0 place-items-center">
                {/* The ring leaves from under the medallion as it lands. */}
                {!reduced ? (
                  <motion.span
                    aria-hidden
                    initial={{ opacity: 0.75, scale: 0.9 }}
                    animate={{ opacity: 0, scale: 2.1 }}
                    transition={{ duration: 1, ease: easing.outExpo, delay: 0.12 }}
                    className="absolute inset-0 rounded-full border border-ember-500/70"
                  />
                ) : null}
                <motion.span
                  initial={reduced ? false : { scale: 0.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ...settle, delay: 0.08 }}
                  className={cn(
                    "grid size-10 place-items-center rounded-full text-ember-200",
                    "bg-[linear-gradient(145deg,rgba(245,196,0,0.28),rgba(245,196,0,0.09))]",
                    "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_0_18px_-4px_rgba(245,196,0,0.75)]",
                  )}
                >
                  <Award className="size-[18px]" />
                </motion.span>
              </span>

              <motion.span
                initial={reduced ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, ease: easing.outExpo, delay: 0.16 }}
                className="min-w-0"
              >
                <span className="block font-mono text-[9.5px] tracking-[0.2em] text-ember-500 uppercase">
                  Badge earned
                </span>
                <span className="mt-0.5 block text-[14.5px] leading-tight font-semibold text-hi">
                  {active.name}
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-mid">
                  {active.blurb}
                </span>
              </motion.span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
