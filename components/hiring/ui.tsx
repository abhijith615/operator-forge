"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Check, ChevronRight, UserRound, X } from "lucide-react";

import type { RecordRow } from "@/lib/hiring/content";
import { STATION_LABEL } from "@/lib/hiring/roster";
import type { OwnerOption } from "@/lib/hiring/view";
import { cn } from "@/lib/utils";

import { useShuffle } from "./shuffle";

/**
 * The Hiring Test's shared surface.
 *
 * Charcoal, with yellow for what the candidate can act on, teal for a store
 * that is keeping up, orange for one that is not, and red kept back for the
 * few things that are actually critical. Nothing here says right or wrong —
 * the colours describe the store, never the candidate.
 */

/* ── Layout ───────────────────────────────────────────────────────────── */

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-[18px] border border-line bg-surface p-4 sm:p-5", className)} {...props} />;
}

export function Eyebrow({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("font-mono text-[11.5px] tracking-[0.18em] text-lo uppercase", className)} {...props} />;
}

export function SceneHeading({
  eyebrow,
  title,
  sub,
  media,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  /** A picture of the thing the scene is about, shown beside the title. */
  media?: React.ReactNode;
}) {
  return (
    <header className="mb-4 flex items-center gap-3.5">
      {media}
      <div className="min-w-0">
        <Eyebrow className="text-ember-500">{eyebrow}</Eyebrow>
        <h1 className="mt-1.5 text-[24px] leading-[1.1] font-semibold tracking-[-0.03em] text-hi text-balance sm:text-[28px]">
          {title}
        </h1>
        {sub ? <p className="mt-2 text-[14.5px] leading-relaxed text-mid">{sub}</p> : null}
      </div>
    </header>
  );
}

/** The one thing to press, pinned where a thumb is. */
export function ActionBar({ children, note }: { children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-void/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {note ? <p className="text-center text-[12.5px] text-lo">{note}</p> : null}
        <div className="flex items-stretch gap-2 sm:justify-end [&>button]:w-auto [&>button:last-child]:flex-1 [&>button:not(:last-child)]:shrink-0 sm:[&>button:last-child]:flex-none">{children}</div>
      </div>
    </div>
  );
}

export function PrimaryButton({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full px-5 sm:w-auto sm:px-7",
        "bg-ember-500 text-[14px] font-bold tracking-[0.08em] text-void uppercase",
        "transition-[transform,filter,opacity] duration-150 hover:brightness-110 active:scale-[0.985]",
        "disabled:pointer-events-none disabled:opacity-35",
        className,
      )}
      {...props}
    />
  );
}

export function QuietButton({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-line-strong px-5 sm:w-auto",
        "bg-white/[0.04] text-[13.5px] font-semibold tracking-[0.04em] text-hi uppercase",
        "transition-colors hover:border-line-bright hover:bg-white/[0.08] active:scale-[0.985]",
        "disabled:pointer-events-none disabled:opacity-35",
        className,
      )}
      {...props}
    />
  );
}

/* ── Numbers ──────────────────────────────────────────────────────────── */

export type Tone = "neutral" | "good" | "caution" | "critical";

const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-hi",
  good: "text-ion-400",
  caution: "text-warn-500",
  critical: "text-alert-500",
};

export function Stat({
  label,
  value,
  unit,
  tone = "neutral",
  className,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 rounded-[14px] border border-line bg-white/[0.02] px-3 py-2.5", className)}>
      <p className="truncate font-mono text-[11px] tracking-[0.14em] text-lo uppercase">{label}</p>
      <p className={cn("tabular mt-1 text-[22px] leading-none font-semibold tracking-[-0.02em]", TONE_TEXT[tone])}>
        {value}
        {unit ? <span className="ml-1 text-[12.5px] font-medium text-lo">{unit}</span> : null}
      </p>
    </div>
  );
}

/** How a station stands against what it is being asked for. */
export function coverageTone(value: number): Tone {
  if (value >= 0.97) return "good";
  if (value >= 0.7) return "caution";
  return "critical";
}

const TONE_BAR: Record<Tone, string> = {
  neutral: "bg-white/40",
  good: "bg-ion-500",
  caution: "bg-warn-500",
  critical: "bg-alert-500",
};

/** A bar that runs to 140%, with the line that matters drawn at 100. */
export function Meter({ label, value, hint, className }: { label: string; value: number; hint?: string; className?: string }) {
  const tone = coverageTone(value);
  const width = Math.min(100, (value / 1.4) * 100);
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-[13px] font-medium text-mid">{label}</span>
        <span className={cn("tabular text-[15px] font-semibold", TONE_TEXT[tone])}>{Math.round(value * 100)}%</span>
      </div>
      <div className="relative mt-1.5 h-1.5 rounded-full bg-white/[0.07]" role="img" aria-label={`${label} ${Math.round(value * 100)} percent of forecast`}>
        <div className={cn("h-full rounded-full transition-[width] duration-500 ease-out-expo", TONE_BAR[tone])} style={{ width: `${width}%` }} />
        <span aria-hidden className="absolute -top-0.5 h-2.5 w-px bg-white/45" style={{ left: `${(1 / 1.4) * 100}%` }} />
      </div>
      {hint ? <p className="mt-1 text-[12px] text-lo">{hint}</p> : null}
    </div>
  );
}

/* ── People talking ───────────────────────────────────────────────────── */

export function Speech({ who, role, lines, className }: { who: string; role?: string; lines: string[]; className?: string }) {
  return (
    <figure className={cn("flex gap-3", className)}>
      <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line-strong bg-elevated text-[13px] font-semibold text-hi">
        {who.slice(0, 1)}
      </span>
      <div className="min-w-0">
        <figcaption className="text-[12.5px] text-lo">
          <span className="font-semibold text-mid">{who}</span>
          {role ? ` · ${role}` : null}
        </figcaption>
        <blockquote className="mt-1.5 space-y-1.5">
          {lines.map((line) => (
            <p key={line} className="w-fit max-w-full rounded-[14px] rounded-tl-[4px] border border-line bg-elevated px-3.5 py-2 text-[15px] leading-snug text-hi">
              {line}
            </p>
          ))}
        </blockquote>
      </div>
    </figure>
  );
}

/* ── Records ──────────────────────────────────────────────────────────── */

export function Records({ note, rows }: { note?: string; rows: RecordRow[] }) {
  return (
    <div>
      {note ? <p className="mb-2 text-[13px] text-lo">{note}</p> : null}
      <ul className="divide-y divide-line rounded-[14px] border border-line bg-white/[0.02]">
        {rows.map((row, index) => (
          <li key={`${row.time}-${row.text}-${index}`} className="flex items-baseline gap-3 px-3 py-2.5">
            <span className="tabular w-12 shrink-0 font-mono text-[12px] text-lo">{row.time}</span>
            <span className={cn("min-w-0 flex-1 text-[14px] leading-snug", row.gap ? "text-mid" : "text-hi")}>{row.text}</span>
            {row.value ? (
              <span className={cn("tabular shrink-0 text-right text-[13px] font-medium", row.gap ? "text-warn-500" : "text-mid")}>{row.value}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Facts({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0">
          <dt className="font-mono text-[11px] tracking-[0.14em] text-lo uppercase">{row.label}</dt>
          <dd className="mt-0.5 text-[15px] font-semibold text-hi">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ── Choosing ─────────────────────────────────────────────────────────── */

/** A choice that is a surface to press, not a radio button. */
export function Choice({
  selected,
  onClick,
  children,
  detail,
  disabled,
  className,
  go = false,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  detail?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  /** Does something the moment it is pressed, rather than being selected. */
  go?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={go ? undefined : Boolean(selected)}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-[52px] w-full items-center gap-3 rounded-[14px] border px-3.5 py-3 text-left transition-colors",
        selected ? "border-ember-500/70 bg-ember-500/[0.09]" : "border-line-strong bg-white/[0.025] hover:border-line-bright hover:bg-white/[0.05]",
        "disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
    >
      {go ? null : (
        <span
          aria-hidden
          className={cn(
            "grid size-5 shrink-0 place-items-center rounded-[6px] border",
            selected ? "border-ember-500 bg-ember-500 text-void" : "border-line-bright",
          )}
        >
          {selected ? <Check className="size-3.5" strokeWidth={3} /> : null}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] leading-snug font-medium text-hi">{children}</span>
        {detail ? <span className="mt-0.5 block text-[12.5px] leading-snug text-lo">{detail}</span> : null}
      </span>
      {go ? <ChevronRight className="size-4 shrink-0 text-lo" aria-hidden /> : null}
    </button>
  );
}

/** Something to open and read. Shows that it has been opened, and nothing else. */
export function Tile({
  label,
  detail,
  opened,
  onClick,
  icon,
  disabled,
}: {
  label: string;
  detail?: string;
  opened?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-h-[56px] w-full items-center gap-3 rounded-[14px] border px-3.5 py-3 text-left transition-colors",
        opened ? "border-line-bright bg-white/[0.05]" : "border-line-strong bg-white/[0.025] hover:border-line-bright hover:bg-white/[0.05]",
        "disabled:pointer-events-none disabled:opacity-40",
      )}
    >
      {icon ? <span className="shrink-0 text-ember-500 [&_svg]:size-[18px]">{icon}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-semibold text-hi">{label}</span>
        {detail ? <span className="mt-0.5 block text-[12.5px] text-lo">{detail}</span> : null}
      </span>
      {opened ? (
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/[0.09] text-mid">
          <Check className="size-3" strokeWidth={3} aria-hidden />
          <span className="sr-only">Opened</span>
        </span>
      ) : (
        <ChevronRight className="size-4 shrink-0 text-lo" aria-hidden />
      )}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T | null;
  options: { id: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          disabled={option.disabled}
          onClick={() => onChange(option.id)}
          className={cn(
            "min-h-[46px] rounded-[12px] border px-1 text-[12px] font-bold tracking-[0.03em] whitespace-nowrap uppercase transition-colors sm:text-[12.5px] sm:tracking-[0.06em]",
            value === option.id
              ? "border-ember-500 bg-ember-500 text-void"
              : "border-line-strong bg-white/[0.03] text-mid hover:border-line-bright hover:text-hi",
            "disabled:pointer-events-none disabled:opacity-35",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ── Sheets ───────────────────────────────────────────────────────────── */

/** Rises from the bottom on a phone, sits in the middle on a desk. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  dismissable = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  dismissable?: boolean;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={dismissable ? onOpenChange : undefined}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-90 bg-void/80 backdrop-blur-[5px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onEscapeKeyDown={dismissable ? undefined : (event) => event.preventDefault()}
          onPointerDownOutside={dismissable ? undefined : (event) => event.preventDefault()}
          className={cn(
            "fixed inset-x-0 bottom-0 z-100 flex max-h-[88dvh] flex-col rounded-t-[24px] border border-line-strong bg-obsidian shadow-2xl shadow-black",
            "sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[min(34rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[24px]",
            "duration-300 ease-out-expo data-[state=closed]:animate-out data-[state=open]:animate-in",
            "data-[state=closed]:slide-out-to-bottom-8 data-[state=open]:slide-in-from-bottom-8 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        >
          <div className="flex items-start gap-3 border-b border-line px-5 pt-5 pb-4">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="text-[18px] leading-tight font-semibold tracking-[-0.02em] text-hi">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1 text-[13.5px] leading-snug text-mid">{description}</DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
              )}
            </div>
            {dismissable ? (
              <DialogPrimitive.Close className="grid size-9 shrink-0 place-items-center rounded-full text-lo transition-colors hover:bg-white/[0.07] hover:text-hi">
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

const FIT_TONE: Record<OwnerOption["fit"], string> = {
  strong: "text-ion-400",
  possible: "text-mid",
  weak: "text-warn-500",
};

/**
 * HANDLE MYSELF, or ASSIGN TO…
 *
 * The same sheet wherever a piece of work needs an owner. It says who suits
 * the job and what handing it to them costs, and leaves the choice alone.
 */
export function OwnerSheet({
  open,
  onOpenChange,
  title,
  description,
  options,
  onPick,
  self,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  options: OwnerOption[];
  onPick: (owner: string) => void;
  /** Leave out where the manager cannot do the job personally. */
  self?: { note?: string };
}) {
  const pick = (owner: string) => {
    onOpenChange(false);
    onPick(owner);
  };
  // Not best-suited first: who suits the job is on each row to be read, not given away by where the row sits.
  const order = useShuffle(`owner:${title}`);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} description={description}>
      {self ? (
        <>
          <button
            type="button"
            onClick={() => pick("me")}
            className="flex min-h-[56px] w-full items-center gap-3 rounded-[14px] border border-ember-500/45 bg-ember-500/[0.07] px-3.5 py-3 text-left transition-colors hover:bg-ember-500/[0.12]"
          >
            <UserRound className="size-5 shrink-0 text-ember-500" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-bold tracking-[0.06em] text-hi uppercase">Handle myself</span>
              <span className="mt-0.5 block text-[12.5px] text-mid">{self.note ?? "Accurate, and uses your attention while you do it"}</span>
            </span>
          </button>
          <Eyebrow className="mt-5 mb-2">Assign to</Eyebrow>
        </>
      ) : null}
      <ul className="space-y-1.5">
        {order(options).map((option) => (
          <li key={option.id}>
            <button
              type="button"
              onClick={() => pick(option.id)}
              className="flex min-h-[56px] w-full items-center gap-3 rounded-[14px] border border-line-strong bg-white/[0.025] px-3.5 py-2.5 text-left transition-colors hover:border-line-bright hover:bg-white/[0.06]"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line-strong bg-elevated text-[13px] font-semibold text-hi">
                {option.name.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[14.5px] font-semibold text-hi">{option.name}</span>
                  <span className="text-[12.5px] text-lo">
                    {option.title} · {STATION_LABEL[option.station].split(" ")[0]}
                  </span>
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-lo">{option.note}</span>
              </span>
              <span className={cn("shrink-0 text-right text-[12.5px] font-semibold", FIT_TONE[option.fit])}>{option.fitLabel}</span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

export function Notice({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[14px] border px-3.5 py-3 text-[14px] leading-snug",
        tone === "critical"
          ? "border-alert-500/40 bg-alert-500/[0.08] text-hi"
          : tone === "caution"
            ? "border-warn-500/40 bg-warn-500/[0.08] text-hi"
            : tone === "good"
              ? "border-ion-500/35 bg-ion-500/[0.07] text-hi"
              : "border-line-strong bg-white/[0.03] text-mid",
        className,
      )}
    >
      {children}
    </div>
  );
}
