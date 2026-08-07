import { CUSTOMER_NAMES } from "@/lib/mission/catalog";
import type { TaskTemplate } from "./types";
import { maybePick, openOrdersIn, pickFree } from "./types";

/**
 * Customers: the only stream where the cost of a decision is paid by someone
 * outside the building. Most options here trade money against goodwill, and the
 * read is on whether the operator can name who is actually affected.
 */
export const CUSTOMER_TASKS: TaskTemplate[] = [
  {
    id: "cust-late-delivery",
    stream: "customers",
    priority: "high",
    weight: 11,
    cooldown: 80,
    ttl: 70,
    build: (ctx) => {
      const { world } = ctx;
      const order = pickFree(ctx, openOrdersIn(world));
      if (!order) return null;
      const waited = Math.max(1, Math.round((world.elapsed - order.placedAt) / 60));
      return {
        title: `${order.customerName} is asking where ${order.code} is`,
        detail: `Placed ${waited} minute${waited === 1 ? "" : "s"} ago. Promised in ten. She can see it still says picking.`,
        source: order.customerName,
        subjectId: order.id,
        options: [
          {
            id: "specific-eta",
            label: "Give her a specific time and stick to it",
            outcome: "She stops chasing. You have now committed to something.",
            quality: 0.9,
            capabilities: ["customer-thinking", "communication"],
            effects: [{ kind: "rating", delta: 0.012 }],
          },
          {
            id: "apologise-vague",
            label: "Apologise and say it is on its way",
            outcome: "Buys about four minutes before she messages again.",
            quality: 0.4,
            capabilities: ["communication"],
          },
          {
            id: "expedite",
            label: "Expedite the order and tell her you have",
            outcome: "Her order jumps the queue. Everything behind it waits.",
            quality: 0.8,
            capabilities: ["decision-making", "customer-thinking"],
            effects: [{ kind: "expedite-order", orderId: order.id }],
          },
        ],
      };
    },
    onExpire: {
      note: "She got no reply and left a one-star review.",
      effects: [{ kind: "rating", delta: -0.035 }],
    },
  },

  {
    id: "cust-vip",
    stream: "customers",
    priority: "critical",
    weight: 7,
    cooldown: 220,
    ttl: 45,
    build: (ctx) => {
      const { world } = ctx;
      const order = pickFree(ctx, openOrdersIn(world));
      if (!order) return null;
      return {
        title: `Priority account order just landed — ${order.code}`,
        detail:
          "A corporate account that does eighty orders a week. Their contract has a fifteen-minute service level.",
        source: "Account management",
        subjectId: order.id,
        options: [
          {
            id: "expedite",
            label: "Expedite it to the front",
            outcome: "Contract protected. Four ordinary customers wait longer.",
            quality: 0.8,
            capabilities: ["prioritization", "decision-making"],
            effects: [{ kind: "expedite-order", orderId: order.id }],
          },
          {
            id: "normal",
            label: "Treat it like any other order",
            outcome: "Fair. Also a breach of a contract you are accountable for.",
            quality: 0.35,
            capabilities: ["customer-thinking"],
          },
          {
            id: "expedite-and-flag",
            label: "Expedite it and flag the SLA risk upward",
            outcome: "Handled now, and the pattern gets seen by someone who can fix it.",
            quality: 0.95,
            capabilities: ["ownership", "systems-thinking", "communication"],
            effects: [{ kind: "expedite-order", orderId: order.id }],
          },
        ],
      };
    },
    onExpire: {
      note: "The priority order sat in the general queue and breached its SLA.",
      effects: [{ kind: "rating", delta: -0.04 }],
    },
  },

  {
    id: "cust-refund",
    stream: "customers",
    priority: "high",
    weight: 10,
    cooldown: 110,
    ttl: 85,
    build: ({ rand }) => {
      const name = maybePick(rand, CUSTOMER_NAMES) ?? "A customer";
      return {
        title: `${name} is requesting a refund on damaged goods`,
        detail: "Photo attached. A carton of eggs, clearly broken. Order value ₹640.",
        source: name,
        options: [
          {
            id: "full-refund",
            label: "Refund in full, no questions",
            outcome: "Costs ₹640. She stays a customer.",
            quality: 0.75,
            capabilities: ["customer-thinking", "decision-making"],
            effects: [
              { kind: "refund", amount: 640 },
              { kind: "rating", delta: 0.02 },
            ],
          },
          {
            id: "refund-and-trace",
            label: "Refund, and trace which batch it came from",
            outcome: "Same cost, and you find out whether it is one carton or fifty.",
            quality: 0.95,
            capabilities: ["curiosity", "systems-thinking", "customer-thinking"],
            effects: [
              { kind: "refund", amount: 640 },
              { kind: "rating", delta: 0.022 },
            ],
          },
          {
            id: "partial",
            label: "Offer a partial credit",
            outcome: "Saves money. She will mention it in the review.",
            quality: 0.35,
            capabilities: ["customer-thinking"],
            effects: [{ kind: "refund", amount: 200 }],
          },
        ],
      };
    },
    onExpire: {
      note: "No response. She raised it with her card issuer instead.",
      effects: [{ kind: "rating", delta: -0.03 }],
    },
  },

  {
    id: "cust-wrong-item",
    stream: "customers",
    priority: "high",
    weight: 9,
    cooldown: 130,
    ttl: 80,
    build: ({ rand }) => {
      const name = maybePick(rand, CUSTOMER_NAMES) ?? "A customer";
      return {
        title: `${name} received someone else's basket`,
        detail: "Two orders were swapped at dispatch. The other customer has not noticed yet.",
        source: name,
        options: [
          {
            id: "swap-both",
            label: "Send a rider to swap both baskets",
            outcome: "Costs a rider twenty minutes. Both customers end up right.",
            quality: 0.9,
            capabilities: ["ownership", "customer-thinking"],
          },
          {
            id: "resend-refund",
            label: "Resend hers, refund the other",
            outcome: "Faster and more expensive. Nobody is left holding the wrong food.",
            quality: 0.8,
            capabilities: ["decision-making", "customer-thinking"],
            effects: [{ kind: "refund", amount: 400 }],
          },
          {
            id: "wait-and-see",
            label: "Fix hers, say nothing to the other",
            outcome: "One problem solved. One customer about to find out.",
            quality: 0.15,
            capabilities: ["ownership"],
          },
        ],
      };
    },
    onExpire: {
      note: "Both customers worked it out before you did.",
      effects: [{ kind: "rating", delta: -0.03 }],
    },
  },

  {
    id: "cust-substitution",
    stream: "customers",
    priority: "high",
    weight: 9,
    cooldown: 100,
    ttl: 60,
    build: (ctx) => {
      const { world, rand } = ctx;
      const order = pickFree(ctx, openOrdersIn(world));
      const line = order ? maybePick(rand, order.lines) : null;
      if (!order || !line) return null;
      return {
        title: `${line.name} is out — substitute on ${order.code}?`,
        detail: `${order.customerName} is on live chat. The nearest alternative is a different brand at a higher price.`,
        source: order.customerName,
        subjectId: order.id,
        options: [
          {
            id: "ask",
            label: "Ask her which she would prefer",
            outcome: "Thirty seconds of chat. She chooses and cannot be disappointed.",
            quality: 0.95,
            capabilities: ["customer-thinking", "communication"],
          },
          {
            id: "substitute",
            label: "Substitute at no extra charge",
            outcome: "Fast, generous, and occasionally exactly the wrong item.",
            quality: 0.65,
            capabilities: ["decision-making", "customer-thinking"],
          },
          {
            id: "drop-line",
            label: "Drop the line and refund it",
            outcome: "Clean. She gets an incomplete order she did not agree to.",
            quality: 0.4,
            capabilities: ["decision-making"],
          },
        ],
      };
    },
    onExpire: {
      note: "The chat timed out. The order went without the item and without a word.",
      effects: [{ kind: "rating", delta: -0.025 }],
    },
  },

  {
    id: "cust-cancellation",
    stream: "customers",
    priority: "normal",
    weight: 8,
    cooldown: 140,
    ttl: 75,
    build: (ctx) => {
      const { world } = ctx;
      const order = pickFree(ctx, openOrdersIn(world));
      if (!order) return null;
      return {
        title: `${order.customerName} wants to cancel ${order.code}`,
        detail: "It is already picked and bagged. She says it is taking too long.",
        source: order.customerName,
        subjectId: order.id,
        options: [
          {
            id: "cancel",
            label: "Cancel it and apologise",
            outcome: "You eat the pick. She leaves without a fight.",
            quality: 0.7,
            capabilities: ["customer-thinking", "decision-making"],
            effects: [{ kind: "cancel-order", orderId: order.id }],
          },
          {
            id: "offer-eta",
            label: "Tell her it is bagged and six minutes out",
            outcome: "Honest and specific. Most people wait when they know.",
            quality: 0.9,
            capabilities: ["communication", "customer-thinking"],
          },
          {
            id: "refuse",
            label: "Tell her it is too late to cancel",
            outcome: "Technically true. She will not order again.",
            quality: 0.1,
            capabilities: ["customer-thinking"],
            effects: [{ kind: "rating", delta: -0.03 }],
          },
        ],
      };
    },
    onExpire: { note: "She cancelled through the app and left a comment." },
  },

  {
    id: "cust-address",
    stream: "customers",
    priority: "high",
    weight: 8,
    cooldown: 120,
    ttl: 55,
    build: (ctx) => {
      const rider = pickFree(
        ctx,
        ctx.world.riders.filter((entry) => entry.status === "delivering"),
      );
      if (!rider) return null;
      return {
        title: `${rider.name} cannot find the address`,
        detail:
          "Gate is locked, no flat number, and the customer is not picking up. He has two more drops after this.",
        source: rider.name,
        subjectId: rider.id,
        options: [
          {
            id: "call-customer",
            label: "Call her from the hub line",
            outcome: "Often works when the rider's number does not.",
            quality: 0.9,
            capabilities: ["customer-thinking", "decision-making"],
          },
          {
            id: "next-drops",
            label: "Do the other two drops, come back",
            outcome: "Protects two promises at the cost of one.",
            quality: 0.8,
            capabilities: ["prioritization", "systems-thinking"],
          },
          {
            id: "leave-gate",
            label: "Leave it at the gate",
            outcome: "Fast. If it goes missing it is yours.",
            quality: 0.25,
            capabilities: ["ownership"],
          },
        ],
      };
    },
    onExpire: {
      note: "He waited fifteen minutes, then brought it back. Three drops late.",
      effects: [{ kind: "rating", delta: -0.03 }],
    },
  },

  {
    id: "cust-corporate-order",
    stream: "customers",
    priority: "high",
    weight: 7,
    cooldown: 260,
    ttl: 80,
    build: ({ rand }) => ({
      title: `Bulk order request — ${40 + Math.floor(rand() * 60)} units for an office`,
      detail: "They want it in ninety minutes. It would clear most of the beverage bay.",
      source: "Corporate desk",
      options: [
        {
          id: "accept",
          label: "Accept it in full",
          outcome: "Good revenue. Your bay is empty for the retail queue.",
          quality: 0.45,
          capabilities: ["decision-making"],
        },
        {
          id: "split",
          label: "Accept part now, rest after replenishment",
          outcome: "They get most of it. The floor keeps its cover.",
          quality: 0.95,
          capabilities: ["systems-thinking", "prioritization", "communication"],
        },
        {
          id: "decline",
          label: "Decline — not during peak",
          outcome: "Protects the shift. The account will remember being turned away.",
          quality: 0.5,
          capabilities: ["prioritization"],
        },
      ],
    }),
    onExpire: { note: "The corporate desk went to another hub." },
  },

  {
    id: "cust-churn-risk",
    stream: "customers",
    priority: "normal",
    weight: 7,
    cooldown: 240,
    ttl: 110,
    build: ({ rand }) => {
      const name = maybePick(rand, CUSTOMER_NAMES) ?? "A customer";
      return {
        title: `${name} has had three late orders this week`,
        detail: "Weekly customer for two years. The system has flagged her as at risk of churning.",
        source: "Retention flag",
        options: [
          {
            id: "call",
            label: "Call her personally",
            outcome: "Two minutes. Retention rates on a personal call are very high.",
            quality: 0.95,
            capabilities: ["customer-thinking", "ownership", "communication"],
            effects: [{ kind: "rating", delta: 0.02 }],
          },
          {
            id: "voucher",
            label: "Send an automatic voucher",
            outcome: "Costs money and reads as automated, because it is.",
            quality: 0.5,
            capabilities: ["customer-thinking"],
            effects: [{ kind: "refund", amount: 300 }],
          },
          {
            id: "nothing",
            label: "Nothing — she is one customer",
            outcome: "True. She is also the pattern.",
            quality: 0.15,
            capabilities: ["customer-thinking", "systems-thinking"],
          },
        ],
      };
    },
    onExpire: { note: "She stopped ordering. Nobody noticed until the weekly report." },
  },

  {
    id: "cust-status-batch",
    stream: "customers",
    priority: "normal",
    weight: 10,
    cooldown: 90,
    ttl: 95,
    build: ({ world, rand }) => {
      const count = 3 + Math.floor(rand() * 4);
      return {
        title: `${count} customers are asking for order status at once`,
        detail: `${openOrdersIn(world).length} orders are open. Answering each one properly takes about a minute.`,
        source: "Live chat",
        options: [
          {
            id: "template-then-personal",
            label: "Send a holding note, then handle the worst individually",
            outcome: "Everybody hears something. The angriest hears from a person.",
            quality: 0.95,
            capabilities: ["prioritization", "communication", "customer-thinking"],
          },
          {
            id: "all-personal",
            label: "Answer each one properly",
            outcome: "Every customer is well handled. You lose five minutes off the floor.",
            quality: 0.55,
            capabilities: ["customer-thinking"],
          },
          {
            id: "ignore",
            label: "Leave it to the app notifications",
            outcome: "The app says picking. That is what they are complaining about.",
            quality: 0.15,
            capabilities: ["customer-thinking"],
          },
        ],
      };
    },
    onExpire: {
      note: "Nobody answered the chat queue.",
      effects: [{ kind: "rating", delta: -0.02 }],
    },
  },
];
