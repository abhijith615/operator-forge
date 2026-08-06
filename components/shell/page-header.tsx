import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="font-mono text-[10.5px] tracking-[0.2em] text-ember-500 uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-2.5 text-[26px] leading-tight font-semibold tracking-[-0.03em] text-hi sm:text-[30px]">
          {title}
        </h2>
        {description ? (
          <p className="mt-2.5 max-w-2xl text-[14.5px] leading-relaxed text-mid">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </div>
  );
}

export function PageShell({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10", className)}
      {...props}
    />
  );
}
