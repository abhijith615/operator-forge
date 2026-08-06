import type { Transition, Variants } from "framer-motion";

/**
 * Motion vocabulary. Three curves, used consistently:
 *   • `swift`  — UI acknowledging you (hover, press, toggle)
 *   • `glide`  — content arriving (reveals, page transitions)
 *   • `settle` — objects with mass (panels, sheets, sidebar)
 */
export const easing = {
  outExpo: [0.16, 1, 0.3, 1],
  outQuint: [0.22, 1, 0.36, 1],
  inOutQuart: [0.76, 0, 0.24, 1],
} as const;

export const swift: Transition = { duration: 0.18, ease: easing.outQuint };
export const glide: Transition = { duration: 0.6, ease: easing.outExpo };
export const settle: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 34,
  mass: 0.9,
};

/** Parent that releases children one after another. */
export const stagger = (gap = 0.06, delay = 0): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren: gap, delayChildren: delay },
  },
});

/** The house reveal: up 16px, fade, slight blur burn-off. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: glide,
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: glide },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: settle },
};

/** Route-level transition — content lifts in, never flashes. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.34, ease: easing.outExpo } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.18, ease: easing.inOutQuart } },
};

/** Shared viewport config so every scroll reveal fires at the same threshold. */
export const revealViewport = { once: true, amount: 0.25, margin: "0px 0px -8% 0px" } as const;
