"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { CapabilityReading } from "@/types/genome";

const SIZE = 460;
const CENTER = SIZE / 2;
const MAX_RADIUS = 150;
const RINGS = [0.25, 0.5, 0.75, 1];

function point(index: number, count: number, radius: number) {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  };
}

function polygon(count: number, radiusAt: (index: number) => number) {
  return Array.from({ length: count }, (_, index) => {
    const { x, y } = point(index, count, radiusAt(index));
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

/**
 * The reading, as a shape. Deliberately unlabelled with numbers — the operator
 * should see the silhouette of how they work, not a set of marks to argue with.
 */
export function GenomeRadar({
  readings,
  className,
}: {
  readings: CapabilityReading[];
  className?: string;
}) {
  const [active, setActive] = React.useState<number | null>(null);
  const count = readings.length;

  // A floor on the plotted radius so a weak axis is still visible as a shape.
  const radiusAt = (index: number) =>
    MAX_RADIUS * (0.12 + (readings[index]?.score ?? 0) * 0.88);

  return (
    <div className={cn("relative mx-auto aspect-square w-full max-w-[30rem]", className)}>
      <div className="absolute inset-[20%] rounded-full bg-[radial-gradient(circle,rgba(255,106,43,0.16),transparent_70%)] blur-3xl" />

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="relative size-full overflow-visible"
        role="img"
        aria-label="Your capability shape across ten axes"
      >
        <defs>
          <radialGradient id="genome-fill" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#FF9257" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#FF6A2B" stopOpacity="0.14" />
          </radialGradient>
        </defs>

        {RINGS.map((ratio, index) => (
          <motion.polygon
            key={ratio}
            points={polygon(count, () => MAX_RADIUS * ratio)}
            fill="none"
            stroke="currentColor"
            className="text-white/[0.08]"
            strokeWidth="1"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.05 * index, ease: easing.outExpo }}
            style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
          />
        ))}

        {readings.map((reading, index) => {
          const outer = point(index, count, MAX_RADIUS);
          return (
            <motion.line
              key={`spoke-${reading.id}`}
              x1={CENTER}
              y1={CENTER}
              x2={outer.x}
              y2={outer.y}
              stroke="currentColor"
              className={cn(
                "transition-colors duration-200",
                active === index ? "text-ember-500/50" : "text-white/[0.06]",
              )}
              strokeWidth="1"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.03, ease: easing.outExpo }}
            />
          );
        })}

        {/* The shape itself, grown from the centre. */}
        <motion.polygon
          points={polygon(count, radiusAt)}
          fill="url(#genome-fill)"
          stroke="#FF6A2B"
          strokeWidth="2"
          strokeLinejoin="round"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.3, delay: 0.55, ease: easing.outExpo }}
          style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
        />

        {readings.map((reading, index) => {
          const vertex = point(index, count, radiusAt(index));
          return (
            <motion.circle
              key={`vertex-${reading.id}`}
              cx={vertex.x}
              cy={vertex.y}
              r={active === index ? 5 : 3}
              className="fill-ember-500"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 1.1 + index * 0.04, ease: easing.outExpo }}
            />
          );
        })}

        {/* Labels double as the hover targets. */}
        {readings.map((reading, index) => {
          const anchor = point(index, count, MAX_RADIUS + 34);
          const isRight = anchor.x > CENTER + 4;
          const isLeft = anchor.x < CENTER - 4;
          return (
            <motion.text
              key={`label-${reading.id}`}
              x={anchor.x}
              y={anchor.y}
              textAnchor={isRight ? "start" : isLeft ? "end" : "middle"}
              dominantBaseline="middle"
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              className={cn(
                "cursor-default font-mono text-[9.5px] tracking-[0.1em] uppercase transition-colors duration-200",
                active === index ? "fill-ember-400" : "fill-lo",
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1 + index * 0.04 }}
            >
              {reading.name}
            </motion.text>
          );
        })}

        <circle cx={CENTER} cy={CENTER} r="2.5" className="fill-ember-500/70" />
      </svg>
    </div>
  );
}
