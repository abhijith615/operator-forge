import { hubClock } from "@/lib/mission/config";
import type { TaskTemplate } from "./types";
import { openOrdersIn } from "./types";

/**
 * Management: the stream that never helps with the shift and always has to be
 * answered. The read here is mostly communication and ownership — whether the
 * operator can be honest upward while the floor is on fire.
 */
export const MANAGEMENT_TASKS: TaskTemplate[] = [
  {
    id: "mgmt-morning-report",
    stream: "management",
    priority: "normal",
    weight: 10,
    cooldown: 400,
    ttl: 150,
    build: ({ world }) => ({
      title: "Morning report due to the regional manager",
      detail: `She wants open orders, OTIF and headcount. Right now that reads ${openOrdersIn(world).length} open and ${Math.round(world.metrics.otif * 100)}% OTIF.`,
      source: "Kavitha Raghavan",
      options: [
        {
          id: "send-honest",
          label: "Send the real numbers with one line of context",
          outcome: "She sees a bad number and an operator who understands it.",
          quality: 0.95,
          capabilities: ["communication", "ownership"],
        },
        {
          id: "send-flat",
          label: "Send the numbers with no commentary",
          outcome: "Accurate. She will call to ask what happened.",
          quality: 0.6,
          capabilities: ["communication"],
        },
        {
          id: "delay",
          label: "Send it after the peak, when it looks better",
          outcome: "The number improves. So does her suspicion.",
          quality: 0.2,
          capabilities: ["ownership", "communication"],
        },
      ],
    }),
    onExpire: { note: "The report never went. She noticed." },
  },

  {
    id: "mgmt-manager-call",
    stream: "management",
    priority: "high",
    weight: 8,
    cooldown: 260,
    ttl: 55,
    build: () => ({
      title: "Regional manager is calling",
      detail: "No agenda given. She usually calls when something has already reached her.",
      source: "Kavitha Raghavan",
      options: [
        {
          id: "take-it",
          label: "Take the call now",
          outcome: "Three minutes off the floor at the worst moment. She gets it first-hand.",
          quality: 0.8,
          capabilities: ["communication", "stress-handling"],
        },
        {
          id: "text-back",
          label: "Message: mid-peak, will call in fifteen",
          outcome: "Sets a boundary and keeps the commitment visible.",
          quality: 0.9,
          capabilities: ["communication", "prioritization"],
        },
        {
          id: "ignore",
          label: "Let it ring",
          outcome: "She will call the shift lead instead.",
          quality: 0.15,
          capabilities: ["communication", "ownership"],
        },
      ],
    }),
    onExpire: { note: "The call went unanswered and she rang the shift lead." },
  },

  {
    id: "mgmt-safety-audit",
    stream: "management",
    priority: "high",
    weight: 7,
    cooldown: 400,
    ttl: 120,
    build: () => ({
      title: "Compliance wants the safety audit signed off today",
      detail: "Twelve line items. Four of them need you to physically check something.",
      source: "Compliance",
      options: [
        {
          id: "walk-and-sign",
          label: "Walk the four, then sign",
          outcome: "Six minutes. The signature means something.",
          quality: 0.95,
          capabilities: ["ownership", "curiosity"],
        },
        {
          id: "sign-known",
          label: "Sign what you know, flag the rest as unverified",
          outcome: "Honest and partial. Compliance can work with it.",
          quality: 0.8,
          capabilities: ["ownership", "communication"],
        },
        {
          id: "sign-all",
          label: "Sign all twelve",
          outcome: "Takes ten seconds. Your name is now on things you did not check.",
          quality: 0.0,
          capabilities: ["ownership"],
        },
      ],
    }),
    onExpire: { note: "The audit is overdue and escalates automatically." },
  },

  {
    id: "mgmt-targets",
    stream: "management",
    priority: "normal",
    weight: 9,
    cooldown: 300,
    ttl: 130,
    build: ({ world }) => ({
      title: "Head office has raised today's order target by 15%",
      detail: `You are ${world.workers.filter((w) => w.status === "absent").length} down on the roster and it is raining.`,
      source: "Head office",
      options: [
        {
          id: "push-back",
          label: "Push back with the staffing numbers",
          outcome: "Uncomfortable message, backed by evidence. Usually respected.",
          quality: 0.9,
          capabilities: ["communication", "ownership", "systems-thinking"],
        },
        {
          id: "accept",
          label: "Accept it and try",
          outcome: "Easy to say yes to. Hard to explain at six this evening.",
          quality: 0.35,
          capabilities: ["stress-handling"],
        },
        {
          id: "accept-conditional",
          label: "Accept, conditional on two agency staff",
          outcome: "Turns a demand into a negotiation. Often works.",
          quality: 0.95,
          capabilities: ["communication", "decision-making", "systems-thinking"],
        },
      ],
    }),
    onExpire: { note: "The target stands, unchallenged." },
  },

  {
    id: "mgmt-kpi-anomaly",
    stream: "management",
    priority: "normal",
    weight: 9,
    cooldown: 200,
    ttl: 120,
    build: ({ world }) => ({
      title: "Dashboard flag: pick rate down 22% against last Tuesday",
      detail: `Current OTIF ${Math.round(world.metrics.otif * 100)}%. The dashboard does not say why.`,
      source: "Performance dashboard",
      options: [
        {
          id: "investigate",
          label: "Find the cause before replying",
          outcome: "Two minutes on the floor tells you more than the dashboard will.",
          quality: 0.95,
          capabilities: ["curiosity", "systems-thinking"],
        },
        {
          id: "explain-staffing",
          label: "Reply: two absences and a broken scanner",
          outcome: "Probably right. You have not actually checked.",
          quality: 0.55,
          capabilities: ["communication"],
        },
        {
          id: "acknowledge",
          label: "Acknowledge and move on",
          outcome: "The flag clears. The cause does not.",
          quality: 0.25,
          capabilities: ["ownership"],
        },
      ],
    }),
    onExpire: { note: "The anomaly went unexplained and rolls into the weekly review." },
  },

  {
    id: "mgmt-budget",
    stream: "management",
    priority: "normal",
    weight: 7,
    cooldown: 350,
    ttl: 140,
    build: () => ({
      title: "Overtime spend is at 94% of the monthly budget",
      detail: "It is the eleventh. Finance has copied in your regional manager.",
      source: "Finance",
      options: [
        {
          id: "plan",
          label: "Reply with a plan for the rest of the month",
          outcome: "Turns a warning into a conversation you control.",
          quality: 0.95,
          capabilities: ["ownership", "systems-thinking", "communication"],
        },
        {
          id: "acknowledge",
          label: "Acknowledge and stop approving overtime",
          outcome: "Budget holds. The evening shifts will be short.",
          quality: 0.6,
          capabilities: ["decision-making"],
        },
        {
          id: "ignore",
          label: "Deal with it after the shift",
          outcome: "Reasonable today. It will be at 110% by then.",
          quality: 0.3,
          capabilities: ["prioritization"],
        },
      ],
    }),
    onExpire: { note: "No reply. Finance escalated it." },
  },

  {
    id: "mgmt-handover",
    stream: "management",
    priority: "high",
    weight: 8,
    cooldown: 600,
    ttl: 110,
    build: ({ world }) => ({
      title: "Handover notes for the next supervisor",
      detail: `Whatever you do not write down, they find out the hard way. ${openOrdersIn(world).length} orders are still open.`,
      source: "Shift handover",
      options: [
        {
          id: "full-notes",
          label: "Write the open issues, the causes and what you tried",
          outcome: "Four minutes. The next shift starts ahead instead of behind.",
          quality: 0.95,
          capabilities: ["communication", "ownership", "systems-thinking"],
        },
        {
          id: "quick-notes",
          label: "List the open orders only",
          outcome: "Better than nothing. They will rediscover the causes themselves.",
          quality: 0.55,
          capabilities: ["communication"],
        },
        {
          id: "verbal",
          label: "Tell them verbally on the way out",
          outcome: "Half of it will be forgotten before they reach the floor.",
          quality: 0.35,
          capabilities: ["communication"],
        },
      ],
    }),
    onExpire: { note: "No handover was written. The next shift inherits it blind." },
  },

  {
    id: "mgmt-incident-report",
    stream: "management",
    priority: "high",
    weight: 6,
    cooldown: 400,
    ttl: 100,
    build: ({ world }) => ({
      title: "Incident report required before end of shift",
      detail: `Something on the floor this morning triggered it. Filed at ${hubClock(world.elapsed)} or it goes in as a late submission.`,
      source: "Compliance",
      options: [
        {
          id: "file-now",
          label: "File it now, while you remember the detail",
          outcome: "Accurate account. Costs you three minutes.",
          quality: 0.9,
          capabilities: ["ownership", "communication"],
        },
        {
          id: "file-later",
          label: "File it at the end of the shift",
          outcome: "You will remember less. It will still be on time.",
          quality: 0.6,
          capabilities: ["prioritization"],
        },
        {
          id: "minimise",
          label: "File the shortest version that closes it",
          outcome: "Closed. Useless to anyone trying to stop it happening again.",
          quality: 0.2,
          capabilities: ["ownership", "systems-thinking"],
        },
      ],
    }),
    onExpire: { note: "The incident report was not filed." },
  },

  {
    id: "mgmt-visit-prep",
    stream: "management",
    priority: "high",
    weight: 6,
    cooldown: 500,
    ttl: 90,
    build: () => ({
      title: "Regional manager arrives in twenty minutes",
      detail: "She reads the queue board before she says hello. The floor is what it is.",
      source: "Kavitha Raghavan",
      options: [
        {
          id: "carry-on",
          label: "Change nothing — let her see the real floor",
          outcome: "She sees the truth, including what you are doing about it.",
          quality: 0.9,
          capabilities: ["ownership", "stress-handling"],
        },
        {
          id: "tidy",
          label: "Pull two pickers to tidy the aisles",
          outcome: "It looks better. The queue gets worse while she watches it.",
          quality: 0.2,
          capabilities: ["prioritization", "ownership"],
        },
        {
          id: "brief-first",
          label: "Message her the position before she arrives",
          outcome: "She arrives already knowing. No surprises either way.",
          quality: 0.95,
          capabilities: ["communication", "ownership"],
        },
      ],
    }),
    onExpire: { note: "She arrived with no context and formed her own." },
  },

  {
    id: "mgmt-headcount-survey",
    stream: "management",
    priority: "normal",
    weight: 7,
    cooldown: 450,
    ttl: 160,
    build: () => ({
      title: "Headcount survey from head office",
      detail: "Nine questions about next quarter's staffing. Due today, useful to nobody today.",
      source: "Head office",
      options: [
        {
          id: "delegate",
          label: "Pass it to the shift lead to complete",
          outcome: "Off your plate. The answers will be roughly right.",
          quality: 0.85,
          capabilities: ["prioritization", "decision-making"],
        },
        {
          id: "do-now",
          label: "Fill it in now",
          outcome: "Ten minutes off the floor during peak for a quarterly form.",
          quality: 0.25,
          capabilities: ["prioritization"],
        },
        {
          id: "after-shift",
          label: "After the shift",
          outcome: "Right call, provided you actually do it.",
          quality: 0.8,
          capabilities: ["prioritization"],
        },
      ],
    }),
    onExpire: { note: "The survey went unanswered." },
  },

  {
    id: "mgmt-promo-warning",
    stream: "management",
    priority: "critical",
    weight: 6,
    cooldown: 500,
    ttl: 50,
    build: () => ({
      title: "Marketing is pushing a rain-day promo to your zone in five minutes",
      detail: "Nobody asked you. It will roughly double inbound orders for half an hour.",
      source: "Marketing",
      options: [
        {
          id: "ask-delay",
          label: "Ask them to hold it thirty minutes",
          outcome: "Sometimes they say yes. It costs one message to find out.",
          quality: 0.95,
          capabilities: ["communication", "systems-thinking", "ownership"],
        },
        {
          id: "prepare",
          label: "Let it run and throttle intake now",
          outcome: "You cannot stop the demand, but you can meter it.",
          quality: 0.85,
          capabilities: ["decision-making", "systems-thinking"],
          effects: [{ kind: "throttle", status: "throttled" }],
        },
        {
          id: "nothing",
          label: "Nothing — take it as it comes",
          outcome: "The floor finds out at the same time the customers do.",
          quality: 0.2,
          capabilities: ["stress-handling"],
        },
      ],
    }),
    onExpire: { note: "The promo went out unmodified." },
  },
];
