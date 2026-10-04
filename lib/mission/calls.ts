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
 * That interruption is the part of the job a task list cannot reproduce. A
 * store manager's attention is taken from them several times an hour, usually
 * by someone who needs a number, a permission or a judgement call that only
 * they can give — and what they do in the first second of that is most of what
 * separates one operator from another.
 *
 * Two scheduled calls in a fifteen-minute shift: the store manager at two
 * minutes, when the floor is still settling and the operator has barely formed
 * a picture, and a picker at eight minutes, when they have one and it is about
 * to be contradicted. Both are scored through the ordinary decision ledger, so
 * a call counts exactly as much as the task it interrupted.
 *
 * The third kind is outbound and unscheduled: `recallNegotiation` builds the
 * call the operator makes when they decide to chase an absentee. See its own
 * note below.
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
    caller: "Rekha Menon",
    role: "Store Manager",
    opening: "I'm between meetings. Two things, quickly.",
    stream: "management",
    ringFor: 20,
    ignored: {
      quality: 0.2,
      capabilities: ["ownership", "communication"],
      note: "Rekha stopped calling and pulled the numbers herself. She will have read them without your side of it.",
    },
    beats: [
      {
        id: "sm-status",
        text: "Give me the floor in one line. How are we actually doing?",
        options: [
          {
            id: "specific",
            label: "Name the number that is worst and what you are doing about it",
            reply: "Good. That's the only sentence I needed.",
            quality: 0.9,
            capabilities: ["communication", "ownership", "prioritization"],
          },
          {
            id: "fine",
            label: "Say it is under control",
            reply: "That tells me nothing. I'll check the dashboard myself.",
            quality: 0.3,
            capabilities: ["communication"],
          },
          {
            id: "everything",
            label: "Walk her through everything open, in order",
            reply: "I've got ninety seconds, not nine minutes. Stop — what's the one thing?",
            quality: 0.45,
            capabilities: ["communication", "prioritization"],
          },
        ],
      },
      {
        id: "sm-promise",
        text: "Regional wants a promise on today's on-time number. What do I tell them?",
        options: [
          {
            id: "hedge-with-plan",
            label: "Give a number you can hold, and say what would break it",
            reply: "Then that's what they get. If it breaks, I hear it from you first.",
            quality: 0.95,
            capabilities: ["decision-making", "systems-thinking", "ownership"],
          },
          {
            id: "optimistic",
            label: "Promise the target — you will find a way",
            reply: "I'll hold you to it. I hope you've counted the riders.",
            quality: 0.25,
            capabilities: ["decision-making"],
          },
          {
            id: "defer",
            label: "Ask for an hour before committing to anything",
            reply: "An hour is more than they'll give me, but fine. One hour.",
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
    role: "Picker — Aisle C",
    opening: "Boss, I'm standing in front of a bay and I don't want to guess.",
    stream: "operations",
    ringFor: 20,
    ignored: {
      quality: 0.2,
      capabilities: ["ownership", "communication"],
      note: "Ganesh waited, then made his own call. He picked the short date and said nothing to anyone.",
    },
    beats: [
      {
        id: "pk-short",
        text: "System says eight. There are five. Do I short the orders or hold them?",
        options: [
          {
            id: "count-and-flag",
            label: "Fulfil the five, flag the gap, and count the bay now",
            reply: "Counting it. I'll message you the number in two minutes.",
            quality: 0.95,
            capabilities: ["ownership", "systems-thinking", "curiosity"],
          },
          {
            id: "short-silently",
            label: "Short them and move on — the queue is what matters",
            reply: "Okay. The system still thinks there are eight, though.",
            quality: 0.3,
            capabilities: ["prioritization"],
          },
          {
            id: "hold-all",
            label: "Hold all of them until someone verifies the bay",
            reply: "All of them? That's five customers waiting on one bay.",
            quality: 0.45,
            capabilities: ["decision-making"],
          },
        ],
      },
      {
        id: "pk-shortcut",
        text: "Also — Priya's skipping the scan to keep up. Should I say something or is that your call?",
        options: [
          {
            id: "own-it",
            label: "Thank him, and handle Priya yourself",
            reply: "Good. I didn't want to be the one, honestly.",
            quality: 0.9,
            capabilities: ["ownership", "communication"],
          },
          {
            id: "peer",
            label: "Ask him to raise it with her directly, right now",
            reply: "I'll try. She's faster than me, so it's awkward coming from me.",
            quality: 0.55,
            capabilities: ["communication"],
          },
          {
            id: "ignore",
            label: "Leave it — the queue is more urgent than the scan",
            reply: "Fair enough. I'll keep my head down.",
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
 * and a line of outcome text. But nobody who has ever done this job gets a yes
 * on the first ask. They get a reason, and then they get a second reason, and
 * the shift is covered or not covered depending on what the manager offers in
 * between.
 *
 * So the click opens the call, and the call is two rounds of push-back. The
 * first is the stated reason; the second is the one underneath it. Conceding
 * everything scores no better than conceding nothing — what is scored is
 * whether the operator trades something real for something real and leaves the
 * person willing to pick up the phone next week.
 */
export function recallNegotiation(workerName: string): MissionCall {
  const first = workerName.split(" ")[0] ?? workerName;

  return {
    id: `recall-${first.toLowerCase()}`,
    caller: workerName,
    role: "Absent — rostered 09:00",
    opening: `You called. It rings four times. "Haan, boss. I know, I know."`,
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
        text: `"I'm not well since morning. I was going to message you at ten."`,
        options: [
          {
            id: "believe-and-ask",
            label: "Take it at face value, and ask what they can manage",
            reply: `"...Half shift. Till one. If I sit for the packing, not the picking."`,
            quality: 0.9,
            capabilities: ["curiosity", "communication"],
          },
          {
            id: "press",
            label: "Say the roster went out on Friday and you needed the message then",
            reply: `"You're right. I should have called. Don't put it in the file, boss — I'll come."`,
            quality: 0.7,
            capabilities: ["ownership", "communication"],
          },
          {
            id: "guilt",
            label: "Tell them the floor is short and they are letting the team down",
            reply: `"Everyone is short, boss. Every day someone is short." The line goes quiet.`,
            quality: 0.35,
            capabilities: ["communication"],
          },
        ],
      },
      {
        id: "beat-price",
        text: `"One thing — if I come in now, can you put me on the early slot on Saturday? My brother is travelling."`,
        options: [
          {
            id: "trade-clean",
            label: "Agree to Saturday, and say the roster goes in writing today",
            reply: `"Done. Give me thirty minutes." They are in before the second wave.`,
            quality: 0.95,
            capabilities: ["decision-making", "ownership", "communication"],
          },
          {
            id: "promise-vague",
            label: "Say you will try, and get them moving now",
            reply: `"You said that last month also." They come in. They will not call next time.`,
            quality: 0.4,
            capabilities: ["decision-making"],
          },
          {
            id: "refuse",
            label: "Refuse the trade — attendance is not negotiable",
            reply: `"Then I'll take the day, boss." The line goes dead.`,
            quality: 0.3,
            capabilities: ["decision-making", "stress-handling"],
          },
          {
            id: "check-first",
            label: "Ask who else wants Saturday early before you promise it",
            reply: `"Fair. Check and tell me by evening — I'm leaving now anyway."`,
            quality: 0.85,
            capabilities: ["systems-thinking", "curiosity"],
          },
        ],
      },
    ],
  };
}
