import { applyEffects } from "@/lib/mission/effects";
import { mulberry32 } from "@/lib/mission/random";
import type { TimelineEntry } from "@/types/mission-run";
import type { MissionTask, TaskDecision } from "@/types/tasks";
import type { WorldState } from "@/types/world";

import { TASK_TEMPLATES, TEMPLATES_BY_ID } from "./index";
import type { TaskTemplate } from "./types";

/**
 * The queue is the mission. A hub supervisor is never waiting for something to
 * happen — they are choosing which of six things to drop. So the scheduler's
 * job is not "fire an event", it is "keep the operator pleasantly underwater".
 */
export const MIN_PENDING = 3;
export const MAX_PENDING = 8;

/** How long until the next task lands, given how buried the operator already is. */
function nextGap(pending: number, rand: () => number): number {
  if (pending <= 2) return 8 + rand() * 7; // starved — refill fast
  if (pending <= 4) return 18 + rand() * 12;
  if (pending <= 6) return 28 + rand() * 14;
  return 45 + rand() * 20; // already drowning — stop piling on
}

/** Keep the record bounded; the oldest settled tasks are already in decisions. */
const TASK_HISTORY_CAP = 160;

export interface TaskSchedulerState {
  nextSpawnAt: number;
  templateLastUsed: Record<string, number>;
}

export interface AdvanceTasksInput extends TaskSchedulerState {
  /** Mutated in place — callers pass a draft. */
  world: WorldState;
  tasks: MissionTask[];
  elapsed: number;
  seed: number;
}

export interface AdvanceTasksResult extends TaskSchedulerState {
  tasks: MissionTask[];
  entries: TimelineEntry[];
  decisions: TaskDecision[];
}

let taskCounter = 0;

function instantiate(
  template: TaskTemplate,
  world: WorldState,
  elapsed: number,
  rand: () => number,
  busySubjects: ReadonlySet<string>,
): MissionTask | null {
  if (template.when && !template.when(world)) return null;

  const draft = template.build({ world, rand, elapsed, busySubjects });
  if (!draft) return null;

  taskCounter += 1;
  const ttl = draft.ttl ?? template.ttl;

  return {
    id: `task-${elapsed}-${taskCounter}`,
    templateId: template.id,
    stream: template.stream,
    priority: draft.priority ?? template.priority,
    title: draft.title,
    detail: draft.detail,
    source: draft.source,
    subjectId: draft.subjectId,
    createdAt: elapsed,
    expiresAt: ttl > 0 ? elapsed + ttl : null,
    options: draft.options,
    status: "pending",
  };
}

/** Weighted draw, skipping anything on cooldown or not applicable right now. */
function drawTemplate(
  world: WorldState,
  elapsed: number,
  rand: () => number,
  lastUsed: Record<string, number>,
  pendingTemplateIds: Set<string>,
): TaskTemplate | null {
  const eligible = TASK_TEMPLATES.filter((template) => {
    if (pendingTemplateIds.has(template.id)) return false;
    const used = lastUsed[template.id];
    if (used !== undefined && elapsed - used < template.cooldown) return false;
    if (template.when && !template.when(world)) return false;
    return true;
  });

  if (eligible.length === 0) return null;

  const total = eligible.reduce((sum, template) => sum + template.weight, 0);
  let roll = rand() * total;
  for (const template of eligible) {
    roll -= template.weight;
    if (roll <= 0) return template;
  }
  return eligible[eligible.length - 1] ?? null;
}

export function advanceTasks(input: AdvanceTasksInput): AdvanceTasksResult {
  const { world, elapsed, seed } = input;
  const rand = mulberry32(seed + elapsed * 7919);

  const tasks = input.tasks.map((task) => ({ ...task }));
  const entries: TimelineEntry[] = [];
  const decisions: TaskDecision[] = [];
  const templateLastUsed = { ...input.templateLastUsed };
  let nextSpawnAt = input.nextSpawnAt;

  /* ── Expiry ───────────────────────────────────────────────────────────── */

  const pendingBefore = tasks.filter((task) => task.status === "pending").length;
  const cascadeQueue: string[] = [];

  for (const task of tasks) {
    if (task.status !== "pending") continue;
    if (task.expiresAt === null || task.expiresAt > elapsed) continue;

    task.status = "expired";
    task.resolvedAt = elapsed;

    const template = TEMPLATES_BY_ID.get(task.templateId);
    if (template?.onExpire?.effects) applyEffects(world, template.onExpire.effects);
    if (template?.onExpire?.cascades) cascadeQueue.push(...template.onExpire.cascades);

    entries.push({
      id: `x-${task.id}`,
      at: elapsed,
      kind: "event",
      tone: task.priority === "critical" ? "critical" : "warning",
      title: `Missed: ${task.title}`,
      detail: template?.onExpire?.note ?? "Nobody got to it in time.",
      source: streamToSource(task.stream),
    });

    decisions.push({
      taskId: task.id,
      templateId: task.templateId,
      stream: task.stream,
      priority: task.priority,
      at: elapsed,
      latency: elapsed - task.createdAt,
      optionId: null,
      optionLabel: null,
      // An expiry is not a zero-quality decision — it is an absent one. Phase 3
      // reads it as a prioritisation signal, not a wrong answer.
      quality: 0,
      capabilities: ["prioritization", "stress-handling"],
      expired: true,
      queueDepth: pendingBefore,
    });
  }

  /* ── Cascades from expiry ─────────────────────────────────────────────── */

  for (const templateId of cascadeQueue) {
    const template = TEMPLATES_BY_ID.get(templateId);
    if (!template) continue;
    const task = instantiate(template, world, elapsed, rand, busySubjectsOf(tasks));
    if (!task) continue;
    task.priority = "critical";
    tasks.push(task);
    templateLastUsed[template.id] = elapsed;
  }

  /* ── Spawning ─────────────────────────────────────────────────────────── */

  let pending = tasks.filter((task) => task.status === "pending").length;
  let guard = 0;

  while (guard < 6 && pending < MAX_PENDING && (elapsed >= nextSpawnAt || pending < MIN_PENDING)) {
    guard += 1;

    const pendingTemplateIds = new Set(
      tasks.filter((task) => task.status === "pending").map((task) => task.templateId),
    );

    const template = drawTemplate(world, elapsed, rand, templateLastUsed, pendingTemplateIds);
    if (!template) break;

    const task = instantiate(template, world, elapsed, rand, busySubjectsOf(tasks));
    if (!task) {
      // Declined the draw — park it briefly so we do not spin on it.
      templateLastUsed[template.id] = elapsed - template.cooldown + 20;
      continue;
    }

    tasks.push(task);
    templateLastUsed[template.id] = elapsed;
    pending += 1;
    nextSpawnAt = elapsed + nextGap(pending, rand);
  }

  // Never let the clock drift behind the operator.
  if (nextSpawnAt < elapsed) nextSpawnAt = elapsed + nextGap(pending, rand);

  return {
    tasks: trimHistory(tasks),
    entries,
    decisions,
    nextSpawnAt,
    templateLastUsed,
  };
}

function busySubjectsOf(tasks: MissionTask[]): ReadonlySet<string> {
  const subjects = new Set<string>();
  for (const task of tasks) {
    if (task.status === "pending" && task.subjectId) subjects.add(task.subjectId);
  }
  return subjects;
}

function trimHistory(tasks: MissionTask[]): MissionTask[] {
  if (tasks.length <= TASK_HISTORY_CAP) return tasks;
  const pending = tasks.filter((task) => task.status === "pending");
  const settled = tasks
    .filter((task) => task.status !== "pending")
    .slice(-(TASK_HISTORY_CAP - pending.length));
  return [...settled, ...pending];
}

export function streamToSource(stream: MissionTask["stream"]): TimelineEntry["source"] {
  switch (stream) {
    case "operations":
      return "inventory";
    case "people":
      return "people";
    case "customers":
      return "customers";
    default:
      return "hub";
  }
}

/** Seeds the queue the moment the shift opens — nobody starts on an empty board. */
export function seedInitialTasks(
  world: WorldState,
  seed: number,
): { tasks: MissionTask[]; templateLastUsed: Record<string, number> } {
  const rand = mulberry32(seed + 101);
  const tasks: MissionTask[] = [];
  const templateLastUsed: Record<string, number> = {};

  const openers = ["ppl-attendance", "ops-safety-check", "mgmt-morning-report", "ops-goods-receipt"];

  for (const templateId of openers) {
    const template = TEMPLATES_BY_ID.get(templateId);
    if (!template) continue;
    const task = instantiate(template, world, 0, rand, busySubjectsOf(tasks));
    if (!task) continue;
    tasks.push(task);
    templateLastUsed[template.id] = 0;
  }

  return { tasks, templateLastUsed };
}
