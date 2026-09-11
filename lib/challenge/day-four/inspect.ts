import { layoutOf, metricsOf } from "./floor";
import type { Day4State, ZoneId } from "./types";

/**
 * What each zone says when the operator looks at it in Stage 1.
 *
 * These are the 10:18 facts — the store before the operator has touched it —
 * and each zone gives away one piece of the picture, never the answer. Only
 * together do "putaway clears 22 in ten minutes" and "inbound arrives at 35"
 * say where the constraint is.
 */

export interface ZoneFact {
  label: string;
  value: string;
  tone?: "alert" | "warn" | "ion";
}

export interface ZoneFacts {
  title: string;
  facts: ZoneFact[];
  note: string;
}

export function zoneFacts(state: Day4State, zone: ZoneId): ZoneFacts {
  const layout = layoutOf(state);
  const metrics = metricsOf(state);
  const verified = (["S1", "C1"] as const).reduce((sum, id) => sum + state.batches[id].onFloor, 0);
  const awaiting = state.batches.S2.onFloor;

  switch (zone) {
    case "dock":
      return {
        title: "Dock",
        facts: [
          { label: "Receiving positions", value: "2" },
          { label: "Dock 1", value: "Dairy vehicle · 24 crates" },
          { label: "Dock 2", value: "Partly blocked by staging overflow", tone: "warn" },
          { label: "Occupancy", value: `${Math.round(metrics.dockOccupancy)}%`, tone: "alert" },
        ],
        note: "Two more vehicles are waiting for a position.",
      };
    case "yard":
      return {
        title: "Yard",
        facts: [
          { label: "Frozen vehicle", value: "18 crates · temperature verification pending", tone: "warn" },
          { label: "Acceptance", value: "Cannot unload to storage until accepted" },
          { label: "Grocery vehicle", value: "96 cartons · ambient · next" },
        ],
        note: "The reefer holds frozen stock at temperature while it waits.",
      };
    case "qc":
      return {
        title: "QC / receiving",
        facts: [
          { label: "Checker", value: "1 gate · one load at a time" },
          { label: "Dairy", value: "Temperature + shelf-life check required" },
          { label: "Frozen", value: "Temperature verification pending" },
          { label: "Ambient", value: "Spot-checked at the door" },
        ],
        note: "Cold loads don't come off the vehicle until they are accepted.",
      };
    case "staging":
      return {
        title: "GRN staging",
        facts: [
          { label: "Capacity", value: "80 cartons" },
          { label: "Current", value: `${Math.round(layout.total)} cartons`, tone: "alert" },
          { label: "Scan-verified", value: `${Math.round(verified)} · waiting for putaway` },
          { label: "Awaiting verification", value: `${Math.round(awaiting)}`, tone: "warn" },
        ],
        note: "Nothing leaves staging until it is scan-verified and a putaway team takes it.",
      };
    case "aisleC":
      return {
        title: "Aisle C",
        facts: [
          { label: "Normal picker route", value: "38 sec" },
          { label: "Current route", value: `${metrics.routeSeconds} sec`, tone: "alert" },
          { label: "Reason", value: `${Math.round(layout.aisle)} cartons forcing a detour`, tone: "warn" },
        ],
        note: "Pickers are walking round via aisle B for every Aisle C item.",
      };
    case "putaway":
      return {
        title: "Putaway",
        facts: [
          { label: "Teams on putaway", value: "2 of 4" },
          { label: "Current throughput", value: "22 cartons / 10 min", tone: "warn" },
          { label: "Inbound arriving", value: "35 cartons / 10 min", tone: "alert" },
        ],
        note: "The other two teams are on the docks.",
      };
    case "packing":
      return {
        title: "Packing",
        facts: [
          { label: "Packers", value: "4 on station", tone: "ion" },
          { label: "Queue", value: "6 orders" },
          { label: "Waiting on", value: "Picks" },
        ],
        note: "Packing is waiting for pickers, not the other way round.",
      };
  }
}
