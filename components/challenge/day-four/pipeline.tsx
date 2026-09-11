"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUp, PackageCheck, ShieldAlert, Snowflake, Thermometer } from "lucide-react";

import { FromTo } from "@/components/challenge/day-four/ui";
import { Button } from "@/components/ui/button";
import {
  bringToDock,
  freeDock,
  sendToYard,
  whyNotAisle,
  whyNotGrn,
  whyNotPutaway,
  whyNotQc,
} from "@/lib/challenge/day-four/engine";
import { metricsOf, storageRoom } from "@/lib/challenge/day-four/floor";
import {
  BATCHES,
  BATCH_ORDER,
  GRN_SLOTS,
  LUNCH_FORECAST,
  QC_CRATE,
  RECOVERY_AT,
  STORAGE_LABEL,
  VEHICLES,
  VEHICLE_ORDER,
  clockAt,
} from "@/lib/challenge/day-four/scenario";
import type {
  AisleAction,
  BatchId,
  Day4State,
  QcAction,
  Stage,
  StorageId,
  VehicleId,
} from "@/lib/challenge/day-four/types";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* ── The batch tray ───────────────────────────────────────────────────── */

type Column = "vehicle" | "qc" | "received" | "grn" | "verified" | "putaway" | "ready";

const COLUMNS: { id: Column; label: string; stages: Stage[] }[] = [
  { id: "vehicle", label: "On vehicle", stages: ["vehicle", "accepted"] },
  { id: "qc", label: "QC", stages: ["qc"] },
  { id: "received", label: "Received", stages: ["unloading", "received"] },
  { id: "grn", label: "GRN scan", stages: ["grn"] },
  { id: "verified", label: "Verified", stages: ["verified"] },
  { id: "putaway", label: "Putaway", stages: ["putaway"] },
  { id: "ready", label: "Pick ready", stages: ["ready"] },
];

const DEMAND_TONE = { high: "text-ember-400", medium: "text-mid", low: "text-faint" } as const;

/**
 * Every batch in receiving, in the stage it is in. A batch moves on when the
 * operator moves it — dragged onto the next column on a desktop, tapped and
 * given its next operation on a phone. Moves the process doesn't allow simply
 * don't happen, and the batch says why.
 */
export function BatchTray({
  state,
  selected,
  onSelect,
  onDrop,
}: {
  state: Day4State;
  selected: BatchId | null;
  onSelect: (id: BatchId) => void;
  onDrop: (id: BatchId, column: Column) => void;
}) {
  const [over, setOver] = React.useState<Column | null>(null);
  return (
    <section aria-label="Receiving pipeline" className="overflow-x-auto rounded-card border border-line bg-surface">
      <div className="grid min-w-[860px] grid-cols-7">
        {COLUMNS.map((column, index) => {
          const ids = column.id === "putaway"
            ? state.queue.filter((id) => state.batches[id].stage === "putaway")
            : BATCH_ORDER.filter((id) => column.stages.includes(state.batches[id].stage));
          const capacity = column.id === "qc" ? "1 at a time" : column.id === "grn" ? `${state.grn.length}/${GRN_SLOTS} slots` : null;
          return (
            <div
              key={column.id}
              onDragOver={(event) => {
                event.preventDefault();
                setOver(column.id);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(event) => {
                event.preventDefault();
                setOver(null);
                const id = event.dataTransfer.getData("text/plain") as BatchId;
                if (BATCH_ORDER.includes(id)) onDrop(id, column.id);
              }}
              className={cn(
                "min-h-[150px] p-2",
                index > 0 && "border-l border-line",
                over === column.id && "bg-ember-500/[0.05]",
              )}
            >
              <p className="flex items-baseline justify-between gap-1">
                <span className="font-mono text-[9.5px] tracking-[0.12em] text-lo uppercase">{column.label}</span>
                {index < COLUMNS.length - 1 ? <ArrowRight className="size-3 text-faint" aria-hidden /> : null}
              </p>
              {capacity ? <p className="font-mono text-[9px] text-faint">{capacity}</p> : null}
              <ul className="mt-2 space-y-1.5">
                {ids.map((id, position) => (
                  <li key={id}>
                    <BatchChip
                      state={state}
                      id={id}
                      selected={selected === id}
                      queuePosition={column.id === "putaway" ? position + 1 : null}
                      onSelect={() => onSelect(id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function progressOf(state: Day4State, id: BatchId): number | null {
  const batch = state.batches[id];
  switch (batch.stage) {
    case "unloading":
      return batch.onFloor / batch.cartons;
    case "grn":
      return batch.scanned / batch.cartons;
    case "putaway":
      return batch.stored / batch.cartons;
    default:
      return null;
  }
}

function BatchChip({
  state,
  id,
  selected,
  queuePosition,
  onSelect,
}: {
  state: Day4State;
  id: BatchId;
  selected: boolean;
  queuePosition: number | null;
  onSelect: () => void;
}) {
  const spec = BATCHES[id];
  const batch = state.batches[id];
  const progress = progressOf(state, id);
  const unverified = ["unloading", "received", "grn"].includes(batch.stage);
  const count = Math.round(batch.stage === "ready" ? batch.stored : batch.onTruck + batch.onFloor);
  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => event.dataTransfer.setData("text/plain", id)}
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "w-full cursor-grab rounded-md border px-2 py-1.5 text-left transition-colors active:cursor-grabbing",
        "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
        selected
          ? "border-ember-500 bg-ember-500/10"
          : batch.stage === "ready"
            ? "border-ion-500/50 bg-ion-500/[0.07]"
            : unverified
              ? "border-warn-500/45 bg-elevated"
              : "border-line-strong bg-elevated hover:border-line-bright",
      )}
    >
      <span className="flex items-center gap-1">
        {queuePosition ? <span className="font-mono text-[9px] text-ember-400">#{queuePosition}</span> : null}
        <span className="font-mono text-[11px] font-semibold text-hi">{id}</span>
        {spec.cold === "frozen" ? <Snowflake className="size-3 text-flux-400" aria-label="Frozen" /> : null}
        {spec.cold === "chilled" ? <Thermometer className="size-3 text-info-500" aria-label="Chilled" /> : null}
        <span className={cn("ml-auto font-mono text-[9px] uppercase", DEMAND_TONE[spec.demand])}>{spec.demand}</span>
      </span>
      <span className="mt-0.5 block truncate text-[10.5px] text-mid">{spec.name}</span>
      <span className="font-mono text-[10px] text-faint tabular-nums">
        {count} {spec.unit}
      </span>
      {progress !== null ? (
        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/[0.07]">
          <span className="block h-full rounded-full bg-ember-500 transition-[width] duration-500" style={{ width: `${Math.min(100, progress * 100)}%` }} />
        </span>
      ) : null}
    </button>
  );
}

/* ── The side panel ───────────────────────────────────────────────────── */

export interface RunDigest {
  from: number;
  to: number;
  arrived: number;
  stored: number;
  congestionFrom: number;
  congestionTo: number;
  ready: BatchId[];
  nilRiskFrom: number;
  nilRiskTo: number;
  routeRestored: { from: number; to: number } | null;
}

export function PipelinePanel({
  state,
  selected,
  digest,
  onQc,
  onGrn,
  onPutaway,
  onPrioritise,
  onResolve,
  onAisle,
  onVehicle,
  onRun,
}: {
  state: Day4State;
  selected: BatchId | null;
  digest: RunDigest | null;
  onQc: (id: BatchId) => void;
  onGrn: (id: BatchId) => void;
  onPutaway: (id: BatchId, destination: StorageId) => void;
  onPrioritise: (id: BatchId) => void;
  onResolve: (action: QcAction) => void;
  onAisle: (action: AisleAction) => void;
  onVehicle: (id: VehicleId, action: "pause" | "resume" | "dock" | "yard") => void;
  onRun: () => void;
}) {
  const metrics = metricsOf(state);
  const last = state.t + 3 >= RECOVERY_AT;

  return (
    <div className="space-y-3">
      {state.qcIssue.status === "pending" ? <QualityHold onResolve={onResolve} /> : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" size="lg" onClick={onRun}>
          Run 3 minutes
          <span className="font-mono text-[12px] opacity-80">→ {clockAt(Math.min(RECOVERY_AT, state.t + 3))}</span>
        </Button>
        <span className="text-[11.5px] text-faint">
          {last ? "The next run takes the floor to 10:48 — recovery planning." : "The floor only moves when you run it."}
        </span>
      </div>

      {digest ? <Digest digest={digest} /> : null}

      {selected ? (
        <BatchActions state={state} id={selected} onQc={onQc} onGrn={onGrn} onPutaway={onPutaway} onPrioritise={onPrioritise} />
      ) : (
        <p className="rounded-card border border-dashed border-line px-3.5 py-3 text-[12px] text-lo">
          Tap a batch in the pipeline to move it on — or drag it onto the next column.
        </p>
      )}

      <Vehicles state={state} onVehicle={onVehicle} />
      <AisleRecovery state={state} routeSeconds={metrics.routeSeconds} onAisle={onAisle} />
      <LunchForecast nilRisk={metrics.nilPickRisk} />
    </div>
  );
}

function Digest({ digest }: { digest: RunDigest }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      key={digest.to}
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: easing.outExpo }}
      className="rounded-card border border-line bg-surface p-3"
      role="status"
    >
      <p className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">
        {clockAt(digest.from)} → {clockAt(digest.to)}
      </p>
      <p className="mt-1 text-[12.5px] text-mid">
        <span className="text-hi">+{Math.round(digest.arrived)}</span> came off vehicles ·{" "}
        <span className="text-hi">{Math.round(digest.stored)}</span> put away · floor{" "}
        <FromTo from={Math.round(digest.congestionFrom * 100)} to={Math.round(digest.congestionTo * 100)} className="text-[12.5px]" />
      </p>
      {digest.ready.map((id) => (
        <p key={id} className="mt-1.5 flex items-center gap-2 text-[12.5px] text-ion-400">
          <PackageCheck className="size-3.5" aria-hidden />
          <span className="font-semibold">PICK READY</span> · {BATCHES[id].name} · +{BATCHES[id].cartons} {BATCHES[id].unit} available
        </p>
      ))}
      {digest.ready.some((id) => BATCHES[id].demand === "high") ? (
        <p className="mt-1 text-[11.5px] text-faint">
          Nil-pick risk {Math.round(digest.nilRiskFrom * 100)}% → {Math.round(digest.nilRiskTo * 100)}%
        </p>
      ) : null}
      {digest.routeRestored ? (
        <p className="mt-1.5 text-[12.5px] font-semibold text-ion-400">
          ROUTE RESTORED · Aisle C {digest.routeRestored.from}s → {digest.routeRestored.to}s
        </p>
      ) : null}
    </motion.div>
  );
}

const STAGE_TEXT: Record<Stage, string> = {
  vehicle: "On the vehicle.",
  qc: "At the QC gate — three minutes a check.",
  accepted: "Accepted. Coming off as soon as its dock is unloading.",
  unloading: "Coming off the vehicle.",
  received: "On the floor. Not sellable until it is scan-verified.",
  grn: "Being scan-verified.",
  verified: "Scan-verified. Ready for putaway.",
  putaway: "A putaway team is storing it.",
  ready: "On its shelf. Pick-ready.",
};

function BatchActions({
  state,
  id,
  onQc,
  onGrn,
  onPutaway,
  onPrioritise,
}: {
  state: Day4State;
  id: BatchId;
  onQc: (id: BatchId) => void;
  onGrn: (id: BatchId) => void;
  onPutaway: (id: BatchId, destination: StorageId) => void;
  onPrioritise: (id: BatchId) => void;
}) {
  const spec = BATCHES[id];
  const batch = state.batches[id];
  const qcReason = spec.cold && batch.stage === "vehicle" ? whyNotQc(state, id) : null;
  const grnReason = batch.stage === "received" ? whyNotGrn(state, id) : null;

  return (
    <div className="rounded-card border border-ember-500/40 bg-ember-500/[0.04] p-3.5">
      <p className="flex items-baseline gap-2">
        <span className="font-mono text-[12px] font-semibold text-ember-400">{id}</span>
        <span className="text-[14px] font-semibold text-hi">{spec.name}</span>
      </p>
      <p className="mt-0.5 text-[11.5px] text-lo">
        {spec.cartons} {spec.unit} · {spec.cold ? (spec.cold === "frozen" ? "Frozen" : "Chilled") : "Ambient"} · {spec.demand} demand
      </p>
      <p className="mt-2 text-[12.5px] text-mid">
        {batch.stage === "vehicle" && !spec.cold ? "On the grocery vehicle — comes off when that vehicle is unloading." : STAGE_TEXT[batch.stage]}
      </p>

      <div className="mt-2.5 space-y-1.5">
        {spec.cold && batch.stage === "vehicle" ? (
          <ActionButton label="Send to QC" reason={qcReason} onClick={() => onQc(id)} />
        ) : null}
        {batch.stage === "received" ? <ActionButton label="Start GRN scan" reason={grnReason} onClick={() => onGrn(id)} /> : null}
        {batch.stage === "verified" ? (
          <div>
            <p className="font-mono text-[10px] tracking-[0.12em] text-lo uppercase">Put away to</p>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {(["chilled", "frozen", "fastpick", "ambient", "deep"] as StorageId[]).map((destination) => {
                const reason = whyNotPutaway(state, id, destination);
                const allowed = spec.allowed.includes(destination);
                return (
                  <button
                    key={destination}
                    type="button"
                    disabled={Boolean(reason)}
                    onClick={() => onPutaway(id, destination)}
                    title={reason ?? undefined}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed",
                      "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                      reason
                        ? "border-line text-faint opacity-50"
                        : destination === spec.storage
                          ? "border-ion-500/60 bg-ion-500/[0.06] text-hi hover:bg-ion-500/[0.12]"
                          : "border-line-strong bg-surface text-mid hover:text-hi",
                    )}
                  >
                    <span className="block text-[11.5px] font-medium">{STORAGE_LABEL[destination]}</span>
                    <span className="block font-mono text-[9.5px]">
                      {allowed ? `${Math.round(storageRoom(state, destination))} free` : "not for this stock"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {batch.stage === "putaway" ? (
          <>
            <p className="font-mono text-[11px] text-mid">
              Storing into {batch.destination ? STORAGE_LABEL[batch.destination] : "—"} · {Math.round(batch.stored)}/{batch.cartons}
            </p>
            <ActionButton
              label="Move to the front of putaway"
              reason={state.queue[0] === id ? "Already first" : null}
              onClick={() => onPrioritise(id)}
              icon={<ArrowUp className="size-3.5" aria-hidden />}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  reason,
  onClick,
  icon,
}: {
  label: string;
  reason: string | null;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <Button variant={reason ? "secondary" : "primary"} size="md" className="w-full" disabled={Boolean(reason)} onClick={onClick}>
        {icon}
        {label}
      </Button>
      {reason ? <p className="mt-1 text-[11px] text-warn-500">{reason}</p> : null}
    </div>
  );
}

/* ── The crate at the gate ────────────────────────────────────────────── */

const QC_ACTIONS: { id: QcAction; label: string; detail: string; tone: "safe" | "risk" }[] = [
  { id: "quarantine", label: "Quarantine / reject", detail: "Into the cage. Back to the supplier.", tone: "safe" },
  { id: "recheck", label: "Hold for recheck", detail: "The gate rechecks it — two minutes.", tone: "safe" },
  { id: "accept", label: "Accept to stock", detail: "It joins the batch.", tone: "risk" },
  { id: "shelf", label: "Send direct to shelf", detail: "Past QC and GRN, straight out.", tone: "risk" },
];

export function QualityHold({ onResolve }: { onResolve: (action: QcAction) => void }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: easing.outExpo }}
      className="rounded-card border border-alert-500/50 bg-alert-500/[0.06] p-4"
      role="alert"
    >
      <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-alert-500 uppercase">
        <ShieldAlert className="size-3.5" aria-hidden />
        Quality hold · QC gate
      </p>
      <div className="mt-3 flex items-start gap-3">
        {/* The crate itself. */}
        <div aria-hidden className="relative grid size-16 shrink-0 place-items-center rounded-md border-2 border-alert-500/70 bg-info-500/20">
          <span className="font-mono text-[11px] font-semibold text-hi">{QC_CRATE.id}</span>
          <span className="absolute -top-1 -right-1 size-3 rotate-45 bg-alert-500" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-hi">Dairy crate {QC_CRATE.id}</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-mid">{QC_CRATE.issue}</p>
          <p className="mt-1 text-[11.5px] text-faint">The rest of D1 waits at the gate until this crate has a decision.</p>
        </div>
      </div>
      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {QC_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => onResolve(action.id)}
            className={cn(
              "rounded-md border px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
              "border-line-strong bg-surface hover:border-line-bright",
            )}
          >
            <span className="block text-[12.5px] font-semibold text-hi">{action.label}</span>
            <span className="block text-[11px] text-lo">{action.detail}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Vehicles ─────────────────────────────────────────────────────────── */

function Vehicles({ state, onVehicle }: { state: Day4State; onVehicle: (id: VehicleId, action: "pause" | "resume" | "dock" | "yard") => void }) {
  const dockFree = freeDock(state);
  return (
    <div className="rounded-card border border-line bg-surface p-3">
      <p className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">Docks and vehicles</p>
      <ul className="mt-2 space-y-2">
        {VEHICLE_ORDER.map((id) => {
          const run = state.vehicles[id];
          const spec = VEHICLES[id];
          const onTruck = spec.batches.reduce((sum, batch) => sum + state.batches[batch].onTruck, 0);
          if (run.done) {
            return (
              <li key={id} className="text-[12px] text-faint">
                {spec.name} · unloaded and gone
              </li>
            );
          }
          const awaitingQc = spec.temperature !== "Ambient" && spec.batches.some((batch) => ["vehicle", "qc"].includes(state.batches[batch].stage));
          const status = run.dock
            ? run.paused
              ? `Dock ${run.dock} · paused`
              : awaitingQc
                ? `Dock ${run.dock} · waiting for QC`
                : `Dock ${run.dock} · unloading`
            : run.lane === "hold"
              ? "Held at the yard"
              : "Waiting for a dock";
          return (
            <li key={id} className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-medium text-hi">{spec.name}</span>
                <span className="font-mono text-[10.5px] text-lo">
                  {status} · {Math.round(onTruck)} left
                </span>
              </span>
              {run.dock && !run.paused && id === "grocery" ? (
                <Button variant="secondary" size="sm" onClick={() => onVehicle(id, "pause")}>
                  Pause unload
                </Button>
              ) : null}
              {run.dock && run.paused ? (
                <>
                  <Button variant="secondary" size="sm" onClick={() => onVehicle(id, "resume")}>
                    Resume
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onVehicle(id, "yard")} disabled={sendToYard(state, id) === state}>
                    To yard
                  </Button>
                </>
              ) : null}
              {!run.dock ? (
                <Button variant="secondary" size="sm" disabled={!dockFree || bringToDock(state, id) === state} onClick={() => onVehicle(id, "dock")}>
                  {dockFree ? `Bring to dock ${dockFree}` : "No free dock"}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-faint">A vehicle on a dock keeps a team there. Paused or gone, that team puts stock away.</p>
    </div>
  );
}

/* ── Aisle C ──────────────────────────────────────────────────────────── */

const AISLE_ACTIONS: { id: AisleAction; label: string }[] = [
  { id: "safe", label: "Temp hold in safe zone" },
  { id: "staging", label: "Move to staging" },
  { id: "putaway", label: "Putaway now" },
  { id: "leave", label: "Leave in aisle" },
];

function AisleRecovery({ state, routeSeconds, onAisle }: { state: Day4State; routeSeconds: number; onAisle: (action: AisleAction) => void }) {
  const spill = state.batches.C1;
  const inAisle = spill.location === "aisle" && spill.onFloor > 0;
  if (!inAisle) {
    return (
      <div className="rounded-card border border-ion-500/35 bg-ion-500/[0.04] px-3 py-2.5 text-[12px] text-ion-400">
        Aisle C spill cleared · route {routeSeconds}s
      </div>
    );
  }
  return (
    <div className="rounded-card border border-warn-500/40 bg-warn-500/[0.04] p-3">
      <p className="font-mono text-[10px] tracking-[0.14em] text-warn-500 uppercase">Aisle C · picker route</p>
      <p className="mt-1 text-[12.5px] text-mid">
        {Math.round(spill.onFloor)} cartons in the route · current {routeSeconds}s, normal 38s
      </p>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {AISLE_ACTIONS.map((action) => {
          const reason = whyNotAisle(state, action.id);
          const chosen = state.aisle.action === action.id;
          return (
            <button
              key={action.id}
              type="button"
              disabled={Boolean(reason) || (action.id === "leave" && chosen)}
              onClick={() => onAisle(action.id)}
              title={reason ?? undefined}
              className={cn(
                "rounded-md border px-2 py-1.5 text-left text-[11.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                chosen ? "border-ember-500 bg-ember-500/10 text-hi" : "border-line-strong bg-surface text-mid hover:text-hi",
              )}
            >
              {action.label}
              {reason ? <span className="block font-mono text-[9.5px] text-faint">{reason}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Lunch ────────────────────────────────────────────────────────────── */

function LunchForecast({ nilRisk }: { nilRisk: number }) {
  return (
    <div className="rounded-card border border-line bg-surface p-3">
      <p className="flex items-baseline justify-between font-mono text-[10px] tracking-[0.14em] uppercase">
        <span className="text-ember-500">Lunch · high demand</span>
        <span className="text-faint">nil-pick risk {Math.round(nilRisk * 100)}%</span>
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {LUNCH_FORECAST.map((item) => (
          <li key={item} className="rounded-full border border-line-strong px-2.5 py-0.5 text-[11.5px] text-mid">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export type { Column };
