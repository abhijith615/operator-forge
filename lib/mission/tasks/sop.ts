import type { TaskTemplate } from "./types";

/**
 * The fifteen.
 *
 * `SOP.md` sets out fifteen high-stakes simulations for a dark store manager,
 * each one an acute situation with four courses of action, exactly one of which
 * a strong operator takes, and a weighted rubric saying what the choice is
 * evidence of. They are the backbone of the trial shift: the rest of the
 * catalogue is texture around them, because a shift made only of set pieces
 * stops reading as a job and a shift made only of texture stops reading as a
 * test.
 *
 * Three things are carried over from the document exactly, because changing
 * them would change what is being measured:
 *
 *  - **The optimal option.** Each scenario's rubric names one. It scores 0.95
 *    here. The others are graded by how much of the rubric they miss, not by
 *    how obviously wrong they look — the plausible wrong answer is the whole
 *    point, and several of these are the thing a real manager under pressure
 *    actually does.
 *  - **The rubric's weights.** Each parameter maps to the capability it is
 *    evidence for, heaviest first, so the genome reads the scenario the way the
 *    document scores it.
 *  - **The escalation.** Every one of these ends with somebody senior on the
 *    phone wanting a decision now. That line is the task's `detail`, and the
 *    caller is its `source`, because the pressure in these scenarios is as much
 *    about who is waiting as about what is broken.
 *
 * Options are authored in the document's A–D order. The scheduler shuffles them
 * on the way to the screen — see `shuffleOptions` — so the position of the
 * right answer carries no information.
 *
 * Times of day in the source range across a whole trading day. The trial shift
 * is fifteen minutes of one morning, so the clock references are dropped rather
 * than contradicted; everything else is the scenario as written.
 */
export const SOP_TASKS: TaskTemplate[] = [
  /* ── Inventory ────────────────────────────────────────────────────────── */

  {
    id: "sop-barcode-corruption",
    stream: "operations",
    priority: "critical",
    weight: 44,
    cooldown: 10_000,
    ttl: 115,
    build: () => ({
      title: "Milk barcodes are rejecting on every handheld",
      detail:
        "420 units came in with a transposed digit in the printed EAN-13. Pickers are stuck in Aisle 1 and 42 orders are stacking up. Manual entry is blocked by central security policy. City Ops Head: “Click-to-dispatch is at 7.8 minutes. At 8.0 the load balancer shuts your store off the app. Your decision, now.”",
      source: "City Operations Head",
      options: [
        {
          id: "pause-and-relabel",
          label: "Pause the store for fifteen minutes and re-label all 420 cartons",
          outcome:
            "Correct in the end, and fifteen minutes of closure during the peak is the one thing the SLA cannot absorb.",
          quality: 0.45,
          capabilities: ["systems-thinking", "decision-making"],
          effects: [{ kind: "throttle", status: "closed" }],
        },
        {
          id: "nil-pick",
          label: "Have pickers mark the milk “damaged/nil pick” and dispatch the orders short",
          outcome:
            "The queue clears and 42 customers get a partial order and a refund voucher. The stock was on the shelf the whole time.",
          quality: 0.2,
          capabilities: ["prioritization"],
          effects: [{ kind: "rating", delta: -0.25 }],
        },
        {
          id: "packing-override",
          label:
            "Batch-pick without scanning, verify at packing against printed legacy barcodes, re-label during lulls",
          outcome:
            "Flow holds, no order goes out short, and the catalogue error gets fixed at the second checkpoint instead of on the aisle.",
          quality: 0.95,
          capabilities: [
            "prioritization",
            "customer-thinking",
            "systems-thinking",
            "stress-handling",
          ],
          effects: [{ kind: "count-sku", sku: "CHL-4101" }],
        },
        {
          id: "cancel-and-deactivate",
          label: "Cancel every affected order and deactivate the dairy category until a replacement arrives",
          outcome:
            "You have solved a labelling problem by removing your highest-volume category on a weekday morning.",
          quality: 0.1,
          capabilities: ["decision-making"],
          effects: [{ kind: "rating", delta: -0.4 }],
        },
      ],
    }),
    onExpire: {
      note: "Click-to-dispatch crossed 8.0 minutes. The load balancer took the store off the app.",
      effects: [{ kind: "throttle", status: "closed" }],
    },
  },

  {
    id: "sop-shelf-life-blockade",
    stream: "operations",
    priority: "high",
    weight: 40,
    cooldown: 10_000,
    ttl: 110,
    build: () => ({
      title: "Vendor truck blocking the dock over a rejected yogurt line",
      detail:
        "400 units of Greek yogurt at 35% remaining shelf life against a mandatory 70% threshold. The driver refuses a partial rejection and has parked across the only inbound dock, holding up a line-haul. Demurrage is running at ₹5,000 every fifteen minutes. Regional Category Manager: “That line is on the app home banner today. Sign the waiver or give me your alternative.”",
      source: "Regional Category Manager",
      options: [
        {
          id: "sign-waiver",
          label: "Sign the shelf-life waiver and inward the whole shipment",
          outcome:
            "The banner stays funded. In four days it is spoilage complaints, and your signature is on the exception.",
          quality: 0.15,
          capabilities: ["decision-making"],
          effects: [{ kind: "rating", delta: -0.2 }],
        },
        {
          id: "gate-reject-all",
          label: "Gate-reject the entire vehicle and have the truck towed off the dock",
          outcome:
            "Food safety holds. So does the dairy stockout, and you have thrown away compliant butter and paneer with it.",
          quality: 0.5,
          capabilities: ["ownership", "stress-handling"],
        },
        {
          id: "partial-reject",
          label:
            "Unload the compliant butter and paneer, formally reject the yogurt, move the truck to the holding area, escalate to the vendor's logistics director",
          outcome:
            "Dock clears, the compliant stock lands, the rejection is documented, and the commercial pressure goes to the people who can actually settle it.",
          quality: 0.95,
          capabilities: ["ownership", "prioritization", "communication", "decision-making"],
        },
        {
          id: "quarantine-transfer",
          label: "Take the yogurt into a quarantined bin and push it to a flagship store to sell within 48 hours",
          outcome:
            "You have not rejected short-dated stock, you have moved it to somebody else's shelf with your name on the transfer.",
          quality: 0.3,
          capabilities: ["systems-thinking"],
        },
      ],
    }),
    onExpire: {
      note: "The dock stayed blocked through the inbound window. Demurrage, and the line-haul turned back.",
    },
  },

  {
    id: "sop-high-value-shortage",
    stream: "management",
    priority: "critical",
    weight: 42,
    cooldown: 10_000,
    ttl: 110,
    build: () => ({
      title: "Eight smartwatches missing from the secure cage",
      detail:
        "Physical count finds zero units against a system record of eight — ₹24,000 unreconciled. Two were picked and dispatched this morning; the system still shows eight available and an order for one has just landed. Biometric access is limited to three people, but eight associates and two contractors worked the cage perimeter. Loss Prevention Head: “Unauthorised transfer, or an active theft issue on your shift? And what are you doing with that live order?”",
      source: "Internal Audit & Loss Prevention",
      options: [
        {
          id: "write-off",
          label: "Mark the order damaged, write the ₹24,000 off to shrinkage, raise it at the weekly meeting",
          outcome:
            "The shift ends, the stock does not come back, and whoever took it learns exactly how much they can take.",
          quality: 0.1,
          capabilities: ["decision-making"],
        },
        {
          id: "freeze-and-search",
          label:
            "Clear the order as item-not-found, freeze cage access, search the morning shift before 15:30, pull CCTV on access timestamps, file an asset incident report",
          outcome:
            "The order stops compounding, the stock cannot leave with the shift, and the investigation starts on evidence rather than suspicion.",
          quality: 0.95,
          capabilities: ["ownership", "prioritization", "curiosity", "communication"],
        },
        {
          id: "assume-misplaced",
          label: "Call it a stowing error, stow an empty carton to let the order clear, search the floor after closing",
          outcome:
            "You have falsified a pick to clear a queue and lost the only window in which the stock was still in the building.",
          quality: 0.05,
          capabilities: ["prioritization"],
          effects: [{ kind: "rating", delta: -0.2 }],
        },
        {
          id: "suspend-and-interrogate",
          label: "Hold the order, suspend all outbound picking, interview every associate one by one",
          outcome:
            "The whole floor stops for one bin, and informal interrogations are the fastest way to lose both the evidence and the team.",
          quality: 0.25,
          capabilities: ["curiosity", "stress-handling"],
        },
      ],
    }),
    onExpire: {
      note: "The shift went home before anything was secured. The cage discrepancy is now an audit finding.",
    },
  },

  /* ── People ───────────────────────────────────────────────────────────── */

  {
    id: "sop-wildcat-strike",
    stream: "people",
    priority: "critical",
    weight: 44,
    cooldown: 10_000,
    ttl: 110,
    build: () => ({
      title: "Riders have blocked the exit ramp and stopped taking orders",
      detail:
        "A packer and a delivery partner argued over a torn bag. Twenty-five riders have switched off their bikes and blocked the ramp; sixty packed bags are stacking on the staging tables, chilled and frozen among them. You have no authority over third-party riders. Fleet Director: “Eighty orders trapped, a hundred more in queue, and they are talking about union reps. Twelve minutes before auto-cancellation. Your plan?”",
      source: "Regional Logistics Fleet Director",
      options: [
        {
          id: "threaten-deactivation",
          label: "Threaten platform deactivation, have security clear the bikes, call the police",
          outcome:
            "A labour dispute becomes a public one, on camera, outside your store. The bags are still on the table.",
          quality: 0.05,
          capabilities: ["stress-handling"],
          effects: [{ kind: "rating", delta: -0.3 }],
        },
        {
          id: "de-escalate",
          label:
            "Pull the packer off the floor, go to the bay yourself, meet the rider lead and fleet coordinator, replace the bag without penalty, review CCTV after the peak, put supervisors on the backlog",
          outcome:
            "The source of the argument is gone, the people who can actually end the standoff are in it, and the cold stock comes off the table while you talk.",
          quality: 0.95,
          capabilities: ["stress-handling", "prioritization", "communication", "systems-thinking"],
        },
        {
          id: "close-and-divert",
          label: "Lock the gates, halt order processing, divert the queue to the store four km away",
          outcome:
            "Safe, and it concedes the evening. The sister store cannot absorb your peak and the standoff is unresolved tomorrow.",
          quality: 0.35,
          capabilities: ["decision-making"],
          effects: [{ kind: "throttle", status: "closed" }],
        },
        {
          id: "pay-cash",
          label: "Pay the protesting riders out of petty cash and write up the packer",
          outcome:
            "Deliveries resume in ten minutes and you have taught twenty-five people exactly how to stop your store again.",
          quality: 0.15,
          capabilities: ["decision-making"],
        },
      ],
    }),
    onExpire: {
      note: "Customer service began auto-cancelling. The staged chilled stock had been out for over fifteen minutes.",
      effects: [{ kind: "cold-chain-loss", units: 40 }],
    },
  },

  {
    id: "sop-absenteeism-cascade",
    stream: "people",
    priority: "critical",
    weight: 42,
    cooldown: 10_000,
    ttl: 115,
    build: () => ({
      title: "Seven of eighteen associates have shown up on a festival morning",
      detail:
        "A 61% absenteeism rate against a day projected at 3,200 orders. Four hundred pre-scheduled breakfast deliveries drop at 07:00. Agency cannot supply temps before 11:30, throttling needs central approval and carries a revenue penalty, and overtime is capped by statute. Staffing Partner: “How are you re-engineering this to avoid a total collapse in forty-five minutes?”",
      source: "City Staffing Partner",
      options: [
        {
          id: "push-harder",
          label: "Run the normal workflow with seven people at double speed and threaten the absentees with dismissal",
          outcome:
            "Pick errors climb, two people are unusable by ten, and the ones who did turn up remember being threatened.",
          quality: 0.05,
          capabilities: ["stress-handling"],
          effects: [{ kind: "worker-fatigue", workerId: "all-active", delta: 0.3 }],
        },
        {
          id: "throttle-and-rebuild",
          label:
            "Throttle intake 40% until 11:30, rebuild the seven into batch-pick (4 pick, 2 pack, 1 staging), suspend cycle counts and putaway, call the afternoon shift in two hours early on approved overtime",
          outcome:
            "Capacity is matched to the people in the building instead of the forecast, and the relief is already moving.",
          quality: 0.95,
          capabilities: ["decision-making", "systems-thinking", "learning-agility", "ownership"],
          effects: [{ kind: "throttle", status: "throttled" }],
        },
        {
          id: "dairy-only",
          label: "Suspend ambient and high-value fulfilment and run as a dairy and fresh node until relief arrives",
          outcome:
            "A defensible simplification that throws away the basket size on the busiest morning of the quarter.",
          quality: 0.45,
          capabilities: ["prioritization", "decision-making"],
        },
        {
          id: "riders-pack",
          label: "Put all seven on picking and let delivery riders pack and bag their own orders",
          outcome:
            "Unbadged, untrained people handling food on the pack bench. It is quick, and it is the finding that closes a store.",
          quality: 0.1,
          capabilities: ["decision-making"],
        },
      ],
    }),
    onExpire: {
      note: "The breakfast drop landed on seven people and the standard workflow. The queue never recovered.",
    },
  },

  {
    id: "sop-metric-gaming",
    stream: "people",
    priority: "high",
    weight: 40,
    cooldown: 10_000,
    ttl: 110,
    build: () => ({
      title: "Your fastest picker is faking nil-picks to protect their rate",
      detail:
        "Item-not-found has gone from 0.18% to 0.85% in a week. CCTV confirms your top picker — 165 UPH against a store average of 115 — scans the bin and flags “nil pick” whenever an item needs a step-ladder. Confronted, they say the afternoon shift walks out with them. That shift starts in an hour. HR Business Partner: “What actions are you taking right now?”",
      source: "HR Business Partner",
      options: [
        {
          id: "overlook",
          label: "Let it go to keep the evening shift intact",
          outcome:
            "Phantom stockouts keep corrupting the inventory record and demand forecast, and the whole floor now knows the rules are negotiable.",
          quality: 0.05,
          capabilities: ["stress-handling"],
        },
        {
          id: "terminate-on-spot",
          label: "Terminate on the spot, escort them out, tell the floor complaints will be met the same way",
          outcome:
            "The falsification stops. So does any chance of the walkout not happening, and you have skipped every step HR needs.",
          quality: 0.25,
          capabilities: ["ownership", "decision-making"],
        },
        {
          id: "reassign-and-document",
          label:
            "Name it as a compliance breach, move them to inbound under direct supervision for the shift, brief the afternoon leads on standards pre-shift, raise a formal written notice with HR after the shift",
          outcome:
            "The data stops being corrupted today, the floor is staffed tonight, and the record is clean enough to stand up later.",
          quality: 0.95,
          capabilities: ["ownership", "stress-handling", "decision-making", "communication"],
        },
        {
          id: "informal-promotion",
          label: "Offer them a shift-lead role to stop quietly and keep it off the record",
          outcome:
            "You have promoted the person who gamed the metric, and bought their silence with the job.",
          quality: 0.05,
          capabilities: ["communication"],
        },
      ],
    }),
    onExpire: {
      note: "Nothing was said before the shift change. The nil-pick rate held and the afternoon shift came in unbriefed.",
    },
  },

  /* ── Logical and critical thinking ────────────────────────────────────── */

  {
    id: "sop-phase-failure",
    stream: "operations",
    priority: "critical",
    weight: 44,
    cooldown: 10_000,
    ttl: 110,
    build: () => ({
      title: "Chiller down in 41°C heat and the generator will not pick up the circuit",
      detail:
        "The walk-in has gone from 3.8°C to 8.5°C in twenty minutes with ₹3,50,000 of dairy, poultry and produce inside; three freezers holding ₹1,20,000 are warming. HVAC is seventy-five minutes out. You have four insulated boxes, sixty gel pads, dry ice, and a sister store 2.8 km away with 30% spare capacity. Cluster Ops Head: “Unmanaged breach means total disposal under FSSAI. Your plan.”",
      source: "Cluster Operations Head",
      options: [
        {
          id: "wait-it-out",
          label: "Keep the doors shut to hold the cold and wait for the technician",
          outcome:
            "Seventy-five minutes above threshold. Everything in the room is legally unsellable by the time he parks.",
          quality: 0.1,
          capabilities: ["stress-handling"],
          effects: [{ kind: "cold-chain-loss", units: 120 }],
        },
        {
          id: "thermal-evacuation",
          label:
            "Pause chilled and frozen on the app, pack high-value frozen into insulated boxes with dry ice, van the bulk dairy to the sister store, seal the walk-in on the rest",
          outcome:
            "The most vulnerable, highest-value stock moves first, nothing compromised reaches a customer, and the network absorbs what you cannot hold.",
          quality: 0.95,
          capabilities: ["prioritization", "ownership", "systems-thinking", "decision-making"],
          effects: [{ kind: "throttle", status: "throttled" }],
        },
        {
          id: "flash-sale",
          label: "Run an 80% clearance flash sale to move the dairy and frozen before it spoils",
          outcome:
            "You have sold temperature-abused food to your own catchment, at speed, with a promotion attached to it.",
          quality: 0.05,
          capabilities: ["decision-making"],
          effects: [{ kind: "rating", delta: -0.5 }],
        },
        {
          id: "portable-ac",
          label: "Borrow portable air conditioners from the shops nearby and run them in on extension cords",
          outcome:
            "Domestic units cannot pull a walk-in down, and you have put trailing cables through a wet room on a failed phase.",
          quality: 0.1,
          capabilities: ["curiosity"],
        },
      ],
    }),
    onExpire: {
      note: "The breach went unmanaged past the hour. Under FSSAI the whole room is a disposal.",
      effects: [{ kind: "cold-chain-loss", units: 140 }],
    },
  },

  {
    id: "sop-routing-discrepancy",
    stream: "management",
    priority: "high",
    weight: 38,
    cooldown: 10_000,
    ttl: 110,
    build: () => ({
      title: "The line-haul on your dock belongs to the North Zone store",
      detail:
        "400 totes, ₹6,00,000, and the WMS returns “PO mismatch — document routing error”. The paper challan carries your facility ID; the electronic pallet IDs are North Zone's. The driver wants to unload and leave in twenty minutes. Receiving another store's goods breaks GST and the ledger; turning it away undocumented loses it in transit. Central Supply Chain Planning: “North Zone is stocking out. Are you receiving it or not?”",
      source: "Central Supply Chain Planning",
      options: [
        {
          id: "keep-it",
          label: "Inward it as a miscellaneous delivery and stow it for your own weekend",
          outcome:
            "Your weekend looks good. North Zone stocks out, and the tax invoice does not match anything in either ledger.",
          quality: 0.05,
          capabilities: ["decision-making"],
        },
        {
          id: "refuse-outright",
          label: "Endorse the challan “wrong facility”, send the driver away, return to normal receiving",
          outcome:
            "Correct on paper and ₹6 lakh is now moving with no owner and no destination confirmed.",
          quality: 0.45,
          capabilities: ["ownership"],
        },
        {
          id: "three-way-reroute",
          label:
            "Hold unloading, check pallet labels against the ASN, get Central Planning and the North Zone manager on a three-way, locate your own consignment, reroute the truck with valid paperwork",
          outcome:
            "The paperwork error is found rather than absorbed, the stock reaches the store that needs it, and both ledgers survive the audit.",
          quality: 0.95,
          capabilities: ["systems-thinking", "ownership", "curiosity", "communication"],
        },
        {
          id: "hold-hostage",
          label: "Unload it into staging and hold it until your own consignment is dispatched",
          outcome:
            "Leverage, in a network where the only thing you have actually blocked is another manager's morning.",
          quality: 0.15,
          capabilities: ["decision-making"],
        },
      ],
    }),
    onExpire: {
      note: "The driver left on his own schedule. Neither store can say where the consignment is.",
    },
  },

  {
    id: "sop-aisle-congestion",
    stream: "operations",
    priority: "high",
    weight: 38,
    cooldown: 10_000,
    ttl: 115,
    build: () => ({
      title: "450 new SKUs have strangled Aisle 2",
      detail:
        "A corporate assortment expansion put beauty, cosmetics and seasonal lines into the same 2,500 sq ft. Pick times have gone from 65 to 125 seconds and five or six pickers regularly jam the three-foot aisle. Walls cannot move without a multi-day shutdown and the catalogue cannot be trimmed — national vendor promotions. VP Operations: “Productivity is down 45%. The SKUs stay. Fix the aisle.”",
      source: "VP Operations",
      options: [
        {
          id: "shutdown-reshelf",
          label: "Shut the store for two days, pull every second shelving unit, halve capacity for width",
          outcome:
            "Two days of zero fulfilment and half the stock, to solve a problem that is about where things sit, not how much room there is.",
          quality: 0.1,
          capabilities: ["decision-making"],
        },
        {
          id: "reslot-and-zone",
          label:
            "Re-slot fast-moving oils and flour to end-caps and floor bays by packing, push slow lines into deep shelving, split the floor into two pick zones with consolidated packing",
          outcome:
            "Velocity-based slotting takes the traffic out of the aisle and zone picking stops pickers crossing each other. No wall moves.",
          quality: 0.95,
          capabilities: ["systems-thinking", "learning-agility", "prioritization", "decision-making"],
        },
        {
          id: "one-picker-rule",
          label: "One picker per aisle — everyone else queues outside Aisle 2",
          outcome:
            "The jam becomes a queue. The same pickers wait for the same aisle and the clock keeps running.",
          quality: 0.3,
          capabilities: ["prioritization"],
        },
        {
          id: "no-carts",
          label: "Leave the carts at the entrance and have pickers carry items by hand",
          outcome:
            "Fewer obstructions, many more trips. Pick times go up, not down, and the team is exhausted by noon.",
          quality: 0.2,
          capabilities: ["decision-making"],
          effects: [{ kind: "worker-fatigue", workerId: "all-active", delta: 0.2 }],
        },
      ],
    }),
    onExpire: {
      note: "The aisle stayed as it was. Dispatch queues are spilling into the street.",
    },
  },

  /* ── Time management ──────────────────────────────────────────────────── */

  {
    id: "sop-convergence",
    stream: "management",
    priority: "critical",
    weight: 44,
    cooldown: 10_000,
    ttl: 115,
    build: () => ({
      title: "An inspector, a broken-down truck and an executive's order, all at once",
      detail:
        "An FSSAI officer is at the counter wanting cold rooms, sanitation logs and medical files. A 3PL reefer has died across the only dock and wardens are threatening to tow. And an order from an executive in the catchment is eight minutes past SLA on a missing coffee SKU. The inspector cannot be left unescorted. City Ops Manager: “Fifteen minutes. How are you spending your staff and your attention?”",
      source: "City Operations Manager",
      options: [
        {
          id: "chase-the-order",
          label: "Find the executive's coffee yourself and hand-deliver it, then deal with the rest",
          outcome:
            "The store manager spent the inspection window walking an aisle for one order. The warden had the truck hooked up by then.",
          quality: 0.1,
          capabilities: ["customer-thinking"],
        },
        {
          id: "inspector-only",
          label: "Sit with the inspector for the full fifteen minutes and let the other two run",
          outcome:
            "Defensible and incomplete. The dock is towed, the escalation lands upstairs, and you delegated nothing.",
          quality: 0.35,
          capabilities: ["ownership"],
        },
        {
          id: "delegate-in-phases",
          label:
            "0–2 min: seat the officer with the Deputy and the compliance binder. 2–4: Inbound Supervisor and security on the truck and the warden. 4–7: Outbound Lead runs an approved substitution and a priority rider. 7–15: you take the inspector's walkthrough yourself",
          outcome:
            "Three problems, three owners, and the one that can close the store gets the store manager — in that order.",
          quality: 0.95,
          capabilities: ["prioritization", "ownership", "decision-making", "customer-thinking"],
        },
        {
          id: "refuse-entry",
          label: "Refuse the inspector entry until legal counsel arrives, put the floor on the truck and the order",
          outcome:
            "Non-cooperation is its own citation, and you have made an inspection into an incident.",
          quality: 0.05,
          capabilities: ["decision-making"],
        },
      ],
    }),
    onExpire: {
      note: "Fifteen minutes passed with nothing delegated. The truck was towed and the inspector logged non-cooperation.",
    },
  },

  {
    id: "sop-staging-backlog",
    stream: "operations",
    priority: "high",
    weight: 40,
    cooldown: 10_000,
    ttl: 110,
    build: () => ({
      title: "Forty-five minutes to clear a backlog before the evening surge",
      detail:
        "Printer failures have left 65 unpicked orders, 40 picked-but-unpacked totes across the stations, and tote drop-offs blocked so pickers cannot close routes. Eight pallets of beverages are still unstowed on the dock — and live on the app. Twelve associates, frustrated. GM Operations: “Fifty orders a minute at 18:00. Give me your exact forty-five-minute recovery schedule.”",
      source: "GM Operations",
      options: [
        {
          id: "all-on-stow",
          label: "Put all twelve on stowing the beverage pallets for forty-five minutes",
          outcome:
            "The dock is clear and you enter the surge with 105 orders already behind you.",
          quality: 0.15,
          capabilities: ["prioritization"],
        },
        {
          id: "phased-recovery",
          label:
            "0–15: halt putaway, four clear the 40 totes across two stations, two clear dispatch staging. 15–30: six batch-pick the 65 backlogged orders. 30–45: four cross-dock the beverages to end-caps, then a floor sweep",
          outcome:
            "The bottleneck is cleared before the work that feeds it, and the beverages land where a picker can reach them in the surge.",
          quality: 0.95,
          capabilities: ["prioritization", "systems-thinking", "decision-making", "ownership"],
        },
        {
          id: "cancel-the-queue",
          label: "Ask the control tower to cancel all 105 backlogged orders and start the peak clean",
          outcome:
            "A clean queue at 18:00, bought with 105 customers who ordered hours ago and get nothing.",
          quality: 0.1,
          capabilities: ["decision-making"],
          effects: [{ kind: "rating", delta: -0.4 }],
        },
        {
          id: "pack-in-aisles",
          label: "Have pickers pack in the aisles with manual supplies and leave the dock for later",
          outcome:
            "Packing in a pick aisle blocks the aisle. The dock is still loaded and the beverages are still live on the app.",
          quality: 0.2,
          capabilities: ["learning-agility"],
        },
      ],
    }),
    onExpire: {
      note: "The surge arrived on top of the backlog. Fulfilment is running twenty minutes late across the board.",
    },
  },

  {
    id: "sop-flash-sale-cutover",
    stream: "management",
    priority: "high",
    weight: 38,
    cooldown: 10_000,
    ttl: 115,
    build: () => ({
      title: "Forty-three minutes to a midnight flash sale, and the cash is ₹1,500 short",
      detail:
        "Four things at once: stage 500 units of party stock on end-caps; inward 400 kg of gourmet ice that arrived late and is already melting on the dock; brief eight incoming night associates; and reconcile ₹45,000 of COD showing a ₹1,500 shortage. The 00:01 go-live is hardcoded. Commercial Director: “Biggest campaign of the quarter. How are you spending the next forty-three minutes?”",
      source: "Platform Commercial Director",
      options: [
        {
          id: "chase-the-cash",
          label: "Find the ₹1,500 first and postpone the launch if you have to",
          outcome:
            "₹1,500 of exposure resolved. 400 kg of ice gone, and the quarter's campaign launched to an empty end-cap.",
          quality: 0.1,
          capabilities: ["ownership"],
        },
        {
          id: "triage",
          label:
            "0–15: four outgoing associates move the ice into freezers, temperatures logged. 15–30: two night staff stage the party lines and scan-verify. 30–40: seal ₹43,500 under dual signature, raise a ₹1,500 discrepancy ticket, brief the shift. 40–43: confirm readiness",
          outcome:
            "The thing that is melting moves first, the deadline is met, and the shortage is documented rather than quietly absorbed.",
          quality: 0.95,
          capabilities: ["prioritization", "decision-making", "ownership", "communication"],
        },
        {
          id: "reject-and-lock",
          label: "Reject the late ice, lock the cash box unbalanced, let the night shift stage it themselves",
          outcome:
            "Three problems deferred onto people who have just walked in, and an unbalanced safe with your name on it.",
          quality: 0.05,
          capabilities: ["decision-making"],
        },
        {
          id: "delegate-outside",
          label: "Hand staging and ice receiving to the delivery drivers waiting outside",
          outcome:
            "Unbadged people receiving stock and touching the cold chain, with no scan trail on either.",
          quality: 0.1,
          capabilities: ["decision-making"],
        },
      ],
    }),
    onExpire: {
      note: "Midnight came. The ice was water, the end-caps were empty, and the safe was never balanced.",
    },
  },

  /* ── Customer-first ───────────────────────────────────────────────────── */

  {
    id: "sop-infant-formula",
    stream: "customers",
    priority: "critical",
    weight: 44,
    cooldown: 10_000,
    ttl: 110,
    build: () => ({
      title: "Punctured foil seal on a tin of infant formula",
      detail:
        "A customer reports powder residue around the rim of a Stage-1 formula tin delivered twenty minutes ago and is threatening a police report and social media. A picker has just found a second punctured tin from the same batch on the shelf. Four orders with tins from that batch are at the packing counter. VP Customer Experience: “The child has not consumed it. The parents are furious. Your resolution for this family, and for that stock?”",
      source: "VP Customer Experience",
      options: [
        {
          id: "app-credit",
          label: "Issue a ₹200 app credit, let the four staged orders go, inspect the shelf tomorrow",
          outcome:
            "Four more tins from a suspect batch went out to four more households tonight, for ₹200.",
          quality: 0.05,
          capabilities: ["customer-thinking"],
          effects: [{ kind: "rating", delta: -0.5 }],
        },
        {
          id: "containment",
          label:
            "Stop the four orders at dispatch, quarantine the batch, de-list the SKU across the catchment, call the family yourself, send a verified replacement by supervisor, offer to cover a paediatric consult, file a food safety incident report",
          outcome:
            "The exposure stops at four orders, the family hears from the person responsible, and the manufacturer's quality team gets what they need.",
          quality: 0.95,
          capabilities: ["customer-thinking", "ownership", "systems-thinking", "communication"],
          effects: [{ kind: "block-sku", sku: "BAB-8501" }],
        },
        {
          id: "deflect-to-brand",
          label: "Point the customer at the manufacturer and have packers tape over minor punctures",
          outcome:
            "You have instructed a team to conceal a packaging defect on infant nutrition. In writing, on a terminal.",
          quality: 0.0,
          capabilities: ["communication"],
          effects: [{ kind: "rating", delta: -0.6 }],
        },
        {
          id: "allege-fraud",
          label: "Tell support the claim looks fraudulent and refuse a recall without lab results",
          outcome:
            "A furious parent, a second punctured tin on your own shelf, and a store that called them a liar.",
          quality: 0.05,
          capabilities: ["curiosity"],
          effects: [{ kind: "rating", delta: -0.5 }],
        },
      ],
    }),
    onExpire: {
      note: "The four staged orders dispatched. The batch is now in four more homes and the family went public.",
      effects: [{ kind: "rating", delta: -0.6 }],
    },
  },

  {
    id: "sop-cloudburst",
    stream: "customers",
    priority: "critical",
    weight: 42,
    cooldown: 10_000,
    ttl: 115,
    build: () => ({
      title: "Ninety millimetres in two hours and the competition has gone offline",
      detail:
        "Roads are under two feet of water. The store is dry; 300 emergency orders are in for drinking water, formula, milk, bread, candles and first aid. Riders will not take bikes through it and the fleet manager wants the hub offline. Forty riders are sheltering inside. An RWA rep 600 m away: “No power, flooded basements, families need water and baby food. Are you shutting down?” City Ops Head: “Rider safety is paramount. Your decision.”",
      source: "City Operations Head",
      options: [
        {
          id: "go-offline",
          label: "Take the hub offline, send the riders home, lock up",
          outcome:
            "Nobody gets hurt, and the one night the catchment genuinely needed the store, it was shut.",
          quality: 0.35,
          capabilities: ["ownership"],
          effects: [{ kind: "throttle", status: "closed" }],
        },
        {
          id: "relief-model",
          label:
            "Cut the catalogue to essentials, pull the geofence from 3 km to a walkable 800 m avoiding submerged roads, stop two-wheelers, run foot teams in rain gear with incentive pay plus a high-chassis van, drop consolidated orders at complex gates",
          outcome:
            "Nobody rides through floodwater, and water and formula still reach the buildings that need them.",
          quality: 0.95,
          capabilities: ["customer-thinking", "ownership", "learning-agility", "systems-thinking"],
          effects: [{ kind: "throttle", status: "throttled" }],
        },
        {
          id: "force-riders",
          label: "Keep the full 3 km zone and catalogue live and penalise riders who refuse",
          outcome:
            "You have ordered people onto flooded roads on two-wheelers, with the penalty in writing.",
          quality: 0.0,
          capabilities: ["decision-making"],
          effects: [{ kind: "rating", delta: -0.4 }],
        },
        {
          id: "open-doors",
          label: "Open the doors and let the public walk in and buy off the fulfilment aisles",
          outcome:
            "A dark store is not a shop. No queue management, no segregation, and a crowd inside a live pick floor.",
          quality: 0.2,
          capabilities: ["customer-thinking"],
        },
      ],
    }),
    onExpire: {
      note: "The decision made itself. The hub went dark and the 300 orders cancelled.",
      effects: [{ kind: "throttle", status: "closed" }],
    },
  },

  {
    id: "sop-allergen-breach",
    stream: "customers",
    priority: "critical",
    weight: 42,
    cooldown: 10_000,
    ttl: 110,
    build: () => ({
      title: "Peanut butter leaked over a vegan order packed with raw chicken",
      detail:
        "A customer with a severe peanut allergy and a vegan household opened a single unsealed paper bag containing cracked whole peanut butter, their almond butter and oats, and a pack of raw chicken sausages. They have a skin reaction and are preparing a consumer court complaint. The packer bagged across hazard categories to save packaging. Head of Brand Reputation: “She is an influential food writer. How are you handling her, and how did your floor allow this?”",
      source: "Head of Brand Reputation",
      options: [
        {
          id: "blame-transit",
          label: "Put it down to courier handling, process a routine refund, close the allergy escalation",
          outcome:
            "A refund for an allergic reaction caused by your own bagging rule being ignored. The packing floor learns nothing.",
          quality: 0.0,
          capabilities: ["customer-thinking"],
          effects: [{ kind: "rating", delta: -0.5 }],
        },
        {
          id: "restitution-and-fix",
          label:
            "Call her yourself — apologise, check her condition, cover medical costs, send replacements from isolated stock. Pull the packing CCTV, pause that station for segregation retraining, and configure the WMS to force a dual scan when raw meat or allergens meet groceries",
          outcome:
            "The person is looked after by the manager, and the bagging rule stops depending on whether a packer is in a hurry.",
          quality: 0.95,
          capabilities: ["customer-thinking", "curiosity", "systems-thinking", "ownership"],
        },
        {
          id: "nda-subscription",
          label: "Offer a year of free premium delivery in exchange for an NDA on the incident",
          outcome:
            "You have tried to buy silence from a food writer over an allergic reaction. That is the story now.",
          quality: 0.0,
          capabilities: ["communication"],
          effects: [{ kind: "rating", delta: -0.6 }],
        },
        {
          id: "cannot-guarantee",
          label: "Tell support that high-volume stores cannot guarantee allergen isolation",
          outcome:
            "On the record, from the store manager: our packing cannot be trusted with allergies.",
          quality: 0.0,
          capabilities: ["communication"],
          effects: [{ kind: "rating", delta: -0.6 }],
        },
      ],
    }),
    onExpire: {
      note: "Nobody called her. The complaint was filed with the photographs attached.",
      effects: [{ kind: "rating", delta: -0.5 }],
    },
  },
];
