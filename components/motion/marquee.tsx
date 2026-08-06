"use client";

import { cn } from "@/lib/utils";

interface MarqueeProps extends React.ComponentProps<"div"> {
  /** Seconds for one full pass. */
  speed?: number;
}

/** Infinite horizontal rail. Content is duplicated once for a seamless loop. */
export function Marquee({ className, children, speed = 42, ...props }: MarqueeProps) {
  return (
    <div className={cn("mask-fade-x group/marquee overflow-hidden", className)} {...props}>
      <div
        className="flex w-max animate-marquee items-center group-hover/marquee:[animation-play-state:paused]"
        style={{ animationDuration: `${speed}s` }}
      >
        <div className="flex shrink-0 items-center">{children}</div>
        <div aria-hidden className="flex shrink-0 items-center">
          {children}
        </div>
      </div>
    </div>
  );
}
