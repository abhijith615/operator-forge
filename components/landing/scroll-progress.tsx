"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/** A one-pixel read of how far through the story you are. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-90 h-[3px] origin-left bg-ember-500"
    />
  );
}
