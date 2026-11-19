"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Fades and lifts its children in the first time they scroll into view.
 *
 * Server-rendered visible, so the page reads fine without JavaScript. After
 * hydration only elements still below the fold are hidden, so nothing that is
 * already on screen flickers. Reduced motion skips it entirely.
 */
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [state, setState] = React.useState<"static" | "hidden" | "shown">("static");

  React.useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (element.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    setState("hidden");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState("shown");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={state === "shown" && delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        state !== "static" && "transition-[opacity,transform] duration-700 ease-out",
        state === "hidden" && "translate-y-4 opacity-0",
        state === "shown" && "translate-y-0 opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}
