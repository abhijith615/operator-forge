"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Ban, ScanLine, Truck } from "lucide-react";

import {
  EmptyRow,
  PanelFrame,
  StatRow,
  StatusPill,
} from "@/components/mission/panels/panel-frame";
import { Term } from "@/components/mission/term";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsShiftLive } from "@/hooks/use-mission";
import { easing } from "@/lib/motion";
import { useMissionStore } from "@/stores/mission-store";
import { cn, formatDuration } from "@/lib/utils";
import type { InventoryItem } from "@/types/world";

type Lens = "all" | "risk" | "counted";

export function InventoryPanel() {
  const world = useMissionStore((state) => state.world);
  const dispatch = useMissionStore((state) => state.dispatch);
  const live = useIsShiftLive();
  const [lens, setLens] = React.useState<Lens>("risk");

  if (!world) return null;

  const risky = world.inventory.filter(
    (item) => item.systemQty - item.reserved <= 3 || item.blocked,
  );
  const counted = world.inventory.filter((item) => item.counted);

  const rows =
    lens === "all" ? world.inventory : lens === "risk" ? risky : counted;

  const variance = counted.filter((item) => item.actualQty !== item.systemQty).length;

  return (
    <PanelFrame
      eyebrow="Stock position"
      title="Inventory"
      description={
        <>
          What the system believes is on the shelf. A <Term id="cycle-count">cycle count</Term>{" "}
          is the only way to find out whether it is right — and it costs a picker
          a few minutes each time.
        </>
      }
    >
      <StatRow
        items={[
          { label: "SKUs stocked", value: String(world.inventory.length) },
          { label: "At or below cover", value: String(risky.length) },
          { label: "Counted this shift", value: String(counted.length) },
          { label: "Variances found", value: String(variance) },
        ]}
      />

      <div className="panel sheen overflow-hidden">
        <div className="flex items-center gap-1 border-b border-line px-3 py-2.5">
          {(
            [
              ["risk", `Needs attention ${risky.length}`],
              ["all", "Full assortment"],
              ["counted", `Counted ${counted.length}`],
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
                  layoutId="inventory-lens"
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
            {lens === "counted"
              ? "Nothing has been counted yet. You are trusting the system."
              : "Nothing is short. The shelf is ahead of the queue."}
          </EmptyRow>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((item) => (
              <InventoryRow
                key={item.sku}
                item={item}
                live={live}
                onCount={() => dispatch({ type: "cycle-count", sku: item.sku })}
                onBlock={() => dispatch({ type: "block-sku", sku: item.sku })}
                onReplenish={() =>
                  dispatch({ type: "request-replenishment", sku: item.sku })
                }
              />
            ))}
          </ul>
        )}
      </div>
    </PanelFrame>
  );
}

function InventoryRow({
  item,
  live,
  onCount,
  onBlock,
  onReplenish,
}: {
  item: InventoryItem;
  live: boolean;
  onCount: () => void;
  onBlock: () => void;
  onReplenish: () => void;
}) {
  const available = item.systemQty - item.reserved;
  const variance = item.counted ? item.actualQty - item.systemQty : null;

  return (
    <motion.li
      layout
      transition={{ duration: 0.3, ease: easing.outExpo }}
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        item.blocked && "bg-alert-500/[0.03]",
      )}
    >
      <span
        data-readout
        className="w-[5.5rem] shrink-0 font-mono text-[11.5px] text-faint"
      >
        {item.sku}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] text-hi">{item.name}</p>
        <p className="truncate text-[11.5px] text-lo">
          {item.category}
          {item.replenishmentEta !== null
            ? ` · replenishment in ${formatDuration(item.replenishmentEta)}`
            : ""}
        </p>
      </div>

      <div className="hidden w-24 shrink-0 text-right sm:block">
        <p className="text-[10px] tracking-[0.1em] text-faint uppercase">System</p>
        <p data-readout className="text-[14px] text-mid tabular-nums">
          {item.systemQty}
        </p>
      </div>

      <div className="w-24 shrink-0 text-right">
        <p className="text-[10px] tracking-[0.1em] text-faint uppercase">Available</p>
        <p
          data-readout
          className={cn(
            "text-[14px] tabular-nums",
            available <= 0 ? "text-alert-500" : available <= 3 ? "text-warn-500" : "text-hi",
          )}
        >
          {available}
        </p>
      </div>

      <div className="hidden w-28 shrink-0 justify-end sm:flex">
        {item.blocked ? (
          <StatusPill tone="alert">Blocked</StatusPill>
        ) : variance === null ? (
          <StatusPill tone="neutral">Uncounted</StatusPill>
        ) : variance === 0 ? (
          <StatusPill tone="ion">Matched</StatusPill>
        ) : (
          <StatusPill tone="warn">
            {variance > 0 ? "+" : ""}
            {variance} vs system
          </StatusPill>
        )}
      </div>

      <div className="flex shrink-0 gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onCount}
              disabled={!live}
              aria-label={`Cycle count ${item.name}`}
              className="hover:text-ember-400"
            >
              <ScanLine />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Run a cycle count</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onBlock}
              disabled={!live}
              aria-label={item.blocked ? `Unblock ${item.name}` : `Block ${item.name}`}
              className={cn(item.blocked ? "text-alert-500" : "hover:text-alert-500")}
            >
              <Ban />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {item.blocked ? "Return to the assortment" : "Stop pickers hunting for it"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onReplenish}
              disabled={!live || item.replenishmentEta !== null}
              aria-label={`Request replenishment for ${item.name}`}
              className="hover:text-ion-400"
            >
              <Truck />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Request replenishment · ~10 min</TooltipContent>
        </Tooltip>
      </div>
    </motion.li>
  );
}
