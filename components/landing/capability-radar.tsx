"use client";

import { motion } from "framer-motion";

import { capabilities } from "@/lib/constants/site";

const SIZE = 420;
const CENTER = SIZE / 2;
const MAX_RADIUS = 152;
const RINGS = [0.28, 0.52, 0.76, 1];
const AXES = capabilities.length;

function point(index: number, radius: number) {
  const angle = (Math.PI * 2 * index) / AXES - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  };
}

function polygon(radius: number) {
  return Array.from({ length: AXES }, (_, index) => {
    const { x, y } = point(index, radius);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

/**
 * The instrument the Genome is drawn on: ten axes, no reading yet.
 * A sweep arm rotates so the frame feels powered rather than decorative.
 */
export function CapabilityRadar() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[26rem]">
      <div className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle,rgba(245,196,0,0.14),transparent_70%)] blur-2xl" />

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="relative size-full overflow-visible"
        role="img"
        aria-label="The ten capability axes measured during a mission"
      >
        <defs>
          <linearGradient id="radar-sweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#F5C400" stopOpacity="0" />
            <stop offset="100%" stopColor="#F5C400" stopOpacity="0.55" />
          </linearGradient>
          <radialGradient id="radar-core">
            <stop offset="0%" stopColor="#FFD84D" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#F5C400" stopOpacity="0" />
          </radialGradient>
        </defs>

        {RINGS.map((ratio, index) => (
          <motion.polygon
            key={ratio}
            points={polygon(MAX_RADIUS * ratio)}
            fill="none"
            stroke="currentColor"
            className="text-white/[0.09]"
            strokeWidth="1"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.9, delay: 0.1 + index * 0.08, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
          />
        ))}

        {Array.from({ length: AXES }, (_, index) => {
          const outer = point(index, MAX_RADIUS);
          return (
            <motion.line
              key={index}
              x1={CENTER}
              y1={CENTER}
              x2={outer.x}
              y2={outer.y}
              stroke="currentColor"
              className="text-white/[0.07]"
              strokeWidth="1"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.7, delay: 0.3 + index * 0.045, ease: [0.16, 1, 0.3, 1] }}
            />
          );
        })}

        {/* sweep arm */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
        >
          <path
            d={`M ${CENTER} ${CENTER} L ${CENTER + MAX_RADIUS} ${CENTER} A ${MAX_RADIUS} ${MAX_RADIUS} 0 0 0 ${
              CENTER + MAX_RADIUS * Math.cos(-Math.PI / 4)
            } ${CENTER + MAX_RADIUS * Math.sin(-Math.PI / 4)} Z`}
            fill="url(#radar-sweep)"
          />
        </motion.g>

        <circle cx={CENTER} cy={CENTER} r="34" fill="url(#radar-core)" />
        <circle cx={CENTER} cy={CENTER} r="3" className="fill-ember-500" />

        {capabilities.map((capability, index) => {
          const anchor = point(index, MAX_RADIUS + 30);
          const isRight = anchor.x > CENTER + 4;
          const isLeft = anchor.x < CENTER - 4;
          return (
            <motion.text
              key={capability.id}
              x={anchor.x}
              y={anchor.y}
              textAnchor={isRight ? "start" : isLeft ? "end" : "middle"}
              dominantBaseline="middle"
              className="fill-lo font-mono text-[9.5px] tracking-[0.1em] uppercase"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, delay: 0.55 + index * 0.05 }}
            >
              {capability.name}
            </motion.text>
          );
        })}
      </svg>
    </div>
  );
}
