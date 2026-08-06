"use client";

import { motion } from "framer-motion";
import { Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FIRST_SHIFT } from "@/lib/constants/mission";
import { easing } from "@/lib/motion";

/**
 * The launch control. Armed by the mission engine — until that ships the button
 * stays disabled rather than pretending to start a shift that does not exist.
 */
export function LaunchCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: easing.outExpo, delay: 0.12 }}
      className="panel sheen grain relative overflow-hidden p-6"
    >
      <div className="absolute -top-16 left-1/2 size-56 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,106,43,0.22),transparent_68%)] blur-2xl" />

      <div className="relative">
        <p className="font-mono text-[10.5px] tracking-[0.16em] text-faint uppercase">
          Launch
        </p>

        <p className="mt-4 text-[15px] leading-relaxed text-mid">
          Starting the shift plays the handover, counts you in from five, and
          opens the hub. There is no way back to this screen afterwards.
        </p>

        <Tooltip>
          <TooltipTrigger asChild>
            <span className="mt-6 block">
              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled
                className="w-full"
              >
                <Play />
                Start {FIRST_SHIFT.name}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Not armed yet</TooltipContent>
        </Tooltip>

        <p className="mt-4 flex items-center gap-2 text-[12px] text-lo">
          <span className="rounded-full border border-line-strong bg-white/[0.04] px-2 py-0.5 font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">
            Build note
          </span>
          The mission engine, world state and AI colleagues arrive in Phase 2.
        </p>
      </div>
    </motion.div>
  );
}
