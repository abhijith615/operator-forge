"use client";

import * as React from "react";
import { animate, useInView, useMotionValue } from "framer-motion";

import { cn } from "@/lib/utils";

interface CountUpProps extends React.ComponentProps<"span"> {
  to: number;
  from?: number;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}

/** Numeric readout that counts up the first time it enters view. */
export function CountUp({
  to,
  from = 0,
  decimals = 0,
  duration = 1.6,
  prefix = "",
  suffix = "",
  className,
  ...props
}: CountUpProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const value = useMotionValue(from);
  const [display, setDisplay] = React.useState(from.toFixed(decimals));

  React.useEffect(() => {
    if (!inView) return;
    const controls = animate(value, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(latest.toFixed(decimals)),
    });
    return () => controls.stop();
  }, [inView, to, duration, decimals, value]);

  return (
    <span ref={ref} data-readout className={cn(className)} {...props}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
