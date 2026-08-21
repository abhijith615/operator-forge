"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Boxes,
  Building2,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

import { easing } from "@/lib/motion";
import { shortfallNote, type ResourcePool } from "@/lib/mission/resources";
import { cn } from "@/lib/utils";
import type { MissionTask, TaskPriority, TaskStream } from "@/types/tasks";

const STREAM_ICON: Record<TaskStream, LucideIcon> = {
  operations: Boxes,
  people: Users,
  customers: UserRound,
  management: Building2,
};

const STREAM_LABEL: Record<TaskStream, string> = {
  operations: "Operations",
  people: "People",
  customers: "Customers",
  management: "Management",
};

const PRIORITY: Record<
  TaskPriority,
  { rail: string; chip: string; label: string; glow: string }
> = {
  critical: {
    rail: "bg-alert-500",
    chip: "border-alert-500/30 bg-alert-500/12 text-alert-500",
    label: "Critical",
    glow: "shadow-[0_0_0_1px_rgba(255,77,94,0.18)]",
  },
  high: {
    rail: "bg-warn-500",
    chip: "border-warn-500/30 bg-warn-500/12 text-warn-500",
    label: "High",
    glow: "",
  },
  normal: {
    rail: "bg-lo/60",
    chip: "border-line-strong bg-white/[0.05] text-mid",
    label: "Normal",
    glow: "",
  },
};

interface TaskCardProps {
  task: MissionTask;
  elapsed: number;
  /** Free capacity right now. Memoised upstream so this stays comparable. */
  pool: ResourcePool;
  disabled?: boolean;
  onResolve: (optionId: string) => void;
}

/**
 * One decision, with its clock visible. Options are always on screen — a queue
 * you have to expand twice per item is a queue you fall behind on.
 */
export const TaskCard = React.memo(function TaskCard({
  task,
  elapsed,
  pool,
  disabled = false,
  onResolve,
}: TaskCardProps) {
  const style = PRIORITY[task.priority];
  const Icon = STREAM_ICON[task.stream];

  const total = task.expiresAt !== null ? task.expiresAt - task.createdAt : 0;
  const left = task.expiresAt !== null ? Math.max(0, task.expiresAt - elapsed) : null;
  const ratio = total > 0 && left !== null ? left / total : 1;
  const urgent = left !== null && left <= 15;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ duration: 0.35, ease: easing.outExpo }}
      className={cn(
        "relative overflow-hidden rounded-card border border-line bg-surface",
        style.glow,
        urgent && "border-alert-500/40",
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-[3px]", style.rail)} />

      <div className="py-3 pr-3 pl-4">
        <div className="flex items-center gap-2">
          <Icon className="size-3 shrink-0 text-lo" />
          <span className="truncate text-[10.5px] font-medium tracking-[0.1em] text-lo uppercase">
            {STREAM_LABEL[task.stream]}
          </span>
          <span
            className={cn(
              "shrink-0 rounded-full border px-1.5 py-px text-[9.5px] font-medium tracking-wide uppercase",
              style.chip,
            )}
          >
            {style.label}
          </span>

          {left !== null ? (
            <span
              data-readout
              className={cn(
                "ml-auto shrink-0 font-mono text-[11.5px] tabular-nums",
                urgent ? "text-alert-500" : ratio < 0.4 ? "text-warn-500" : "text-faint",
              )}
            >
              {Math.floor(left / 60)}:{String(Math.floor(left % 60)).padStart(2, "0")}
            </span>
          ) : null}
        </div>

        <h4 className="mt-2 text-[13.5px] leading-snug font-medium text-hi">
          {task.title}
        </h4>
        <p className="mt-1 text-[12px] leading-relaxed text-mid">{task.detail}</p>
        <p className="mt-1.5 text-[11px] text-faint">{task.source}</p>

        <div className="mt-3 flex flex-col gap-1.5">
          {task.options.map((option) => {
            // Closed because the floor cannot cover it — not because the game
            // decided. The reason is always shown, and it is always something
            // the operator could have seen coming.
            const shortfall = shortfallNote(pool, option.requires);
            const closed = shortfall !== null;

            return (
              <button
                key={option.id}
                type="button"
                disabled={disabled || closed}
                onClick={() => onResolve(option.id)}
                aria-describedby={closed ? `${option.id}-why` : undefined}
                className={cn(
                  "w-full rounded-lg border border-line px-2.5 py-2 text-left text-[12.5px] leading-snug",
                  "text-mid transition-colors duration-150",
                  !closed &&
                    "hover:border-ember-500/40 hover:bg-ember-500/[0.07] hover:text-hi active:scale-[0.99]",
                  closed && "cursor-not-allowed border-dashed opacity-45",
                  "disabled:pointer-events-none",
                  disabled && !closed && "opacity-40",
                )}
              >
                <span className={cn(closed && "line-through decoration-faint")}>
                  {option.label}
                </span>
                {closed ? (
                  <span
                    id={`${option.id}-why`}
                    className="mt-0.5 block text-[11px] text-warn-500/80"
                  >
                    {shortfall}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {left !== null ? (
        <div className="h-[2px] w-full bg-white/[0.05]">
          <div
            className={cn(
              "h-full origin-left transition-[width] duration-1000 ease-linear",
              urgent ? "bg-alert-500" : ratio < 0.4 ? "bg-warn-500" : "bg-ember-500/70",
            )}
            style={{ width: `${Math.max(0, Math.min(100, ratio * 100))}%` }}
          />
        </div>
      ) : null}
    </motion.li>
  );
});
