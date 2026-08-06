"use client";

import { useReducedMotion } from "framer-motion";

import { Badge } from "@/components/ui/badge";

/**
 * Motion is driven by the operating system rather than an in-app toggle, so
 * this reports the setting we are actually honouring instead of duplicating it.
 */
export function MotionStatus() {
  const reduced = useReducedMotion();

  return (
    <div className="flex items-center justify-between gap-4 rounded-card border border-line bg-white/[0.02] px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[13.5px] text-hi">Reduced motion</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-lo">
          Read from your system preferences. Change it there and the interface
          follows on the next paint.
        </p>
      </div>
      <Badge tone={reduced ? "ion" : "neutral"}>{reduced ? "On" : "Off"}</Badge>
    </div>
  );
}
