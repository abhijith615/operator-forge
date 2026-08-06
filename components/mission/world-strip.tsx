"use client";

import {
  Bike,
  Boxes,
  CloudRain,
  CloudSun,
  PackageCheck,
  ShoppingBag,
  Star,
  Sun,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { MetricTile, type MetricTone } from "@/components/mission/metric-tile";
import { Term } from "@/components/mission/term";
import { hubClock } from "@/lib/mission/config";
import { openOrders } from "@/lib/mission/engine";
import { useMissionStore } from "@/stores/mission-store";
import type { WeatherCondition, WorldState } from "@/types/world";

const WEATHER_ICON: Record<WeatherCondition, LucideIcon> = {
  clear: Sun,
  cloudy: CloudSun,
  rain: CloudRain,
  storm: CloudRain,
};

const HUB_TONE: Record<WorldState["hubStatus"], MetricTone> = {
  open: "ion",
  strained: "warn",
  critical: "alert",
  throttled: "warn",
  closed: "alert",
};

const HUB_HINT: Record<WorldState["hubStatus"], string> = {
  open: "Intake normal, floor keeping up",
  strained: "Backlog building faster than it clears",
  critical: "The queue is winning",
  throttled: "You cut intake to catch up",
  closed: "No new orders coming in",
};

/** The eight readings an operator glances at without thinking. */
export function WorldStrip() {
  const world = useMissionStore((state) => state.world);
  if (!world) return null;

  const open = openOrders(world);
  const breaching = open.filter(
    (order) => order.placedAt + order.promisedIn - world.elapsed < 120,
  ).length;

  const activeWorkers = world.workers.filter((w) => w.status === "active").length;
  const absent = world.workers.filter((w) => w.status === "absent").length;
  const ridersOut = world.riders.filter((r) => r.status === "delivering").length;
  const ridersAvailable = world.riders.filter((r) => r.status === "idle").length;

  const lowStock = world.inventory.filter(
    (item) => item.systemQty - item.reserved <= 3,
  ).length;

  const WeatherIcon = WEATHER_ICON[world.weather.condition];
  const otifPct = Math.round(world.metrics.otif * 100);

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-4">
      <MetricTile
        label="Open orders"
        value={open.length}
        icon={ShoppingBag}
        tone={breaching > 0 ? "alert" : "ember"}
        hint={
          breaching > 0 ? (
            <>
              {breaching} within 2 min of a <Term id="breach">breach</Term>
            </>
          ) : (
            `${world.metrics.ordersDelivered} delivered so far`
          )
        }
      />

      <MetricTile
        label={<Term id="otif">OTIF</Term>}
        value={otifPct}
        unit="%"
        icon={PackageCheck}
        tone={otifPct >= 92 ? "ion" : otifPct >= 80 ? "warn" : "alert"}
        hint={`${world.metrics.ordersBreached} breached`}
      />

      <MetricTile
        label="Customer rating"
        value={world.rating.toFixed(2)}
        icon={Star}
        tone={world.rating >= 4.4 ? "ion" : world.rating >= 4.1 ? "warn" : "alert"}
        hint={`${world.complaints.filter((c) => !c.resolution).length} open complaints`}
      />

      <MetricTile
        label="Hub status"
        value={world.hubStatus === "open" ? "Open" : world.hubStatus[0]!.toUpperCase() + world.hubStatus.slice(1)}
        icon={Zap}
        tone={HUB_TONE[world.hubStatus]}
        hint={HUB_HINT[world.hubStatus]}
      />

      <MetricTile
        label="Workers on floor"
        value={activeWorkers}
        icon={Users}
        tone={absent > 0 ? "warn" : "neutral"}
        hint={absent > 0 ? `${absent} absent` : "Full roster"}
      />

      <MetricTile
        label="Riders out"
        value={ridersOut}
        icon={Bike}
        tone={ridersAvailable === 0 ? "warn" : "flux"}
        hint={`${ridersAvailable} available`}
      />

      <MetricTile
        label="Stock alerts"
        value={lowStock}
        icon={Boxes}
        tone={lowStock > 3 ? "alert" : lowStock > 0 ? "warn" : "neutral"}
        hint={lowStock > 0 ? "SKUs at or below cover" : "Nothing critical"}
      />

      <MetricTile
        label="Weather · hub time"
        value={hubClock(world.elapsed)}
        icon={WeatherIcon}
        tone={world.weather.condition === "rain" ? "warn" : "neutral"}
        hint={world.weather.note}
      />
    </div>
  );
}
