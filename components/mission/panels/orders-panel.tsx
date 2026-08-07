"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, X, Zap } from "lucide-react";

import {
  EmptyRow,
  PanelFrame,
  StatRow,
  StatusPill,
} from "@/components/mission/panels/panel-frame";
import { Term } from "@/components/mission/term";
import { Button } from "@/components/ui/button";
import { useIsShiftLive } from "@/hooks/use-mission";
import { hubClock } from "@/lib/mission/config";
import { secondsToBreach } from "@/lib/mission/engine";
import { easing } from "@/lib/motion";
import { useMissionStore } from "@/stores/mission-store";
import { cn, formatDuration } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types/world";

const STATUS_TONE: Record<OrderStatus, Parameters<typeof StatusPill>[0]["tone"]> = {
  queued: "neutral",
  picking: "ember",
  packed: "flux",
  dispatched: "ion",
  delivered: "ion",
  breached: "alert",
  cancelled: "neutral",
};

type Lens = "open" | "risk" | "closed";

export function OrdersPanel() {
  const world = useMissionStore((state) => state.world);
  const dispatch = useMissionStore((state) => state.dispatch);
  const live = useIsShiftLive();
  const [lens, setLens] = React.useState<Lens>("open");

  if (!world) return null;

  const open = world.orders.filter((order) =>
    ["queued", "picking", "packed", "dispatched"].includes(order.status),
  );
  const risk = open.filter((order) => secondsToBreach(order, world.elapsed) < 180);
  const closed = world.orders
    .filter((order) => ["delivered", "breached", "cancelled"].includes(order.status))
    .slice(-40)
    .reverse();

  const rows =
    lens === "open"
      ? [...open].sort(
          (a, b) => secondsToBreach(a, world.elapsed) - secondsToBreach(b, world.elapsed),
        )
      : lens === "risk"
        ? [...risk].sort(
            (a, b) => secondsToBreach(a, world.elapsed) - secondsToBreach(b, world.elapsed),
          )
        : closed;

  return (
    <PanelFrame
      eyebrow="Live queue"
      title="Orders"
      description={
        <>
          Every promise the store has made and has not yet kept. Sorted by how
          close each one is to a <Term id="breach">breach</Term>.
        </>
      }
    >
      <StatRow
        items={[
          { label: "Open", value: String(open.length) },
          { label: "Within 3 minutes", value: String(risk.length) },
          { label: <Term id="otif">OTIF</Term>, value: `${Math.round(world.metrics.otif * 100)}%` },
          { label: "Breached", value: String(world.metrics.ordersBreached) },
        ]}
      />

      <div className="panel sheen overflow-hidden">
        <div className="flex items-center gap-1 border-b border-line px-3 py-2.5">
          {(
            [
              ["open", `Open ${open.length}`],
              ["risk", `At risk ${risk.length}`],
              ["closed", "Settled"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setLens(value)}
              className={cn(
                "relative rounded-full px-3 py-1.5 text-[12.5px] transition-colors duration-150",
                lens === value ? "text-hi" : "text-lo hover:text-mid",
              )}
            >
              {lens === value ? (
                <motion.span
                  layoutId="orders-lens"
                  transition={{ type: "spring", stiffness: 520, damping: 42 }}
                  className="absolute inset-0 -z-10 rounded-full bg-white/[0.07]"
                />
              ) : null}
              {label}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <EmptyRow>
            {lens === "risk"
              ? "Nothing is close to breaching. Enjoy it."
              : "No orders here."}
          </EmptyRow>
        ) : (
          <ul className="divide-y divide-line">
            <AnimatePresence initial={false}>
              {rows.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  elapsed={world.elapsed}
                  live={live}
                  onExpedite={() => dispatch({ type: "expedite-order", orderId: order.id })}
                  onCancel={() => dispatch({ type: "cancel-order", orderId: order.id })}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </PanelFrame>
  );
}

function OrderRow({
  order,
  elapsed,
  live,
  onExpedite,
  onCancel,
}: {
  order: Order;
  elapsed: number;
  live: boolean;
  onExpedite: () => void;
  onCancel: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const left = secondsToBreach(order, elapsed);
  const settled = ["delivered", "breached", "cancelled"].includes(order.status);
  const critical = !settled && left < 120;

  return (
    <motion.li
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: easing.outExpo }}
      className={cn("transition-colors", critical && "bg-alert-500/[0.035]")}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="grid size-6 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-white/[0.06] hover:text-hi"
          aria-label={expanded ? "Hide basket" : "Show basket"}
          aria-expanded={expanded}
        >
          <ChevronRight
            className={cn("size-3.5 transition-transform duration-200", expanded && "rotate-90")}
          />
        </button>

        <div className="w-16 shrink-0">
          <span data-readout className="font-mono text-[13px] text-hi tabular-nums">
            {order.code}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] text-hi">{order.customerName}</p>
          <p className="truncate text-[11.5px] text-lo">
            {order.lines.length} item{order.lines.length === 1 ? "" : "s"} · placed{" "}
            {hubClock(Math.max(0, order.placedAt))} · ₹{order.value}
          </p>
        </div>

        {order.expedited ? (
          <StatusPill tone="ember">
            <Zap className="size-3" />
            Expedited
          </StatusPill>
        ) : null}

        <StatusPill tone={STATUS_TONE[order.status]} className="capitalize">
          {order.status}
        </StatusPill>

        <div className="w-20 shrink-0 text-right">
          {settled ? (
            <span className="font-mono text-[11.5px] text-faint">—</span>
          ) : (
            <span
              data-readout
              className={cn(
                "font-mono text-[13px] tabular-nums",
                left < 0 ? "text-alert-500" : left < 180 ? "text-warn-500" : "text-mid",
              )}
            >
              {left < 0 ? `−${formatDuration(-left)}` : formatDuration(left)}
            </span>
          )}
        </div>

        {!settled ? (
          <div className="flex shrink-0 gap-1.5">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onExpedite}
              disabled={!live || order.expedited}
              aria-label={`Expedite ${order.code}`}
              className="hover:text-ember-400"
            >
              <Zap />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onCancel}
              disabled={!live}
              aria-label={`Cancel ${order.code}`}
              className="hover:text-alert-500"
            >
              <X />
            </Button>
          </div>
        ) : (
          <div className="w-[4.25rem] shrink-0" />
        )}
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: easing.outExpo }}
            className="overflow-hidden"
          >
            <ul className="space-y-1.5 border-t border-line bg-obsidian/50 px-4 py-3 pl-[4.75rem]">
              {order.lines.map((line) => (
                <li key={line.sku} className="flex items-center gap-3 text-[12.5px]">
                  <span className="font-mono text-[11px] text-faint">{line.sku}</span>
                  <span className="text-mid">{line.name}</span>
                  <span className="ml-auto text-lo tabular-nums">×{line.qty}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.li>
  );
}
