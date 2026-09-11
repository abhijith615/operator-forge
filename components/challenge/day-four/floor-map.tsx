"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { teamsOnPutaway } from "@/lib/challenge/day-four/engine";
import { routeSeconds, storageUsed, type FloorLayout, type FloorMetrics } from "@/lib/challenge/day-four/floor";
import { BATCHES, BATCH_ORDER, STORAGE_CAP, VEHICLES, VEHICLE_ORDER } from "@/lib/challenge/day-four/scenario";
import type { BatchId, Day4State, StorageId, VehicleId, ZoneId } from "@/lib/challenge/day-four/types";
import { cn } from "@/lib/utils";

/**
 * The store, from above.
 *
 * Everything on this map is drawn from the floor state — nothing is decoration.
 * Each square in the staging lanes is a carton that has not been put away;
 * squares in Aisle C are cartons a picker has to walk around; the dashed line
 * is where the pickers actually walk, and it bends when the aisle is blocked.
 * The learner should be able to look at it and see where the store is choking.
 */

const W = 1000;
const H = 560;

const G = {
  yard: { x: 16, y: 14, w: 330, h: 84 },
  dock1: { x: 16, y: 108, w: 160, h: 70 },
  dock2: { x: 186, y: 108, w: 160, h: 70 },
  apron: { x: 16, y: 182, w: 330, h: 28 },
  qc: { x: 356, y: 108, w: 110, h: 102 },
  staging: { x: 16, y: 216, w: 450, h: 186 },
  safe: { x: 16, y: 410, w: 200, h: 56 },
  quarantine: { x: 226, y: 410, w: 110, h: 56 },
  putaway: { x: 476, y: 216, w: 40, h: 186 },
  store: { x: 526, y: 14, w: 280, h: 388 },
  fastpick: { x: 530, y: 34, w: 48, h: 364 },
  aisleA: { x: 582, y: 34, w: 26, h: 364 },
  rack1: { x: 612, y: 34, w: 48, h: 364 },
  aisleB: { x: 664, y: 34, w: 26, h: 364 },
  rack2: { x: 694, y: 34, w: 48, h: 364 },
  aisleC: { x: 746, y: 34, w: 26, h: 364 },
  deep: { x: 776, y: 34, w: 26, h: 364 },
  chilled: { x: 818, y: 14, w: 166, h: 184 },
  frozen: { x: 818, y: 208, w: 166, h: 194 },
  packing: { x: 526, y: 430, w: 236, h: 108 },
  outbound: { x: 772, y: 430, w: 212, h: 108 },
};

type Rect = { x: number; y: number; w: number; h: number };

const BATCH_FILL: Record<BatchId, string> = {
  S1: "fill-ion-500/60",
  S2: "fill-white/[0.14]",
  C1: "fill-warn-500/70",
  D1: "fill-info-500/80",
  F1: "fill-flux-400/75",
  G1: "fill-ion-400/85",
  G2: "fill-white/30",
  G3: "fill-white/[0.18]",
};

const HIT: Partial<Record<ZoneId, Rect[]>> = {
  yard: [G.yard],
  dock: [G.dock1, G.dock2, G.apron],
  qc: [G.qc],
  staging: [G.staging],
  aisleC: [{ x: G.aisleC.x - 6, y: G.aisleC.y, w: G.aisleC.w + 12, h: G.aisleC.h }],
  putaway: [G.putaway],
  packing: [G.packing],
};

const ZONE_NAME: Record<ZoneId, string> = {
  yard: "Yard",
  dock: "Dock",
  qc: "QC / receiving",
  staging: "GRN staging",
  aisleC: "Aisle C",
  putaway: "Putaway",
  packing: "Packing",
};

function unverified(state: Day4State, id: BatchId): boolean {
  const stage = state.batches[id].stage;
  return stage === "received" || stage === "grn" || stage === "unloading";
}

export function FloorMap({
  state,
  layout,
  metrics,
  interactive = false,
  marking = false,
  selected = null,
  inspected = [],
  highlight = [],
  bottleneck = null,
  compact = false,
  caption,
  onZone,
}: {
  state: Day4State;
  layout: FloorLayout;
  metrics: FloorMetrics;
  interactive?: boolean;
  marking?: boolean;
  selected?: ZoneId | null;
  inspected?: ZoneId[];
  highlight?: ZoneId[];
  bottleneck?: ZoneId | null;
  compact?: boolean;
  caption?: string;
  onZone?: (zone: ZoneId) => void;
}) {
  const reduced = useReducedMotion();
  const labelSize = compact ? 22 : 12;
  const bigLabel = compact ? 26 : 13;

  // Cartons in the painted lanes, in the order they arrived.
  const laneCells: { id: BatchId; unverified: boolean }[] = [];
  let remaining = Math.round(layout.lanes);
  for (const id of BATCH_ORDER) {
    const batch = state.batches[id];
    if (batch.location !== "lanes") continue;
    const count = Math.min(remaining, Math.round(batch.onFloor));
    for (let i = 0; i < count; i += 1) laneCells.push({ id, unverified: unverified(state, id) });
    remaining -= count;
    if (remaining <= 0) break;
  }
  const aisleCount = Math.round(layout.aisle);
  const apronCount = Math.round(layout.apron);
  const safeCount = Math.round(layout.safe);
  const unsafeCount = Math.round(layout.unsafe);
  const blocked = layout.aisleBlocked > 0.25;
  const seconds = routeSeconds(metrics.delay);

  return (
    <figure className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full select-none"
        role="img"
        aria-label={`Store floor at ${caption ?? "now"}: ${Math.round(layout.total)} inbound cartons on the floor, Aisle C ${Math.round(layout.aisleBlocked * 100)}% blocked`}
      >
        <defs>
          <pattern id="d4-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" fill="none" className="stroke-white/[0.035]" strokeWidth="1" />
          </pattern>
          <pattern id="d4-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" className="stroke-white/10" strokeWidth="3" />
          </pattern>
        </defs>
        <rect width={W} height={H} className="fill-void" />
        <rect width={W} height={H} fill="url(#d4-grid)" />

        {/* ── Zones ── */}
        <Zone r={G.yard} label="Yard" size={labelSize} dashed />
        <Zone r={G.dock1} label="Dock 1" size={labelSize} />
        <Zone r={G.dock2} label="Dock 2" size={labelSize} tone={layout.dock2Factor < 1 ? "warn" : undefined} />
        <Zone r={G.qc} label="QC gate" size={labelSize} />
        <Zone r={G.staging} label="GRN staging" size={bigLabel} tone={layout.lanes >= 64 ? "alert" : layout.lanes >= 50 ? "warn" : undefined} />
        <Zone r={G.safe} label="Safe lane" size={labelSize} dashed={!state.safeOpen} tone={state.safeOpen ? "ion" : undefined} muted={!state.safeOpen} />
        <Zone r={G.quarantine} label="Quarantine" size={labelSize} tone={state.quarantine > 0 ? "alert" : undefined} />
        <Zone r={G.putaway} label="" size={labelSize} />
        <Zone r={G.store} label="" size={labelSize} />
        <Zone r={G.chilled} label="Chilled" size={bigLabel} tone="info" />
        <Zone r={G.frozen} label="Frozen" size={bigLabel} tone="flux" />
        <Zone r={G.packing} label="Packing" size={bigLabel} />
        <Zone r={G.outbound} label="Outbound / dispatch" size={labelSize} />

        {/* Racks and aisles */}
        {[G.fastpick, G.rack1, G.rack2, G.deep].map((rack, index) => (
          <g key={index}>
            <rect x={rack.x} y={rack.y} width={rack.w} height={rack.h} className="fill-white/[0.05] stroke-white/10" strokeWidth={1} />
            {!compact
              ? Array.from({ length: 11 }, (_, row) => (
                  <line
                    key={row}
                    x1={rack.x}
                    x2={rack.x + rack.w}
                    y1={rack.y + 16 + row * 32}
                    y2={rack.y + 16 + row * 32}
                    className="stroke-white/[0.07]"
                  />
                ))
              : null}
          </g>
        ))}
        {[
          { r: G.aisleA, label: "A" },
          { r: G.aisleB, label: "B" },
          { r: G.aisleC, label: "C" },
        ].map(({ r, label }) => (
          <g key={label}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} className="fill-white/[0.015]" />
            <text x={r.x + r.w / 2} y={r.y + r.h + 14} textAnchor="middle" className="fill-faint font-mono" fontSize={compact ? 18 : 11}>
              {label}
            </text>
          </g>
        ))}
        <text x={G.fastpick.x + G.fastpick.w / 2} y={G.store.y + 12} textAnchor="middle" className="fill-ion-400 font-mono" fontSize={compact ? 13 : 9}>
          FAST PICK
        </text>
        <text x={G.deep.x + G.deep.w / 2} y={G.store.y + 12} textAnchor="middle" className="fill-faint font-mono" fontSize={compact ? 13 : 9}>
          DEEP
        </text>
        {!compact ? (
          <text x={G.rack1.x + 64} y={G.store.y + 12} textAnchor="middle" className="fill-faint font-mono" fontSize={9}>
            AMBIENT
          </text>
        ) : null}

        {/* ── Congestion heat ── */}
        <Heat r={G.staging} level={Math.max(0, (layout.lanes - 45) / 25)} reduced={reduced} />
        <Heat r={G.apron} level={apronCount / 12} reduced={reduced} />
        <Heat r={{ x: G.aisleC.x - 4, y: G.aisleC.y, w: G.aisleC.w + 8, h: G.aisleC.h }} level={layout.aisleBlocked * 1.4} reduced={reduced} />

        {/* ── Cartons ── */}
        <LaneGrid cells={laneCells} />
        <Stack r={G.apron} count={apronCount} cols={22} cell={12} className="fill-warn-500/70" />
        <AisleStack r={G.aisleC} count={aisleCount} className="fill-warn-500/80" />
        {unsafeCount > 0 ? <AisleStack r={G.aisleB} count={unsafeCount} className="fill-alert-500/70" /> : null}
        {state.safeOpen ? <Stack r={{ ...G.safe, y: G.safe.y + 18, h: G.safe.h - 18 }} count={safeCount} cols={12} cell={14} className="fill-ion-500/55" /> : null}
        {state.quarantine > 0 ? (
          <Stack r={{ ...G.quarantine, y: G.quarantine.y + 20, h: 30 }} count={state.quarantine} cols={6} cell={14} className="fill-alert-500/80" />
        ) : null}

        {/* ── Vehicles ── */}
        {VEHICLE_ORDER.map((id) => (
          <Vehicle key={id} id={id} state={state} compact={compact} />
        ))}

        {/* QC gate contents */}
        <QcGate state={state} compact={compact} />

        {/* Putaway teams */}
        <Teams state={state} compact={compact} />

        {/* Storage fill */}
        <StorageMeter r={G.chilled} storage="chilled" state={state} compact={compact} />
        <StorageMeter r={G.frozen} storage="frozen" state={state} compact={compact} />
        <StorageMeter r={{ x: G.fastpick.x - 2, y: G.store.y + G.store.h - 2, w: G.fastpick.w + 4, h: 0 }} storage="fastpick" state={state} compact={compact} vertical={G.fastpick} />

        {/* ── Picker route ── */}
        <PickerRoute blocked={blocked} unsafe={unsafeCount > 0} seconds={seconds} reduced={reduced} compact={compact} />

        {/* ── Interaction ── */}
        {(Object.keys(HIT) as ZoneId[]).map((zone) =>
          (HIT[zone] ?? []).map((r, index) => {
            const isSelected = selected === zone;
            const isBottleneck = bottleneck === zone;
            const lit = highlight.includes(zone);
            const seen = inspected.includes(zone);
            return (
              <g key={`${zone}-${index}`}>
                {isSelected || isBottleneck || lit ? (
                  <rect
                    x={r.x - 3}
                    y={r.y - 3}
                    width={r.w + 6}
                    height={r.h + 6}
                    rx={6}
                    fill="none"
                    className={cn(
                      isBottleneck ? "stroke-alert-500" : isSelected ? "stroke-ember-500" : "stroke-ember-500/50",
                    )}
                    strokeWidth={isBottleneck ? 3 : 2}
                    strokeDasharray={lit && !isSelected ? "6 4" : undefined}
                  />
                ) : null}
                {interactive && index === 0 && seen && !marking ? (
                  <circle cx={r.x + r.w - 10} cy={r.y + 10} r={4} className="fill-ion-400" />
                ) : null}
                {interactive ? (
                  <rect
                    x={r.x}
                    y={r.y}
                    width={r.w}
                    height={r.h}
                    rx={4}
                    role="button"
                    tabIndex={index === 0 ? 0 : -1}
                    aria-label={`${marking ? "Mark" : "Inspect"} ${ZONE_NAME[zone]}`}
                    className={cn(
                      "cursor-pointer fill-transparent outline-none transition-colors",
                      marking ? "hover:fill-alert-500/[0.12] focus-visible:fill-alert-500/[0.12]" : "hover:fill-white/[0.05] focus-visible:fill-white/[0.06]",
                    )}
                    onClick={() => onZone?.(zone)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onZone?.(zone);
                      }
                    }}
                  />
                ) : null}
                {isBottleneck && index === 0 ? (
                  <g>
                    <rect x={r.x + 4} y={r.y + 4} width={compact ? 170 : 96} height={compact ? 30 : 18} rx={3} className="fill-alert-500" />
                    <text x={r.x + 10} y={r.y + (compact ? 25 : 16)} className="fill-void font-mono font-semibold" fontSize={compact ? 18 : 10}>
                      BOTTLENECK
                    </text>
                  </g>
                ) : null}
              </g>
            );
          }),
        )}
      </svg>
      {caption ? (
        <figcaption className="pointer-events-none absolute top-2 right-2 rounded-full border border-line-strong bg-obsidian/85 px-2.5 py-1 font-mono text-[10px] text-mid backdrop-blur-sm">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/* ── Pieces ───────────────────────────────────────────────────────────── */

function Zone({
  r,
  label,
  size,
  tone,
  dashed = false,
  muted = false,
}: {
  r: Rect;
  label: string;
  size: number;
  tone?: "warn" | "alert" | "ion" | "info" | "flux";
  dashed?: boolean;
  muted?: boolean;
}) {
  const stroke =
    tone === "alert"
      ? "stroke-alert-500/60"
      : tone === "warn"
        ? "stroke-warn-500/60"
        : tone === "ion"
          ? "stroke-ion-500/60"
          : tone === "info"
            ? "stroke-info-500/50"
            : tone === "flux"
              ? "stroke-flux-400/50"
              : "stroke-white/15";
  return (
    <g>
      <rect
        x={r.x}
        y={r.y}
        width={r.w}
        height={r.h}
        rx={4}
        className={cn(muted ? "fill-transparent" : "fill-white/[0.025]", stroke, "transition-[stroke] duration-500")}
        strokeWidth={1.2}
        strokeDasharray={dashed ? "5 4" : undefined}
      />
      {label ? (
        <text x={r.x + 8} y={r.y + size + 4} className={cn("font-mono uppercase", muted ? "fill-faint" : "fill-lo")} fontSize={size} letterSpacing={1}>
          {label}
        </text>
      ) : null}
    </g>
  );
}

function Heat({ r, level, reduced }: { r: Rect; level: number; reduced: boolean | null }) {
  const opacity = Math.max(0, Math.min(0.32, level * 0.3));
  return (
    <motion.rect
      x={r.x}
      y={r.y}
      width={r.w}
      height={r.h}
      rx={4}
      className="pointer-events-none fill-alert-500"
      initial={false}
      animate={{ opacity }}
      transition={{ duration: reduced ? 0 : 0.8 }}
    />
  );
}

const LANE_COLS = 14;
const LANE_ROWS = 5;

function LaneGrid({ cells }: { cells: { id: BatchId; unverified: boolean }[] }) {
  const r = G.staging;
  const cellW = (r.w - 24) / LANE_COLS;
  const cellH = (r.h - 36) / LANE_ROWS;
  return (
    <g>
      {Array.from({ length: LANE_COLS * LANE_ROWS }, (_, index) => {
        const col = index % LANE_COLS;
        const row = Math.floor(index / LANE_COLS);
        const x = r.x + 12 + col * cellW;
        const y = r.y + 28 + row * cellH;
        const cell = cells[index];
        return (
          <rect
            key={index}
            x={x + 2}
            y={y + 2}
            width={cellW - 4}
            height={cellH - 4}
            rx={2}
            className={cn(
              "transition-[fill,stroke,opacity] duration-500",
              cell ? BATCH_FILL[cell.id] : "fill-white/[0.025]",
              cell?.unverified ? "stroke-warn-500" : "stroke-transparent",
            )}
            strokeWidth={cell?.unverified ? 1.4 : 0}
          />
        );
      })}
    </g>
  );
}

function Stack({ r, count, cols, cell, className }: { r: Rect; count: number; cols: number; cell: number; className: string }) {
  const perRow = Math.max(1, Math.min(cols, Math.floor((r.w - 8) / (cell + 2))));
  return (
    <g>
      {Array.from({ length: Math.max(0, count) }, (_, index) => {
        const col = index % perRow;
        const row = Math.floor(index / perRow);
        const y = r.y + 4 + row * (cell * 0.8 + 2);
        if (y + cell * 0.8 > r.y + r.h) return null;
        return <rect key={index} x={r.x + 4 + col * (cell + 2)} y={y} width={cell} height={cell * 0.8} rx={1.5} className={className} />;
      })}
    </g>
  );
}

function AisleStack({ r, count, className }: { r: Rect; count: number; className: string }) {
  // Cartons fill the aisle from the staging end, where the spill starts.
  const start = r.y + r.h - 110;
  return (
    <g>
      {Array.from({ length: Math.min(30, Math.max(0, count)) }, (_, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const y = start + 96 - row * 13 + (row > 7 ? 0 : 0);
        return (
          <rect
            key={index}
            x={r.x + 2 + col * 11.5}
            y={Math.max(r.y + 2, y - Math.floor(row / 8) * 0)}
            width={10.5}
            height={11}
            rx={1.5}
            className={cn(className, "transition-opacity duration-500")}
          />
        );
      })}
    </g>
  );
}

function Vehicle({ id, state, compact }: { id: VehicleId; state: Day4State; compact: boolean }) {
  const run = state.vehicles[id];
  const spec = VEHICLES[id];
  const total = spec.batches.reduce((sum, batch) => sum + BATCHES[batch].cartons, 0);
  const onTruck = spec.batches.reduce((sum, batch) => sum + state.batches[batch].onTruck, 0);
  if (run.done && onTruck <= 0) return null;

  const yardSlots: Record<VehicleId, number> = { dairy: 0, frozen: 1, grocery: 2 };
  const slot = run.dock === 1 ? G.dock1 : run.dock === 2 ? G.dock2 : null;
  const x = slot ? slot.x + 12 : G.yard.x + 10 + yardSlots[id] * 108;
  const y = slot ? slot.y + 18 : G.yard.y + 26;
  const w = slot ? 136 : 100;
  const h = slot ? 40 : 46;
  const cold = spec.temperature === "Chilled" ? "stroke-info-500" : spec.temperature === "Frozen" ? "stroke-flux-400" : "stroke-white/40";
  const pendingQc = spec.batches.some((batch) => ["vehicle", "qc"].includes(state.batches[batch].stage)) && spec.temperature !== "Ambient";
  const status = !run.dock
    ? run.lane === "hold"
      ? "HELD"
      : "WAITING"
    : run.paused
      ? "PAUSED"
      : pendingQc
        ? "QC FIRST"
        : "UNLOADING";

  return (
    <motion.g initial={false} animate={{ x: 0, y: 0 }}>
      <rect x={x} y={y} width={w} height={h} rx={4} className={cn("fill-elevated", cold)} strokeWidth={1.4} />
      <rect x={x + 4} y={y + h - 8} width={(w - 8) * Math.max(0, onTruck / total)} height={4} rx={2} className="fill-ember-500/80 transition-[width] duration-500" />
      <text x={x + 6} y={y + (compact ? 20 : 14)} className="fill-hi font-mono" fontSize={compact ? 16 : 10}>
        {spec.name.split(" ")[0]?.toUpperCase()} · {Math.round(onTruck)}
      </text>
      {!compact || slot ? (
        <text
          x={x + 6}
          y={y + (compact ? 34 : 27)}
          className={cn("font-mono", status === "UNLOADING" ? "fill-ember-400" : status === "QC FIRST" ? "fill-info-500" : status === "PAUSED" || status === "HELD" ? "fill-ion-400" : "fill-faint")}
          fontSize={compact ? 12 : 9}
        >
          {status}
        </text>
      ) : null}
    </motion.g>
  );
}

function QcGate({ state, compact }: { state: Day4State; compact: boolean }) {
  const r = G.qc;
  const inGate = state.qcSlot;
  const flagged = state.qcIssue.status === "pending";
  return (
    <g>
      {inGate ? (
        <g>
          <rect x={r.x + 14} y={r.y + 34} width={36} height={26} rx={3} className={BATCH_FILL[inGate]} />
          <text x={r.x + 56} y={r.y + 52} className="fill-mid font-mono" fontSize={compact ? 16 : 10}>
            {inGate}
          </text>
        </g>
      ) : null}
      {flagged ? (
        <g>
          <rect x={r.x + 14} y={r.y + 66} width={36} height={26} rx={3} className="fill-alert-500/80 stroke-alert-500" />
          <text x={r.x + 56} y={r.y + 84} className="fill-alert-500 font-mono" fontSize={compact ? 14 : 9}>
            D1-07
          </text>
        </g>
      ) : null}
      {!inGate && !flagged && !compact ? (
        <text x={r.x + 8} y={r.y + 60} className="fill-faint font-mono" fontSize={9}>
          idle
        </text>
      ) : null}
    </g>
  );
}

function Teams({ state, compact }: { state: Day4State; compact: boolean }) {
  const r = G.putaway;
  const onPutaway = teamsOnPutaway(state);
  return (
    <g>
      <text x={r.x + r.w / 2} y={r.y + 16} textAnchor="middle" className="fill-lo font-mono" fontSize={compact ? 12 : 8}>
        PUT
      </text>
      <text x={r.x + r.w / 2} y={r.y + 27} textAnchor="middle" className="fill-lo font-mono" fontSize={compact ? 12 : 8}>
        AWAY
      </text>
      {Array.from({ length: 4 }, (_, index) => (
        <circle
          key={index}
          cx={r.x + r.w / 2}
          cy={r.y + 52 + index * 34}
          r={compact ? 10 : 8}
          className={cn("transition-colors duration-500", index < onPutaway ? "fill-ion-400" : "fill-white/10 stroke-white/30")}
          strokeWidth={1}
        />
      ))}
      <path d={`M ${r.x + r.w / 2} ${r.y + r.h - 22} l 0 14 m -5 -6 l 5 6 l 5 -6`} className="stroke-ion-400/60" fill="none" transform={`rotate(-90 ${r.x + r.w / 2} ${r.y + r.h - 15})`} />
    </g>
  );
}

function StorageMeter({
  r,
  storage,
  state,
  compact,
  vertical,
}: {
  r: Rect;
  storage: StorageId;
  state: Day4State;
  compact: boolean;
  vertical?: Rect;
}) {
  const used = storageUsed(state, storage);
  const cap = STORAGE_CAP[storage];
  const share = Math.min(1, used / cap);
  const ready = BATCH_ORDER.some((id) => state.batches[id].destination === storage && state.batches[id].stage === "ready");
  if (vertical) {
    const fillH = vertical.h * share;
    return (
      <rect
        x={vertical.x + vertical.w - 6}
        y={vertical.y + vertical.h - fillH}
        width={4}
        height={fillH}
        className="fill-ion-400/80 transition-all duration-700"
      />
    );
  }
  const barW = r.w - 20;
  return (
    <g>
      <rect x={r.x + 10} y={r.y + r.h - 22} width={barW} height={6} rx={3} className="fill-white/[0.07]" />
      <rect x={r.x + 10} y={r.y + r.h - 22} width={barW * share} height={6} rx={3} className={cn("transition-all duration-700", storage === "frozen" ? "fill-flux-400" : "fill-info-500")} />
      <text x={r.x + 10} y={r.y + r.h - 30} className="fill-mid font-mono" fontSize={compact ? 16 : 10}>
        {Math.round(used)}/{cap}
      </text>
      {ready ? (
        <text x={r.x + r.w - 10} y={r.y + (compact ? 30 : 22)} textAnchor="end" className="fill-ion-400 font-mono font-semibold" fontSize={compact ? 14 : 9}>
          PICK READY
        </text>
      ) : null}
    </g>
  );
}

/**
 * Where the pickers walk. Clear: packing, up aisle A, across the top, down
 * Aisle C and home. Blocked: they cut back down aisle B and walk the long way.
 */
function PickerRoute({
  blocked,
  unsafe,
  seconds,
  reduced,
  compact,
}: {
  blocked: boolean;
  unsafe: boolean;
  seconds: number;
  reduced: boolean | null;
  compact: boolean;
}) {
  const a = G.aisleA.x + G.aisleA.w / 2;
  const b = G.aisleB.x + G.aisleB.w / 2;
  const c = G.aisleC.x + G.aisleC.w / 2;
  const top = 26;
  const bottom = 418;
  const start = G.packing.x + 40;
  const clear = `M ${start} ${G.packing.y} L ${a} ${bottom} L ${a} ${top} L ${c} ${top} L ${c} ${bottom} L ${start + 120} ${G.packing.y}`;
  const detour = unsafe
    ? `M ${start} ${G.packing.y} L ${a} ${bottom} L ${a} ${top} L ${c} ${top} L ${c} 250 L ${c + 26} 250 L ${c + 26} ${bottom} L ${start + 120} ${G.packing.y}`
    : `M ${start} ${G.packing.y} L ${a} ${bottom} L ${a} ${top} L ${c} ${top} L ${c} 240 L ${b} 240 L ${b} ${bottom} L ${start + 120} ${G.packing.y}`;
  const path = blocked || unsafe ? detour : clear;
  const duration = Math.max(3, seconds / 9);
  return (
    <g className="pointer-events-none">
      <motion.path
        d={path}
        fill="none"
        className={blocked || unsafe ? "stroke-warn-500/80" : "stroke-ion-400/70"}
        strokeWidth={compact ? 3 : 2}
        strokeDasharray="6 5"
        initial={false}
        animate={{ d: path }}
        transition={{ duration: reduced ? 0 : 0.6 }}
      />
      {!reduced ? (
        [0, 0.5].map((offset) => (
          <circle key={offset} r={compact ? 8 : 5} className="fill-hi">
            <animateMotion dur={`${duration}s`} begin={`${offset * duration}s`} repeatCount="indefinite" path={path} />
          </circle>
        ))
      ) : (
        <circle cx={a} cy={top} r={5} className="fill-hi" />
      )}
      <g>
        <rect x={G.packing.x + 8} y={G.packing.y + 66} width={compact ? 220 : 190} height={compact ? 32 : 26} rx={4} className={blocked || unsafe ? "fill-warn-500/15 stroke-warn-500/50" : "fill-ion-500/10 stroke-ion-500/40"} />
        <text x={G.packing.x + 16} y={G.packing.y + (compact ? 88 : 83)} className={cn("font-mono", blocked || unsafe ? "fill-warn-500" : "fill-ion-400")} fontSize={compact ? 16 : 11}>
          Aisle C route {seconds}s{compact ? "" : " · normal 38s"}
        </text>
      </g>
    </g>
  );
}
