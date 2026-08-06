export interface GlossaryTerm {
  id: string;
  term: string;
  /** One line, in the tooltip. */
  short: string;
  /** The plain explanation, in the modal. */
  explanation: string;
  /** Concrete, from this hub. */
  example: string;
  /** Why anyone outside this shift cares. */
  realWorld: string;
}

/**
 * Every unfamiliar word on the floor is clickable. Operators should never have
 * to pretend they know what something means.
 */
export const GLOSSARY: Record<string, GlossaryTerm> = {
  otif: {
    id: "otif",
    term: "OTIF",
    short: "On Time In Full — orders delivered complete and on time.",
    explanation:
      "The share of orders that arrived both on time and with everything the customer asked for. Missing one item makes an order not in full, even if it arrived early. Being three minutes late makes it not on time, even if every item is there.",
    example:
      "You have delivered 24 orders this shift and 3 arrived after their promised time. OTIF is 21 of 24, or 87%.",
    realWorld:
      "OTIF is the headline number quick-commerce and retail supply chains are run on, because it is the only metric that refuses to let a business trade completeness for speed. A hub that hits 99% on time by shipping half-empty baskets still has bad OTIF.",
  },
  shrinkage: {
    id: "shrinkage",
    term: "Shrinkage",
    short: "Stock the system thinks you have but the shelf does not.",
    explanation:
      "The gap between recorded inventory and physical inventory. It comes from theft, damage, spoilage, miscounts at receiving, and items scanned wrong on the way out. Shrinkage is not one problem — it is the name for the whole family of them.",
    example:
      "The system says 14 units of Full Cream Milk. The shelf has none. That 14-unit gap is shrinkage, and until somebody counts, every picker sent for milk wastes a trip.",
    realWorld:
      "Grocery retail typically runs 1–3% shrinkage on revenue, and in fresh and cold chain it goes higher. It is one of the few costs that is invisible until someone physically looks.",
  },
  picker: {
    id: "picker",
    term: "Picker",
    short: "The person who walks the aisles and assembles an order.",
    explanation:
      "A picker takes an order, walks the store collecting each item, and hands it off to be packed. In a ten-minute hub their walking route is the single biggest driver of how fast an order moves — which is why shelf layout matters more than software.",
    example:
      "You have five pickers rostered. Two did not show. The three left have to absorb the whole morning's queue between them.",
    realWorld:
      "Picking is 50–70% of the labour cost in a fulfilment operation. Every design decision in a dark store — layout, batching, slotting — exists to make picking shorter.",
  },
  putaway: {
    id: "putaway",
    term: "Putaway",
    short: "Getting delivered stock onto the right shelf.",
    explanation:
      "When a replenishment van arrives, someone has to move each carton to its home location and record it. Putaway is unglamorous and easy to defer when the floor is busy — and deferring it is how stock becomes findable only by the person who stacked it.",
    example:
      "If the milk replenishment lands and nobody does putaway, the system will show stock while the cartons sit at the receiving door and pickers keep reporting a stockout.",
    realWorld:
      "Bad putaway is one of the most common root causes of inventory mismatch. The stock exists; the location record does not.",
  },
  "cycle-count": {
    id: "cycle-count",
    term: "Cycle count",
    short: "Counting a few SKUs now instead of everything later.",
    explanation:
      "Rather than shutting down to count the whole store, you count a small set of items while operating. It costs a picker a few minutes and it tells you the truth about those items — which is often the cheapest way to end an argument between the shelf and the system.",
    example:
      "Six SKUs are flagged as mismatched. Counting the two with open orders against them settles what you can actually promise customers right now.",
    realWorld:
      "Continuous cycle counting has largely replaced annual stocktakes in modern warehouses, because a small correct number today is worth more than a complete number in March.",
  },
  "dark-store": {
    id: "dark-store",
    term: "Dark store",
    short: "A retail-format warehouse closed to the public.",
    explanation:
      "A small store laid out like a shop but with no customers inside — everything is picked by staff for delivery. Laid out for walking speed rather than browsing, and sited to reach a delivery radius in minutes.",
    example: "Dark Store 114 in Indiranagar serves roughly a three-kilometre radius.",
    realWorld:
      "The dark store is the unit of economics that made ten-minute delivery possible. Whether it is profitable depends almost entirely on orders per hour per store.",
  },
  breach: {
    id: "breach",
    term: "Breach",
    short: "An order that has passed the time you promised the customer.",
    explanation:
      "The moment an order crosses its promised delivery time it is breached, whether or not it has left the building. A breach is not recoverable — you can only decide how badly it ends.",
    example:
      "Order #4412 was promised in ten minutes and is now at eleven. It is breached even though the rider is two minutes away.",
    realWorld:
      "Promise-time breaches drive both refund cost and churn. Most operators track time-to-breach on the open queue, not breaches after the fact, because only the first is actionable.",
  },
  "pick-path": {
    id: "pick-path",
    term: "Pick path",
    short: "The route a picker walks to collect one order.",
    explanation:
      "The sequence of locations a picker visits. A good pick path never doubles back. Fast-moving items sit near the packing station, and items commonly bought together sit near each other.",
    example:
      "An order with milk, spinach and dog food sends one picker across three zones — three times the walking of an order from a single aisle.",
    realWorld:
      "Optimising pick paths and slotting is where warehouses find their largest labour savings without hiring anyone.",
  },
  stockout: {
    id: "stockout",
    term: "Stockout",
    short: "An item a customer wants that you do not have.",
    explanation:
      "Zero sellable units of a SKU. A stockout costs you the item's margin, and often the whole basket when the customer cancels. A stockout the system does not know about is worse, because you keep accepting orders for it.",
    example:
      "Full Cream Milk is out on the shelf but shows 14 in the system, so orders containing it keep arriving.",
    realWorld:
      "Roughly a third of shoppers who hit a stockout buy the item from a competitor rather than substitute. It is a churn event, not just a lost sale.",
  },
  replenishment: {
    id: "replenishment",
    term: "Replenishment",
    short: "Restocking the hub from the larger warehouse upstream.",
    explanation:
      "Requesting stock from the mother warehouse to refill the hub. It is not instant — the van has to be loaded, driven and put away, which is usually the difference between fixing a stockout this hour and fixing it this afternoon.",
    example: "You request milk at 09:39; realistically it is on the shelf after 09:55.",
    realWorld:
      "Replenishment lead time is the constraint that decides how much buffer stock a hub must hold, and therefore how much cash is tied up in it.",
  },
  throttle: {
    id: "throttle",
    term: "Throttling",
    short: "Deliberately accepting fewer orders to protect the ones you have.",
    explanation:
      "Turning down or switching off intake so the floor can clear its backlog. It costs revenue and it is visible to customers, but it stops a queue that is already breaching from breaching further.",
    example:
      "With 28 open orders and three pickers, throttling for ten minutes may save more promises than it loses.",
    realWorld:
      "Every quick-commerce platform has a version of this — surge pricing, extended promise times, or hiding the store. Choosing when to use it is one of the clearest tests of an operator's judgement.",
  },
  "cold-chain": {
    id: "cold-chain",
    term: "Cold chain",
    short: "Goods that must stay refrigerated end to end.",
    explanation:
      "Dairy, meat and frozen items that spoil if they leave their temperature range at any point — in the chiller, during picking, or in a rider's bag. Once broken, the damage is not visible and not reversible.",
    example:
      "A chiller door left open on bay 3 quietly costs you units that still read as sellable in the system.",
    realWorld:
      "Cold chain failures are both a margin problem and a food safety one, which is why they are usually the most heavily monitored part of a grocery operation.",
  },
  backlog: {
    id: "backlog",
    term: "Backlog",
    short: "Orders accepted but not yet out of the door.",
    explanation:
      "Everything queued, being picked, or packed and waiting for a rider. Backlog is the number that predicts your next hour: if it is growing, the breaches have already been decided, they just have not happened yet.",
    example:
      "Backlog climbing from 12 to 26 in twenty minutes means the floor is taking in more than it can push out.",
    realWorld:
      "In any queueing system, watching the queue length is more useful than watching the completion rate. The queue tells you the future; completions tell you the past.",
  },
};

export const GLOSSARY_IDS = Object.keys(GLOSSARY);

export function getTerm(id: string): GlossaryTerm | undefined {
  return GLOSSARY[id];
}
