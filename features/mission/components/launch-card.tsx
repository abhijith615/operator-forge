"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FIRST_SHIFT } from "@/lib/constants/mission";
import { easing } from "@/lib/motion";

/**
 * The launch control. One press starts a clock that will not stop, so the copy
 * says exactly that before the operator commits.
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

        <Button asChild variant="primary" size="lg" className="mt-6 w-full">
          <Link href="/start">
            <Play />
            Start {FIRST_SHIFT.name}
          </Link>
        </Button>

        <p className="mt-4 text-center font-mono text-[10.5px] tracking-[0.14em] text-faint uppercase">
          {FIRST_SHIFT.durationMinutes} minutes · one attempt · no pause
        </p>
      </div>
    </motion.div>
  );
}
