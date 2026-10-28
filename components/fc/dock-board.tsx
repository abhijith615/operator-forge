"use client";

import * as React from "react";
import { Snowflake, Truck, Wrench, X } from "lucide-react";

import { DOCKS, DOCK_INFO, SLOTS, VEHICLES, slotLabel, type VehicleId } from "@/lib/fc/content";
import { arrivesAt, busyAt, canPlace, dockClosed, trayOf } from "@/lib/fc/engine";
import type { FcState } from "@/lib/fc/types";
import { cn } from "@/lib/utils";

import type { SceneProps } from "./shared";

/** Each truck keeps one colour all morning, so it can be followed across screens. */
export const TRUCK_COLOUR: Record<VehicleId, string> = {
  spice: "#e8a23a",
  dairy: "#5cc8f0",
  bright: "#b38cf2",
  crunchy: "#f07a4a",
  mega: "#3fc9a5",
  quickbev: "#ef6fa8",
};

function hours(length: number): string {
  const minutes = length * 30;
  return minutes % 60 === 0 ? `${minutes / 60} h` : `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)} h ` : ""}30 min`;
}

export function TruckCard({ v, state, selected, onClick }: { v: VehicleId; state: FcState; selected?: boolean; onClick?: () => void }) {
  const truck = VEHICLES[v];
  const arrives = arrivesAt(state, v);
  const late = v === "dairy" && arrives !== truck.arrives;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex min-h-[64px] w-full items-center gap-3 rounded-[14px] border px-3 py-2.5 text-left transition-[border-color,background-color,transform] duration-150 active:scale-[0.99]",
        selected ? "border-ember-500 bg-ember-500/[0.1] shadow-[0_0_0_3px_rgba(245,196,0,0.15)]" : "border-line-strong bg-white/[0.025] hover:border-line-bright",
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-[10px]" style={{ background: `${TRUCK_COLOUR[v]}26`, color: TRUCK_COLOUR[v] }}>
        {truck.chilled ? <Snowflake className="size-5" aria-hidden /> : <Truck className="size-5" aria-hidden />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-semibold text-hi">{truck.vendor}</span>
        <span className="block truncate text-[12.5px] text-lo">{truck.load}</span>
      </span>
      <span className="shrink-0 text-right text-[12px] leading-tight">
        <span className={cn("block font-semibold", late ? "text-warn-500" : "text-mid")}>
          {truck.booked === null ? "No booking" : late ? `At gate ${slotLabel(arrives)}` : `Booked ${slotLabel(truck.booked)}`}
        </span>
        <span className="block text-lo">Unload {hours(truck.length)}</span>
      </span>
    </button>
  );
}

/**
 * Four docks across the morning, in half-hours. Tap a truck, then a dock and a
 * time. The row underneath counts trucks being unloaded in each half-hour
 * against the crews there are to unload them. It never says whether a plan is
 * good — only what it is.
 */
export function DockBoard({ state, act, crews }: SceneProps & { crews: number }) {
  const [selected, setSelected] = React.useState<VehicleId | null>(null);
  const tray = trayOf(state);
  const placed = (Object.keys(state.board) as VehicleId[]).filter((v) => state.board[v]);

  React.useEffect(() => {
    if (selected && !tray.includes(selected) && !placed.includes(selected)) setSelected(null);
  }, [selected, tray, placed]);

  const tap = (dock: (typeof DOCKS)[number], slot: number) => {
    if (!selected) return;
    if (act({ t: "place", v: selected, dock, start: slot })) setSelected(null);
  };

  const cols = { gridTemplateColumns: `62px repeat(${SLOTS}, minmax(44px, 1fr))` };

  return (
    <div>
      {tray.length ? (
        <div className="mb-3">
          <p className="mb-2 text-[13px] font-medium text-mid">{selected ? "Now tap a dock and a time on the board." : "Tap a truck to place it."}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {tray.map((v) => (
              <TruckCard key={v} v={v} state={state} selected={selected === v} onClick={() => setSelected(selected === v ? null : v)} />
            ))}
          </div>
        </div>
      ) : (
        <p className="mb-3 rounded-[12px] border border-line bg-white/[0.02] px-3 py-2 text-[13px] text-mid">
          Every truck is on the board. Tap one to move it.
        </p>
      )}

      {selected && placed.includes(selected) ? (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-[12px] border border-ember-500/40 bg-ember-500/[0.07] px-3 py-2">
          <p className="text-[13px] text-hi">
            Moving <span className="font-semibold">{VEHICLES[selected].vendor}</span> — tap a new dock and time.
          </p>
          <button
            type="button"
            onClick={() => {
              act({ t: "unplace", v: selected });
              setSelected(null);
            }}
            className="inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-full border border-line-strong px-3 text-[12.5px] font-semibold text-mid hover:text-hi"
          >
            <X className="size-3.5" aria-hidden /> Take off board
          </button>
        </div>
      ) : null}

      <p className="mb-1.5 text-right text-[11.5px] text-lo sm:hidden">Swipe the board sideways to see 07:30–12:30 →</p>
      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <div className="min-w-[520px] rounded-[16px] border border-line bg-white/[0.015] p-2" role="grid" aria-label="Dock board">
          <div className="grid gap-[3px]" style={cols} role="row">
            <span />
            {Array.from({ length: SLOTS }, (_, slot) => (
              <span key={slot} role="columnheader" className="tabular pb-1 text-center font-mono text-[10.5px] text-lo">
                {slotLabel(slot)}
              </span>
            ))}
          </div>

          {DOCKS.map((dock) => (
            <div key={dock} className="relative mt-[3px] grid gap-[3px]" style={cols} role="row">
              <span className="sticky left-0 z-20 flex flex-col justify-center rounded-[8px] bg-[#1c1c1c] px-1.5 py-1 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.8)]" style={{ gridRow: 1, gridColumn: 1 }} role="rowheader">
                <span className="flex items-center gap-1 text-[12.5px] font-semibold text-hi">
                  {DOCK_INFO[dock].label.replace("Dock ", "D")}
                  {dock === "D3" ? <Snowflake className="size-3 text-[#5cc8f0]" aria-label="cold dock" /> : null}
                </span>
                <span className="text-[9.5px] leading-tight text-lo">{dock === "D3" ? "Cold" : "Normal"}</span>
              </span>

              {Array.from({ length: SLOTS }, (_, slot) => {
                const closed = dockClosed(state, dock, slot);
                const ok = selected ? canPlace(state, selected, dock, slot) : false;
                return (
                  <button
                    key={slot}
                    type="button"
                    role="gridcell"
                    disabled={!ok}
                    onClick={() => tap(dock, slot)}
                    aria-label={`${DOCK_INFO[dock].label} at ${slotLabel(slot)}${closed ? ", closed for repair" : ""}`}
                    style={{ gridRow: 1, gridColumn: slot + 2 }}
                    className={cn(
                      "h-[52px] rounded-[8px] border transition-colors",
                      closed
                        ? "border-warn-500/30 bg-[repeating-linear-gradient(135deg,rgba(255,170,60,0.12)_0_5px,transparent_5px_10px)]"
                        : ok
                          ? "border-ember-500/50 bg-ember-500/[0.08] hover:bg-ember-500/[0.2]"
                          : "border-white/[0.05] bg-white/[0.02]",
                    )}
                  >
                    {closed && slot === 3 ? <Wrench className="mx-auto size-3.5 text-warn-500" aria-hidden /> : null}
                  </button>
                );
              })}

              {placed
                .filter((v) => state.board[v]!.dock === dock)
                .map((v) => {
                  const p = state.board[v]!;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSelected(selected === v ? null : v)}
                      aria-label={`${VEHICLES[v].vendor}, ${DOCK_INFO[dock].label}, from ${slotLabel(p.start)}`}
                      aria-pressed={selected === v}
                      style={{ gridRow: 1, gridColumn: `${p.start + 2} / span ${VEHICLES[v].length}`, background: `${TRUCK_COLOUR[v]}2e`, borderColor: TRUCK_COLOUR[v], color: TRUCK_COLOUR[v] }}
                      className={cn(
                        "z-10 flex h-[52px] min-w-0 items-center gap-1.5 overflow-hidden rounded-[8px] border-[1.5px] px-2 text-left transition-transform duration-150 animate-in fade-in-0 zoom-in-95",
                        selected === v && "ring-2 ring-ember-500 ring-offset-1 ring-offset-void",
                      )}
                    >
                      {VEHICLES[v].chilled ? <Snowflake className="size-3.5 shrink-0" aria-hidden /> : <Truck className="size-3.5 shrink-0" aria-hidden />}
                      <span className="min-w-0 truncate text-[12px] font-semibold text-hi">{VEHICLES[v].vendor.split(" ")[0]}</span>
                    </button>
                  );
                })}
            </div>
          ))}

          <div className="mt-2 grid gap-[3px] border-t border-line pt-2" style={cols} role="row">
            <span className="sticky left-0 z-20 flex flex-col justify-center bg-[#151515] px-1.5 text-[10.5px] leading-tight text-lo" role="rowheader">
              Crews busy
              <span className="text-faint">of {crews}</span>
            </span>
            {Array.from({ length: SLOTS }, (_, slot) => {
              const busy = busyAt(state.board, slot).length;
              const over = busy > crews;
              return (
                <span key={slot} role="gridcell" className="flex flex-col items-center gap-1 py-1" aria-label={`${slotLabel(slot)}: ${busy} truck${busy === 1 ? "" : "s"} unloading, ${crews} crew${crews === 1 ? "" : "s"}`}>
                  <span className="flex gap-[3px]">
                    {Array.from({ length: Math.max(crews, busy) }, (_, i) => (
                      <span key={i} className={cn("size-[7px] rounded-full", i < busy ? (i >= crews ? "bg-alert-500" : "bg-ion-400") : "bg-white/10")} />
                    ))}
                  </span>
                  <span className={cn("tabular text-[11px] font-semibold", over ? "text-alert-500" : busy ? "text-mid" : "text-faint")}>{busy}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <p className="mt-2 text-[12px] text-lo">
        <Snowflake className="mr-1 inline size-3 text-[#5cc8f0]" aria-hidden />
        Dock 3 is the only cold dock. A crew (2 loaders + 1 scanner) unloads one truck at a time.
      </p>
    </div>
  );
}
