import {
  BadgeCheck,
  CalendarDays,
  Check,
  type LucideIcon,
  MessageSquareQuote,
  Mic,
  Presentation,
  Radio,
  UserRoundCheck,
  Users,
  UsersRound,
  X,
} from "lucide-react";

import type { Mentor } from "@/lib/constants/operator-bootcamp";
import { cn } from "@/lib/utils";

import { HAIRLINE, MUTED } from "./section";

/** Icons by the names the config uses, so the config never imports a component. */
const ICONS: Record<string, LucideIcon> = {
  calendar: CalendarDays,
  live: Radio,
  seats: Users,
  interview: UserRoundCheck,
  sessions: Presentation,
  missions: UsersRound,
  feedback: MessageSquareQuote,
  ama: Mic,
  yes: Check,
  no: X,
  assured: BadgeCheck,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const Glyph = ICONS[name] ?? Check;
  return <Glyph className={className} aria-hidden />;
}

/** A big number and what it counts. */
export function StatCard({ value, label, highlight = false }: { value: string; label: string; highlight?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-full min-w-[11.5rem] snap-start flex-col justify-between rounded-2xl border p-5 md:min-w-0",
        highlight ? "border-ember-500 bg-ember-500" : cn("bg-white", HAIRLINE),
      )}
    >
      <p className="text-[52px] leading-none font-bold tracking-[-0.05em] whitespace-nowrap tabular-nums md:text-[60px]">{value}</p>
      <p className={cn("mt-4 text-[15px] leading-snug", highlight ? "font-medium text-[#111111]" : MUTED)}>{label}</p>
    </div>
  );
}

/** One week of the curriculum. */
export function WeekCard({ week, weekLabel, title, outcome }: { week: string; weekLabel: string; title: string; outcome: string }) {
  return (
    <article className={cn("relative h-full rounded-2xl border bg-white p-6", HAIRLINE)}>
      <p className="flex items-baseline gap-2 font-mono text-[12px] tracking-[0.16em] text-[#5C5C57] uppercase">
        {weekLabel}
        <span className="text-[28px] font-bold tracking-[-0.04em] text-[#111111] tabular-nums">{week}</span>
      </p>
      <h3 className="mt-4 text-[22px] leading-tight font-bold tracking-[-0.025em]">{title}</h3>
      <p className={cn("mt-2 text-[16px] leading-relaxed", MUTED)}>{outcome}</p>
    </article>
  );
}

/** A numbered step: admissions and the pathway. */
export function Step({ number, title, body, dark = false }: { number: string; title: string; body: string; dark?: boolean }) {
  return (
    <div>
      <span
        className={cn(
          "inline-grid size-12 place-items-center rounded-full font-mono text-[15px] font-semibold",
          dark ? "bg-ember-500 text-[#111111]" : "border border-[#111111] bg-[#FAFAF7] text-[#111111]",
        )}
      >
        {number}
      </span>
      <h3 className="mt-4 text-[21px] leading-tight font-bold tracking-[-0.02em]">{title}</h3>
      <p className={cn("mt-2 text-[16px] leading-relaxed", MUTED)}>{body}</p>
    </div>
  );
}

/** Initials from a name, ignoring brackets and punctuation: "[Name]" → "N". */
function initialsOf(name: string): string {
  const letters = name
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase());
  return letters.slice(0, 2).join("") || "?";
}

export function MentorCard({ mentor }: { mentor: Mentor }) {
  return (
    <article className={cn("flex h-full gap-4 rounded-2xl border bg-white p-5", HAIRLINE)}>
      {mentor.photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- a small avatar; next/image would need sizes for a 56px square.
        <img src={mentor.photo} alt="" width={56} height={56} loading="lazy" decoding="async" className="size-14 shrink-0 rounded-full object-cover" />
      ) : (
        <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-[#111111] text-[18px] font-bold text-ember-500">
          {initialsOf(mentor.name)}
        </span>
      )}
      <div className="min-w-0">
        <h3 className="text-[18px] leading-tight font-bold tracking-[-0.02em]">{mentor.name}</h3>
        <p className="mt-0.5 text-[14px] font-medium text-[#111111]/80">{mentor.role}</p>
        <p className={cn("mt-2 text-[15px] leading-relaxed", MUTED)}>{mentor.bio}</p>
      </div>
    </article>
  );
}
