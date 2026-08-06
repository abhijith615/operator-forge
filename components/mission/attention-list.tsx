"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  MessageSquareWarning,
  ShoppingBag,
  TriangleAlert,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { secondsToBreach } from "@/lib/mission/engine";
import { easing } from "@/lib/motion";
import { useMissionStore } from "@/stores/mission-store";
import { cn, formatDuration } from "@/lib/utils";
import type { WorldState } from "@/types/world";

interface AttentionItem {
  id: string;
  icon: LucideIcon;
  tone: "critical" | "warning" | "info";
  title: string;
  detail: string;
  href: string;
  cta: string;
}

const TONE: Record<AttentionItem["tone"], string> = {
  critical: "text-alert-500 border-alert-500/25 bg-alert-500/[0.06]",
  warning: "text-warn-500 border-warn-500/25 bg-warn-500/[0.05]",
  info: "text-info-500 border-info-500/25 bg-info-500/[0.05]",
};

function buildItems(world: WorldState): AttentionItem[] {
  const items: AttentionItem[] = [];

  const nearBreach = world.orders
    .filter(
      (order) =>
        ["queued", "picking", "packed"].includes(order.status) &&
        secondsToBreach(order, world.elapsed) < 180,
    )
    .sort((a, b) => secondsToBreach(a, world.elapsed) - secondsToBreach(b, world.elapsed));

  const soonest = nearBreach[0];
  if (soonest) {
    const left = secondsToBreach(soonest, world.elapsed);
    items.push({
      id: "near-breach",
      icon: ShoppingBag,
      tone: left < 0 ? "critical" : "warning",
      title:
        left < 0
          ? `${nearBreach.length} order${nearBreach.length === 1 ? "" : "s"} past the promise`
          : `${soonest.code} breaches in ${formatDuration(left)}`,
      detail:
        nearBreach.length > 1
          ? `${nearBreach.length} orders are inside the last three minutes.`
          : `${soonest.customerName} is waiting on ${soonest.lines.length} items.`,
      href: "/orders",
      cta: "Open Orders",
    });
  }

  const absent = world.workers.filter((worker) => worker.status === "absent");
  if (absent.length) {
    items.push({
      id: "absent",
      icon: Users,
      tone: "critical",
      title: `${absent.length} picker${absent.length === 1 ? "" : "s"} not on the floor`,
      detail: absent.map((worker) => worker.name).join(", "),
      href: "/people",
      cta: "Open People",
    });
  }

  const fatigued = world.workers.filter(
    (worker) => worker.status === "active" && worker.fatigue > 0.75,
  );
  if (fatigued.length) {
    items.push({
      id: "fatigue",
      icon: Users,
      tone: "warning",
      title: `${fatigued.length} worker${fatigued.length === 1 ? " is" : "s are"} running on empty`,
      detail: "Mistakes start here. A break costs throughput now and saves it later.",
      href: "/people",
      cta: "Open People",
    });
  }

  const complaints = world.complaints.filter((complaint) => !complaint.resolution);
  if (complaints.length) {
    items.push({
      id: "complaints",
      icon: MessageSquareWarning,
      tone: complaints.some((c) => c.severity === "high") ? "critical" : "warning",
      title: `${complaints.length} unresolved complaint${complaints.length === 1 ? "" : "s"}`,
      detail: complaints[0]
        ? `${complaints[0].customerName} on ${complaints[0].orderCode}`
        : "",
      href: "/customers",
      cta: "Open Customers",
    });
  }

  const stockAlerts = world.inventory.filter(
    (item) => !item.blocked && item.systemQty - item.reserved <= 0,
  );
  if (stockAlerts.length) {
    items.push({
      id: "stock",
      icon: Boxes,
      tone: "warning",
      title: `${stockAlerts.length} SKU${stockAlerts.length === 1 ? "" : "s"} oversold`,
      detail: "Committed to more units than the system shows on the shelf.",
      href: "/inventory",
      cta: "Open Inventory",
    });
  }

  const impairments = world.impairments.filter((imp) => !imp.resolved);
  for (const impairment of impairments) {
    items.push({
      id: impairment.id,
      icon: Wrench,
      tone: "warning",
      title: impairment.label,
      detail: `Pick throughput at ${Math.round(impairment.pickPenalty * 100)}% while this stands.`,
      href: "/people",
      cta: "See the floor",
    });
  }

  return items.slice(0, 6);
}

/** Triage. What an operator would actually walk towards first. */
export function AttentionList({ className }: { className?: string }) {
  const world = useMissionStore((state) => state.world);
  if (!world) return null;

  const items = buildItems(world);

  return (
    <section className={cn("panel sheen flex flex-col overflow-hidden", className)}>
      <header className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
        <TriangleAlert className="size-3.5 text-ember-500" />
        <span className="font-mono text-[10.5px] tracking-[0.16em] text-lo uppercase">
          Needs you now
        </span>
        <span className="ml-auto font-mono text-[11px] text-faint tabular-nums">
          {items.length}
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <div className="grid size-10 place-items-center rounded-full border border-ion-500/25 bg-ion-500/10">
              <CheckCircle2 className="size-4 text-ion-400" />
            </div>
            <p className="text-[13.5px] text-hi">The floor is holding</p>
            <p className="max-w-[16rem] text-[12.5px] leading-relaxed text-lo">
              Nothing is breaching, nobody is missing, and no complaint is open.
              It will not last.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.35, ease: easing.outExpo }}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-start gap-3 rounded-card border p-3.5 transition-colors duration-200",
                      TONE[item.tone],
                      "hover:bg-white/[0.05]",
                    )}
                  >
                    <item.icon className="mt-0.5 size-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] leading-snug font-medium text-hi">
                        {item.title}
                      </p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-mid">
                        {item.detail}
                      </p>
                    </div>
                    <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-hi" />
                  </Link>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </section>
  );
}
