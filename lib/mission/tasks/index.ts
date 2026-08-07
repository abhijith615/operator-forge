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

export * from "./types";
