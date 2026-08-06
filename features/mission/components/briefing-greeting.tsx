"use client";

import { motion } from "framer-motion";

import { useClock } from "@/hooks/use-clock";
import { easing } from "@/lib/motion";

function greetingFor(hour: number): string {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function BriefingGreeting({ firstName }: { firstName: string }) {
  const now = useClock();
  const greeting = now ? greetingFor(now.getHours()) : "Welcome";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: easing.outExpo }}
    >
      <p className="font-mono text-[10.5px] tracking-[0.2em] text-ember-500 uppercase">
        Pre-shift briefing
      </p>
      <h2
        className="mt-2.5 text-[26px] leading-tight font-semibold tracking-[-0.03em] text-hi sm:text-[32px]"
        suppressHydrationWarning
      >
        {greeting}, {firstName}.
      </h2>
      <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-mid">
        Read the dossier before you start. Once the clock runs, it does not stop
        for questions.
      </p>
    </motion.div>
  );
}
