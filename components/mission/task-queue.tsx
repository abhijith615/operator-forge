"use client";

import * as React from "react";
import { AnimatePresence } from "framer-motion";
import { ListChecks } from "lucide-react";

import { TaskCard } from "@/components/mission/task-card";
import { useIsShiftLive, useLiveElapsed } from "@/hooks/use-mission";
import { useMissionStore } from "@/stores/mission-store";
import { cn } from "@/lib/utils";
import type { MissionTask, TaskPriority, TaskStream } from "@/types/tasks";

const PRIORITY_RANK: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
};

type Filter = "all" | TaskStream;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "operations", label: "Ops" },
  { value: "people", label: "People" },
  { value: "customers", label: "Cust" },
  { value: "management", label: "Mgmt" },
];

/** Sort by how much it will hurt, then by how little time is left. */
function sortTasks(tasks: MissionTask[], elapsed: number): MissionTask[] {
  return [...tasks].sort((a, b) => {
    const rank = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (rank !== 0) return rank;
    const aLeft = a.expiresAt === null ? Infinity : a.expiresAt - elapsed;
    const bLeft = b.expiresAt === null ? Infinity : b.expiresAt - elapsed;
    return aLeft - bLeft;
  });
}

export function TaskQueue({
  className,
  ...props
}: React.ComponentProps<"section">) {
  const tasks = useMissionStore((state) => state.tasks);
  const resolveTask = useMissionStore((state) => state.resolveTask);
  const elapsed = useLiveElapsed();
  const live = useIsShiftLive();
  const [filter, setFilter] = React.useState<Filter>("all");

  const pending = React.useMemo(
    () => tasks.filter((task) => task.status === "pending"),
    [tasks],
  );

  const visible = React.useMemo(() => {
    const scoped = filter === "all" ? pending : pending.filter((t) => t.stream === filter);
    return sortTasks(scoped, elapsed);
  }, [pending, filter, elapsed]);

  const counts = React.useMemo(
    () => ({
      critical: pending.filter((task) => task.priority === "critical").length,
      high: pending.filter((task) => task.priority === "high").length,
      normal: pending.filter((task) => task.priority === "normal").length,
    }),
    [pending],
  );

  return (
    <section
      className={cn("panel sheen flex min-h-0 flex-col overflow-hidden", className)}
      aria-label="Task queue"
      {...props}
    >
      <header className="shrink-0 border-b border-line px-4 pt-3 pb-2.5">
        <div className="flex items-center gap-2">
          <ListChecks className="size-3.5 text-ember-500" />
          <span className="font-mono text-[10.5px] tracking-[0.16em] text-lo uppercase">
            Task queue
          </span>
          <span
            data-readout
            className="ml-auto font-mono text-[12px] text-hi tabular-nums"
          >
            {pending.length}
          </span>
        </div>

        <div className="mt-2.5 flex items-center gap-3 text-[10.5px]">
          <span className="flex items-center gap-1.5 text-alert-500">
            <span className="size-1.5 rounded-full bg-alert-500" />
            {counts.critical} critical
          </span>
          <span className="flex items-center gap-1.5 text-warn-500">
            <span className="size-1.5 rounded-full bg-warn-500" />
            {counts.high} high
          </span>
          <span className="flex items-center gap-1.5 text-lo">
            <span className="size-1.5 rounded-full bg-lo" />
            {counts.normal} normal
          </span>
        </div>

        <div className="mt-2.5 flex gap-1">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={cn(
                "rounded-full px-2 py-1 text-[11px] transition-colors duration-150",
                filter === option.value
                  ? "bg-white/[0.09] text-hi"
                  : "text-lo hover:text-mid",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <div className="mask-fade-y min-h-0 flex-1 overflow-y-auto p-3">
        {visible.length === 0 ? (
          <p className="px-3 py-10 text-center text-[12.5px] leading-relaxed text-lo">
            {live
              ? "Nothing in this lane right now. It will not last."
              : "The shift is over. Nothing left to action."}
          </p>
        ) : (
          <ul className="space-y-2.5">
            <AnimatePresence initial={false}>
              {visible.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  elapsed={elapsed}
                  disabled={!live}
                  onResolve={(optionId) => resolveTask(task.id, optionId)}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </section>
  );
}
