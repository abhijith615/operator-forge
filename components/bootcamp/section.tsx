import type { Emphasised } from "@/lib/constants/operator-bootcamp";
import { cn } from "@/lib/utils";

/** Page width and gutters, shared by every section and the header. */
export const CONTAINER = "mx-auto w-full max-w-[1200px] px-5 md:px-8";

/** A landmark section: labelled by its own heading, offset for the sticky header. */
export function Section({
  id,
  labelledBy,
  dark = false,
  className,
  children,
}: {
  id: string;
  labelledBy: string;
  dark?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn("scroll-mt-16 py-16 md:py-24", dark ? "bg-[#111111] text-white" : "text-[#111111]", className)}
    >
      <div className={CONTAINER}>{children}</div>
    </section>
  );
}

/**
 * A headline with one or two emphasised words: italic, with the brand yellow
 * as a marker behind them on light sections and as the text colour on dark.
 */
export function Headline({
  id,
  parts,
  as: Tag = "h2",
  dark = false,
  className,
}: {
  id?: string;
  parts: Emphasised;
  as?: "h1" | "h2" | "h3";
  dark?: boolean;
  className?: string;
}) {
  return (
    <Tag
      id={id}
      className={cn(
        "font-bold tracking-[-0.04em] text-balance",
        Tag === "h1" ? "text-[clamp(2.4rem,6.2vw,4.5rem)] leading-[1.02]" : "text-[clamp(2rem,4.6vw,3.4rem)] leading-[1.05]",
        className,
      )}
    >
      {parts.map((part, index) =>
        part.em ? (
          <em
            key={index}
            className={cn(
              "italic",
              dark
                ? "text-ember-500"
                : "bg-[linear-gradient(transparent_62%,var(--color-ember-500)_62%,var(--color-ember-500)_92%,transparent_92%)] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]",
            )}
          >
            {part.text}
          </em>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </Tag>
  );
}

/** Secondary text colour on the light page: #5C5C57 on #FAFAF7 is above 6:1. */
export const MUTED = "text-[#5C5C57]";
/** The thin border used everywhere. */
export const HAIRLINE = "border-[#E6E4DD]";
