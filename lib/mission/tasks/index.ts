import { CUSTOMER_TASKS } from "./customers";
import { MANAGEMENT_TASKS } from "./management";
import { OPERATIONS_TASKS } from "./operations";
import { PEOPLE_TASKS } from "./people";
import type { TaskTemplate } from "./types";

export const TASK_TEMPLATES: TaskTemplate[] = [
  ...OPERATIONS_TASKS,
  ...PEOPLE_TASKS,
  ...CUSTOMER_TASKS,
  ...MANAGEMENT_TASKS,
];

export const TEMPLATES_BY_ID = new Map(
  TASK_TEMPLATES.map((template) => [template.id, template]),
);

/**
 * What the shift actually deals.
 *
 * Seventy-odd templates were written for a thirty-minute morning, where there
 * was room for the quiet ones — a rota query, an energy report — and they did
 * real work: a shift made only of emergencies stops reading as a job. Fifteen
 * minutes has no such room. Around thirty tasks land, and every one of them
 * has to be worth the seconds it costs to read, or the operator leaves.
 *
 * So the draw is narrowed to the tasks that force a choice: something is
 * scarce, two people want it, and the wrong call is visible. Streams stay
 * balanced — roughly ten each from operations, people and customers, eight
 * from management — because the genome scores capability by stream and a
 * lopsided shift scores a lopsided operator.
 *
 * The rest stay in `TASK_TEMPLATES`, and cascades still reach them through
 * `TEMPLATES_BY_ID`: ignoring the right thing can still summon a task the
 * scheduler would never have dealt on its own. Which is the point of a
 * consequence.
 */
const SHIFT_TEMPLATE_IDS = new Set([
  // Operations — the floor stops, or something spoils.
  "ops-stock-threshold",
  "ops-dispatch-stall",
  "ops-cold-chain",
  "ops-fire-exit",
  "ops-item-not-found",
  "ops-mispick",
  "ops-packing-backlog",
  "ops-label-printer",
  "ops-goods-receipt",
  "ops-safety-check",
  "ops-scanner-drop",
  "ops-putaway-backlog",

  // People — someone is hurt, leaving, or refusing.
  "ppl-injury",
  "ppl-recall",
  "ppl-leave-early",
  "ppl-fatigue",
  "ppl-conflict",
  "ppl-rider-vehicle",
  "ppl-no-ppe",
  "ppl-agency",
  "ppl-attendance",
  "ppl-break-clash",
  "ppl-late-arrival",
  "ppl-overtime",

  // Customers — the rating is on the line and they are watching.
  "cust-vip",
  "cust-allergen",
  "cust-late-delivery",
  "cust-refund",
  "cust-wrong-item",
  "cust-substitution",
  "cust-missing-item",
  "cust-public-review",
  "cust-address",
  "cust-status-batch",
  "cust-corporate-order",
  "cust-redirect",

  // Head office — someone senior wants an answer now.
  "mgmt-promo-warning",
  "mgmt-inspector",
  "mgmt-manager-call",
  "mgmt-handover",
  "mgmt-press",
  "mgmt-peer-store",
  "mgmt-morning-report",
  "mgmt-targets",
  "mgmt-safety-audit",
  "mgmt-kpi-anomaly",
]);

/** The pool the scheduler draws from. Order follows the catalogue. */
export const SHIFT_TEMPLATES: TaskTemplate[] = TASK_TEMPLATES.filter((template) =>
  SHIFT_TEMPLATE_IDS.has(template.id),
);

export * from "./types";
