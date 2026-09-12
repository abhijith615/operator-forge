"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { GripVertical, ShieldCheck } from "lucide-react";

import { AnimatedPercent, TONE_TEXT, coverTone } from "@/components/challenge/day-three/ui";
import {
  arjunOvertime,
  baseStation,
  coverageAt,
  peakCoverage,
  placeAt,
  windowOf,
  workerById,
  type Series,
  type World,
} from "@/lib/challenge/day-three/capacity";
import {
  DEMAND,
  EVENING_END,
  NIGHT_END,
  PEAK_FROM,
  PEAK_TO,
  shortClock,
} from "@/lib/challenge/day-three/forecast";
import { ARJUN, AUDIT, FLEX, RECEIVING, REGULARS, RIYA } from "@/lib/challenge/day-three/workforce";
import {
  COVER_LABEL,
  type Day3State,
  type Station,
  type Worker,
} from "@/lib/challenge/day-three/types";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The live shift board.
 *
 * One horizontal evening, 4:30 PM to 10 PM, with the night folded up at the
 * right-hand edge so work can be pushed into it. Demand runs across the top,
 * the stations below it, and every person is a block on the hours they are
 * actually there. Nothing on it is decoration: a block that slides right is a
 * person arriving late, a red wedge above the capacity line is orders the
 * floor cannot clear.
 */

const NIGHT_SCALE = 0.35;
const UNITS = EVENING_END + (NIGHT_END - EVENING_END) * NIGHT_SCALE;

export function xPct(t: number): number {
  const units = t <= EVENING_END ? t : EVENING_END + (t - EVENING_END) * NIGHT_SCALE;
  return (Math.max(0, Math.min(UNITS, units)) / UNITS) * 100;
}

/** Inverse of xPct, for dragging. */
function tAt(pct: number): number {
  const units = (Math.max(0, Math.min(100, pct)) / 100) * UNITS;
  return units <= EVENING_END ? units : EVENING_END + (units - EVENING_END) / NIGHT_SCALE;
}

const TICKS = [0, 30, 90, 150, 210, 270, 330, 390, 450, 510];
const STATIONS: Station[] = ["picking", "packing", "dispatch"];
const DEMAND_MAX = 420;

interface Segment {
  start: number;
  end: number;
  /** `pending` is overtime on the board that the person has not agreed to. */
  kind: "on" | "away" | "late" | "pending";
  label?: string;
}

interface Row {
  worker: Worker;
  segments: Segment[];
  temporary: boolean;
  note?: "cover" | "moved";
}

/** What a block says about itself once someone's work has been changed. */
function onLabel(state: Day3State, worker: Worker, t: number): string | undefined {
  if (worker.id !== RIYA.id || t < RIYA.applyAt) return undefined;
  const actions = state.people.riya.interventions;
  if (actions.includes("zone")) return "A/B";
  if (actions.includes("pair") && t >= RIYA.pairFrom && t < RIYA.pairTo) return "paired";
  return undefined;
}

function segmentsFor(
  state: Day3State,
  world: World,
  worker: Worker,
  station: Station,
  asTransfer: boolean,
): Segment[] {
  const segments: Segment[] = [];
  const planned = windowOf(state, { ...world, late: false }, worker);
  const actual = windowOf(state, world, worker);
  if (!asTransfer && planned && actual && actual.start > planned.start) {
    segments.push({ start: planned.start, end: Math.min(actual.start, planned.end), kind: "late" });
  }
  let current: Segment | null = null;
  for (let t = 0; t < EVENING_END; t += 1) {
    const place = placeAt(state, world, worker, t);
    const inWindow = actual ? t >= actual.start && t < actual.end : false;
    let kind: Segment["kind"] | null = null;
    let label: string | undefined;
    if (place === station) {
      const pencilled =
        worker.id === ARJUN.id && t >= ARJUN.rotaEnd && arjunOvertime(state) === "pending";
      kind = pencilled ? "pending" : "on";
      label = pencilled ? undefined : onLabel(state, worker, t);
    } else if (!asTransfer && inWindow) {
      kind = "away";
      label = place === "receiving" ? "HV" : place ? place.slice(0, 4) : "off";
    }
    if (current && current.kind === kind && current.label === label) {
      current.end = t + 1;
    } else {
      if (current) segments.push(current);
      current = kind ? { start: t, end: t + 1, kind, label } : null;
    }
  }
  if (current) segments.push(current);
  return segments;
}

function rowsFor(state: Day3State, world: World, station: Station): Row[] {
  const rows: Row[] = [];
  const people = [...REGULARS, ...FLEX.filter((worker) => state.flex[worker.id])];
  for (const worker of people) {
    if (baseStation(state, worker) === station) {
      rows.push({ worker, segments: segmentsFor(state, world, worker, station, false), temporary: false });
    }
  }
  // People who are only here for a while: a backfill, a cover.
  for (const transfer of state.transfers) {
    if (transfer.to !== station) continue;
    const worker = workerById(transfer.workerId);
    if (!worker || rows.some((row) => row.worker.id === worker.id)) continue;
    const segments = segmentsFor(state, world, worker, station, true);
    if (segments.length > 0) rows.push({ worker, segments, temporary: true, note: "cover" });
  }
  // And anyone whose work was moved here for the evening — Faisal to packing,
  // Riya to packing — who has no transfer and no base role on this lane.
  for (const worker of people) {
    if (rows.some((row) => row.worker.id === worker.id)) continue;
    const segments = segmentsFor(state, world, worker, station, true);
    if (segments.length > 0) rows.push({ worker, segments, temporary: true, note: "moved" });
  }
  return rows;
}

export function ShiftBoard({
  state,
  world,
  series,
  now,
  editable,
  showReceiving,
  showAudit,
  auditMovable,
  focus,
  onAssign,
  onReceivingDrop,
  onMoveAudit,
  onSelectWorker,
}: {
  state: Day3State;
  world: World;
  series: Series;
  now: number;
  editable: boolean;
  showReceiving: boolean;
  showAudit: boolean;
  auditMovable: boolean;
  focus?: Station | "riders" | "special" | null;
  onAssign: (workerId: string, station: Station) => void;
  onReceivingDrop: (workerId: string) => void;
  onMoveAudit: (start: number) => void;
  onSelectWorker: (workerId: string) => void;
}) {
  const coverage = peakCoverage(series);

  return (
    <section
      aria-label="Shift board"
      className="overflow-hidden rounded-card border border-line bg-surface"
    >
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <Axis now={now} />
          <DemandRow series={series} now={now} />
          {STATIONS.map((station) => (
            <StationLane
              key={station}
              station={station}
              rows={rowsFor(state, world, station)}
              series={series}
              value={coverage[station]}
              now={now}
              editable={editable}
              focused={focus === station}
              onAssign={onAssign}
              onSelectWorker={onSelectWorker}
            />
          ))}
          <RiderLane series={series} value={coverage.riders} now={now} focused={focus === "riders"} />
          <SpecialLane
            state={state}
            now={now}
            showReceiving={showReceiving}
            showAudit={showAudit}
            auditMovable={auditMovable}
            focused={focus === "special"}
            onReceivingDrop={onReceivingDrop}
            onMoveAudit={onMoveAudit}
          />
        </div>
      </div>
    </section>
  );
}

/* ── Frame ────────────────────────────────────────────────────────────── */

function LaneFrame({
  label,
  side,
  focused,
  children,
  className,
  height,
  onDragOver,
  onDrop,
  dropActive,
}: {
  label: React.ReactNode;
  side?: React.ReactNode;
  focused?: boolean;
  children: React.ReactNode;
  className?: string;
  height?: number;
  onDragOver?: (event: React.DragEvent) => void;
  onDrop?: (event: React.DragEvent) => void;
  dropActive?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[96px_minmax(0,1fr)] border-t border-line",
        focused && "bg-ember-500/[0.04]",
        className,
      )}
    >
      <div className="sticky left-0 z-10 flex flex-col justify-center gap-0.5 border-r border-line bg-surface px-3 py-2">
        <span className="font-mono text-[9.5px] tracking-[0.14em] text-lo uppercase">{label}</span>
        {side}
      </div>
      <div
        className={cn("relative", dropActive && "bg-ember-500/[0.06] outline-1 outline-ember-500/40 outline-dashed")}
        style={height ? { minHeight: height } : undefined}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <Gridlines />
        {children}
      </div>
    </div>
  );
}

function Gridlines() {
  return (
    <>
      {TICKS.slice(1, -1).map((t) => (
        <span
          key={t}
          aria-hidden
          className={cn("absolute inset-y-0 w-px", t === EVENING_END ? "bg-line-strong" : "bg-white/[0.04]")}
          style={{ left: `${xPct(t)}%` }}
        />
      ))}
      {/* The peak, shaded, so every lane reads against it. */}
      <span
        aria-hidden
        className="absolute inset-y-0 bg-white/[0.022]"
        style={{ left: `${xPct(PEAK_FROM)}%`, width: `${xPct(PEAK_TO) - xPct(PEAK_FROM)}%` }}
      />
      {/* The night, folded. */}
      <span
        aria-hidden
        className="absolute inset-y-0 right-0 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.025)_0_6px,transparent_6px_12px)]"
        style={{ left: `${xPct(EVENING_END)}%` }}
      />
    </>
  );
}

function NowLine({ now }: { now: number }) {
  if (now <= 0) return null;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 z-[5] w-px bg-ember-500/70"
      style={{ left: `${xPct(now)}%` }}
    />
  );
}

function Axis({ now }: { now: number }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)]">
      <div className="sticky left-0 z-10 border-r border-line bg-surface px-3 py-2">
        <span className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">Evening</span>
      </div>
      <div className="relative h-8">
        {TICKS.map((t, index) => (
          <span
            key={t}
            className={cn(
              "absolute top-2.5 font-mono text-[10px] text-faint tabular-nums",
              index === 0 ? "translate-x-1" : index === TICKS.length - 1 ? "-translate-x-full -ml-1" : "-translate-x-1/2",
              t > EVENING_END && "text-faint/70",
            )}
            style={{ left: `${xPct(t)}%` }}
          >
            {shortClock(t)}
          </span>
        ))}
        <span
          className="absolute top-0.5 font-mono text-[8.5px] tracking-[0.14em] text-faint uppercase"
          style={{ left: `${xPct(EVENING_END) + 0.8}%` }}
        >
          Lean · night
        </span>
        {now > 0 ? (
          <span
            className="absolute -bottom-0.5 z-[6] -translate-x-1/2 rounded-sm bg-ember-500 px-1 font-mono text-[9px] leading-[14px] font-semibold text-void tabular-nums"
            style={{ left: `${xPct(now)}%` }}
          >
            {shortClock(now)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ── Demand ───────────────────────────────────────────────────────────── */

function DemandRow({ series, now }: { series: Series; now: number }) {
  const reduced = useReducedMotion();
  const H = 100;
  const y = (orders: number) => H - (Math.min(DEMAND_MAX, orders) / DEMAND_MAX) * H;
  const x = (t: number) => (xPct(t) / 100) * UNITS;

  const step = 5;
  const top: string[] = [];
  const bottom: string[] = [];
  const capacityLine: string[] = [];
  for (let t = 0; t <= EVENING_END; t += step) {
    const at = Math.min(t, EVENING_END - 1);
    const demand = series.demand[at] ?? 0;
    const capacity = Math.min(
      series.picking[at] ?? 0,
      series.packing[at] ?? 0,
      series.dispatch[at] ?? 0,
      series.riderCap[at] ?? 0,
    );
    top.push(`${x(t)},${y(demand)}`);
    bottom.unshift(`${x(t)},${y(Math.min(demand, capacity))}`);
    capacityLine.push(`${x(t)},${y(capacity)}`);
  }
  const demandArea = `M0,${H} L${top.join(" L")} L${x(EVENING_END)},${H} Z`;
  const gapArea = `M${top.join(" L")} L${bottom.join(" L")} Z`;
  const nightY = y(60);

  return (
    <LaneFrame
      label="Demand"
      side={<span className="text-[10px] leading-tight text-faint">Orders / hr vs what the floor can clear</span>}
      height={84}
    >
      <svg
        viewBox={`0 0 ${UNITS} ${H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <motion.path
          d={demandArea}
          className="fill-white/[0.06]"
          initial={false}
          animate={{ d: demandArea }}
          transition={{ duration: reduced ? 0 : 0.7, ease: easing.outExpo }}
        />
        <motion.path
          d={gapArea}
          className="fill-alert-500/45"
          initial={false}
          animate={{ d: gapArea }}
          transition={{ duration: reduced ? 0 : 0.7, ease: easing.outExpo }}
        />
        <motion.polyline
          points={top.join(" ")}
          fill="none"
          className="stroke-hi/70"
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
          initial={false}
          animate={{ points: top.join(" ") }}
          transition={{ duration: reduced ? 0 : 0.7, ease: easing.outExpo }}
        />
        <polyline
          points={capacityLine.join(" ")}
          fill="none"
          className="stroke-ion-400"
          strokeWidth={1.4}
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={x(EVENING_END)}
          x2={UNITS}
          y1={nightY}
          y2={nightY}
          className="stroke-white/25"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {DEMAND.filter((band) => band.to <= EVENING_END).map((band) => (
        <span
          key={band.from}
          className={cn(
            "absolute top-1 -translate-x-1/2 font-mono text-[8.5px] tracking-[0.1em] whitespace-nowrap uppercase",
            band.level === "VERY HIGH" ? "text-alert-500" : band.level === "HIGH" ? "text-warn-500" : "text-faint",
          )}
          style={{ left: `${(xPct(band.from) + xPct(band.to)) / 2}%` }}
        >
          {band.level}
        </span>
      ))}
      <span className="absolute right-1 bottom-1 font-mono text-[8.5px] tracking-[0.1em] text-faint uppercase">
        lean
      </span>
      <NowLine now={now} />
    </LaneFrame>
  );
}

/* ── Stations ─────────────────────────────────────────────────────────── */

function HeatStrip({ series, lane }: { series: Series; lane: Station | "riders" }) {
  const buckets: { t: number; value: number }[] = [];
  for (let t = 0; t < EVENING_END; t += 15) {
    let sum = 0;
    for (let m = t; m < t + 15; m += 1) sum += coverageAt(series, lane, m);
    buckets.push({ t, value: sum / 15 });
  }
  return (
    <div className="absolute inset-x-0 top-0 h-1" aria-hidden>
      {buckets.map((bucket) => {
        const tone = coverTone(bucket.value);
        return (
          <span
            key={bucket.t}
            className={cn(
              "absolute inset-y-0 transition-colors duration-500",
              tone === "ok" ? "bg-ion-500/60" : tone === "tight" ? "bg-warn-500/70" : "bg-alert-500/80",
            )}
            style={{ left: `${xPct(bucket.t)}%`, width: `${xPct(bucket.t + 15) - xPct(bucket.t)}%` }}
          />
        );
      })}
    </div>
  );
}

function StationLane({
  station,
  rows,
  series,
  value,
  now,
  editable,
  focused,
  onAssign,
  onSelectWorker,
}: {
  station: Station;
  rows: Row[];
  series: Series;
  value: number;
  now: number;
  editable: boolean;
  focused: boolean;
  onAssign: (workerId: string, station: Station) => void;
  onSelectWorker: (workerId: string) => void;
}) {
  const [over, setOver] = React.useState(false);
  const tone = coverTone(value);

  return (
    <LaneFrame
      label={COVER_LABEL[station]}
      focused={focused}
      side={
        <span className="flex items-baseline gap-1.5">
          <AnimatedPercent value={value} className={cn("text-[15px] font-semibold", TONE_TEXT[tone])} />
          <span className="font-mono text-[9px] text-faint">7–9</span>
        </span>
      }
      height={Math.max(44, rows.length * 20 + 14)}
      dropActive={over}
      onDragOver={
        editable
          ? (event) => {
              event.preventDefault();
              if (!over) setOver(true);
            }
          : undefined
      }
      onDrop={
        editable
          ? (event) => {
              event.preventDefault();
              setOver(false);
              const id = event.dataTransfer.getData("text/plain");
              if (id) onAssign(id, station);
            }
          : undefined
      }
    >
      <div onDragLeave={() => setOver(false)} className="absolute inset-0">
        <HeatStrip series={series} lane={station} />
        {rows.length === 0 ? (
          <p className="absolute inset-0 grid place-items-center text-[11.5px] text-faint">
            {editable ? "Drop people here, or tap a card to assign" : "Nobody on this station"}
          </p>
        ) : null}
        {rows.map((row, index) => (
          <WorkerRow key={row.worker.id} row={row} top={8 + index * 20} onSelect={onSelectWorker} />
        ))}
        <NowLine now={now} />
      </div>
    </LaneFrame>
  );
}

function WorkerRow({ row, top, onSelect }: { row: Row; top: number; onSelect: (id: string) => void }) {
  const reduced = useReducedMotion();
  const flex = row.worker.kind === "flex";
  const manager = row.worker.kind === "manager";
  const firstOn = row.segments.find((segment) => segment.kind === "on");

  return (
    <div className="absolute inset-x-0 h-4" style={{ top }}>
      {row.segments.map((segment, index) => {
        const left = xPct(segment.start);
        const width = Math.max(0.6, xPct(segment.end) - left);
        return (
          <motion.button
            type="button"
            key={`${segment.kind}-${index}`}
            onClick={() => onSelect(row.worker.id)}
            initial={reduced ? false : { opacity: 0, scaleX: 0.6 }}
            animate={{ opacity: 1, scaleX: 1, left: `${left}%`, width: `${width}%` }}
            transition={{ duration: reduced ? 0 : 0.45, ease: easing.outExpo }}
            style={{ originX: 0 }}
            title={`${row.worker.name} · ${shortClock(segment.start)}–${shortClock(segment.end)}`}
            className={cn(
              "absolute inset-y-0 flex items-center overflow-hidden rounded-[4px] px-1.5 text-left",
              "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
              segment.kind === "late"
                ? "border border-dashed border-alert-500/70 bg-alert-500/[0.08]"
                : segment.kind === "pending"
                  ? "border border-dashed border-ember-500/70 bg-ember-500/[0.1]"
                  : segment.kind === "away"
                    ? "border border-dashed border-white/15 bg-transparent"
                    : manager
                    ? "bg-ember-500/70"
                    : row.temporary
                      ? "bg-info-500/60"
                      : flex
                        ? "border border-flux-400/60 bg-flux-500/35"
                        : "bg-white/[0.16] hover:bg-white/[0.22]",
            )}
          >
            <span
              className={cn(
                "truncate font-mono text-[9.5px] leading-none font-semibold",
                segment.kind === "late"
                  ? "text-alert-500"
                  : segment.kind === "pending"
                    ? "text-ember-400"
                    : segment.kind === "away"
                      ? "text-faint"
                      : "text-hi",
              )}
            >
              {segment.kind === "late"
                ? "late"
                : segment.kind === "pending"
                  ? "OT?"
                  : segment.kind === "away"
                    ? segment.label
                    : segment === firstOn
                      ? `${row.worker.name}${row.note === "cover" ? " · cover" : row.note === "moved" ? " · moved" : ""}`
                      : (segment.label ?? "")}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ── Riders ───────────────────────────────────────────────────────────── */

function RiderLane({
  series,
  value,
  now,
  focused,
}: {
  series: Series;
  value: number;
  now: number;
  focused: boolean;
}) {
  const tone = coverTone(value);
  const buckets: { t: number; count: number; need: number }[] = [];
  for (let t = 0; t < EVENING_END; t += 15) {
    buckets.push({ t, count: series.riderCount[t] ?? 0, need: Math.ceil(series.riderNeed[t] ?? 0) });
  }
  const max = 34;
  return (
    <LaneFrame
      label="Riders"
      focused={focused}
      side={
        <span className="flex items-baseline gap-1.5">
          <AnimatedPercent value={value} className={cn("text-[15px] font-semibold", TONE_TEXT[tone])} />
          <span className="font-mono text-[9px] text-faint">7–9</span>
        </span>
      }
      height={56}
    >
      {buckets.map((bucket) => {
        const short = bucket.count < bucket.need;
        const left = xPct(bucket.t);
        const width = xPct(bucket.t + 15) - left;
        return (
          <div key={bucket.t} className="absolute inset-y-1.5" style={{ left: `${left}%`, width: `${width}%` }}>
            <div className="absolute inset-x-[1.5px] bottom-0 flex items-end" style={{ height: "100%" }}>
              <motion.div
                className={cn("w-full rounded-t-[2px]", short ? "bg-alert-500/60" : "bg-ion-500/45")}
                initial={false}
                animate={{ height: `${(bucket.count / max) * 100}%` }}
                transition={{ duration: 0.5, ease: easing.outExpo }}
              />
            </div>
            <span
              aria-hidden
              className="absolute inset-x-0 h-px bg-hi/60"
              style={{ bottom: `${(bucket.need / max) * 100}%` }}
            />
          </div>
        );
      })}
      <span className="absolute top-1 right-1 font-mono text-[8.5px] text-faint">bars: riders · line: need</span>
      <NowLine now={now} />
    </LaneFrame>
  );
}

/* ── Special tasks ────────────────────────────────────────────────────── */

function SpecialLane({
  state,
  now,
  showReceiving,
  showAudit,
  auditMovable,
  focused,
  onReceivingDrop,
  onMoveAudit,
}: {
  state: Day3State;
  now: number;
  showReceiving: boolean;
  showAudit: boolean;
  auditMovable: boolean;
  focused: boolean;
  onReceivingDrop: (workerId: string) => void;
  onMoveAudit: (start: number) => void;
}) {
  const receiving = state.transfers.find((transfer) => transfer.reason === "receiving");
  const receiver = receiving ? workerById(receiving.workerId) : undefined;
  const [over, setOver] = React.useState(false);
  const trackRef = React.useRef<HTMLDivElement>(null);

  return (
    <LaneFrame label="Special tasks" focused={focused} height={52}>
      <div ref={trackRef} className="absolute inset-0">
        {showReceiving ? (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              if (!over) setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setOver(false);
              const id = event.dataTransfer.getData("text/plain");
              if (id) onReceivingDrop(id);
            }}
            className={cn(
              "absolute inset-y-2 flex items-center gap-1 overflow-hidden rounded-[5px] border px-1.5",
              receiver
                ? receiver.highValue
                  ? "border-ion-500/60 bg-ion-500/15"
                  : "border-alert-500/60 bg-alert-500/15"
                : "border-dashed border-warn-500/70 bg-warn-500/10",
              over && "ring-2 ring-ember-500",
            )}
            style={{
              left: `${xPct(RECEIVING.start)}%`,
              width: `${Math.max(7, xPct(RECEIVING.end) - xPct(RECEIVING.start))}%`,
              minWidth: 64,
            }}
            title="High-value receiving · 6:05–6:25 PM"
          >
            <ShieldCheck className="size-3 shrink-0 text-warn-500" aria-hidden />
            <span className="truncate font-mono text-[9.5px] font-semibold text-hi">
              {receiver ? receiver.name : state.receivingSkipped ? "Held" : "HV · drop"}
            </span>
          </div>
        ) : null}
        {showAudit ? (
          <AuditBlock
            start={state.auditStart}
            movable={auditMovable}
            track={trackRef}
            onMove={onMoveAudit}
          />
        ) : null}
        <NowLine now={now} />
      </div>
    </LaneFrame>
  );
}

/**
 * The audit, as a thing you pick up and move. Pointer events rather than
 * native drag-and-drop so it works under a finger, arrow keys so it works
 * without one.
 */
function AuditBlock({
  start,
  movable,
  track,
  onMove,
}: {
  start: number;
  movable: boolean;
  track: React.RefObject<HTMLDivElement | null>;
  onMove: (start: number) => void;
}) {
  const reduced = useReducedMotion();
  const dragging = React.useRef<{ offset: number } | null>(null);
  const end = start + AUDIT.duration;
  const inPeak = start < PEAK_TO && end > PEAK_FROM;
  const lean = start >= EVENING_END;
  const left = xPct(start);
  const width = xPct(end) - left;

  const toStart = (clientX: number) => {
    const rect = track.current?.getBoundingClientRect();
    if (!rect) return start;
    return tAt(((clientX - rect.left) / rect.width) * 100 - (dragging.current?.offset ?? 0));
  };

  return (
    <motion.div
      role="slider"
      aria-label="Inventory audit start time"
      aria-valuemin={AUDIT.earliest}
      aria-valuemax={AUDIT.latest}
      aria-valuenow={start}
      aria-valuetext={`${shortClock(start)} to ${shortClock(end)}`}
      tabIndex={movable ? 0 : -1}
      onKeyDown={(event) => {
        if (!movable) return;
        if (event.key === "ArrowRight") onMove(start + AUDIT.step);
        if (event.key === "ArrowLeft") onMove(start - AUDIT.step);
      }}
      onPointerDown={(event) => {
        if (!movable) return;
        const rect = track.current?.getBoundingClientRect();
        if (!rect) return;
        try {
          (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        } catch {
          // Some pointers cannot be captured; the drag still tracks while over the lane.
        }
        dragging.current = { offset: ((event.clientX - rect.left) / rect.width) * 100 - left };
      }}
      onPointerMove={(event) => {
        if (dragging.current) onMove(toStart(event.clientX));
      }}
      onPointerUp={() => {
        dragging.current = null;
      }}
      onPointerCancel={() => {
        dragging.current = null;
      }}
      initial={false}
      animate={{ left: `${left}%`, width: `${width}%` }}
      transition={{ duration: reduced ? 0 : 0.25, ease: easing.outExpo }}
      style={{ minWidth: 70, touchAction: "none" }}
      className={cn(
        "absolute inset-y-2 flex items-center gap-1 overflow-hidden rounded-[5px] border px-1 select-none",
        movable ? "cursor-grab active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none" : "",
        lean
          ? "border-ion-500/60 bg-ion-500/15"
          : inPeak
            ? "border-alert-500/70 bg-alert-500/20"
            : "border-warn-500/60 bg-warn-500/15",
      )}
    >
      {movable ? <GripVertical className="size-3 shrink-0 text-lo" aria-hidden /> : null}
      <span className="truncate font-mono text-[9.5px] font-semibold text-hi">
        Audit · {shortClock(start)}
      </span>
    </motion.div>
  );
}
