"use client";

import { motion } from "framer-motion";

import { easing, revealViewport } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface WordRevealProps {
  text: string;
  className?: string;
  /** Words rendered in the accent colour, matched case-insensitively. */
  highlight?: readonly string[];
  delay?: number;
  as?: "h1" | "h2" | "h3" | "p";
}

/**
 * Headline that arrives word by word from below a clipping mask.
 * Screen readers get the whole string; only the glyphs are split.
 */
export function WordReveal({
  text,
  className,
  highlight = [],
  delay = 0,
  as: Tag = "h2",
}: WordRevealProps) {
  const words = text.split(" ");
  const accents = new Set(highlight.map((word) => word.toLowerCase()));

  return (
    <Tag className={cn("[text-wrap:balance]", className)}>
      <span className="sr-only">{text}</span>
      <motion.span
        aria-hidden
        initial="hidden"
        whileInView="show"
        viewport={revealViewport}
        variants={{ show: { transition: { staggerChildren: 0.045, delayChildren: delay } } }}
        className="inline"
      >
        {words.map((word, index) => (
          <span
            key={`${word}-${index}`}
            className="inline-block overflow-hidden pb-[0.12em] align-bottom"
          >
            <motion.span
              variants={{
                hidden: { y: "112%", opacity: 0 },
                show: {
                  y: "0%",
                  opacity: 1,
                  transition: { duration: 0.85, ease: easing.outExpo },
                },
              }}
              className={cn(
                "inline-block",
                accents.has(word.replace(/[.,]/g, "").toLowerCase()) && "text-ember-500",
              )}
            >
              {word}
            </motion.span>
            {index < words.length - 1 ? <span>&nbsp;</span> : null}
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}
