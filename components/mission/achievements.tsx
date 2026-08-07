"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Award } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { easing } from "@/lib/motion";
import { playMessageSound } from "@/lib/sound";
import { useMissionStore } from "@/stores/mission-store";
import { useShellStore } from "@/stores/shell-store";
import { cn } from "@/lib/utils";

const DWELL_MS = 6000;

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

/** A brief, quiet acknowledgement the moment one is earned. */
export function AchievementToast() {
  const achievements = useMissionStore((state) => state.achievements);
  const soundEnabled = useShellStore((state) => state.soundEnabled);
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
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-70 flex justify-center px-4">
      <AnimatePresence>
        {active ? (
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97, transition: { duration: 0.2 } }}
            transition={{ duration: 0.5, ease: easing.outExpo }}
            className="glass flex items-center gap-3 rounded-full border-ember-500/25 py-2 pr-5 pl-3"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ember-500/15 text-ember-400">
              <Award className="size-3.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-hi">{active.name}</span>
              <span className="block truncate text-[11.5px] text-mid">{active.blurb}</span>
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
