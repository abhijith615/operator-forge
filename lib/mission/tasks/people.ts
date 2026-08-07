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
    // Names a different worker each time, so a second showing reads as new.
    repeatable: true,
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
    repeatable: true,
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

  {
    id: "ppl-shift-swap",
    stream: "people",
    priority: "normal",
    weight: 8,
    cooldown: 300,
    ttl: 130,
    build: (ctx) => {
      const worker = pickFree(ctx, activeWorkers(ctx.world));
      if (!worker) return null;
      return {
        title: `${worker.name} wants to swap Saturday with someone`,
        detail: "They have already found a willing swap. It just needs signing off.",
        source: worker.name,
        subjectId: worker.id,
        options: [
          {
            id: "check-cover",
            label: "Check the swap keeps Saturday covered, then approve",
            outcome: "Thirty seconds of checking. Stops a swap that leaves you short.",
            quality: 0.95,
            capabilities: ["systems-thinking", "decision-making"],
          },
          {
            id: "approve",
            label: "Approve it — they sorted it themselves",
            outcome: "Popular, and occasionally leaves Saturday with two pickers.",
            quality: 0.55,
            capabilities: ["communication"],
          },
          {
            id: "decline",
            label: "Decline — the roster is the roster",
            outcome: "Nothing breaks. Nobody arranges their own cover again either.",
            quality: 0.25,
            capabilities: ["ownership"],
          },
        ],
      };
    },
    onExpire: { note: "The swap went unanswered and both of them turned up." },
  },

  {
    id: "ppl-no-ppe",
    stream: "people",
    priority: "high",
    weight: 7,
    cooldown: 280,
    ttl: 75,
    build: (ctx) => {
      const worker = pickFree(ctx, activeWorkers(ctx.world));
      if (!worker) return null;
      return {
        title: `${worker.name} is on the chiller run without safety boots`,
        detail: "Trainers. On a wet floor, around cages. They say they left theirs at home.",
        source: "Floor",
        subjectId: worker.id,
        options: [
          {
            id: "spare-pair",
            label: "Find them a spare pair before they go back on",
            outcome: "Five minutes and the problem is gone for the day.",
            quality: 0.95,
            capabilities: ["ownership", "decision-making"],
          },
          {
            id: "move-them",
            label: "Move them to a dry-goods aisle for the shift",
            outcome: "Workable. It also quietly rewards forgetting them.",
            quality: 0.7,
            capabilities: ["decision-making", "prioritization"],
          },
          {
            id: "carry-on",
            label: "Let them carry on and mention it later",
            outcome: "Nothing will happen. Until it does, and it is your signature on the roster.",
            quality: 0.05,
            capabilities: ["ownership"],
          },
        ],
      };
    },
    onExpire: { note: "They worked the whole shift in trainers." },
  },

  {
    id: "ppl-agency",
    stream: "people",
    priority: "high",
    weight: 8,
    cooldown: 260,
    ttl: 85,
    when: (world) => world.workers.some((worker) => worker.status === "absent"),
    build: ({ world }) => ({
      title: "Agency can send two people for the peak",
      detail: `You are ${world.workers.filter((w) => w.status === "absent").length} down. They would arrive in twenty minutes, untrained on this floor.`,
      source: "Agency desk",
      options: [
        {
          id: "take-one",
          label: "Take one and pair them with a picker",
          outcome: "Half the hands, and they are actually useful by the time they start.",
          quality: 0.9,
          capabilities: ["systems-thinking", "decision-making"],
        },
        {
          id: "take-both",
          label: "Take both",
          outcome: "Most hands, and two people who need showing where everything is.",
          quality: 0.6,
          capabilities: ["decision-making"],
        },
        {
          id: "decline",
          label: "Decline — we will manage",
          outcome: "Saves the agency cost. The queue does not care about the agency cost.",
          quality: 0.35,
          capabilities: ["stress-handling", "prioritization"],
        },
      ],
    }),
    onExpire: { note: "The agency filled the slots with another store." },
  },

  {
    id: "ppl-recognition",
    stream: "people",
    priority: "normal",
    weight: 9,
    cooldown: 300,
    ttl: 140,
    build: (ctx) => {
      const worker = pickFree(ctx, activeWorkers(ctx.world));
      if (!worker) return null;
      return {
        title: `${worker.name} spotted the mislabelled batch before it shipped`,
        detail: "Nobody asked them to check. It would have been forty wrong orders.",
        source: "Floor",
        subjectId: worker.id,
        options: [
          {
            id: "say-it-now",
            label: "Say so, in front of the floor",
            outcome: "Ten seconds. The rest of the shift now knows what good looks like.",
            quality: 0.95,
            capabilities: ["communication", "ownership"],
          },
          {
            id: "log-it",
            label: "Note it for their review",
            outcome: "Counts in six months. Does nothing this morning.",
            quality: 0.6,
            capabilities: ["ownership"],
          },
          {
            id: "nothing",
            label: "Nothing — it is the job",
            outcome: "It is the job. It is also the reason you still have forty orders.",
            quality: 0.15,
            capabilities: ["communication"],
          },
        ],
      };
    },
    onExpire: { note: "Nobody said anything about it." },
  },

  {
    id: "ppl-rider-rating",
    stream: "people",
    priority: "normal",
    weight: 7,
    cooldown: 300,
    ttl: 120,
    build: (ctx) => {
      const rider = pickFree(ctx, ctx.world.riders);
      if (!rider) return null;
      return {
        title: `${rider.name}'s customer rating has dropped this week`,
        detail: "Three mentions of him not waiting at the door. He has not been spoken to about it.",
        source: "Rider metrics",
        subjectId: rider.id,
        options: [
          {
            id: "ask-first",
            label: "Ask him what is happening on those drops",
            outcome: "Usually there is a reason. Sometimes it is your dispatch timing.",
            quality: 0.95,
            capabilities: ["curiosity", "communication"],
          },
          {
            id: "tell-him",
            label: "Tell him to wait longer at the door",
            outcome: "Clear instruction. You still do not know why it started.",
            quality: 0.5,
            capabilities: ["communication"],
          },
          {
            id: "reassign",
            label: "Move him off the difficult routes",
            outcome: "The number improves. The behaviour does not.",
            quality: 0.35,
            capabilities: ["decision-making"],
          },
        ],
      };
    },
    onExpire: { note: "The rating kept sliding and nobody asked why." },
  },

  {
    id: "ppl-pay-query",
    stream: "people",
    priority: "normal",
    weight: 8,
    cooldown: 320,
    ttl: 120,
    build: (ctx) => {
      const worker = pickFree(ctx, activeWorkers(ctx.world));
      if (!worker) return null;
      return {
        title: `${worker.name} says last month's overtime was not paid`,
        detail: "They have asked twice already, through someone else. They are asking you directly now.",
        source: worker.name,
        subjectId: worker.id,
        options: [
          {
            id: "own-it",
            label: "Take the details and chase payroll yourself today",
            outcome: "Two minutes now, and they stop having to chase it.",
            quality: 0.95,
            capabilities: ["ownership", "communication"],
          },
          {
            id: "route",
            label: "Give them the payroll contact",
            outcome: "Correct process. It is the third time they have been given a contact.",
            quality: 0.4,
            capabilities: ["communication"],
          },
          {
            id: "later",
            label: "Tell them you will look after the shift",
            outcome: "Only worth anything if you remember.",
            quality: 0.5,
            capabilities: ["prioritization"],
          },
        ],
      };
    },
    onExpire: { note: "The pay query went unanswered for a third time." },
  },

  {
    id: "ppl-newcomer-lost",
    stream: "people",
    priority: "normal",
    weight: 8,
    cooldown: 280,
    ttl: 100,
    build: () => ({
      title: "The new picker has been in frozen for six minutes",
      detail: "One order. They have not asked anyone for help and they are not going to.",
      source: "Floor",
      options: [
        {
          id: "go-help",
          label: "Go and walk the aisle with them",
          outcome: "Costs you five minutes. They will find it alone tomorrow.",
          quality: 0.9,
          capabilities: ["ownership", "communication"],
        },
        {
          id: "send-buddy",
          label: "Send an experienced picker over",
          outcome: "Solves it without taking you off the board.",
          quality: 0.85,
          capabilities: ["decision-making", "prioritization"],
        },
        {
          id: "reassign-order",
          label: "Move the order to someone faster",
          outcome: "The order ships. The new picker learns nothing except that they were moved.",
          quality: 0.35,
          capabilities: ["prioritization"],
        },
      ],
    }),
    onExpire: { note: "They came out of frozen eventually, with the wrong item." },
  },

  {
    id: "ppl-shift-brief",
    stream: "people",
    priority: "normal",
    weight: 8,
    cooldown: 500,
    ttl: 130,
    build: ({ world }) => ({
      title: "The floor has not been briefed since you took over",
      detail: `${activePickers(world).length} pickers, all working from what they assume the priorities are.`,
      source: "Shift lead",
      options: [
        {
          id: "brief-now",
          label: "Pull everyone in for ninety seconds",
          outcome: "Stops the floor for ninety seconds. Aligns it for the rest of the shift.",
          quality: 0.95,
          capabilities: ["communication", "systems-thinking"],
        },
        {
          id: "brief-individually",
          label: "Tell people as you pass them",
          outcome: "Nothing stops. Half of them get a slightly different version.",
          quality: 0.6,
          capabilities: ["communication"],
        },
        {
          id: "skip",
          label: "They know what they are doing",
          outcome: "They know what they were doing before you arrived.",
          quality: 0.25,
          capabilities: ["communication", "ownership"],
        },
      ],
    }),
    onExpire: { note: "The floor never got briefed." },
  },
];
