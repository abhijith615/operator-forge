"use client";

import * as React from "react";
import { Snowflake, Thermometer, Truck } from "lucide-react";

import { FromTo } from "@/components/challenge/day-four/ui";
import { nowCount } from "@/lib/challenge/day-four/engine";
import type { FloorMetrics } from "@/lib/challenge/day-four/floor";
import { VEHICLES, VEHICLE_ORDER } from "@/lib/challenge/day-four/scenario";
import type { Day4State, Lane, VehicleId } from "@/lib/challenge/day-four/types";
import { cn } from "@/lib/utils";

const LANES: { id: Lane; label: string; hint: string }[] = [
  { id: "now", label: "Process now", hint: "On a dock from 10:27" },
  { id: "next", label: "Stage next", hint: "Takes the next dock that frees up" },
  { id: "hold", label: "Hold at vehicle", hint: "Waits until you call it in" },
];

/**
 * The dock sequencer.
 *
 * Three loads, three lanes, and the floor at 10:48 redrawn every time a
 * vehicle moves — so the operator sees the consequence of "unload everything
 * now" on the map itself, before committing to it.
 */
export function DockSequencer({
  state,
  opening,
  projected,
  onLane,
}: {
  state: Day4State;
  opening: FloorMetrics;
  projected: FloorMetrics;
  onLane: (vehicle: VehicleId, lane: Lane) => void;
}) {
  const [over, setOver] = React.useState<Lane | null>(null);

  return (
    <section aria-label="Dock sequencer" className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {LANES.map((lane) => {
          const vehicles = VEHICLE_ORDER.filter((id) => state.plan[id] === lane.id);
          const full = lane.id === "now" && vehicles.length >= 2;
          return (
            <div
              key={lane.id}
              onDragOver={(event) => {
                event.preventDefault();
                setOver(lane.id);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(event) => {
                event.preventDefault();
                setOver(null);
                const id = event.dataTransfer.getData("text/plain") as VehicleId;
                if (VEHICLE_ORDER.includes(id)) onLane(id, lane.id);
              }}
              className={cn(
                "min-h-[120px] rounded-card border p-2.5 transition-colors",
                over === lane.id ? "border-ember-500 bg-ember-500/[0.06]" : "border-line bg-surface",
              )}
            >
              <p className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">{lane.label}</span>
                {lane.id === "now" ? (
                  <span className={cn("font-mono text-[10px]", full ? "text-warn-500" : "text-faint")}>{vehicles.length}/2 docks</span>
                ) : null}
              </p>
              <p className="text-[10.5px] text-faint">{lane.hint}</p>
              <ul className="mt-2 space-y-2">
                {vehicles.map((id) => (
                  <li key={id}>
                    <VehicleCard id={id} state={state} onLane={onLane} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="rounded-card border border-line bg-surface p-3.5">
        <p className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">
          If receiving runs on this plan until 10:48
        </p>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          <Row label="Floor cartons">
            <FromTo from={Math.round(opening.floorCartons)} to={Math.round(projected.floorCartons)} unit="" />
          </Row>
          <Row label="Aisle C blocked">
            <FromTo from={Math.round(opening.aisleBlocked * 100)} to={Math.round(projected.aisleBlocked * 100)} />
          </Row>
          <Row label="Picker route delay">
            <FromTo from={Math.round(opening.delay)} to={Math.round(projected.delay)} unit="s" />
          </Row>
          <Row label="CTD">
            <FromTo from={opening.ctd} to={projected.ctd} unit="s" />
          </Row>
        </dl>
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] text-faint">{label}</dt>
      <dd className="mt-0.5 text-[15px]">{children}</dd>
    </div>
  );
}

function VehicleCard({ id, state, onLane }: { id: VehicleId; state: Day4State; onLane: (id: VehicleId, lane: Lane) => void }) {
  const vehicle = VEHICLES[id];
  const cold = vehicle.temperature !== "Ambient";
  return (
    <div
      draggable
      onDragStart={(event) => event.dataTransfer.setData("text/plain", id)}
      className={cn(
        "cursor-grab rounded-card border bg-elevated p-3 active:cursor-grabbing",
        vehicle.temperature === "Chilled" ? "border-info-500/45" : vehicle.temperature === "Frozen" ? "border-flux-400/45" : "border-line-strong",
      )}
    >
      <p className="flex items-center gap-2 text-[13.5px] font-semibold text-hi">
        {vehicle.temperature === "Frozen" ? (
          <Snowflake className="size-3.5 text-flux-400" aria-hidden />
        ) : vehicle.temperature === "Chilled" ? (
          <Thermometer className="size-3.5 text-info-500" aria-hidden />
        ) : (
          <Truck className="size-3.5 text-lo" aria-hidden />
        )}
        {vehicle.name}
      </p>
      <p className="mt-0.5 font-mono text-[11px] text-mid">
        {vehicle.load} · {vehicle.temperature}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10.5px]">
        <dt className="text-faint">Checks</dt>
        <dd className="text-right text-mid">{vehicle.checks.join(" + ")}</dd>
        <dt className="text-faint">Space demand</dt>
        <dd className={cn("text-right", vehicle.spaceDemand === "Very high" ? "text-alert-500" : "text-mid")}>{vehicle.spaceDemand}</dd>
        <dt className="text-faint">Lunch relevance</dt>
        <dd className="text-right text-mid">{vehicle.demand}</dd>
      </dl>
      {cold && vehicle.note ? <p className="mt-1.5 text-[10.5px] leading-snug text-warn-500">{vehicle.note}</p> : null}
      <div className="mt-2.5 grid grid-cols-3 gap-1" role="group" aria-label={`${vehicle.name} lane`}>
        {LANES.map((lane) => {
          const active = state.plan[id] === lane.id;
          const blocked = lane.id === "now" && !active && nowCount(state.plan, id) >= 2;
          return (
            <button
              key={lane.id}
              type="button"
              aria-pressed={active}
              disabled={blocked}
              onClick={() => onLane(id, lane.id)}
              title={blocked ? "Both docks are taken" : undefined}
              className={cn(
                "h-8 rounded-md border text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                active ? "border-ember-500/70 bg-ember-500/15 text-hi" : "border-line bg-surface text-lo hover:text-mid",
              )}
            >
              {lane.id === "now" ? "Now" : lane.id === "next" ? "Next" : "Hold"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
