import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  ListChecks,
  MapPin,
  MessagesSquare,
  ShieldAlert,
  UserRound,
} from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Aurora, GridField } from "@/components/visuals/aurora";
import { FIRST_SHIFT } from "@/lib/constants/mission";

export const metadata: Metadata = {
  title: "Mission brief",
  description: "The First Shift — your role, the store, and what you are accountable for.",
};

const SPECS = [
  { icon: UserRound, label: "Your role", value: FIRST_SHIFT.role },
  { icon: MapPin, label: "Where", value: FIRST_SHIFT.location },
  { icon: Clock3, label: "How long", value: `${FIRST_SHIFT.durationMinutes} minutes, no pause` },
  { icon: ShieldAlert, label: "Difficulty", value: FIRST_SHIFT.difficulty },
] as const;

const SHAPE = [
  {
    icon: ListChecks,
    title: "Work arrives faster than you can clear it",
    body: "A new task lands every twenty to forty seconds — absences, a stockout, a supplier at the dock, head office wanting a report. Three to eight sit waiting at any moment. You will not get through all of them, and you are not meant to.",
  },
  {
    icon: MessagesSquare,
    title: "Three colleagues answer in real time",
    body: "A store manager stuck in traffic, an inventory lead who knows the shelf better than the system, and a customer whose order is late. They have opinions and incomplete information, like everyone at work.",
  },
  {
    icon: ShieldAlert,
    title: "Ignoring something is a decision",
    body: "Every task expires. Some of them get worse when they do — a worker walks, stock goes phantom, a rating slips. Choosing what to drop is most of the job.",
  },
] as const;

export default function BriefPage() {
  return (
    <main id="main" className="relative min-h-dvh overflow-hidden">
      <Aurora />
      <GridField />

      <div className="relative mx-auto max-w-3xl px-5 py-16 sm:px-6 sm:py-24">
        <Reveal>
          <Link href="/" className="flex w-fit items-center gap-2.5">
            <LogoMark className="size-6" />
            <span className="text-[12.5px] font-semibold tracking-[0.18em] text-hi">
              OPERATOR<span className="text-lo"> FORGE</span>
            </span>
          </Link>
        </Reveal>

        {/* ── Who you are ─────────────────────────────────────────────── */}
        <Reveal delay={0.05} className="mt-14">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge tone="ember">{FIRST_SHIFT.codename}</Badge>
            <Badge tone="neutral">Single attempt</Badge>
            <Badge tone="neutral">{FIRST_SHIFT.industry}</Badge>
          </div>

          <h1 className="mt-6 text-[clamp(2.1rem,5.5vw,3.4rem)] leading-[1.02] font-semibold tracking-[-0.04em] text-gradient text-balance">
            {FIRST_SHIFT.name}
          </h1>

          <p className="mt-5 text-[17px] leading-relaxed text-ember-400/90">
            {FIRST_SHIFT.tagline}
          </p>

          <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-mid">
            {FIRST_SHIFT.summary}
          </p>
        </Reveal>

        {/* ── The facts ───────────────────────────────────────────────── */}
        <RevealGroup
          gap={0.05}
          className="mt-10 grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2"
        >
          {SPECS.map((spec) => (
            <RevealItem key={spec.label} className="bg-surface px-5 py-4">
              <div className="flex items-center gap-2 text-lo">
                <spec.icon className="size-3.5" />
                <span className="font-mono text-[10px] tracking-[0.14em] uppercase">
                  {spec.label}
                </span>
              </div>
              <p className="mt-2 text-[15px] text-hi">{spec.value}</p>
            </RevealItem>
          ))}
        </RevealGroup>

        {/* ── What it feels like ──────────────────────────────────────── */}
        <Reveal className="mt-16">
          <h2 className="text-[22px] leading-tight font-semibold tracking-[-0.03em] text-hi">
            What you are walking into
          </h2>
        </Reveal>

        <RevealGroup gap={0.07} className="mt-6 space-y-4">
          {SHAPE.map((item) => (
            <RevealItem
              key={item.title}
              className="panel sheen flex gap-4 p-5 sm:p-6"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-line-strong bg-obsidian text-ember-500">
                <item.icon className="size-4" />
              </span>
              <div className="min-w-0">
                <h3 className="text-[15px] font-medium text-hi">{item.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-mid">{item.body}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>

        {/* ── Goals ───────────────────────────────────────────────────── */}
        <Reveal className="mt-16">
          <h2 className="text-[22px] leading-tight font-semibold tracking-[-0.03em] text-hi">
            What you are accountable for
          </h2>
          <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-mid">
            Four things, none of which have a single correct answer.
          </p>
        </Reveal>

        <RevealGroup gap={0.06} className="mt-6 space-y-3">
          {FIRST_SHIFT.objectives.map((objective, index) => (
            <RevealItem
              key={objective}
              className="flex gap-4 rounded-card border border-line bg-surface px-5 py-4"
            >
              <span className="mt-0.5 font-mono text-[11px] text-faint tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="text-[14.5px] leading-relaxed text-mid">{objective}</p>
            </RevealItem>
          ))}
        </RevealGroup>

        {/* ── How you are read ────────────────────────────────────────── */}
        <Reveal className="panel sheen mt-16 p-6 sm:p-8">
          <p className="font-mono text-[10.5px] tracking-[0.16em] text-faint uppercase">
            How you will be read
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-mid">
            There is no mark at the end of this. You get an Operator Genome — a
            portrait of how you worked, drawn from what you reached for first,
            what you let expire, who you asked, and how fast you were still
            deciding at minute twenty-five.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-mid">
            Ten capabilities, none of them scored out of a hundred. Nothing is
            shown to you while the clock is running.
          </p>
        </Reveal>

        {/* ── Go ──────────────────────────────────────────────────────── */}
        <Reveal className="mt-12 flex flex-col items-center gap-4 text-center">
          <Button asChild variant="primary" size="lg" className="w-full sm:w-auto">
            <Link href="/login">
              Report for your shift
              <ArrowRight className="transition-transform duration-300 ease-out-expo group-hover/btn:translate-x-1" />
            </Link>
          </Button>
          <p className="font-mono text-[10.5px] tracking-[0.14em] text-faint uppercase">
            Sign in first · about twenty seconds
          </p>
          <Link
            href="/"
            className="text-[13px] text-lo transition-colors hover:text-mid"
          >
            Back to the overview
          </Link>
        </Reveal>
      </div>
    </main>
  );
}
