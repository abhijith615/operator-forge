"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowRight, Lock, ShieldCheck, TrendingUp } from "lucide-react";

import {
  Avatar,
  CoverageMeter,
  MomentHeading,
  Shift,
  SkillStars,
  StaffMessage,
  TONE_TEXT,
  coverTone,
} from "@/components/challenge/day-three/ui";
import { Button } from "@/components/ui/button";
import {
  AUDIT,
  RECEIVING,
} from "@/lib/challenge/day-three/workforce";
import {
  EVENING_END,
  HIGH_DEMAND_CATEGORIES,
  clockLabel,
  peakLift,
} from "@/lib/challenge/day-three/forecast";
import {
  COVER_LABEL,
  type Bottleneck,
  type CoverLane,
  type LateEvent,
  type ReceivingOutcome,
  type Station,
  type Worker,
} from "@/lib/challenge/day-three/types";
import { rupees } from "@/lib/challenge/day-two/ledger";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

const STATIONS: Station[] = ["picking", "packing", "dispatch"];

/* ── Phase 1 ──────────────────────────────────────────────────────────── */

export function CoreMoment({
  time,
  coverage,
  bottleneck,
  unassigned,
  onConfirm,
}: {
  time: string;
  coverage: Record<CoverLane, number>;
  bottleneck: Bottleneck | null;
  unassigned: number;
  onConfirm: () => void;
}) {
  // Nothing to read until people are on the board.
  const empty = unassigned >= 13;
  const insight = empty
    ? null
    : coverage.picking - coverage.packing > 0.2
      ? "Picking may create work faster than packing can clear it."
      : coverage.packing - coverage.picking > 0.25
        ? "Packing will stand idle waiting on picking — the queue forms at the shelves."
        : coverage.dispatch < 0.85
          ? "Packed orders will wait at the dispatch bay."
          : null;

  return (
    <section className="space-y-3">
      <MomentHeading
        time={time}
        eyebrow="Build your core team"
        title="Put thirteen people where the evening needs them."
        sub="Tap Pick, Pack or Disp on a card, or drag it onto the board. Coverage is for the 7–9 PM peak, as forecast at 4:30."
      />
      <div className="grid grid-cols-3 gap-2">
        {STATIONS.map((station) => (
          <CoverageMeter key={station} lane={station} value={coverage[station]} />
        ))}
      </div>
      {empty ? (
        <p className="rounded-card border border-line bg-surface px-3.5 py-2.5 text-[12.5px] text-mid">
          Place people and the board will show where the queue forms first.
        </p>
      ) : bottleneck ? (
        <motion.div
          key={`${bottleneck.lane}-${bottleneck.at}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-card border border-alert-500/45 bg-alert-500/[0.06] px-3.5 py-2.5"
          role="status"
        >
          <span className="font-mono text-[10px] tracking-[0.16em] text-alert-500 uppercase">
            Projected bottleneck
          </span>
          <span className="text-[14px] font-semibold text-hi">
            {COVER_LABEL[bottleneck.lane]} · {clockLabel(bottleneck.at)}
          </span>
          {insight ? <span className="w-full text-[12.5px] text-mid">{insight}</span> : null}
        </motion.div>
      ) : insight ? (
        <p className="rounded-card border border-warn-500/35 bg-warn-500/[0.04] px-3.5 py-2.5 text-[12.5px] text-mid">
          {insight}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" size="lg" onClick={onConfirm}>
          Lock in the core team
          <ArrowRight />
        </Button>
        {unassigned > 0 ? (
          <span className="text-[12px] text-warn-500">
            {unassigned} {unassigned === 1 ? "person is" : "people are"} still unassigned
          </span>
        ) : null}
      </div>
    </section>
  );
}

/* ── Forecast twist ───────────────────────────────────────────────────── */

export function ForecastMoment({
  time,
  before,
  after,
  onKeep,
  onAdjust,
}: {
  time: string;
  before: Record<CoverLane, number>;
  after: Record<CoverLane, number>;
  onKeep: () => void;
  onAdjust: () => void;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.section
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easing.outExpo }}
      className="space-y-3 rounded-card border border-alert-500/45 bg-alert-500/[0.05] p-4"
      role="status"
    >
      <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-alert-500 uppercase">
        <TrendingUp className="size-3.5" aria-hidden />
        {time} · Updated forecast
      </p>
      <p className="text-[clamp(1.4rem,4vw,1.9rem)] leading-tight font-semibold tracking-[-0.03em] text-hi">
        7–9 PM demand revised: +{peakLift(true)}%
        <span className="block text-[13px] font-normal tracking-normal text-mid">
          vs a normal evening · was +{peakLift(false)}% at 4:30
        </span>
      </p>
      <ul className="flex flex-wrap gap-1.5" aria-label="High-demand categories">
        {HIGH_DEMAND_CATEGORIES.map((category) => (
          <li key={category} className="rounded-full border border-line-strong px-2.5 py-1 text-[11.5px] text-mid">
            {category}
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-3 gap-2">
        {STATIONS.map((station) => (
          <div key={station} className="rounded-card border border-line bg-surface px-3 py-2">
            <dt className="font-mono text-[9.5px] tracking-[0.12em] text-faint uppercase">{COVER_LABEL[station]}</dt>
            <dd className="mt-1">
              <Shift from={before[station]} to={after[station]} className="text-[14px]" />
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-[15px] font-semibold text-hi">Would you adjust your floor?</p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="lg" onClick={onKeep}>
          Keep plan
        </Button>
        <Button variant="primary" size="lg" onClick={onAdjust}>
          Adjust
        </Button>
      </div>
    </motion.section>
  );
}

export function AdjustMoment({
  time,
  coverage,
  onDone,
}: {
  time: string;
  coverage: Record<CoverLane, number>;
  onDone: () => void;
}) {
  return (
    <section className="space-y-3">
      <MomentHeading
        time={time}
        eyebrow="Adjust your floor"
        title="Rebalance for a +42% peak."
        sub="Move anyone you like. Flex staff and riders come next — this is about the thirteen you already have."
      />
      <div className="grid grid-cols-3 gap-2">
        {STATIONS.map((station) => (
          <CoverageMeter key={station} lane={station} value={coverage[station]} />
        ))}
      </div>
      <Button variant="primary" size="lg" onClick={onDone}>
        Done adjusting
        <ArrowRight />
      </Button>
    </section>
  );
}

/* ── Phase 2 ──────────────────────────────────────────────────────────── */

export function GapHeading({
  time,
  eyebrow,
  title,
  sub,
  coverage,
  lanes,
}: {
  time: string;
  eyebrow: string;
  title: string;
  sub: string;
  coverage: Record<CoverLane, number>;
  lanes: CoverLane[];
}) {
  return (
    <div className="space-y-3">
      <MomentHeading time={time} eyebrow={eyebrow} title={title} sub={sub} tone="alert" />
      <div className={cn("grid gap-2", lanes.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
        {lanes.map((lane) => (
          <CoverageMeter key={lane} lane={lane} value={coverage[lane]} label={`Peak ${COVER_LABEL[lane].toLowerCase()}`} />
        ))}
      </div>
    </div>
  );
}

/* ── Phase 3 · late ───────────────────────────────────────────────────── */

export function LateMoment({
  time,
  late,
  worker,
  current,
  candidates,
  coverId,
  marketOpen,
  onCover,
  onToggleMarket,
  onConfirm,
  market,
}: {
  time: string;
  late: LateEvent;
  worker: Worker;
  current: number;
  candidates: Worker[];
  coverId: string | null;
  marketOpen: boolean;
  onCover: (workerId: string | null) => void;
  onToggleMarket: () => void;
  onConfirm: () => void;
  market: React.ReactNode;
}) {
  const station = late.station;
  const window = `${clockLabel(late.due)}–${clockLabel(late.arrives)}`;
  const recovered = current >= Math.min(1, late.before) - 0.02 || current >= 0.97;
  const needed = late.atAlert < 0.95;

  return (
    <section className="space-y-3">
      <MomentHeading time={time} eyebrow="The plan breaks" title="Someone isn't coming on time." tone="alert" />
      <StaffMessage
        from={worker.name}
        role={worker.kind === "flex" ? "On-demand · " + (station ? COVER_LABEL[station] : "") : worker.level}
        time={time}
        lines={["I'm stuck in traffic. Earliest arrival is 7:15."]}
        tone="alert"
      />
      {station ? (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-card border border-line bg-surface px-3.5 py-3">
          <span className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">
            {COVER_LABEL[station]} coverage · {window}
          </span>
          <Shift from={late.before} to={current} className="text-[18px]" />
          <span className={cn("w-full text-[12px]", needed ? "text-mid" : "text-ion-400")}>
            {needed
              ? recovered
                ? "Covered. The board has absorbed it."
                : "Repair it however you like — or carry the gap."
              : "Your plan already has room for this. Nothing has to move."}
          </span>
        </div>
      ) : (
        <p className="rounded-card border border-line bg-surface px-3.5 py-3 text-[12.5px] text-mid">
          {worker.name} isn&apos;t on a station tonight, so the board doesn&apos;t move.
        </p>
      )}

      {station && needed ? (
        <div className="space-y-2">
          <p className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">
            Cover {COVER_LABEL[station].toLowerCase()} until 7:15
          </p>
          <div className="flex flex-wrap gap-1.5">
            {candidates.map((candidate) => (
              <PersonChip
                key={candidate.id}
                worker={candidate}
                station={station}
                selected={coverId === candidate.id}
                onClick={() => onCover(coverId === candidate.id ? null : candidate.id)}
              />
            ))}
            <button
              type="button"
              aria-pressed={coverId === "you"}
              onClick={() => onCover(coverId === "you" ? null : "you")}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[12px] transition-colors focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                coverId === "you" ? "border-ember-500 bg-ember-500/15 text-hi" : "border-line-strong text-lo hover:text-mid",
              )}
            >
              Cover it yourself
            </button>
          </div>
          {coverId === "you" ? (
            <p className="text-[11.5px] text-warn-500">While you&apos;re on a station, nobody is running the floor.</p>
          ) : null}
          <button
            type="button"
            onClick={onToggleMarket}
            aria-expanded={marketOpen}
            className="text-[12.5px] text-ember-400 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
          >
            {marketOpen ? "Hide the flex market" : "Book or extend a temp instead"}
          </button>
          {marketOpen ? market : null}
          <p className="text-[11.5px] text-faint">You can also move anyone on the team panel.</p>
        </div>
      ) : null}

      <Button variant={recovered || !needed ? "primary" : "secondary"} size="lg" onClick={onConfirm}>
        {!needed ? "Carry on" : recovered ? "Floor repaired" : "Carry the gap"}
        <ArrowRight />
      </Button>
    </section>
  );
}

function PersonChip({
  worker,
  station,
  selected,
  disabledReason,
  from,
  onClick,
}: {
  worker: Worker;
  station: Station;
  selected: boolean;
  disabledReason?: string;
  from?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      title={disabledReason}
      className={cn(
        "flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
        selected ? "border-ember-500 bg-ember-500/15" : "border-line-strong bg-elevated hover:border-line-bright",
      )}
    >
      <Avatar worker={worker} size="sm" />
      <span className="text-[12px] font-medium text-hi">{worker.name}</span>
      <SkillStars level={worker.skills[station]} className="text-[10px]" />
      {from ? <span className="font-mono text-[9.5px] text-faint">from {from}</span> : null}
    </button>
  );
}

/* ── Phase 3 · receiving ──────────────────────────────────────────────── */

export function ReceivingMoment({
  time,
  preview,
  authorised,
  others,
  backfillCandidates,
  fromOf,
  onAssign,
  onBackfill,
  onSkip,
  onConfirm,
  skipped,
}: {
  time: string;
  preview: ReceivingOutcome;
  authorised: Worker[];
  others: Worker[];
  backfillCandidates: Worker[];
  fromOf: (workerId: string) => string;
  onAssign: (workerId: string) => void;
  onBackfill: (workerId: string | null) => void;
  onSkip: () => void;
  onConfirm: () => void;
  skipped: boolean;
}) {
  const [showOthers, setShowOthers] = React.useState(false);
  const assigned = !preview.skipped && preview.workerId;
  const vacated = preview.vacated;

  return (
    <section className="space-y-3">
      <MomentHeading time={time} eyebrow="Inbound alert" title="High-value electronics vehicle · ETA 6:05 PM" tone="alert" />
      <StaffMessage
        from="Floor Lead"
        role="Store 114"
        time={time}
        lines={["Arjun is one of the authorised staff available for high-value handling."]}
        tone="ember"
      />

      <div className="rounded-card border border-line bg-surface p-3.5">
        <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-lo uppercase">
          <ShieldCheck className="size-3.5 text-ion-400" aria-hidden />
          High-value receiving · {clockLabel(RECEIVING.start)}–{clockLabel(RECEIVING.end)}
        </p>
        <p className="mt-1 text-[12px] text-mid">Drag an authorised associate onto the block on the board, or tap one here.</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {authorised.map((worker) => (
            <ChipButton
              key={worker.id}
              worker={worker}
              selected={preview.workerId === worker.id}
              note={`from ${fromOf(worker.id)}`}
              onClick={() => onAssign(worker.id)}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowOthers((open) => !open)}
          aria-expanded={showOthers}
          className="mt-2 text-[11.5px] text-lo underline-offset-4 hover:text-mid hover:underline"
        >
          {showOthers ? "Hide everyone else" : "Someone else"}
        </button>
        {showOthers ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {others.map((worker) => (
              <ChipButton
                key={worker.id}
                worker={worker}
                selected={preview.workerId === worker.id}
                note="not authorised"
                warn
                onClick={() => onAssign(worker.id)}
              />
            ))}
          </div>
        ) : null}
      </div>

      {assigned && vacated ? (
        <div className="rounded-card border border-line bg-surface p-3.5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">
              {COVER_LABEL[vacated]} · 6:05–6:25 PM
            </span>
            <Shift from={preview.before} to={preview.after} className="text-[18px]" />
          </div>
          <p className="mt-2 font-mono text-[10px] tracking-[0.14em] text-lo uppercase">
            Backfill {COVER_LABEL[vacated].toLowerCase()} for twenty minutes
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {backfillCandidates.map((worker) => (
              <ChipButton
                key={worker.id}
                worker={worker}
                selected={preview.backfillId === worker.id}
                note={`from ${fromOf(worker.id)}`}
                stars={worker.skills[vacated]}
                onClick={() => onBackfill(preview.backfillId === worker.id ? null : worker.id)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {!assigned ? (
        <button
          type="button"
          onClick={onSkip}
          aria-pressed={skipped}
          className={cn(
            "text-[12px] underline-offset-4 hover:underline",
            skipped ? "text-alert-500" : "text-lo hover:text-mid",
          )}
        >
          {skipped
            ? "The vehicle will wait until after the peak, unreceived."
            : "Hold the vehicle until after the peak"}
        </button>
      ) : null}

      <Button variant="primary" size="lg" disabled={!assigned && !skipped} onClick={onConfirm}>
        Continue
        <ArrowRight />
      </Button>
    </section>
  );
}

function ChipButton({
  worker,
  selected,
  note,
  warn,
  stars,
  onClick,
}: {
  worker: Worker;
  selected: boolean;
  note: string;
  warn?: boolean;
  stars?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
        selected
          ? warn
            ? "border-alert-500 bg-alert-500/15"
            : "border-ember-500 bg-ember-500/15"
          : "border-line-strong bg-elevated hover:border-line-bright",
      )}
    >
      <Avatar worker={worker} size="sm" />
      <span className="text-[12px] font-medium text-hi">{worker.name}</span>
      {stars !== undefined ? <SkillStars level={stars as 0 | 1 | 2 | 3} className="text-[10px]" /> : null}
      <span className={cn("font-mono text-[9.5px]", warn ? "text-alert-500" : "text-faint")}>{note}</span>
    </button>
  );
}

/* ── Phase 5 · the audit ──────────────────────────────────────────────── */

const PRESETS = [AUDIT.planned, 300, 390, 480];

export function AuditMoment({
  time,
  start,
  withoutAudit,
  withAudit,
  onMove,
  onConfirm,
}: {
  time: string;
  start: number;
  withoutAudit: number;
  withAudit: number;
  onMove: (start: number) => void;
  onConfirm: () => void;
}) {
  const lean = start >= EVENING_END;
  return (
    <section className="space-y-3">
      <MomentHeading
        time={time}
        eyebrow="Inventory audit"
        title={`Scheduled ${clockLabel(AUDIT.planned)} · 45 min · 2 associates`}
        sub="It is on the board. Drag the audit block anywhere on the timeline — the demand curve is right above it."
      />
      {lean ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-card border border-ion-500/45 bg-ion-500/[0.06] p-3.5"
          role="status"
        >
          <p className="font-mono text-[10px] tracking-[0.16em] text-ion-400 uppercase">Peak floor capacity restored</p>
          <p className="mt-1 text-[14px] font-semibold text-hi">
            Audit rescheduled to lean operations · {clockLabel(start)}
          </p>
          <p className="mt-1 text-[12px] text-mid">The night crew runs it. Nobody leaves the peak floor.</p>
        </motion.div>
      ) : (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-card border border-alert-500/40 bg-alert-500/[0.05] px-3.5 py-3">
          <span className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">
            Picking · 7:30–8:15 PM
          </span>
          <Shift from={withoutAudit} to={withAudit} className="text-[18px]" />
          <span className="w-full text-[12px] text-mid">
            Audit at {clockLabel(start)}–{clockLabel(start + AUDIT.duration)}
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onMove(start - AUDIT.step)}
          aria-label="Fifteen minutes earlier"
          className="h-8 rounded-md border border-line-strong px-2.5 font-mono text-[11.5px] text-mid hover:text-hi focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
        >
          −15
        </button>
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={start === preset}
            onClick={() => onMove(preset)}
            className={cn(
              "h-8 rounded-md border px-2.5 font-mono text-[11.5px] transition-colors focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
              start === preset ? "border-ember-500 bg-ember-500/15 text-hi" : "border-line-strong text-mid hover:text-hi",
            )}
          >
            {clockLabel(preset)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onMove(start + AUDIT.step)}
          aria-label="Fifteen minutes later"
          className="h-8 rounded-md border border-line-strong px-2.5 font-mono text-[11.5px] text-mid hover:text-hi focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
        >
          +15
        </button>
      </div>
      <Button variant="primary" size="lg" onClick={onConfirm}>
        Review the peak plan
        <ArrowRight />
      </Button>
    </section>
  );
}

/* ── Lock-in ──────────────────────────────────────────────────────────── */

export interface PlanView {
  picking: number;
  packing: number;
  dispatch: number;
  flex: number;
  riders: number;
  receiving: string;
  receivingOk: boolean;
  audit: string;
  auditOk: boolean;
  flexCost: number;
  riderCost: number;
}

export function ReviewMoment({
  time,
  plan,
  coverage,
  issues,
  onLock,
}: {
  time: string;
  plan: PlanView;
  coverage: Record<CoverLane, number>;
  issues: string[];
  onLock: () => void;
}) {
  const rows: { label: string; value: string; tone?: string }[] = [
    { label: "Picking", value: String(plan.picking) },
    { label: "Packing", value: String(plan.packing) },
    { label: "Dispatch", value: String(plan.dispatch) },
    { label: "Flex staff", value: String(plan.flex) },
    { label: "Riders at 7:30", value: String(plan.riders) },
    { label: "High-value receiving", value: plan.receiving, tone: plan.receivingOk ? "text-ion-400" : "text-alert-500" },
    { label: "Inventory audit", value: plan.audit, tone: plan.auditOk ? "text-ion-400" : "text-warn-500" },
    { label: "Temp labour cost", value: rupees(plan.flexCost) },
    { label: "Rider support cost", value: rupees(plan.riderCost) },
  ];

  return (
    <section className="space-y-3">
      <MomentHeading
        time={time}
        eyebrow="Final lock-in"
        title="Onam peak plan"
        sub="Everything on the board can still move. When you lock it, the next two hours play out on what you built."
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["picking", "packing", "dispatch", "riders"] as CoverLane[]).map((lane) => (
          <CoverageMeter key={lane} lane={lane} value={coverage[lane]} />
        ))}
      </div>
      <dl className="overflow-hidden rounded-card border border-line">
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={cn(
              "flex items-baseline justify-between gap-4 bg-surface px-3.5 py-2",
              index > 0 && "border-t border-line",
            )}
          >
            <dt className="text-[12.5px] text-lo">{row.label}</dt>
            <dd className={cn("font-mono text-[13px] font-semibold tabular-nums", row.tone ?? "text-hi")}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      {issues.length > 0 ? (
        <ul className="space-y-1">
          {issues.map((issue) => (
            <li key={issue} className="flex gap-2 text-[12.5px] text-warn-500">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {issue}
            </li>
          ))}
        </ul>
      ) : (
        <p className={cn("text-[12.5px]", TONE_TEXT[coverTone(Math.min(coverage.picking, coverage.packing, coverage.dispatch, coverage.riders))])}>
          Every station is covered for the peak.
        </p>
      )}
      <Button variant="primary" size="lg" className="w-full" onClick={onLock}>
        <Lock className="size-4" aria-hidden />
        Lock shift plan
      </Button>
    </section>
  );
}
