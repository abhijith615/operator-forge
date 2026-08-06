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
      className="fixed inset-x-0 top-0 z-90 h-px origin-left bg-linear-to-r from-ember-500 via-ember-400 to-flux-500"
    />
  );
}
