"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Boxes,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ListChecks,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

import { CommsPanel } from "@/components/challenge/comms";
import {
  FloorBoard,
  NilPickBoard,
  PackingBoard,
  RecoveryBoard,
} from "@/components/challenge/task-surfaces";
import { ActionCard, MetricsBoard, StatusPill } from "@/components/challenge/ui";
import { countdown, storeClock, type ScheduledTask } from "@/lib/challenge/schedule";
import type { Metrics, SceneChoice, StaffingPlan, TaskStream } from "@/lib/challenge/types";
import type { RecoveryAction } from "@/lib/challenge/day-one";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

const STREAM_ICON: Record<TaskStream, LucideIcon> = {
  operations: Boxes,
  people: Users,
  customers: UserRound,
  management: Building2,
};

export interface OpenTask extends ScheduledTask {
  /** Seconds into the shift when it landed. */
  landedAt: number;
}

export interface ControlRoomProps {
  remaining: number;
  elapsed: number;
  metrics: Metrics;
  previous: Metrics | null;
  tasks: OpenTask[];
  resolvedCount: number;
  activeId: string | null;
  onOpen: (id: string | null) => void;
  plan: StaffingPlan;
  onPlan: (plan: StaffingPlan) => void;
  onStaffing: () => void;
  onChoice: (task: OpenTask, choice: SceneChoice) => void;
  inspected: string[];
  onInspect: (id: string) => void;
  onPacking: (
    bags: Record<string, "bag-1" | "bag-2">,
    protection: Record<string, string>,
  ) => void;
  onRecovery: (actions: RecoveryAction[]) => void;
  flash: { headline: string; body: string; tone: "healthy" | "warning" | "critical" } | null;
}

type Lane = "queue" | "board" | "comms";

/**
 * Three panels and a clock.
 *
 * Desktop puts the board in the middle because it is what an operator watches
 * between decisions; the queue and comms flank it. Below `xl` there is no
 * honest way to show three columns at once, so they become lanes and the
 * operator switches — which is closer to how a phone gets used on a floor
 * anyway than three columns squeezed to 120px each.
 */
export function ControlRoom(props: ControlRoomProps) {
  const [lane, setLane] = React.useState<Lane>("queue");
  const reduced = useReducedMotion();
  const active = props.tasks.find((task) => task.id === props.activeId) ?? null;

  // A task arriving pulls the operator to the queue on small screens, but only
  // if they are not mid-decision on something else.
  const taskCount = props.tasks.length;
  React.useEffect(() => {
    if (taskCount > 0 && !active) setLane("queue");
  }, [taskCount, active]);

  const urgent = props.remaining <= 120;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-obsidian">
      {/* ── Clock bar ── */}
      <header className="shrink-0 border-b border-line bg-obsidian/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-2.5">
          <span
            data-readout
            className="font-mono text-[13px] leading-none text-lo tabular-nums"
          >
            {storeClock(props.elapsed)}
          </span>

          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1",
              urgent ? "border-alert-500/50 bg-alert-500/10" : "border-line-strong",
            )}
            role="timer"
            aria-live="off"
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                urgent ? "bg-alert-500" : "bg-ion-500",
              )}
              aria-hidden
            />
            <span
              data-readout
              className={cn(
                "font-mono text-[14px] leading-none font-semibold tabular-nums",
                urgent ? "text-alert-500" : "text-hi",
              )}
            >
              {countdown(props.remaining)}
            </span>
            <span className="sr-only">remaining in the shift</span>
          </span>

          <span className="ml-auto flex items-center gap-3 text-[11.5px] text-lo">
            <span className="hidden sm:inline">
              {props.resolvedCount} handled · {props.tasks.length} open
            </span>
            <span className="font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
              Day 1
            </span>
          </span>
        </div>

        {/* Lane switcher — below xl only. */}
        <div className="flex gap-1 border-t border-line px-3 py-1.5 xl:hidden">
          {(
            [
              ["queue", "Tasks", props.tasks.length],
              ["board", "Store", null],
              ["comms", "Comms", null],
            ] as [Lane, string, number | null][]
          ).map(([id, label, badge]) => (
            <button
              key={id}
              type="button"
              onClick={() => setLane(id)}
              aria-pressed={lane === id}
              className={cn(
                "flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-lg text-[12.5px] font-medium transition-colors",
                lane === id ? "bg-white/[0.09] text-hi" : "text-lo hover:text-mid",
              )}
            >
              {label}
              {badge ? (
                <span className="rounded-full bg-ember-500 px-1.5 text-[10px] font-semibold text-void tabular-nums">
                  {badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </header>

      {/* ── Panels ── */}
      <div className="mx-auto grid w-full max-w-[1600px] min-h-0 flex-1 gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,0.9fr)]">
        {/* Task queue */}
        <section
          aria-label="Task queue"
          className={cn(
            "min-h-0 flex-col rounded-card border border-line bg-surface",
            lane === "queue" ? "flex" : "hidden",
            "xl:flex",
          )}
        >
          <header className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
            <ListChecks className="size-3.5 text-ember-500" aria-hidden />
            <span className="font-mono text-[10.5px] tracking-[0.16em] text-lo uppercase">
              Task queue
            </span>
            <span
              data-readout
              className="ml-auto font-mono text-[12px] text-hi tabular-nums"
            >
              {props.tasks.length}
            </span>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {active ? (
              <ActiveTask {...props} task={active} />
            ) : props.tasks.length === 0 ? (
              <p className="px-2 py-10 text-center text-[12.5px] leading-relaxed text-lo">
                Nothing needs you this second. Watch the board — it will not last.
              </p>
            ) : (
              <ul className="space-y-2.5">
                <AnimatePresence initial={false}>
                  {props.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      elapsed={props.elapsed}
                      reduced={Boolean(reduced)}
                      onOpen={() => props.onOpen(task.id)}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </section>

        {/* Store dashboard */}
        <section
          aria-label="Store dashboard"
          className={cn(
            "min-h-0 flex-col rounded-card border border-line bg-surface",
            lane === "board" ? "flex" : "hidden",
            "xl:flex",
          )}
        >
          <header className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
            <span className="size-1.5 rounded-full bg-ion-500" aria-hidden />
            <span className="font-mono text-[10.5px] tracking-[0.16em] text-lo uppercase">
              Store 114 · live
            </span>
          </header>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            <MetricsBoard metrics={props.metrics} previous={props.previous} />

            <AnimatePresence>
              {props.flash ? (
                <motion.div
                  key={props.flash.headline}
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: easing.outExpo }}
                  role="status"
                  aria-live="polite"
                  className={cn(
                    "rounded-card border p-3.5",
                    props.flash.tone === "healthy"
                      ? "border-ion-500/40 bg-ion-500/[0.07]"
                      : props.flash.tone === "warning"
                        ? "border-warn-500/40 bg-warn-500/[0.06]"
                        : "border-alert-500/45 bg-alert-500/[0.06]",
                  )}
                >
                  <StatusPill status={props.flash.tone}>{props.flash.headline}</StatusPill>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-mid">
                    {props.flash.body}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="rounded-card border border-line bg-elevated p-3.5">
              <p className="font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
                Store target
              </p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-mid">
                Click → dispatch under{" "}
                <span className="font-mono font-semibold text-hi">180 sec</span>. Everything
                on this board either protects that number or costs it.
              </p>
            </div>
          </div>
        </section>

        {/* Comms */}
        <div
          className={cn(
            "min-h-0",
            lane === "comms" ? "flex flex-col" : "hidden",
            "xl:flex xl:flex-col",
          )}
        >
          <CommsPanel />
        </div>
      </div>
    </div>
  );
}

/* ── Queue row ────────────────────────────────────────────────────────── */

function TaskRow({
  task,
  elapsed,
  reduced,
  onOpen,
}: {
  task: OpenTask;
  elapsed: number;
  reduced: boolean;
  onOpen: () => void;
}) {
  const Icon = STREAM_ICON[task.stream] ?? Boxes;
  const left = task.ttl === null ? null : Math.max(0, task.landedAt + task.ttl - elapsed);
  const urgent = left !== null && left <= 30;

  const rail =
    task.priority === "critical"
      ? "bg-alert-500"
      : task.priority === "high"
        ? "bg-warn-500"
        : "bg-lo/60";

  return (
    <motion.li
      layout
      initial={reduced ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
      transition={{ duration: 0.3, ease: easing.outExpo }}
    >
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "relative w-full overflow-hidden rounded-card border bg-elevated p-0 text-left transition-colors",
          "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
          urgent ? "border-alert-500/50" : "border-line hover:border-ember-500/40",
        )}
      >
        <span className={cn("absolute inset-y-0 left-0 w-[3px]", rail)} aria-hidden />
        <span className="block py-3 pr-3 pl-4">
          <span className="flex items-center gap-2">
            <Icon className="size-3 shrink-0 text-lo" aria-hidden />
            <span className="text-[10px] font-medium tracking-[0.1em] text-lo uppercase">
              {task.stream}
            </span>
            <span
              className={cn(
                "rounded-full border px-1.5 py-px text-[9.5px] font-medium tracking-wide uppercase",
                task.priority === "critical"
                  ? "border-alert-500/30 bg-alert-500/12 text-alert-500"
                  : task.priority === "high"
                    ? "border-warn-500/30 bg-warn-500/12 text-warn-500"
                    : "border-line-strong text-mid",
              )}
            >
              {task.priority}
            </span>
            {left !== null ? (
              <span
                data-readout
                className={cn(
                  "ml-auto font-mono text-[11.5px] tabular-nums",
                  urgent ? "text-alert-500" : "text-faint",
                )}
              >
                {countdown(left)}
              </span>
            ) : null}
          </span>

          <span className="mt-2 block text-[13.5px] leading-snug font-medium text-hi">
            {task.title}
          </span>
          <span className="mt-1 block text-[12px] leading-relaxed text-mid">
            {task.detail}
          </span>
          <span className="mt-1.5 block text-[11px] text-faint">{task.source}</span>
        </span>
      </button>
    </motion.li>
  );
}

/* ── Opened task ──────────────────────────────────────────────────────── */

function ActiveTask({
  task,
  plan,
  onPlan,
  onStaffing,
  onChoice,
  inspected,
  onInspect,
  onPacking,
  onRecovery,
  metrics,
  onOpen,
}: ControlRoomProps & { task: OpenTask }) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => onOpen(null)}
        className="inline-flex items-center gap-1.5 text-[12.5px] text-lo transition-colors hover:text-hi focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
      >
        <ChevronLeft className="size-3.5" aria-hidden />
        Back to the queue
      </button>

      <div>
        <p className="font-mono text-[10px] tracking-[0.14em] text-ember-500 uppercase">
          {task.source}
        </p>
        <h2 className="mt-1.5 text-[16px] leading-snug font-semibold text-hi">
          {task.title}
        </h2>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-mid">{task.detail}</p>
      </div>

      {task.kind === "staffing" ? (
        <FloorBoard plan={plan} onChange={onPlan} onConfirm={onStaffing} />
      ) : task.kind === "nil-pick" ? (
        <NilPickBoard
          inspected={inspected}
          onInspect={onInspect}
          onChoose={(choice) => onChoice(task, choice)}
        />
      ) : task.kind === "packing" ? (
        <PackingBoard onSubmit={onPacking} />
      ) : task.kind === "recovery" ? (
        <RecoveryBoard metrics={metrics} onExecute={onRecovery} />
      ) : (
        <div className="space-y-2">
          {(task.choices ?? []).map((choice) => (
            <ActionCard
              key={choice.id}
              label={choice.label}
              detail={choice.detail}
              onSelect={() => onChoice(task, choice)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Small completion marker used by the shell ────────────────────────── */

export function Handled({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-2 text-[12.5px] text-ion-400">
      <CheckCircle2 className="size-3.5" aria-hidden />
      {label}
    </p>
  );
}
