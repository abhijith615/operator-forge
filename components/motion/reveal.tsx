"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

import { revealViewport, riseIn, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface RevealProps extends Omit<HTMLMotionProps<"div">, "variants"> {
  delay?: number;
  as?: "div" | "section" | "li" | "article" | "header";
}

/** Single element that rises into view once, on scroll. */
export function Reveal({ className, delay = 0, children, ...props }: RevealProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={revealViewport}
      variants={riseIn}
      transition={{ delay }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface RevealGroupProps extends Omit<HTMLMotionProps<"div">, "variants"> {
  gap?: number;
  delay?: number;
}

/** Parent that releases `Reveal.Item` children in sequence. */
export function RevealGroup({
  className,
  gap = 0.07,
  delay = 0,
  children,
  ...props
}: RevealGroupProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={revealViewport}
      variants={stagger(gap, delay)}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  className,
  children,
  ...props
}: Omit<HTMLMotionProps<"div">, "variants">) {
  return (
    <motion.div variants={riseIn} className={cn(className)} {...props}>
      {children}
    </motion.div>
  );
}
