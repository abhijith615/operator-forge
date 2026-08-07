import type { TaskTemplate } from "./types";
import { activePickers, lowStock, maybePick, openOrdersIn, pickFree } from "./types";

/**
 * Operations: the floor itself. A mix of things going wrong and the routine
 * work that keeps them from going wrong — deliberately weighted so the operator
 * spends most of their time on ordinary store activity, not emergencies.
 */
export const OPERATIONS_TASKS: TaskTemplate[] = [
  {
    id: "ops-item-not-found",
    stream: "operations",
    priority: "high",
    weight: 10,
    cooldown: 100,
    ttl: 75,
    // A different picker cannot find a different SKU — reads new each time.
    repeatable: true,
    build: (ctx) => {
      const { world, rand } = ctx;
      const picker = pickFree(ctx, activePickers(world));
      const item = maybePick(rand, world.inventory);
      if (!picker || !item) return null;
      return {
        title: `${picker.name} cannot find ${item.name}`,
        detail: `System says ${item.systemQty} on hand. The bay is empty. There is an order waiting on it.`,
        source: picker.name,
        subjectId: picker.id,
        options: [
          {
            id: "check-backup",
            label: "Send them to the overflow bay",
            outcome: "Two minutes lost, but the stock turns up more often than not.",
            quality: 0.9,
            capabilities: ["systems-thinking", "decision-making"],
          },
          {
            id: "short-the-line",
            label: "Ship short and refund the line",
            outcome: "Order moves. The customer gets an incomplete basket.",
            quality: 0.45,
            capabilities: ["prioritization", "customer-thinking"],
            effects: [{ kind: "rating", delta: -0.01 }],
          },
          {
            id: "block-sku",
            label: "Block the SKU and count it later",
            outcome: "Nobody else wastes a trip. You have not learned why yet.",
            quality: 0.65,
            capabilities: ["ownership", "decision-making"],
            effects: [{ kind: "block-sku", sku: item.sku }],
          },
        ],
      };
    },
    onExpire: {
      note: "The picker gave up and moved on. The order is still short.",
      effects: [{ kind: "rating", delta: -0.015 }],
    },
  },

  {
    id: "ops-scanner-drop",
    stream: "operations",
    priority: "high",
    weight: 6,
    cooldown: 240,
    ttl: 90,
    build: ({ rand }) => ({
      title: `Scanner at station ${1 + Math.floor(rand() * 3)} has dropped off the network`,
      detail: "Picks there are being keyed by hand. Every basket takes longer.",
      source: "Floor systems",
      options: [
        {
          id: "restart",
          label: "Restart the access point",
          outcome: "Ninety seconds down, then everything reconnects.",
          quality: 0.85,
          capabilities: ["decision-making", "learning-agility"],
        },
        {
          id: "manual",
          label: "Keep keying manually for now",
          outcome: "Nothing stops, but the station stays slow all shift.",
          quality: 0.35,
          capabilities: ["stress-handling"],
          effects: [{ kind: "impairment", label: "Station keying by hand", pickPenalty: 0.85 }],
        },
        {
          id: "maintenance",
          label: "Log it with maintenance and move the picker",
          outcome: "Fixed properly, but not this shift.",
          quality: 0.7,
          capabilities: ["ownership", "systems-thinking"],
        },
      ],
    }),
    onExpire: {
      note: "Nobody touched it. The station is still limping.",
      effects: [{ kind: "impairment", label: "Scanner still down", pickPenalty: 0.8 }],
    },
  },

  {
    id: "ops-goods-receipt",
    stream: "operations",
    priority: "normal",
    weight: 12,
    cooldown: 150,
    ttl: 110,
    build: ({ rand }) => ({
      title: "Replenishment van at the dock",
      detail: `${8 + Math.floor(rand() * 20)} cartons waiting. The driver needs a signature before he can leave.`,
      source: "Receiving",
      options: [
        {
          id: "unload-now",
          label: "Pull a packer off to unload now",
          outcome: "Stock lands and gets put away. Packing slows for ten minutes.",
          quality: 0.8,
          capabilities: ["decision-making", "systems-thinking"],
        },
        {
          id: "sign-hold",
          label: "Sign it and stage the cartons for later",
          outcome: "Driver leaves. The stock exists but nobody can find it yet.",
          quality: 0.45,
          capabilities: ["prioritization"],
        },
        {
          id: "wait",
          label: "Make him wait until the queue clears",
          outcome: "The dock is blocked and the supplier logs a delay against you.",
          quality: 0.2,
          capabilities: ["communication"],
        },
      ],
    }),
    onExpire: { note: "The driver left without unloading. The replenishment goes back." },
  },

  {
    id: "ops-cycle-count",
    stream: "operations",
    priority: "normal",
    weight: 11,
    cooldown: 120,
    ttl: 120,
    repeatable: true,
    build: ({ world, rand }) => {
      const item = maybePick(
        rand,
        world.inventory.filter((entry) => !entry.counted),
      );
      if (!item) return null;
      return {
        title: `Cycle count due on ${item.name}`,
        detail: `Last counted before the shift. System shows ${item.systemQty}, with ${item.reserved} committed to open orders.`,
        source: "Inventory schedule",
        options: [
          {
            id: "count-now",
            label: "Count it now",
            outcome: "Costs a picker four minutes and settles the number.",
            quality: 0.85,
            capabilities: ["curiosity", "systems-thinking"],
            effects: [{ kind: "count-sku", sku: item.sku }],
          },
          {
            id: "defer",
            label: "Push it to the next shift",
            outcome: "Nothing breaks now. Nothing is learned either.",
            quality: 0.5,
            capabilities: ["prioritization"],
          },
          {
            id: "skip",
            label: "Mark it counted without counting",
            outcome: "The schedule looks clean. The shelf does not care.",
            quality: 0.05,
            capabilities: ["ownership"],
          },
        ],
      };
    },
    onExpire: { note: "The count slipped. The number stays unverified." },
  },

  {
    id: "ops-stock-threshold",
    stream: "operations",
    priority: "critical",
    weight: 9,
    cooldown: 90,
    ttl: 70,
    repeatable: true,
    when: (world) => lowStock(world).length > 0,
    build: ({ world, rand }) => {
      const item = maybePick(rand, lowStock(world));
      if (!item) return null;
      const cover = item.systemQty - item.reserved;
      return {
        title: `${item.name} is down to ${Math.max(0, cover)} units of cover`,
        detail: `${item.reserved} units are already committed to open orders. Orders containing it keep arriving.`,
        source: "Inventory alert",
        options: [
          {
            id: "replenish",
            label: "Request an emergency replenishment",
            outcome: "Ten minutes from the mother warehouse if the van is loaded.",
            quality: 0.85,
            capabilities: ["decision-making", "systems-thinking"],
            effects: [{ kind: "replenish-sku", sku: item.sku }],
          },
          {
            id: "block",
            label: "Block it so no new orders take it",
            outcome: "You stop the bleeding and lose the sales.",
            quality: 0.7,
            capabilities: ["prioritization", "customer-thinking"],
            effects: [{ kind: "block-sku", sku: item.sku }],
          },
          {
            id: "ride-it",
            label: "Ride it out and hope",
            outcome: "Cheapest option right now. Most expensive in twenty minutes.",
            quality: 0.15,
            capabilities: ["stress-handling"],
          },
        ],
      };
    },
    onExpire: {
      note: "It sold out. Orders containing it cannot be completed.",
      cascades: ["cust-substitution"],
    },
  },

  {
    id: "ops-dispatch-stall",
    stream: "operations",
    priority: "critical",
    weight: 8,
    cooldown: 100,
    ttl: 60,
    repeatable: true,
    when: (world) =>
      world.orders.filter((order) => order.status === "packed").length >= 3 &&
      world.riders.filter((rider) => rider.status === "idle").length === 0,
    build: ({ world }) => {
      const packed = world.orders.filter((order) => order.status === "packed").length;
      const returning = world.riders.find((rider) => rider.status === "returning");
      return {
        title: `${packed} packed orders and no rider on the pad`,
        detail: "Everything is bagged and going cold on the dispatch bench.",
        source: "Dispatch",
        options: [
          {
            id: "recall-returning",
            label: "Turn a returning rider around early",
            outcome: "One rider skips their break. Two orders go out now.",
            quality: 0.8,
            capabilities: ["decision-making", "prioritization"],
            effects: returning
              ? [{ kind: "rider-status", riderId: returning.id, status: "idle" }]
              : [],
          },
          {
            id: "throttle",
            label: "Throttle intake until riders catch up",
            outcome: "Fewer promises made. Fewer promises broken.",
            quality: 0.75,
            capabilities: ["systems-thinking", "decision-making"],
            effects: [{ kind: "throttle", status: "throttled" }],
          },
          {
            id: "wait-it-out",
            label: "Let the bench build",
            outcome: "Riders return eventually. The promises do not.",
            quality: 0.2,
            capabilities: ["stress-handling"],
          },
        ],
      };
    },
    onExpire: {
      note: "The bench kept building. Several orders went cold.",
      effects: [{ kind: "rating", delta: -0.03 }],
    },
  },

  {
    id: "ops-cold-chain",
    stream: "operations",
    priority: "critical",
    weight: 5,
    cooldown: 300,
    ttl: 55,
    build: () => ({
      title: "Chiller door on bay 3 has been open too long",
      detail: "The sensor has tripped. Dairy and frozen are the exposure.",
      source: "Cold chain sensor",
      options: [
        {
          id: "close-and-check",
          label: "Close it and pull the affected stock for check",
          outcome: "You lose a few units and keep the rest sellable.",
          quality: 0.9,
          capabilities: ["ownership", "systems-thinking"],
          effects: [{ kind: "cold-chain-loss", units: 2 }],
        },
        {
          id: "close-only",
          label: "Just get it shut",
          outcome: "Alarm clears. Nobody knows what was compromised.",
          quality: 0.4,
          capabilities: ["decision-making"],
        },
        {
          id: "silence",
          label: "Silence the alarm, deal with it after the peak",
          outcome: "The peak lasts an hour. So does the exposure.",
          quality: 0.05,
          capabilities: ["ownership"],
          effects: [{ kind: "cold-chain-loss", units: 6 }],
        },
      ],
    }),
    onExpire: {
      note: "The door stayed open. Cold chain stock is compromised and unrecorded.",
      effects: [{ kind: "cold-chain-loss", units: 5 }],
    },
  },

  {
    id: "ops-packing-backlog",
    stream: "operations",
    priority: "high",
    weight: 8,
    cooldown: 130,
    ttl: 80,
    build: (ctx) => {
      const picker = pickFree(ctx, activePickers(ctx.world));
      if (!picker) return null;
      return {
        title: "Packing bench is falling behind the pick face",
        detail: "Baskets are stacking up faster than two packers can bag them.",
        source: "Packing",
        subjectId: picker.id,
        options: [
          {
            id: "move-picker",
            label: `Move ${picker.name} to packing for ten minutes`,
            outcome: "Bench clears. Picking slows while they are away.",
            quality: 0.8,
            capabilities: ["decision-making", "systems-thinking"],
          },
          {
            id: "batch",
            label: "Batch same-zone orders to cut handling",
            outcome: "Less walking per basket. Takes a minute to set up.",
            quality: 0.85,
            capabilities: ["systems-thinking", "learning-agility"],
          },
          {
            id: "leave",
            label: "Leave it — the pick face matters more",
            outcome: "Defensible. The bottleneck just moves downstream.",
            quality: 0.4,
            capabilities: ["prioritization"],
          },
        ],
      };
    },
    onExpire: { note: "The bench stayed backed up and dispatch slipped." },
  },

  {
    id: "ops-quality-damage",
    stream: "operations",
    priority: "normal",
    weight: 9,
    cooldown: 160,
    ttl: 100,
    build: ({ world, rand }) => {
      const item = maybePick(rand, world.inventory);
      if (!item) return null;
      return {
        title: `Damaged carton found — ${item.name}`,
        detail: "Outer packaging is crushed. Contents look intact but unverified.",
        source: "Quality check",
        options: [
          {
            id: "quarantine",
            label: "Quarantine and log it against the supplier",
            outcome: "Right answer, and the claim is recoverable.",
            quality: 0.9,
            capabilities: ["ownership", "systems-thinking"],
          },
          {
            id: "sell-through",
            label: "Put it out anyway",
            outcome: "Saves the units. Risks a customer opening it.",
            quality: 0.25,
            capabilities: ["customer-thinking"],
            effects: [{ kind: "rating", delta: -0.015 }],
          },
          {
            id: "discard",
            label: "Bin it and move on",
            outcome: "Fast and safe. The supplier never pays for it.",
            quality: 0.55,
            capabilities: ["decision-making"],
          },
        ],
      };
    },
    onExpire: { note: "The carton went out unchecked." },
  },

  {
    id: "ops-safety-check",
    stream: "operations",
    priority: "normal",
    weight: 10,
    cooldown: 200,
    ttl: 130,
    build: () => ({
      title: "Hourly safety walk is due",
      detail: "Aisle obstructions, spill check, fire exits, ladder storage.",
      source: "Safety schedule",
      options: [
        {
          id: "walk-now",
          label: "Do the walk yourself",
          outcome: "Four minutes off the floor. You see two things you would have missed.",
          quality: 0.8,
          capabilities: ["ownership", "curiosity"],
        },
        {
          id: "delegate",
          label: "Ask the shift lead to do it",
          outcome: "Gets done. You did not see the floor for yourself.",
          quality: 0.7,
          capabilities: ["decision-making", "communication"],
        },
        {
          id: "tick",
          label: "Tick it and carry on",
          outcome: "The checklist is complete. The aisles are not.",
          quality: 0.05,
          capabilities: ["ownership"],
        },
      ],
    }),
    onExpire: { note: "The safety walk was missed. It is on the record." },
  },

  {
    id: "ops-batching",
    stream: "operations",
    priority: "normal",
    weight: 8,
    cooldown: 140,
    ttl: 90,
    when: (world) => openOrdersIn(world).length >= 6,
    build: ({ world }) => ({
      title: "Several orders are pulling from the same aisle",
      detail: `${openOrdersIn(world).length} orders open. A batch would cut the walking on four of them.`,
      source: "Pick planning",
      options: [
        {
          id: "batch-them",
          label: "Batch the overlapping orders",
          outcome: "One trip instead of four. Slightly more complex to pack.",
          quality: 0.9,
          capabilities: ["systems-thinking", "learning-agility"],
        },
        {
          id: "keep-single",
          label: "Keep them single-pick",
          outcome: "Simpler, slower, and safer under pressure.",
          quality: 0.5,
          capabilities: ["decision-making"],
        },
      ],
    }),
    onExpire: { note: "The batching window closed." },
  },

  {
    id: "ops-equipment-check",
    stream: "operations",
    priority: "normal",
    weight: 7,
    cooldown: 240,
    ttl: 140,
    build: () => ({
      title: "Weighing scale calibration reminder",
      detail: "Overdue by two days. Out-of-tolerance scales mean wrong weights on every dispatch.",
      source: "Equipment log",
      options: [
        {
          id: "calibrate",
          label: "Calibrate it now",
          outcome: "Three minutes. Every weight after this is trustworthy.",
          quality: 0.8,
          capabilities: ["ownership", "systems-thinking"],
        },
        {
          id: "next-shift",
          label: "Book it for the next shift",
          outcome: "Reasonable. Somebody else's problem for another eight hours.",
          quality: 0.55,
          capabilities: ["prioritization"],
        },
      ],
    }),
    onExpire: { note: "Calibration slipped again." },
  },

  {
    id: "ops-putaway-backlog",
    stream: "operations",
    priority: "high",
    weight: 8,
    cooldown: 170,
    ttl: 95,
    build: () => ({
      title: "Putaway backlog at the receiving door",
      detail: "Cartons are on the floor, not in bins. The system counts them as available.",
      source: "Receiving",
      options: [
        {
          id: "clear-now",
          label: "Clear the putaway before anything else",
          outcome: "Stock becomes findable. Costs you a picker for a while.",
          quality: 0.85,
          capabilities: ["systems-thinking", "decision-making"],
        },
        {
          id: "partial",
          label: "Put away only the fast movers",
          outcome: "Most of the value, a fraction of the time.",
          quality: 0.9,
          capabilities: ["prioritization", "systems-thinking"],
        },
        {
          id: "later",
          label: "Leave it for the next shift",
          outcome: "Pickers will keep reporting stockouts on stock you own.",
          quality: 0.2,
          capabilities: ["ownership"],
        },
      ],
    }),
    onExpire: {
      note: "The cartons stayed on the floor. Phantom stock in the system.",
      cascades: ["ops-item-not-found"],
    },
  },

  {
    id: "ops-mispick",
    stream: "operations",
    priority: "high",
    weight: 9,
    cooldown: 200,
    ttl: 70,
    build: (ctx) => {
      const order = pickFree(ctx, openOrdersIn(ctx.world));
      if (!order) return null;
      return {
        title: `Wrong item caught at dispatch on ${order.code}`,
        detail: "The bag has someone else's shampoo in it. It has not left the store yet.",
        source: "Dispatch check",
        subjectId: order.id,
        options: [
          {
            id: "fix-now",
            label: "Hold it and correct the bag",
            outcome: "Two minutes, and the customer never finds out it happened.",
            quality: 0.85,
            capabilities: ["ownership", "customer-thinking"],
          },
          {
            id: "fix-and-trace",
            label: "Correct it, then find out which station packed it",
            outcome: "Fixes the bag and the cause. Costs you four minutes.",
            quality: 0.95,
            capabilities: ["systems-thinking", "curiosity"],
          },
          {
            id: "send-anyway",
            label: "Send it — she can request a return",
            outcome: "Saves two minutes now and costs a rider trip later.",
            quality: 0.1,
            capabilities: ["customer-thinking"],
            effects: [{ kind: "rating", delta: -0.025 }],
          },
        ],
      };
    },
    onExpire: {
      note: "It went out with the wrong item in it.",
      effects: [{ kind: "rating", delta: -0.025 }],
    },
  },

  {
    id: "ops-temperature-log",
    stream: "operations",
    priority: "normal",
    weight: 9,
    cooldown: 260,
    ttl: 130,
    build: () => ({
      title: "Chiller temperature log is due",
      detail: "Four units, read and signed every two hours. Environmental health checks these first.",
      source: "Cold chain log",
      options: [
        {
          id: "read-all",
          label: "Read all four and sign",
          outcome: "Three minutes. One of them is drifting, which you now know.",
          quality: 0.9,
          capabilities: ["ownership", "curiosity"],
        },
        {
          id: "copy-last",
          label: "Copy the last reading forward",
          outcome: "The log looks complete. The drifting unit keeps drifting.",
          quality: 0,
          capabilities: ["ownership"],
        },
        {
          id: "delegate",
          label: "Ask the packer to do the round",
          outcome: "Gets done by someone who is already near the chillers.",
          quality: 0.8,
          capabilities: ["prioritization", "decision-making"],
        },
      ],
    }),
    onExpire: { note: "The temperature log has a two-hour gap in it." },
  },

  {
    id: "ops-slotting",
    stream: "operations",
    priority: "normal",
    weight: 8,
    cooldown: 300,
    ttl: 120,
    build: ({ world, rand }) => {
      const item = maybePick(rand, world.inventory);
      if (!item) return null;
      return {
        title: `${item.name} is your fastest mover and it is in the back aisle`,
        detail: "Every order containing it adds a forty-metre round trip to the pick.",
        source: "Pick planning",
        options: [
          {
            id: "move-now",
            label: "Move it to the front bay now",
            outcome: "Ten minutes of disruption, then every pick after it is shorter.",
            quality: 0.9,
            capabilities: ["systems-thinking", "decision-making"],
          },
          {
            id: "next-quiet",
            label: "Move it in the next quiet window",
            outcome: "Sensible, if a quiet window arrives.",
            quality: 0.7,
            capabilities: ["prioritization"],
          },
          {
            id: "leave",
            label: "Leave it — the layout is not yours to change",
            outcome: "True, and the walking cost is yours either way.",
            quality: 0.3,
            capabilities: ["ownership"],
          },
        ],
      };
    },
    onExpire: { note: "The slotting problem stays, and so does the walking." },
  },

  {
    id: "ops-returns",
    stream: "operations",
    priority: "normal",
    weight: 8,
    cooldown: 220,
    ttl: 110,
    build: () => ({
      title: "A rider has brought back a refused order",
      detail: "Chilled items, out of the store for twenty minutes. It needs a decision before it goes anywhere.",
      source: "Returns",
      options: [
        {
          id: "dispose",
          label: "Write it off and log the reason",
          outcome: "Costs the order value. It is the only defensible call on cold stock.",
          quality: 0.9,
          capabilities: ["ownership", "decision-making"],
        },
        {
          id: "restock",
          label: "Put it back on the shelf",
          outcome: "Saves the value. Sells someone temperature-abused dairy.",
          quality: 0,
          capabilities: ["ownership", "customer-thinking"],
        },
        {
          id: "ask",
          label: "Ask the inventory lead what the policy is",
          outcome: "Costs a minute and gets you the right answer with a witness.",
          quality: 0.8,
          capabilities: ["curiosity", "communication"],
        },
      ],
    }),
    onExpire: { note: "The returned crate sat in the aisle unresolved." },
  },

  {
    id: "ops-fire-exit",
    stream: "operations",
    priority: "critical",
    weight: 6,
    cooldown: 400,
    ttl: 55,
    build: () => ({
      title: "A pallet is blocking the rear fire exit",
      detail: "Receiving left it there during the last delivery. The door will not open past it.",
      source: "Safety",
      options: [
        {
          id: "clear-now",
          label: "Stop and clear it now",
          outcome: "Costs you two people for five minutes. Not a decision anyone will question.",
          quality: 0.95,
          capabilities: ["ownership", "decision-making"],
        },
        {
          id: "after-peak",
          label: "Clear it after the peak",
          outcome: "The peak lasts twenty minutes. So does the blocked exit.",
          quality: 0.05,
          capabilities: ["ownership", "prioritization"],
        },
      ],
    }),
    onExpire: {
      note: "The fire exit stayed blocked for the rest of the shift.",
      effects: [{ kind: "rating", delta: -0.01 }],
    },
  },

  {
    id: "ops-label-printer",
    stream: "operations",
    priority: "high",
    weight: 8,
    cooldown: 240,
    ttl: 80,
    build: () => ({
      title: "Label printer at packing has jammed",
      detail: "Nothing can be dispatched without a label. Two people are standing there.",
      source: "Packing",
      options: [
        {
          id: "clear-jam",
          label: "Clear it yourself",
          outcome: "Ninety seconds if the jam is simple, ten minutes if it is not.",
          quality: 0.8,
          capabilities: ["ownership", "decision-making"],
        },
        {
          id: "spare",
          label: "Switch to the spare printer at goods-in",
          outcome: "Packing walks further per order, but nothing stops.",
          quality: 0.9,
          capabilities: ["systems-thinking", "decision-making"],
        },
        {
          id: "handwrite",
          label: "Handwrite labels until it is fixed",
          outcome: "Slow, and handwritten labels are how orders go to the wrong address.",
          quality: 0.3,
          capabilities: ["stress-handling"],
        },
      ],
    }),
    onExpire: {
      note: "Dispatch was stopped for several minutes waiting on labels.",
      effects: [{ kind: "rating", delta: -0.02 }],
    },
  },

  {
    id: "ops-expiry-sweep",
    stream: "operations",
    priority: "normal",
    weight: 9,
    cooldown: 280,
    ttl: 125,
    build: ({ world, rand }) => {
      const item = maybePick(
        rand,
        world.inventory.filter((entry) => entry.category === "Fresh" || entry.category === "Cold chain"),
      );
      if (!item) return null;
      return {
        title: `${item.name} goes out of date tonight`,
        detail: "Roughly a dozen units. They are still perfectly sellable this morning.",
        source: "Date check",
        options: [
          {
            id: "markdown",
            label: "Mark them down and move them to the front",
            outcome: "Recovers most of the value and they leave the store today.",
            quality: 0.9,
            capabilities: ["systems-thinking", "decision-making"],
          },
          {
            id: "pull",
            label: "Pull them now",
            outcome: "Zero risk, zero recovery. Defensible on a busy morning.",
            quality: 0.6,
            capabilities: ["decision-making"],
          },
          {
            id: "leave",
            label: "Leave them at full price",
            outcome: "You will be writing all twelve off at ten tonight.",
            quality: 0.25,
            capabilities: ["ownership"],
          },
        ],
      };
    },
    onExpire: { note: "The near-date stock stayed at full price and did not move." },
  },

  {
    id: "ops-shrink-pattern",
    stream: "operations",
    priority: "high",
    weight: 7,
    cooldown: 320,
    ttl: 100,
    build: () => ({
      title: "Personal care has shown negative variance three weeks running",
      detail: "Small, consistent, and always the same two shelves. That pattern is not miscounting.",
      source: "Loss prevention",
      options: [
        {
          id: "escalate-evidence",
          label: "Gather the counts and escalate with evidence",
          outcome: "Slow, correct, and the only version that survives scrutiny.",
          quality: 0.95,
          capabilities: ["systems-thinking", "ownership", "communication"],
        },
        {
          id: "accuse",
          label: "Raise it with the team on shift",
          outcome: "Everyone on that shift now knows they are suspected. Including whoever is innocent.",
          quality: 0.1,
          capabilities: ["communication", "ownership"],
        },
        {
          id: "watch",
          label: "Count those shelves daily for a week first",
          outcome: "Turns a suspicion into a fact before anyone is named.",
          quality: 0.9,
          capabilities: ["curiosity", "systems-thinking"],
        },
      ],
    }),
    onExpire: { note: "The variance pattern went unexamined for another week." },
  },
];
