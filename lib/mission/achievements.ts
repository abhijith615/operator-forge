import type { Achievement, MissionTask, TaskDecision } from "@/types/tasks";

interface AchievementRule {
  id: string;
  name: string;
  blurb: string;
  met: (ctx: { decisions: TaskDecision[]; tasks: MissionTask[]; elapsed: number }) => boolean;
}

const answered = (decisions: TaskDecision[]) => decisions.filter((d) => !d.expired);

/**
 * Small, earned, and never patronising. Each one recognises a specific way of
 * operating rather than raw volume — nothing here can be farmed by clicking
 * quickly.
 */
const RULES: AchievementRule[] = [
  {
    id: "inventory-detective",
    name: "Inventory Detective",
    blurb: "You went and checked instead of trusting the number.",
    met: ({ decisions }) =>
      answered(decisions).some(
        (decision) =>
          (decision.templateId === "ops-cycle-count" ||
            decision.templateId === "ops-stock-threshold") &&
          decision.quality >= 0.8,
      ),
  },
  {
    id: "customer-hero",
    name: "Customer Hero",
    blurb: "Someone was waiting and you got to them inside twenty seconds.",
    met: ({ decisions }) =>
      answered(decisions).some(
        (decision) =>
          decision.stream === "customers" && decision.latency <= 20 && decision.quality >= 0.8,
      ),
  },
  {
    id: "people-leader",
    name: "People Leader",
    blurb: "Four calls about people, none of them left waiting.",
    met: ({ decisions }) => {
      const people = decisions.filter((decision) => decision.stream === "people");
      return (
        people.filter((decision) => !decision.expired).length >= 4 &&
        people.every((decision) => !decision.expired)
      );
    },
  },
  {
    id: "fast-thinker",
    name: "Fast Thinker",
    blurb: "Three decisions inside two minutes, none of them careless.",
    met: ({ decisions }) => {
      const good = answered(decisions).filter((decision) => decision.quality >= 0.6);
      return good.some((decision, index) => {
        if (index < 2) return false;
        const third = good[index - 2];
        return third !== undefined && decision.at - third.at <= 120;
      });
    },
  },
  {
    id: "held-the-line",
    name: "Held the Line",
    blurb: "The board was stacked and you still let nothing expire.",
    met: ({ decisions }) => {
      const settled = decisions.filter((decision) => decision.queueDepth >= 6);
      return settled.length >= 5 && settled.every((decision) => !decision.expired);
    },
  },
  {
    id: "straight-talker",
    name: "Straight Talker",
    blurb: "You told management the truth while the floor was still on fire.",
    met: ({ decisions }) =>
      answered(decisions).some(
        (decision) => decision.stream === "management" && decision.quality >= 0.9,
      ),
  },
  {
    id: "clean-board",
    name: "Clean Board",
    blurb: "You got the queue down to two while the shift was still running.",
    met: ({ tasks, decisions, elapsed }) =>
      elapsed > 300 &&
      answered(decisions).length >= 10 &&
      tasks.filter((task) => task.status === "pending").length <= 2,
  },
];

/** Returns only newly earned achievements, in the order they were met. */
export function evaluateAchievements(ctx: {
  decisions: TaskDecision[];
  tasks: MissionTask[];
  elapsed: number;
  earned: Achievement[];
}): Achievement[] {
  const already = new Set(ctx.earned.map((achievement) => achievement.id));

  return RULES.filter((rule) => !already.has(rule.id) && rule.met(ctx)).map((rule) => ({
    id: rule.id,
    name: rule.name,
    blurb: rule.blurb,
    at: ctx.elapsed,
  }));
}
