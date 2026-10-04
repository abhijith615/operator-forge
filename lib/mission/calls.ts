import type { CapabilityId } from "@/lib/constants/site";
import type { TaskStream } from "@/types/tasks";

/**
 * The phone, in the trial shift.
 *
 * Everything else in the control room waits in a queue: it sits there, it is
 * visible, and it can be read when there is a gap. A phone call does none of
 * that. It arrives on top of whatever was open, it rings for twenty seconds,
 * and letting it ring is itself a decision with a cost.
 *
 * Two scheduled calls in a fifteen-minute shift. The store manager at two
 * minutes — he is stuck on the ORR and wants the floor in one line, which is
 * the hardest thing to give when you have only just picked it up. A picker at
 * eight minutes, standing at a bin whose count is wrong, asking for a ruling
 * only you can give. Both are scored through the ordinary decision ledger, so
 * a call weighs exactly what the task it interrupted would have.
 *
 * The third kind is outbound: `recallNegotiation`, the call the operator makes
 * when they decide to chase an absentee.
 *
 * Questions and answers are kept to a line each. A caller waiting on the other
 * end is the pressure; a paragraph to read is not.
 */

export interface MissionCallOption {
  id: string;
  label: string;
  /** What the caller says back, so the exchange reads as speech. */
  reply: string;
  /** 0–1, on the same scale as a task option. Feeds the genome directly. */
  quality: number;
  capabilities: CapabilityId[];
}

export interface MissionCallBeat {
  id: string;
  /** Spoken by the caller — a question, not a form label. */
  text: string;
  options: MissionCallOption[];
}

export interface MissionCall {
  id: string;
  caller: string;
  role: string;
  /** One line of context before they ask for anything. */
  opening: string;
  stream: TaskStream;
  /** Seconds it rings before it goes unanswered. */
  ringFor: number;
  /** Shift second the phone starts ringing. Absent on outbound calls. */
  at?: number;
  /** What declining costs. Never nothing — the call happened either way. */
  ignored: {
    quality: number;
    capabilities: CapabilityId[];
    note: string;
  };
  beats: MissionCallBeat[];
}

/* ── Scheduled, inbound ───────────────────────────────────────────────────── */

export const SCHEDULED_CALLS: MissionCall[] = [
  {
    id: "call-store-manager",
    at: 120,
    caller: "Rohit Menon",
    role: "Store Manager",
    opening: "“Still on the ORR. Two things, quickly.”",
    stream: "management",
    ringFor: 20,
    ignored: {
      quality: 0.2,
      capabilities: ["ownership", "communication"],
      note: "Rohit stopped calling and read the board himself, without your side of it.",
    },
    beats: [
      {
        id: "sm-status",
        text: "“Give me the floor in one line. How are we doing?”",
        options: [
          {
            id: "specific",
            label: "Name the worst number and your fix",
            reply: "“Good. That's the only sentence I needed.”",
            quality: 0.95,
            capabilities: ["communication", "ownership", "prioritization"],
          },
          {
            id: "fine",
            label: "Say it is under control",
            reply: "“That tells me nothing. I'll check the board.”",
            quality: 0.3,
            capabilities: ["communication"],
          },
          {
            id: "everything",
            label: "Walk him through everything open",
            reply: "“i have ninety seconds. what's the one thing?”",
            quality: 0.45,
            capabilities: ["communication", "prioritization"],
          },
        ],
      },
      {
        id: "sm-ctd",
        text: "“Cluster wants a number on today's CTD. What do I say?”",
        options: [
          {
            id: "hold-with-risk",
            label: "Give a number you can hold",
            reply: "“then that's what they get. tell me first if it slips.”",
            quality: 0.95,
            capabilities: ["decision-making", "systems-thinking", "ownership"],
          },
          {
            id: "optimistic",
            label: "Promise the 180-second target",
            reply: "“hope you've counted the packers.”",
            quality: 0.25,
            capabilities: ["decision-making"],
          },
          {
            id: "defer",
            label: "Ask for an hour before committing",
            reply: "“more than they'll give me. fine. one hour.”",
            quality: 0.6,
            capabilities: ["curiosity", "decision-making"],
          },
        ],
      },
    ],
  },

  {
    id: "call-picker",
    at: 480,
    caller: "Ganesh Iyer",
    role: "Picker · Zone C",
    opening: "“Boss, I'm at the bin. I don't want to guess.”",
    stream: "operations",
    ringFor: 20,
    ignored: {
      quality: 0.2,
      capabilities: ["ownership", "communication"],
      note: "Ganesh waited, then called it himself. He marked the nil pick and said nothing.",
    },
    beats: [
      {
        id: "pk-short",
        text: "“System says eight. There are five. Short them or hold?”",
        options: [
          {
            id: "count-and-flag",
            label: "Ship the five, then count the bin",
            reply: "“Counting it. Number to you in two minutes.”",
            quality: 0.95,
            capabilities: ["ownership", "systems-thinking", "curiosity"],
          },
          {
            id: "short-silently",
            label: "Short them. The queue matters more",
            reply: "“Okay. System still thinks there are eight.”",
            quality: 0.3,
            capabilities: ["prioritization"],
          },
          {
            id: "hold-all",
            label: "Hold them until someone verifies",
            reply: "“All five? That's five people waiting on one bin.”",
            quality: 0.45,
            capabilities: ["decision-making"],
          },
        ],
      },
      {
        id: "pk-shortcut",
        text: "“Priya's skipping the bin scan to keep up. Your call?”",
        options: [
          {
            id: "own-it",
            label: "Thank him. Handle Priya yourself",
            reply: "“Good. Didn't want to be the one, honestly.”",
            quality: 0.9,
            capabilities: ["ownership", "communication"],
          },
          {
            id: "peer",
            label: "Ask him to raise it with her",
            reply: "“She's faster than me. Awkward coming from me.”",
            quality: 0.5,
            capabilities: ["communication"],
          },
          {
            id: "ignore",
            label: "Leave it. The queue is urgent",
            reply: "“Fair enough. Head down.”",
            quality: 0.2,
            capabilities: ["prioritization"],
          },
        ],
      },
    ],
  },
];

/* ── Outbound, built on the spot ──────────────────────────────────────────── */

/**
 * Chasing an absentee, as an actual conversation.
 *
 * Choosing "call them in" from the queue used to be the whole task: one click
 * and a line of outcome text. But nobody who has done this job gets a yes on
 * the first ask. They get a reason, and then the reason underneath it, and the
 * shift is covered or not covered depending on what gets traded in between.
 *
 * Two rounds. Conceding everything scores no better than conceding nothing:
 * what is scored is whether something real is traded for something real, and
 * whether the person still picks up next week.
 */
export function recallNegotiation(workerName: string): MissionCall {
  const first = workerName.split(" ")[0] ?? workerName;

  return {
    id: `recall-${first.toLowerCase()}`,
    caller: workerName,
    role: "Absent · rostered 09:00",
    opening: "“Haan boss. I know, I know.”",
    stream: "people",
    ringFor: 0,
    ignored: {
      quality: 0.3,
      capabilities: ["communication"],
      note: `${first} was left on the call. The gap on the floor stays open.`,
    },
    beats: [
      {
        id: "beat-reason",
        text: "“Not well since morning. I was going to message at ten.”",
        options: [
          {
            id: "believe-and-ask",
            label: "Ask what they can manage today",
            reply: "“...Half shift. Packing, not picking.”",
            quality: 0.9,
            capabilities: ["curiosity", "communication"],
          },
          {
            id: "press",
            label: "Say the roster went out Friday",
            reply: "“You're right. Don't file it. I'll come.”",
            quality: 0.7,
            capabilities: ["ownership", "communication"],
          },
          {
            id: "guilt",
            label: "Say they are failing the team",
            reply: "“Everyone is short, boss.” The line goes quiet.",
            quality: 0.35,
            capabilities: ["communication"],
          },
        ],
      },
      {
        id: "beat-price",
        text: "“If I come, can I have Saturday early slot?”",
        options: [
          {
            id: "trade-clean",
            label: "Agree, and put it in writing today",
            reply: "“Done. Thirty minutes.” They are in before the wave.",
            quality: 0.95,
            capabilities: ["decision-making", "ownership", "communication"],
          },
          {
            id: "check-first",
            label: "Check who else wants Saturday first",
            reply: "“Fair. Tell me by evening. Leaving now anyway.”",
            quality: 0.85,
            capabilities: ["systems-thinking", "curiosity"],
          },
          {
            id: "promise-vague",
            label: "Say you will try. Get them moving",
            reply: "“You said that last month.” They come, reluctantly.",
            quality: 0.4,
            capabilities: ["decision-making"],
          },
          {
            id: "refuse",
            label: "Refuse. Attendance is not negotiable",
            reply: "“Then I'll take the day.” The line goes dead.",
            quality: 0.3,
            capabilities: ["decision-making", "stress-handling"],
          },
        ],
      },
    ],
  };
}
