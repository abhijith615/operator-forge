import type { TaskTemplate } from "./types";

/**
 * The floor, as the SOP describes it.
 *
 * Built from "Information and General SOP Dark Store" — the architecture and
 * procedure sections, the manager's daily routine, the KPI framework, and the
 * interview with a working Blinkit store manager at the top of it. Every
 * scenario below is a documented rule being tested at the moment it bites:
 *
 *  - Chilled intake refused above 6°C, frozen above −15°C.
 *  - Ambient needs 60% shelf life left at the dock, dairy and fresh 70–80%.
 *  - GRN posted within 45 minutes of docking; milk-run and frozen vehicles
 *    released inside the hour.
 *  - Nil pick never cancelled by the picker — the Floor Lead gets 45 seconds
 *    to find it before the SKU is de-listed.
 *  - PPI of 10–15 seconds per item; anything above is engaged with, not posted.
 *  - Click-to-dispatch at or under 180 seconds. Rider bay dwell under 90.
 *  - Stock variance over 0.2% triggers a root-cause investigation.
 *  - Chilled above 5°C for thirty continuous minutes means transfer, now.
 *  - Short manpower is solved through the on-demand picker app, or riders from
 *    a nearby store inside the 3 km cluster — not by pushing the people here.
 *
 * Written short on purpose. A card is read in the two seconds between two other
 * things going wrong, so the situation is one line and each option is a handful
 * of words. The pressure should come from what is being asked, not from how
 * much there is to read.
 *
 * Options are authored best-first; the scheduler shuffles them on the way to
 * the screen, so position carries no information.
 */
export const SOP_TASKS: TaskTemplate[] = [
  /* ── Inbound: the dock, the clock, the thermometer ────────────────────── */

  {
    id: "sop-chilled-probe",
    stream: "operations",
    priority: "critical",
    weight: 36,
    cooldown: 10_000,
    ttl: 70,
    build: () => ({
      title: "Dairy truck probes at 7.2°C",
      detail: "Chilled intake is refused above 6°C. The dairy bay is near empty.",
      source: "Inbound Lead",
      options: [
        {
          id: "refuse",
          label: "Refuse it. Log a gate rejection",
          outcome: "The right call. The bay stays empty and the vendor carries the loss.",
          quality: 0.95,
          capabilities: ["ownership", "decision-making"],
        },
        {
          id: "chill-down",
          label: "Unload fast and chill it down",
          outcome: "The breach already happened in transit. Cooling it now hides it, nothing more.",
          quality: 0.1,
          capabilities: ["prioritization"],
          effects: [{ kind: "rating", delta: -0.2 }],
        },
        {
          id: "call-vendor",
          label: "Hold the truck, call the vendor",
          outcome: "Defensible, and the dock is blocked while you wait for a callback.",
          quality: 0.5,
          capabilities: ["communication", "curiosity"],
        },
        {
          id: "accept",
          label: "Take it. Sell it today",
          outcome: "Short-dated dairy on your shelf, with your name on the acceptance.",
          quality: 0.05,
          capabilities: ["decision-making"],
          effects: [{ kind: "rating", delta: -0.3 }],
        },
      ],
    }),
    onExpire: { note: "The probe reading went unanswered and the load was stowed." },
  },

  {
    id: "sop-grn-clock",
    stream: "operations",
    priority: "high",
    weight: 34,
    cooldown: 10_000,
    ttl: 65,
    build: () => ({
      title: "GRN is at forty minutes. SLA is forty-five",
      detail: "Half the consignment is still unscanned and unsellable on the app.",
      source: "Inbound Lead",
      options: [
        {
          id: "pull-two",
          label: "Pull two off putaway to scan-verify",
          outcome: "GRN posts inside the window. Stock goes live and putaway catches up after.",
          quality: 0.95,
          capabilities: ["prioritization", "decision-making"],
        },
        {
          id: "post-blind",
          label: "Post the GRN without verifying",
          outcome: "You hit the SLA and seeded a variance nobody will trace for a week.",
          quality: 0.1,
          capabilities: ["prioritization"],
        },
        {
          id: "run-over",
          label: "Run over. Finish it properly",
          outcome: "Clean numbers, and the stock sits in crates while the app shows it out.",
          quality: 0.55,
          capabilities: ["ownership"],
        },
        {
          id: "turn-away",
          label: "Send the rest back unloaded",
          outcome: "You have solved a paperwork deadline by rejecting good stock.",
          quality: 0.05,
          capabilities: ["decision-making"],
        },
      ],
    }),
    onExpire: { note: "The dock SLA blew past forty-five minutes with stock still in crates." },
  },

  {
    id: "sop-milk-run-held",
    stream: "operations",
    priority: "high",
    weight: 32,
    cooldown: 10_000,
    ttl: 65,
    build: () => ({
      title: "Milk run has been on the dock seventy minutes",
      detail: "Milk-run vehicles release inside the hour. The grocery line-haul is waiting behind it.",
      source: "Dock",
      options: [
        {
          id: "clear-now",
          label: "Clear the milk run first, release it",
          outcome: "The shorter clock gets priority. The grocery vehicle docks six minutes later.",
          quality: 0.95,
          capabilities: ["prioritization", "systems-thinking"],
        },
        {
          id: "finish-order",
          label: "Finish in the order they arrived",
          outcome: "Fair, and the vehicle with the one-hour release is the one you held.",
          quality: 0.35,
          capabilities: ["decision-making"],
        },
        {
          id: "both",
          label: "Split the team across both vehicles",
          outcome: "Two half-speed unloads. Neither clears and both clocks keep running.",
          quality: 0.25,
          capabilities: ["prioritization"],
        },
        {
          id: "park-grocery",
          label: "Send the grocery truck away",
          outcome: "Tomorrow's ambient stock just left your catchment.",
          quality: 0.1,
          capabilities: ["decision-making"],
        },
      ],
    }),
    onExpire: { note: "Both vehicles sat on the dock. Demurrage on one, a missed slot on the other." },
  },

  {
    id: "sop-short-shelf-bread",
    stream: "operations",
    priority: "high",
    weight: 32,
    cooldown: 10_000,
    ttl: 65,
    build: () => ({
      title: "Bread arrives with fifty-five percent shelf life",
      detail: "Fresh lines need seventy. Bread is a top-twenty SKU and you are nearly out.",
      source: "Inbound QC",
      options: [
        {
          id: "reject-log",
          label: "Gate-reject it, raise a vendor debit",
          outcome: "The threshold holds. You are short on bread and the vendor pays for it.",
          quality: 0.95,
          capabilities: ["ownership", "decision-making"],
        },
        {
          id: "accept-mark",
          label: "Accept it, sell it down fast today",
          outcome: "The threshold exists because “sell it fast” is what everyone intends.",
          quality: 0.15,
          capabilities: ["prioritization"],
        },
        {
          id: "part-accept",
          label: "Take half, reject the rest",
          outcome: "Half a breach is still a breach, and now the paperwork is ambiguous too.",
          quality: 0.25,
          capabilities: ["decision-making"],
        },
        {
          id: "ask-cluster",
          label: "Ask the cluster manager to decide",
          outcome: "The rule is already written. Escalating it costs you the dock slot.",
          quality: 0.4,
          capabilities: ["communication"],
        },
      ],
    }),
    onExpire: { note: "The bread went to shelf unchecked at fifty-five percent." },
  },

  /* ── Picking: PPI, nil picks, the handheld ────────────────────────────── */

  {
    id: "sop-high-ppi",
    stream: "people",
    priority: "normal",
    weight: 34,
    cooldown: 10_000,
    ttl: 75,
    build: () => ({
      title: "Arun's PPI is twenty-six seconds. Normal is ten to fifteen",
      detail: "He is four weeks in and his zone is the deepest on the floor.",
      source: "Picker dashboard",
      options: [
        {
          id: "walk-with-him",
          label: "Walk his zone with him once",
          outcome: "You find it in four minutes: two bins mislabelled and a route he never learned.",
          quality: 0.95,
          capabilities: ["curiosity", "communication", "ownership"],
        },
        {
          id: "post-group",
          label: "Post his number in the group",
          outcome: "The group is for motivation. Naming the slowest picker in it does the opposite.",
          quality: 0.2,
          capabilities: ["communication"],
        },
        {
          id: "move-off",
          label: "Move him off picking today",
          outcome: "Your UPH recovers and the reason his PPI is high is still on your floor.",
          quality: 0.35,
          capabilities: ["prioritization"],
        },
        {
          id: "leave-it",
          label: "Leave it. He is new",
          outcome: "Four weeks in is exactly when the habit sets.",
          quality: 0.25,
          capabilities: ["stress-handling"],
        },
      ],
    }),
  },

  {
    id: "sop-nil-pick-window",
    stream: "operations",
    priority: "critical",
    weight: 36,
    cooldown: 10_000,
    ttl: 55,
    build: () => ({
      title: "Nil pick raised on Aisle C. Forty-five seconds to find it",
      detail: "The picker cannot cancel it. After the window the SKU de-lists itself.",
      source: "Outbound Floor Lead",
      options: [
        {
          id: "check-overstock",
          label: "Check overstock and the drop bins",
          outcome: "Found behind the replenishment pallet. The order ships whole and the SKU stays live.",
          quality: 0.95,
          capabilities: ["curiosity", "prioritization", "systems-thinking"],
        },
        {
          id: "authorise-now",
          label: "Authorise the nil pick immediately",
          outcome: "Fast, and you de-listed a SKU that was two metres from the bin.",
          quality: 0.3,
          capabilities: ["decision-making"],
        },
        {
          id: "let-picker",
          label: "Let the picker cancel the line",
          outcome: "Pickers never cancel. That is the rule the whole nil-pick count depends on.",
          quality: 0.05,
          capabilities: ["prioritization"],
        },
        {
          id: "hold-order",
          label: "Hold the order until someone looks",
          outcome: "The window exists so an order is never held. This one now is.",
          quality: 0.2,
          capabilities: ["decision-making"],
        },
      ],
    }),
    onExpire: {
      note: "The window closed. The SKU de-listed itself and the cart went out short.",
      effects: [{ kind: "rating", delta: -0.15 }],
    },
  },

  {
    id: "sop-repeat-nil-pick",
    stream: "operations",
    priority: "high",
    weight: 34,
    cooldown: 10_000,
    ttl: 70,
    build: () => ({
      title: "Same SKU nil-picked four times this morning",
      detail: "System says eleven in stock. Four pickers have stood at that bin and found nothing.",
      source: "Nil-pick log",
      options: [
        {
          id: "count-the-bin",
          label: "Count the bin now, correct the system",
          outcome: "Four pickers told you the same thing. The count makes it a number you can act on.",
          quality: 0.95,
          capabilities: ["curiosity", "systems-thinking", "ownership"],
          effects: [{ kind: "count-sku", sku: "DRY-1088" }],
        },
        {
          id: "block-sku",
          label: "Block the SKU and move on",
          outcome: "No more nil picks, no idea why, and eleven units unaccounted for.",
          quality: 0.45,
          capabilities: ["decision-making"],
          effects: [{ kind: "block-sku", sku: "DRY-1088" }],
        },
        {
          id: "retrain",
          label: "Tell the pickers to look harder",
          outcome: "Four people, one bin, same answer. The variance is not in their eyes.",
          quality: 0.1,
          capabilities: ["communication"],
        },
        {
          id: "wait-cycle",
          label: "Wait for the scheduled cycle count",
          outcome: "That is seven days away and the SKU nil-picks all week.",
          quality: 0.2,
          capabilities: ["prioritization"],
        },
      ],
    }),
  },

  {
    id: "sop-bin-not-scanned",
    stream: "operations",
    priority: "normal",
    weight: 30,
    cooldown: 10_000,
    ttl: 70,
    build: () => ({
      title: "A picker is scanning items but skipping the bin",
      detail: "Bin-then-item is what keeps the shelf and the system agreeing.",
      source: "HHT audit",
      options: [
        {
          id: "correct-now",
          label: "Correct him at the pick face now",
          outcome: "Thirty seconds, in the place it happens. He has not done it since.",
          quality: 0.95,
          capabilities: ["communication", "ownership"],
        },
        {
          id: "raise-later",
          label: "Raise it at tomorrow's standup",
          outcome: "A shift of untraceable picks before the message lands.",
          quality: 0.4,
          capabilities: ["communication"],
        },
        {
          id: "ignore-speed",
          label: "Leave it. His UPH is excellent",
          outcome: "His UPH is excellent because of the step he is skipping.",
          quality: 0.05,
          capabilities: ["prioritization"],
        },
        {
          id: "write-up",
          label: "Write him up before speaking to him",
          outcome: "A formal notice for something nobody has yet told him is wrong.",
          quality: 0.25,
          capabilities: ["decision-making"],
        },
      ],
    }),
  },

  /* ── Outbound: CTD, the bay, the riders ───────────────────────────────── */

  {
    id: "sop-ctd-breach",
    stream: "operations",
    priority: "critical",
    weight: 38,
    cooldown: 10_000,
    ttl: 60,
    build: () => ({
      title: "Click-to-dispatch has climbed to 240 seconds",
      detail: "Target is 180. Every second over eats the rider's half of the ten minutes.",
      source: "Fulfilment board",
      options: [
        {
          id: "second-packer",
          label: "Put a second packer on the stations",
          outcome: "Packing was the stage holding it. CTD is back under 180 in four minutes.",
          quality: 0.95,
          capabilities: ["prioritization", "systems-thinking"],
        },
        {
          id: "throttle",
          label: "Throttle intake until it recovers",
          outcome: "It works, and it costs revenue for a bottleneck one person could have cleared.",
          quality: 0.55,
          capabilities: ["decision-making"],
          effects: [{ kind: "throttle", status: "throttled" }],
        },
        {
          id: "push-pickers",
          label: "Tell the pickers to move faster",
          outcome: "The pickers are not the stage that is backed up.",
          quality: 0.15,
          capabilities: ["communication"],
          effects: [{ kind: "worker-fatigue", workerId: "all-active", delta: 0.15 }],
        },
        {
          id: "wait-peak",
          label: "Ride it out. The peak ends soon",
          outcome: "At 240 seconds the platform starts extending your delivery window for you.",
          quality: 0.1,
          capabilities: ["stress-handling"],
        },
      ],
    }),
    onExpire: {
      note: "CTD stayed above target. The app pushed the promise from ten minutes to twenty-five.",
      effects: [{ kind: "rating", delta: -0.2 }],
    },
  },

  {
    id: "sop-rider-dwell",
    stream: "operations",
    priority: "high",
    weight: 32,
    cooldown: 10_000,
    ttl: 65,
    build: () => ({
      title: "Riders are waiting four minutes at the bay",
      detail: "Bay dwell should be under ninety seconds. Two riders have already logged off.",
      source: "Dispatch console",
      options: [
        {
          id: "stage-ahead",
          label: "Stage the next ten into numbered bays",
          outcome: "Riders scan and go. Dwell drops under ninety and nobody else logs off.",
          quality: 0.95,
          capabilities: ["systems-thinking", "prioritization"],
        },
        {
          id: "ask-wait",
          label: "Ask the riders to be patient",
          outcome: "They are paid per delivery. Patience costs them money and you riders.",
          quality: 0.1,
          capabilities: ["communication"],
        },
        {
          id: "call-more",
          label: "Call more riders to the bay",
          outcome: "More people waiting on the same bottleneck.",
          quality: 0.15,
          capabilities: ["decision-making"],
        },
        {
          id: "escalate-fleet",
          label: "Escalate the dwell to the fleet lead",
          outcome: "Correct to flag it. The bags are still not in the bays.",
          quality: 0.4,
          capabilities: ["communication"],
        },
      ],
    }),
    onExpire: { note: "Dwell stayed over four minutes. Three riders logged off the zone." },
  },

  {
    id: "sop-rider-shortage",
    stream: "people",
    priority: "high",
    weight: 34,
    cooldown: 10_000,
    ttl: 70,
    build: () => ({
      title: "Three riders short going into the evening peak",
      detail: "Two stores inside the three-kilometre cluster did bulk hiring last week.",
      source: "Last-Mile Fleet Lead",
      options: [
        {
          id: "borrow-cluster",
          label: "Pull spare riders from the nearby store",
          outcome: "They are already onboarded and twelve minutes away. Covered before the peak.",
          quality: 0.95,
          capabilities: ["systems-thinking", "decision-making", "communication"],
        },
        {
          id: "morning-riders",
          label: "Call this morning's riders back in",
          outcome: "Workable. They have already done a shift and the bonus maths is against you.",
          quality: 0.7,
          capabilities: ["decision-making", "ownership"],
        },
        {
          id: "longer-window",
          label: "Extend the promised window on the app",
          outcome: "Honest, and it depresses conversion across the whole catchment.",
          quality: 0.45,
          capabilities: ["customer-thinking"],
        },
        {
          id: "overload",
          label: "Give each rider more drops",
          outcome: "Longer routes, colder bags, and the bonus threshold slips out of reach.",
          quality: 0.2,
          capabilities: ["prioritization"],
        },
      ],
    }),
    onExpire: { note: "The peak started three riders down. Bay congestion did the rest." },
  },

  /* ── Manpower ─────────────────────────────────────────────────────────── */

  {
    id: "sop-manpower-gap",
    stream: "people",
    priority: "critical",
    weight: 38,
    cooldown: 10_000,
    ttl: 70,
    build: () => ({
      title: "Four pickers absent. Peak starts in forty minutes",
      detail: "The on-demand picker app can list a four-hour job in under a minute.",
      source: "Roll call",
      options: [
        {
          id: "list-on-demand",
          label: "List a four-hour job on the app",
          outcome: "Three accept inside fifteen minutes. You are staffed before the first wave.",
          quality: 0.95,
          capabilities: ["decision-making", "learning-agility", "systems-thinking"],
        },
        {
          id: "overtime",
          label: "Hold the night shift on overtime",
          outcome: "It covers the gap with people who have already worked eight hours.",
          quality: 0.55,
          capabilities: ["decision-making"],
          effects: [{ kind: "worker-fatigue", workerId: "all-active", delta: 0.2 }],
        },
        {
          id: "push-seven",
          label: "Run the peak with who turned up",
          outcome: "Pick errors climb, PPI doubles, and the people who came in resent it.",
          quality: 0.15,
          capabilities: ["stress-handling"],
          effects: [{ kind: "worker-fatigue", workerId: "all-active", delta: 0.3 }],
        },
        {
          id: "throttle-hard",
          label: "Throttle intake for the whole peak",
          outcome: "Safe, expensive, and it was solvable with a two-minute job listing.",
          quality: 0.4,
          capabilities: ["decision-making"],
          effects: [{ kind: "throttle", status: "throttled" }],
        },
      ],
    }),
    onExpire: { note: "Nobody was called. The peak landed on the pickers who turned up." },
  },

  {
    id: "sop-retention-bonus",
    stream: "people",
    priority: "normal",
    weight: 28,
    cooldown: 10_000,
    ttl: 75,
    build: () => ({
      title: "Your best picker wants his retention bonus a month early",
      detail: "The ₹10,000 is paid at three months. He is at two and has an offer.",
      source: "Pick face",
      options: [
        {
          id: "name-the-date",
          label: "Name the exact date, in writing",
          outcome: "He stays. What he actually wanted was to know the number was real.",
          quality: 0.95,
          capabilities: ["communication", "ownership", "decision-making"],
        },
        {
          id: "pay-early",
          label: "Pay it early, keep him happy",
          outcome: "He stays a month. Every picker on the floor now knows the terms are negotiable.",
          quality: 0.3,
          capabilities: ["decision-making"],
        },
        {
          id: "let-go",
          label: "Tell him the policy and move on",
          outcome: "Policy is correct and you have said nothing he could not read himself.",
          quality: 0.4,
          capabilities: ["ownership"],
        },
        {
          id: "promise-vague",
          label: "Tell him you will look into it",
          outcome: "The thing that loses pickers is not the rule, it is the vague answer.",
          quality: 0.15,
          capabilities: ["communication"],
        },
      ],
    }),
  },

  {
    id: "sop-zone-dispute",
    stream: "people",
    priority: "high",
    weight: 30,
    cooldown: 10_000,
    ttl: 65,
    build: () => ({
      title: "Two pickers arguing over zone allocation at the pick face",
      detail: "Zone D is deeper and slower. Both say they had it yesterday.",
      source: "Floor",
      options: [
        {
          id: "rotate-publicly",
          label: "Rotate zones daily, post the rota",
          outcome: "The argument was never about today. A visible rota ends it for good.",
          quality: 0.95,
          capabilities: ["systems-thinking", "communication", "ownership"],
        },
        {
          id: "pick-one",
          label: "Assign it to one of them now",
          outcome: "The floor moves again, and you have the same argument tomorrow.",
          quality: 0.45,
          capabilities: ["decision-making"],
        },
        {
          id: "both-off",
          label: "Move them both to packing",
          outcome: "Two pickers off the pick face during a peak, over a rota question.",
          quality: 0.15,
          capabilities: ["prioritization"],
        },
        {
          id: "ignore",
          label: "Let them sort it out",
          outcome: "They sort it out loudly, in the aisle, for another six minutes.",
          quality: 0.1,
          capabilities: ["stress-handling"],
        },
      ],
    }),
  },

  /* ── Inventory, shrinkage, quality ────────────────────────────────────── */

  {
    id: "sop-cage-short",
    stream: "management",
    priority: "critical",
    weight: 36,
    cooldown: 10_000,
    ttl: 70,
    build: () => ({
      title: "High-value cage is two smartwatches short on the daily count",
      detail: "You issue those yourself. Only three people hold cage access.",
      source: "ICQA Lead",
      options: [
        {
          id: "freeze-and-pull",
          label: "Freeze the cage, pull CCTV and access logs",
          outcome: "Both named in six minutes. The evidence exists only while the shift is still here.",
          quality: 0.95,
          capabilities: ["ownership", "curiosity", "prioritization"],
        },
        {
          id: "write-off",
          label: "Write it off to monthly shrinkage",
          outcome: "Two units today. The person who took them learns the ceiling.",
          quality: 0.05,
          capabilities: ["decision-making"],
        },
        {
          id: "recount",
          label: "Recount at the end of the shift",
          outcome: "By then the shift has gone home and so, probably, have the watches.",
          quality: 0.25,
          capabilities: ["curiosity"],
        },
        {
          id: "accuse",
          label: "Question the pickers on the floor",
          outcome: "Nobody near that cage has access, and the floor now knows you suspect them.",
          quality: 0.1,
          capabilities: ["communication"],
        },
      ],
    }),
    onExpire: {
      note: "Nothing was secured before the shift change. The cage variance is an audit finding now.",
    },
  },

  {
    id: "sop-daily-variance",
    stream: "management",
    priority: "high",
    weight: 32,
    cooldown: 10_000,
    ttl: 70,
    build: () => ({
      title: "Daily variance is 0.6 percent against a 0.2 threshold",
      detail: "Three times over. A root-cause investigation is automatic above the line.",
      source: "WMS variance report",
      options: [
        {
          id: "trace-today",
          label: "Trace today's movements before closing",
          outcome: "Two putaway errors and a mis-weighed line. All three fixable, all three traced.",
          quality: 0.95,
          capabilities: ["curiosity", "systems-thinking", "ownership"],
        },
        {
          id: "monthly",
          label: "Roll it into the monthly reconciliation",
          outcome: "By month end the movement trail is cold and the number is just a number.",
          quality: 0.15,
          capabilities: ["prioritization"],
        },
        {
          id: "adjust-system",
          label: "Adjust the system to match the shelf",
          outcome: "The variance disappears and so does any chance of knowing what caused it.",
          quality: 0.05,
          capabilities: ["decision-making"],
        },
        {
          id: "escalate",
          label: "Send it to the cluster manager",
          outcome: "Correct to report it. The investigation is still yours to run.",
          quality: 0.45,
          capabilities: ["communication"],
        },
      ],
    }),
  },

  {
    id: "sop-weight-mismatch",
    stream: "customers",
    priority: "high",
    weight: 32,
    cooldown: 10_000,
    ttl: 70,
    build: () => ({
      title: "Customer ordered 30g Parle-G and was given the 40g pack",
      detail: "Same shelf, adjacent bins. Support has it as a wrong-item complaint.",
      source: "Customer Support",
      options: [
        {
          id: "split-bins",
          label: "Separate the bins, refund the difference",
          outcome: "The customer is squared and the bin layout stops producing the error.",
          quality: 0.95,
          capabilities: ["customer-thinking", "systems-thinking", "ownership"],
        },
        {
          id: "refund-only",
          label: "Refund it and close the ticket",
          outcome: "Settled for one customer. The two bins are still touching.",
          quality: 0.45,
          capabilities: ["customer-thinking"],
        },
        {
          id: "blame-picker",
          label: "Warn the picker who packed it",
          outcome: "The next picker makes the same error at the same two bins.",
          quality: 0.2,
          capabilities: ["communication"],
        },
        {
          id: "no-action",
          label: "Call it a fair substitution",
          outcome: "They got more biscuit and paid for less. It still books as a loss.",
          quality: 0.1,
          capabilities: ["decision-making"],
        },
      ],
    }),
  },

  {
    id: "sop-expired-on-rack",
    stream: "operations",
    priority: "critical",
    weight: 34,
    cooldown: 10_000,
    ttl: 60,
    build: () => ({
      title: "Expired curd found on the fresh rack, not in the dump area",
      detail: "FEFO puts the oldest at the front. Something was stowed behind it instead.",
      source: "Floor walk",
      options: [
        {
          id: "sweep-and-retrain",
          label: "Sweep the whole bay, re-brief the stower",
          outcome: "Four more found behind it. The stowing habit is the actual defect.",
          quality: 0.95,
          capabilities: ["ownership", "systems-thinking", "curiosity"],
        },
        {
          id: "pull-one",
          label: "Pull that one unit to quarantine",
          outcome: "One unit handled. Whatever is behind it on the same rack is not.",
          quality: 0.4,
          capabilities: ["ownership"],
        },
        {
          id: "end-of-day",
          label: "Flag it for the evening expiry pull",
          outcome: "It is live on the app until then, at the front of a fresh rack.",
          quality: 0.1,
          capabilities: ["prioritization"],
          effects: [{ kind: "rating", delta: -0.2 }],
        },
        {
          id: "discount",
          label: "Mark it down and move it today",
          outcome: "It is expired, not near-expiry. There is no price that makes it sellable.",
          quality: 0.0,
          capabilities: ["decision-making"],
          effects: [{ kind: "rating", delta: -0.4 }],
        },
      ],
    }),
    onExpire: {
      note: "The expired stock stayed on the fresh rack and kept selling.",
      effects: [{ kind: "rating", delta: -0.3 }],
    },
  },

  {
    id: "sop-chiller-drift",
    stream: "operations",
    priority: "critical",
    weight: 38,
    cooldown: 10_000,
    ttl: 55,
    build: () => ({
      title: "Chiller has read 6.8°C for thirty-five minutes",
      detail: "Above five for thirty continuous minutes means transfer and an HVAC escalation.",
      source: "IoT thermal sensor",
      options: [
        {
          id: "transfer-escalate",
          label: "Transfer to backup, raise HVAC now",
          outcome: "Exactly what the thirty-minute rule is for. The stock is out before the hour.",
          quality: 0.95,
          capabilities: ["ownership", "decision-making", "prioritization"],
        },
        {
          id: "watch-it",
          label: "Watch it another fifteen minutes",
          outcome: "The threshold was crossed five minutes ago. Waiting only adds to the loss.",
          quality: 0.1,
          capabilities: ["stress-handling"],
          effects: [{ kind: "cold-chain-loss", units: 40 }],
        },
        {
          id: "close-doors",
          label: "Stop picking from it, keep doors shut",
          outcome: "Sensible, partial, and the compressor is still not fixed.",
          quality: 0.5,
          capabilities: ["prioritization"],
        },
        {
          id: "log-only",
          label: "Log the reading and carry on",
          outcome: "Logged, unmanaged. That is the combination an FSSAI audit looks for.",
          quality: 0.05,
          capabilities: ["communication"],
          effects: [{ kind: "cold-chain-loss", units: 60 }],
        },
      ],
    }),
    onExpire: {
      note: "The drift ran past the hour unmanaged. The bay is a disposal.",
      effects: [{ kind: "cold-chain-loss", units: 90 }],
    },
  },

  {
    id: "sop-packer-defects",
    stream: "customers",
    priority: "high",
    weight: 32,
    cooldown: 10_000,
    ttl: 70,
    build: () => ({
      title: "Three missing-item complaints today, all from one packing station",
      detail: "Order defect rate is at 0.9 percent. Target is under 0.35.",
      source: "Customer Support",
      options: [
        {
          id: "watch-the-station",
          label: "Stand at that station and watch a cycle",
          outcome: "He is bagging before the bill of materials clears. Two minutes to see, one to fix.",
          quality: 0.95,
          capabilities: ["curiosity", "ownership", "systems-thinking"],
        },
        {
          id: "refund-all",
          label: "Refund all three and move on",
          outcome: "Three customers made whole and the station carries on producing a fourth.",
          quality: 0.35,
          capabilities: ["customer-thinking"],
        },
        {
          id: "rotate-him",
          label: "Move him to another station",
          outcome: "The station was never the problem and now the defect moves with him.",
          quality: 0.2,
          capabilities: ["decision-making"],
        },
        {
          id: "brief-all",
          label: "Re-brief every packer at handover",
          outcome: "Everyone hears a lecture meant for one person, hours after it mattered.",
          quality: 0.3,
          capabilities: ["communication"],
        },
      ],
    }),
  },
];
