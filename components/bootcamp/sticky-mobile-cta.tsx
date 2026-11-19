"use client";

import * as React from "react";

import { BOOTCAMP } from "@/lib/constants/operator-bootcamp";
import { cn } from "@/lib/utils";

import { CTAButton } from "./cta-button";

/**
 * The phone-only bar: "₹10,000 to start · Apply now". It slides up once the
 * hero has scrolled away, so it never covers the hero's own button.
 */
export function StickyMobileCTA({ heroId }: { heroId: string }) {
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const hero = document.getElementById(heroId);
    if (!hero || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setShown(!entry!.isIntersecting), { threshold: 0 });
    observer.observe(hero);
    return () => observer.disconnect();
  }, [heroId]);

  return (
    <div
      aria-hidden={!shown}
      inert={!shown}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-[#E6E4DD] bg-[#FAFAF7]/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md transition-transform duration-300 motion-reduce:transition-none md:hidden",
        shown ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] font-semibold text-[#111111]">{BOOTCAMP.mobileBar.text}</p>
        <CTAButton label={BOOTCAMP.mobileBar.cta} location="mobile-bar" variant="compact" />
      </div>
    </div>
  );
}
