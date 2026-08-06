import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}

/** House heading rhythm: index label, statement, one clarifying line. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      <Reveal>
        <div
          className={cn(
            "flex items-center gap-2.5",
            align === "center" && "justify-center",
          )}
        >
          <span className="h-px w-6 bg-ember-500/60" />
          <span className="font-mono text-[10.5px] tracking-[0.2em] text-ember-500 uppercase">
            {eyebrow}
          </span>
        </div>
      </Reveal>
      <Reveal delay={0.06}>
        <h2 className="mt-5 text-[clamp(1.9rem,4.2vw,3.15rem)] leading-[1.04] font-semibold tracking-[-0.035em] text-gradient text-balance">
          {title}
        </h2>
      </Reveal>
      {description ? (
        <Reveal delay={0.12}>
          <p className="mt-5 text-[16px] leading-relaxed text-mid text-balance">
            {description}
          </p>
        </Reveal>
      ) : null}
    </div>
  );
}

export function Section({
  className,
  children,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("relative py-24 sm:py-32", className)}
      {...props}
    >
      {children}
    </section>
  );
}

export function Container({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto max-w-6xl px-4 sm:px-6", className)} {...props} />;
}
