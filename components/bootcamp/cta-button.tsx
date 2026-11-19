"use client";

import { ArrowRight } from "lucide-react";

import { trackApplyClick } from "@/lib/bootcamp/track";
import { APPLY_URL } from "@/lib/constants/operator-bootcamp";
import { cn } from "@/lib/utils";

const VARIANT = {
  /** The main action, on the light page. */
  primary:
    "min-h-14 py-3 px-6 text-[16px] leading-tight text-center bg-ember-500 text-[#111111] hover:brightness-105 focus-visible:ring-[#111111] focus-visible:ring-offset-[#FAFAF7]",
  /** The same action on the dark fee section. */
  onDark: "min-h-14 py-3 px-6 text-[16px] leading-tight text-center bg-ember-500 text-[#111111] hover:brightness-110 focus-visible:ring-ember-500 focus-visible:ring-offset-[#111111]",
  /** Compact, for the header and the mobile bar. */
  compact: "h-10 px-4 text-[14px] whitespace-nowrap bg-[#111111] text-white hover:bg-[#2A2A2A] focus-visible:ring-[#111111] focus-visible:ring-offset-[#FAFAF7]",
} as const;

/**
 * "Apply for the selection interview", wherever it appears. Every click sends
 * `apply_click` with the section it came from.
 */
export function CTAButton({
  label,
  location,
  variant = "primary",
  arrow = true,
  className,
}: {
  label: string;
  location: string;
  variant?: keyof typeof VARIANT;
  arrow?: boolean;
  className?: string;
}) {
  const external = /^https?:\/\//.test(APPLY_URL);
  return (
    <a
      href={APPLY_URL}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      onClick={() => trackApplyClick(location)}
      className={cn(
        "group inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[filter,background-color] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        VARIANT[variant],
        className,
      )}
    >
      {label}
      {arrow ? <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden /> : null}
    </a>
  );
}
