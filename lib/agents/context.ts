import { hubClock } from "@/lib/mission/config";
import { openOrders } from "@/lib/mission/engine";
import type { WorldState } from "@/types/world";

/**
 * A compact, honest read of the floor, injected into every agent turn.
 *
 * Agents are told only what a person in their position could plausibly see, and
 * are instructed elsewhere never to invent numbers beyond this block. Counts
 * the operator has not yet discovered — actual shelf quantities — are withheld.
 */
export function buildWorldBriefing(world: WorldState): string {
  const open = openOrders(world);
  const breaching = open.filter(
    (order) => order.placedAt + order.promisedIn - world.elapsed < 120,
  ).length;

  const activeWorkers = world.workers.filter((w) => w.status === "active").length;
  const absentWorkers = world.workers.filter((w) => w.status === "absent");
  const onBreak = world.workers.filter((w) => w.status === "break").length;
  const ridersOut = world.riders.filter((r) => r.status === "delivering").length;
  const ridersIdle = world.riders.filter((r) => r.status === "idle").length;
  const ridersOffline = world.riders.filter((r) => r.status === "offline").length;

  const openComplaints = world.complaints.filter((c) => !c.resolution);
  const impairments = world.impairments.filter((i) => !i.resolved);

  // Only counted SKUs are shared — the rest is still unknown to everyone.
  const knownVariance = world.inventory
    .filter((item) => item.counted && item.actualQty !== item.systemQty)
    .slice(0, 5)
    .map((item) => `${item.name}: shelf ${item.actualQty} vs system ${item.systemQty}`);

  const lowStock = world.inventory
    .filter((item) => item.systemQty - item.reserved <= 3)
    .slice(0, 5)
    .map((item) => `${item.name} (${item.systemQty} on system, ${item.reserved} committed)`);

  const lines = [
    `## Live floor — ${hubClock(world.elapsed)}, minute ${Math.floor(world.elapsed / 60)} of 60`,
    `Hub status: ${world.hubStatus}${world.statusOverride ? " (operator hold)" : ""}`,
    `Customer rating: ${world.rating.toFixed(2)}`,
    `Weather: ${world.weather.note}`,
    "",
    `Open orders: ${open.length} (${breaching} within two minutes of breaching)`,
    `Delivered: ${world.metrics.ordersDelivered} · Breached: ${world.metrics.ordersBreached} · Cancelled: ${world.metrics.ordersCancelled}`,
    `OTIF so far: ${(world.metrics.otif * 100).toFixed(0)}%`,
    "",
    `Workers active: ${activeWorkers} · on break: ${onBreak} · absent: ${absentWorkers.length}`,
    absentWorkers.length
      ? `Absent: ${absentWorkers.map((w) => w.name).join(", ")}`
      : "No absences.",
    `Riders delivering: ${ridersOut} · idle: ${ridersIdle} · offline: ${ridersOffline}`,
  ];

  if (impairments.length) {
    lines.push("", `Equipment issues: ${impairments.map((i) => i.label).join(", ")}`);
  }

  if (openComplaints.length) {
    lines.push(
      "",
      `Open complaints (${openComplaints.length}):`,
      ...openComplaints
        .slice(0, 4)
        .map((c) => `- ${c.customerName} on ${c.orderCode}: ${c.reason}`),
    );
  }

  if (knownVariance.length) {
    lines.push("", "Counted stock variances:", ...knownVariance.map((v) => `- ${v}`));
  }

  if (lowStock.length) {
    lines.push("", "Running low:", ...lowStock.map((v) => `- ${v}`));
  }

  return lines.join("\n");
}
