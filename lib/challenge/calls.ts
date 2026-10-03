import type { DecisionTag, SignalDelta, TaskStream } from "./types";

/**
 * The phone.
 *
 * Everything else on Day 1 waits its turn in a queue. A phone call does not:
 * it arrives on top of whatever you were doing, it rings for twenty seconds,
 * and not answering is itself an answer. That interruption is the part of the
 * job a task list cannot reproduce — a store manager's attention is taken from
 * them several times an hour, and what they do in the first second of that is
 * most of what distinguishes one from another.
 *
 * Three calls, roughly four minutes apart, so they land between the scored
 * scenarios rather than on top of them. Each is worth real signal in both
 * directions, and those contributions are inside the bounds in `scoring.ts` —
 * anything scored has to be, or the scale stops meaning what it says.
 */

export interface CallOption {
  id: string;
  label: string;
  /** What the caller says back. Keeps the exchange feeling like a conversation. */
  reply: string;
  signals: SignalDelta;
  tags: DecisionTag[];
}

export interface CallQuestion {
  id: string;
  /** Spoken by the caller, so it reads as speech rather than a form label. */
  text: string;
  options: CallOption[];
}

export interface IncomingCall {
  id: string;
  /** Seconds into the shift when the phone starts ringing. */
  at: number;
  caller: string;
  role: string;
  /** One line of context before they ask anything. */
  opening: string;
  stream: TaskStream;
  /** How long it rings before it goes unanswered. */
  ringFor: number;
  /** What declining costs. Never nothing — the call happened either way. */
  ignored: {
    signals: SignalDelta;
    tags: DecisionTag[];
    note: string;
  };
  questions: CallQuestion[];
}

export const CALLS: IncomingCall[] = [
  {
    id: "call-floor-lead",
    at: 240,
    caller: "Faisal",
    role: "Floor Lead",
    opening: "I'm at the pick face. Two things and I'll let you go.",
    stream: "people",
    ringFor: 20,
    ignored: {
      signals: { team: -2, priority: -1 },
      tags: ["let_it_ring"],
      note: "Faisal stops calling and makes the call himself. It is not the one you would have made.",
    },
    questions: [
      {
        id: "q-zone",
        text: "Akhil's finished his zone. Where do you want him?",
        options: [
          {
            id: "packing",
            label: "Packing — it is the stage that is backing up",
            reply: "Right. I'll walk him over.",
            signals: { priority: 2, reasoning: 2, team: 1 },
            tags: ["anticipated_bottleneck", "used_cross_training"],
          },
          {
            id: "more-picking",
            label: "Another picking zone — keep the output up",
            reply: "Picking's not the problem, but you're the boss.",
            signals: { reasoning: -2, priority: -1 },
            tags: ["overstaffed_picking"],
          },
          {
            id: "ask-him",
            label: "Wherever he thinks he is most useful",
            reply: "He'll pick whatever's nearest. That's not a plan.",
            signals: { team: -1, priority: -1 },
            tags: [],
          },
        ],
      },
      {
        id: "q-rakesh",
        text: "Any word on Rakesh? I'm covering his aisle and mine.",
        options: [
          {
            id: "covering",
            label: "He is out. I have rebalanced — you are not covering both",
            reply: "Good. That's all I needed to hear.",
            signals: { team: 2, priority: 1 },
            tags: ["balanced_floor"],
          },
          {
            id: "unknown",
            label: "No word yet. Keep going as you are",
            reply: "Understood. It's getting heavy down here.",
            signals: { team: -1 },
            tags: [],
          },
        ],
      },
    ],
  },
  {
    id: "call-cluster",
    at: 480,
    caller: "Deepa",
    role: "Cluster Manager",
    opening: "Quick one. I'm pulling the morning numbers for the region.",
    stream: "management",
    ringFor: 20,
    ignored: {
      signals: { customer: -2, priority: -2 },
      tags: ["reacted_late"],
      note: "She files the report without your store in it, and calls back at the worst possible moment.",
    },
    questions: [
      {
        id: "q-ctd",
        text: "Where is your click-to-dispatch right now?",
        options: [
          {
            id: "read-it",
            label: "Read it off the board and give her the number",
            reply: "Thank you. That's the first straight answer I've had this morning.",
            signals: { reasoning: 2, priority: 1 },
            tags: ["reported_from_the_board"],
          },
          {
            id: "roughly",
            label: "Roughly on target, I think",
            reply: "I need a number, not an impression.",
            signals: { reasoning: -2 },
            tags: [],
          },
        ],
      },
      {
        id: "q-risk",
        text: "What is the one thing most likely to go wrong in the next ten minutes?",
        options: [
          {
            id: "packing",
            label: "Packing capacity — it is the slowest active stage",
            reply: "Then protect it. Don't let picking out-run it.",
            signals: { reasoning: 3, priority: 2 },
            tags: ["solved_true_bottleneck"],
          },
          {
            id: "orders",
            label: "Order volume — it keeps climbing",
            reply: "Volume is the weather. I asked what you can control.",
            signals: { reasoning: -1 },
            tags: [],
          },
          {
            id: "nothing",
            label: "Nothing I cannot handle",
            reply: "Everyone says that at 07:20. Call me when it isn't true.",
            signals: { reasoning: -2, priority: -1 },
            tags: [],
          },
        ],
      },
      {
        id: "q-help",
        text: "Do you need anything from me?",
        options: [
          {
            id: "riders",
            label: "Rider capacity for the next half hour",
            reply: "I'll move two across from 112. They'll be with you in fifteen.",
            signals: { priority: 2, customer: 2 },
            tags: ["escalated_appropriately"],
          },
          {
            id: "fine",
            label: "No, we are fine",
            reply: "Noted. Then I'll expect the numbers to say so.",
            signals: { priority: -1 },
            tags: [],
          },
        ],
      },
    ],
  },
  {
    id: "call-support",
    at: 720,
    caller: "Nidhi",
    role: "Customer Support",
    opening: "I have a customer on the other line and I need something I can tell her.",
    stream: "customers",
    ringFor: 20,
    ignored: {
      signals: { customer: -3 },
      tags: ["left_customer_waiting"],
      note: "Support tells the customer they cannot reach the store. She asks for a refund and does not reorder.",
    },
    questions: [
      {
        id: "q-order",
        text: "Order #4863 is 22 minutes old. Is it leaving?",
        options: [
          {
            id: "check-and-say",
            label: "Check the board and tell her exactly when",
            reply: "Perfect. A time I can give her is worth ten apologies.",
            signals: { customer: 3, reasoning: 1 },
            tags: ["proportionate_recovery"],
          },
          {
            id: "soon",
            label: "Tell her soon",
            reply: "“Soon” is what she heard twelve minutes ago.",
            signals: { customer: -2 },
            tags: [],
          },
        ],
      },
      {
        id: "q-compensate",
        text: "She is asking for the whole order free. What do I offer?",
        options: [
          {
            id: "proportionate",
            label: "Delivery fee back and an apology — the goods are fine",
            reply: "That's what I'd have gone with. I'll hold the line there.",
            signals: { customer: 2, reasoning: 1 },
            tags: ["proportionate_recovery"],
          },
          {
            id: "everything",
            label: "Give her the full refund, it is quicker",
            reply: "It is. It also teaches her that waiting pays.",
            signals: { customer: -1, reasoning: -1 },
            tags: [],
          },
          {
            id: "nothing",
            label: "Nothing — we are inside the SLA",
            reply: "We are. She is still twenty-two minutes into her morning.",
            signals: { customer: -2 },
            tags: [],
          },
        ],
      },
    ],
  },
];

/** Every call that should have rung by now and has not been dealt with. */
export function callDueAt(elapsed: number, handled: readonly string[]): IncomingCall | null {
  return (
    CALLS.find((call) => call.at <= elapsed && !handled.includes(call.id)) ?? null
  );
}
