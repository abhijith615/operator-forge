"use client";

import * as React from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";

import { cn } from "@/lib/utils";

interface SpotlightCardProps extends React.ComponentProps<"div"> {
  /** Radius of the cursor light, in px. */
  radius?: number;
  tone?: "ember" | "ion" | "flux" | "neutral";
}

const TONE_RGB: Record<NonNullable<SpotlightCardProps["tone"]>, string> = {
  ember: "245,196,0",
  ion: "36,217,181",
  flux: "139,124,255",
  neutral: "255,255,255",
};

/**
 * Panel that tracks the cursor with a soft light and lifts slightly on hover.
 * The glow is painted on a sibling layer so content never inherits the blur.
 */
export function SpotlightCard({
  className,
  children,
  radius = 320,
  tone = "ember",
  ...props
}: SpotlightCardProps) {
  const x = useMotionValue(-999);
  const y = useMotionValue(-999);
  const rgb = TONE_RGB[tone];

  const background = useMotionTemplate`radial-gradient(${radius}px circle at ${x}px ${y}px, rgba(${rgb},0.14), transparent 72%)`;

  function handleMove(event: React.MouseEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - bounds.left);
    y.set(event.clientY - bounds.top);
  }

  function handleLeave() {
    x.set(-999);
    y.set(-999);
  }

  return (
    <div
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn(
        "group/card panel sheen relative isolate overflow-hidden",
        "transition-[transform,border-color,box-shadow] duration-400 ease-out-expo",
        "hover:-translate-y-1 hover:border-line-strong",
        "hover:shadow-[0_24px_60px_-28px_rgba(0,0,0,0.9)]",
        className,
      )}
      {...props}
    >
      <motion.div
        aria-hidden
        style={{ background }}
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
      />
      {children}
    </div>
  );
}
