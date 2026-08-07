import type { TaskTemplate } from "./types";
import { activePickers, activeWorkers, pickFree } from "./types";

/**
 * People: the half of the job nobody puts in a job description. Most of these
 * have no clean answer — the read is on whether the operator treats staff as
 * capacity or as people, and whether they can do both at once.
 */
export const PEOPLE_TASKS: TaskTemplate[] = [
  {
    id: "ppl-leave-early",
    stream: "people",
    priority: "high",
    weight: 10,
    cooldown: 200,
    ttl: 70,
    build: (ctx) => {
      const worker = pickFree(ctx, activeWorkers(ctx.world));
      if (!worker) return null;
      return {
        title: `${worker.name} is asking to leave at eleven`,
        detail: "Their child's school has called. They have not asked for anything before.",
        source: worker.name,
        subjectId: worker.id,
        options: [
          {
            id: "approve",
            label: "Approve it",
            outcome: "You lose the hands. They remember that you said yes.",
            quality: 0.75,
            capabilities: ["ownership", "communication"],
          },
          {
            id: "approve-after-peak",
            label: "Yes, but see the peak out first",
            outcome: "Honest trade, clearly explained. Most people take it well.",
            quality: 0.9,
            capabilities: ["communication", "decision-making", "prioritization"],
          },
          {
            id: "decline",
            label: "Not today — we are two down already",
            outcome: "Defensible on capacity. Expensive on trust.",
            quality: 0.3,
            capabilities: ["stress-handling"],
          },
        ],
      };
    },
    onExpire: {
      note: "They waited, then left without an answer.",
      effects: [{ kind: "sideline-any-active-worker", note: "Left without an answer" }],
    },
  },

  {
    id: "ppl-fatigue",
    stream: "people",
    priority: "high",
    weight: 9,
    cooldown: 120,
    ttl: 80,
    when: (world) =>
      world.workers.some((worker) => worker.status === "active" && worker.fatigue > 0.6),
    build: (ctx) => {
      const worker = pickFree(
        ctx,
        ctx.world.workers.filter(
          (entry) => entry.status === "active" && entry.fatigue > 0.6,
        ),
      );
      if (!worker) return null;
      return {
        title: `${worker.name} has been on the pick face since six`,
        detail: "No break yet. Their pick rate has dropped and they have started making errors.",
        source: worker.name,
        subjectId: worker.id,
        options: [
          {
            id: "break-now",
            label: "Send them for five minutes now",
            outcome: "Throughput dips, then recovers above where it was.",
            quality: 0.9,
            capabilities: ["systems-thinking", "ownership"],
            effects: [
              { kind: "worker-status", workerId: worker.id, status: "break", breakSeconds: 300 },
            ],
          },
          {
            id: "after-queue",
            label: "After the queue drops below ten",
            outcome: "Sensible in theory. The queue may not drop.",
            quality: 0.55,
            capabilities: ["prioritization"],
          },
          {
            id: "push-on",
            label: "Push on — we cannot spare them",
            outcome: "You get twenty more minutes and pay for it in mispicks.",
            quality: 0.15,
            capabilities: ["stress-handling"],
            effects: [{ kind: "worker-fatigue", workerId: worker.id, delta: 0.15 }],
          },
        ],
      };
    },
    onExpire: {
      note: "They kept going. Error rate is climbing.",
      effects: [{ kind: "worker-fatigue", workerId: "all-active", delta: 0.08 }],
    },
  },

  {
    id: "ppl-late-arrival",
    stream: "people",
    priority: "normal",
    weight: 9,
    cooldown: 220,
    ttl: 110,
    build: (ctx) => {
      const worker = pickFree(ctx, ctx.world.workers);
      if (!worker) return null;
      return {
        title: `${worker.name} has just clocked in, forty minutes late`,
        detail: "Third time this month. They have not offered a reason.",
        source: "Attendance system",
        subjectId: worker.id,
        options: [
          {
            id: "ask-why",
            label: "Ask what is going on, privately",
            outcome: "Takes two minutes. Usually there is a real reason.",
            quality: 0.9,
            capabilities: ["curiosity", "communication"],
          },
          {
            id: "log-it",
            label: "Log it and move on",
            outcome: "Process followed. Pattern unaddressed.",
            quality: 0.5,
            capabilities: ["ownership"],
          },
          {
            id: "public-warning",
            label: "Pull them up in front of the floor",
            outcome: "Point made. The floor saw you make it.",
            quality: 0.1,
            capabilities: ["communication"],
          },
        ],
      };
    },
    onExpire: { note: "No conversation happened. The pattern continues." },
  },

  {
    id: "ppl-conflict",
    stream: "people",
    priority: "high",
    weight: 7,
    cooldown: 260,
    ttl: 65,
    build: (ctx) => {
      const workers = activeWorkers(ctx.world);
      const a = pickFree(ctx, workers);
      const b = pickFree(
        ctx,
        workers.filter((entry) => entry.id !== a?.id),
      );
      if (!a || !b) return null;
      return {
        title: `${a.name} and ${b.name} are arguing on the pick face`,
        detail:
          "Something about who took whose trolley. It is getting loud and the floor is watching.",
        source: "Floor",
        subjectId: a.id,
        options: [
          {
            id: "separate",
            label: "Separate them into different zones now",
            outcome: "Heat comes out of it immediately. Cause unresolved.",
            quality: 0.7,
            capabilities: ["decision-making", "stress-handling"],
          },
          {
            id: "hear-both",
            label: "Take both aside for two minutes",
            outcome: "Costs you the two minutes. Usually ends it properly.",
            quality: 0.9,
            capabilities: ["communication", "ownership"],
          },
          {
            id: "ignore",
            label: "Let them sort it out",
            outcome: "Sometimes works. Today the whole floor is listening.",
            quality: 0.2,
            capabilities: ["stress-handling"],
          },
        ],
      };
    },
    onExpire: {
      note: "It escalated. Both are now working badly and the floor is tense.",
      effects: [{ kind: "worker-fatigue", workerId: "all-active", delta: 0.12 }],
    },
  },

  {
    id: "ppl-overtime",
    stream: "people",
    priority: "normal",
    weight: 8,
    cooldown: 240,
    ttl: 120,
    build: ({ world }) => ({
      title: "Overtime approval needed for the evening block",
      detail: `Two of your ${activePickers(world).length} pickers would stay on. It comes out of this month's budget.`,
      source: "Shift planning",
      options: [
        {
          id: "approve-both",
          label: "Approve both",
          outcome: "Evening is covered. Finance will ask about it.",
          quality: 0.7,
          capabilities: ["decision-making"],
        },
        {
          id: "approve-one",
          label: "Approve one, based on tonight's volume forecast",
          outcome: "Proportionate, and you can explain the number.",
          quality: 0.9,
          capabilities: ["systems-thinking", "decision-making"],
        },
        {
          id: "decline",
          label: "Decline — hold the budget",
          outcome: "Budget intact. The evening shift inherits the gap.",
          quality: 0.45,
          capabilities: ["prioritization"],
        },
      ],
    }),
    onExpire: { note: "The window closed. Nobody is rostered for the evening block." },
  },

  {
    id: "ppl-attendance",
    stream: "people",
    priority: "normal",
    weight: 11,
    cooldown: 400,
    ttl: 150,
    build: ({ world }) => ({
      title: "Confirm morning attendance",
      detail: `${activeWorkers(world).length} on the floor, ${world.workers.filter((w) => w.status === "absent").length} unaccounted for. Payroll needs it signed off.`,
      source: "Attendance system",
      options: [
        {
          id: "confirm-chase",
          label: "Confirm, and chase the absentees",
          outcome: "Two minutes of calls. One of them is on their way.",
          quality: 0.9,
          capabilities: ["ownership", "curiosity"],
        },
        {
          id: "confirm",
          label: "Confirm as-is",
          outcome: "Payroll is happy. Nobody called the missing staff.",
          quality: 0.5,
          capabilities: ["decision-making"],
        },
      ],
    }),
    onExpire: { note: "Attendance was not signed off. Payroll will chase you." },
  },

  {
    id: "ppl-training",
    stream: "people",
    priority: "normal",
    weight: 7,
    cooldown: 300,
    ttl: 140,
    build: (ctx) => {
      const worker = pickFree(ctx, activeWorkers(ctx.world));
      if (!worker) return null;
      return {
        title: "New joiner starts tomorrow and needs a buddy",
        detail: `${worker.name} is the obvious pick but they are your fastest picker.`,
        source: "Shift planning",
        subjectId: worker.id,
        options: [
          {
            id: "assign-best",
            label: `Assign ${worker.name} anyway`,
            outcome: "Best training, worst day for throughput tomorrow.",
            quality: 0.75,
            capabilities: ["systems-thinking", "ownership"],
          },
          {
            id: "assign-steady",
            label: "Assign a steadier, slower picker",
            outcome: "Throughput protected. Training is adequate rather than good.",
            quality: 0.8,
            capabilities: ["decision-making", "prioritization"],
          },
          {
            id: "defer",
            label: "Decide tomorrow morning",
            outcome: "The joiner arrives to nobody expecting them.",
            quality: 0.25,
            capabilities: ["ownership"],
          },
        ],
      };
    },
    onExpire: { note: "No buddy assigned. The new joiner will be on their own." },
  },

  {
    id: "ppl-injury",
    stream: "people",
    priority: "critical",
    weight: 5,
    cooldown: 400,
    ttl: 50,
    build: (ctx) => {
      const worker = pickFree(ctx, activeWorkers(ctx.world));
      if (!worker) return null;
      return {
        title: `${worker.name} has hurt their back lifting`,
        detail:
          "They say they are fine and want to keep working. They are not moving like they are fine.",
        source: worker.name,
        subjectId: worker.id,
        options: [
          {
            id: "stand-down",
            label: "Stand them down and file an incident report",
            outcome: "You lose a picker. It is not close to the wrong call.",
            quality: 0.95,
            capabilities: ["ownership", "decision-making"],
            effects: [
              {
                kind: "worker-status",
                workerId: worker.id,
                status: "offline",
                note: "Stood down — injury",
              },
            ],
          },
          {
            id: "light-duties",
            label: "Move them to light duties at packing",
            outcome: "Keeps them on shift. Only defensible if you check on them.",
            quality: 0.6,
            capabilities: ["decision-making", "ownership"],
          },
          {
            id: "carry-on",
            label: "Take them at their word",
            outcome: "They will keep lifting. You will own what happens next.",
            quality: 0,
            capabilities: ["ownership"],
            effects: [{ kind: "worker-fatigue", workerId: worker.id, delta: 0.3 }],
          },
        ],
      };
    },
    onExpire: {
      note: "Nobody responded. They kept lifting.",
      effects: [{ kind: "sideline-any-active-worker", note: "Injured — unreported" }],
    },
  },

  {
    id: "ppl-break-clash",
    stream: "people",
    priority: "normal",
    weight: 9,
    cooldown: 180,
    ttl: 100,
    build: () => ({
      title: "Three people have booked the same break slot",
      detail: "If they all go at once the pick face is down to two.",
      source: "Break rota",
      options: [
        {
          id: "stagger",
          label: "Stagger them fifteen minutes apart",
          outcome: "Everyone gets their break. Cover holds throughout.",
          quality: 0.9,
          capabilities: ["systems-thinking", "prioritization"],
        },
        {
          id: "first-two",
          label: "First two go, third waits for volume to drop",
          outcome: "Workable, provided you remember to release the third.",
          quality: 0.65,
          capabilities: ["decision-making"],
        },
        {
          id: "all-go",
          label: "Let all three go",
          outcome: "Popular. The queue will not forgive it.",
          quality: 0.25,
          capabilities: ["prioritization"],
        },
      ],
    }),
    onExpire: { note: "All three went at once. The pick face emptied." },
  },

  {
    id: "ppl-recall",
    stream: "people",
    priority: "critical",
    weight: 8,
    cooldown: 150,
    ttl: 75,
    when: (world) => world.workers.some((worker) => worker.status === "absent"),
    build: (ctx) => {
      const worker = pickFree(
        ctx,
        ctx.world.workers.filter((entry) => entry.status === "absent"),
      );
      if (!worker) return null;
      return {
        title: `${worker.name} is picking up their phone`,
        detail: "They did not call in. They are twenty minutes away if they leave now.",
        source: "Standby list",
        subjectId: worker.id,
        options: [
          {
            id: "call-in",
            label: "Ask them to come in",
            outcome: "You get the hands back. They start the shift already behind.",
            quality: 0.85,
            capabilities: ["decision-making", "communication"],
            effects: [
              {
                kind: "worker-status",
                workerId: worker.id,
                status: "active",
                note: "Called in",
              },
            ],
          },
          {
            id: "ask-why",
            label: "Ask what happened first",
            outcome: "Slower, but you find out whether this repeats tomorrow.",
            quality: 0.8,
            capabilities: ["curiosity", "communication"],
            effects: [
              {
                kind: "worker-status",
                workerId: worker.id,
                status: "active",
                note: "Called in — reason logged",
              },
            ],
          },
          {
            id: "leave-it",
            label: "Leave it — cover with who you have",
            outcome: "Fewer hands, and the absence goes unexplained.",
            quality: 0.3,
            capabilities: ["stress-handling"],
          },
        ],
      };
    },
    onExpire: { note: "They stopped answering. The gap stays open." },
  },

  {
    id: "ppl-lunch",
    stream: "people",
    priority: "normal",
    weight: 8,
    cooldown: 500,
    ttl: 160,
    build: () => ({
      title: "Lunch order for the floor closes in ten minutes",
      detail: "Nine people. Somebody has to decide and collect the money.",
      source: "Floor",
      options: [
        {
          id: "delegate",
          label: "Hand it to whoever is on break",
          outcome: "Off your plate, and it still gets done.",
          quality: 0.85,
          capabilities: ["prioritization", "decision-making"],
        },
        {
          id: "do-it",
          label: "Sort it yourself",
          outcome: "Five minutes you did not have. The floor notices you did it.",
          quality: 0.5,
          capabilities: ["ownership"],
        },
        {
          id: "skip",
          label: "Skip it today",
          outcome: "Nine people work through lunch without one.",
          quality: 0.2,
          capabilities: ["ownership"],
        },
      ],
    }),
    onExpire: { note: "The lunch window closed with no order placed." },
  },

  {
    id: "ppl-rider-vehicle",
    stream: "people",
    priority: "high",
    weight: 8,
    cooldown: 180,
    ttl: 70,
    build: (ctx) => {
      const rider = pickFree(
        ctx,
        ctx.world.riders.filter((entry) => entry.status !== "offline"),
      );
      if (!rider) return null;
      return {
        title: `${rider.name}'s bike is making a noise he does not like`,
        detail:
          "He is mid-route with an order on the back. He wants to know whether to continue.",
        source: rider.name,
        subjectId: rider.id,
        options: [
          {
            id: "finish-then-swap",
            label: "Finish this drop, then swap to the spare",
            outcome: "Order lands. Bike gets looked at before it strands anyone.",
            quality: 0.9,
            capabilities: ["decision-making", "systems-thinking"],
          },
          {
            id: "return-now",
            label: "Come back now — reassign the order",
            outcome: "Safest. That order is almost certainly late.",
            quality: 0.7,
            capabilities: ["ownership", "customer-thinking"],
            effects: [
              {
                kind: "rider-status",
                riderId: rider.id,
                status: "returning",
                returnSeconds: 120,
                releaseOrder: true,
              },
            ],
          },
          {
            id: "carry-on",
            label: "Tell him to carry on all shift",
            outcome: "You will find out whether it was serious.",
            quality: 0.15,
            capabilities: ["ownership"],
          },
        ],
      };
    },
    onExpire: {
      note: "He carried on. The bike gave up on Old Airport Road.",
      effects: [
        { kind: "rider-status", riderId: "any-delivering", status: "offline", releaseOrder: true },
      ],
    },
  },
];
