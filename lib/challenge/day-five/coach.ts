/**
 * The Shift Lead on the other end of Day 5's assistant.
 *
 * Day 5 asks a single question five times — would the customer agree the order
 * is fine? — and it asks it in warehouse language. A tote, a nil pick, a
 * substitution, FEFO, the handover, the pick face. Somebody who does not know
 * that a tote is just the crate the picker carries cannot tell whether "four
 * of five in tote" is a problem or a normal basket halfway through, and will
 * answer the screen instead of the customer.
 *
 * Nothing here gives the answer away. Every entry defines a thing or explains
 * how the day is scored; none of them says which option to take, because the
 * whole day is about forming that judgement yourself.
 *
 * Curated rather than a model call, for the reasons in Day 1's coach, and
 * `answer()` is the same seam if that ever changes.
 */

export interface CoachReply {
  text: string;
  suggestions?: string[];
}

interface Entry {
  match: RegExp;
  reply: CoachReply;
}

const ENTRIES: Entry[] = [
  {
    match: /\b(tote|crate|basket|bin)\b/i,
    reply: {
      text: "A tote is the plastic crate a picker carries round the aisles. Everything they collect for one order goes in it, and the tote travels to the packing bench as a single unit. “In tote” just means the picker has that item in hand. It says nothing about whether it is the right item, the right size, or in good condition — that is what the bench is for.",
      suggestions: ["What is a nil pick?", "What happens at packing?"],
    },
  },
  {
    match: /\b(nil.?pick|not found|inf|item not found|missing)\b/i,
    reply: {
      text: "A nil pick is an item the picker went to fetch and could not find. The rule is that a picker never cancels it themselves — it goes to the floor lead, who gets a short window to look in overstock and the drop bins before the system de-lists the line. Once it is confirmed, the automated workflow refunds that line and sends the rest of the order.",
      suggestions: ["What is a substitution?", "Why does the refund matter?"],
    },
  },
  {
    match: /\b(substitut\w*|swap|replace|alternative)\b/i,
    reply: {
      text: "A substitution is offering the customer a different product in place of one you cannot supply. It only works if it does the same job — same use, same constraint, close enough on size and price. A substitution the customer would not have chosen themselves is worse than an honest refund, because it arrives looking like you did not read the order.",
      suggestions: ["What is a nil pick?", "What is the customer actually doing?"],
    },
  },
  {
    match: /\b(fefo|fifo|shelf life|expiry|expir\w*|date|batch)\b/i,
    reply: {
      text: "FEFO is first-expired-first-out: the oldest sellable stock goes forward on the shelf so it sells before it dies. A batch is one delivery of one product, with its own expiry. The platform also sets a floor — stock below a minimum remaining life is not sellable at all, however much of it you are holding. FEFO protects margin. The floor protects the customer. They disagree more often than you would think.",
      suggestions: ["How is this day scored?", "What is a nil pick?"],
    },
  },
  {
    match: /\b(handover|rider|dispatch|bay|courier)\b/i,
    reply: {
      text: "Handover is the moment the sealed bag leaves the store with a delivery rider. It is the last point where anything can be checked, changed or stopped — after it, the next person to open that bag is the customer. Most of what Day 5 asks you to catch is catchable only before handover.",
      suggestions: ["What are the six stages?", "What happens at packing?"],
    },
  },
  {
    match: /\b(pack\w*|bench|bagging|seal)\b/i,
    reply: {
      text: "Packing is where the picker's tote becomes the customer's bag: the items are checked against the order, segregated so raw meat and chemicals never share a bag with food, and the bag is sealed with tamper tape. It is the only checkpoint between the aisle and the rider, which is why a flag raised at packing is worth far more than the same flag raised after delivery.",
      suggestions: ["What is a tote?", "What is handover?"],
    },
  },
  {
    match: /\b(pick face|aisle|shelf|slotting|zone)\b/i,
    reply: {
      text: "The pick face is the front edge of the shelving where pickers actually take stock from — the part of the store the customer's order touches. Anything in overstock, on the dock or in the back is not on the pick face yet and does not exist as far as a picker is concerned.",
      suggestions: ["What is a tote?", "What is FEFO?"],
    },
  },
  {
    match: /\b(stages?|journey|six|rail|timeline|nodes?)\b/i,
    reply: {
      text: "The six stages are ordered, picking, packing, handover, delivery and use. “Use” is the one most systems do not track: the moment the customer opens the bag and tries to do the thing they ordered for. An order can pass all five technical stages and fail at use, which is exactly what the day is about.",
      suggestions: ["What is handover?", "How is this day scored?"],
    },
  },
  {
    match: /\b(ctd|click.?to.?dispatch|dispatch time|how fast)\b/i,
    reply: {
      text: "Click-to-dispatch is the time from the customer tapping order to the bag leaving the store, targeted at about three minutes. It is the number the platform watches, and it is the pressure behind every choice here: stopping to check something costs CTD, and shipping an order you have not checked costs the customer.",
      suggestions: ["How is this day scored?", "What is handover?"],
    },
  },
  {
    match: /\b(protected|score|scor\w*|judged|rated|marks?|points?)\b/i,
    reply: {
      text: "The counter at the top is promises protected — the orders that arrived able to do the job the customer ordered them for. It is not the same as orders delivered on time, and it is not the same as tickets closed. You can close every ticket cleanly and protect nothing.",
      suggestions: ["What counts as protected?", "What are the six stages?"],
    },
  },
  {
    match: /\b(what counts|what is protected|how do i protect|good outcome)\b/i,
    reply: {
      text: "An order is protected when the customer can do what they ordered for. Not when the system shows it green, not when it went out inside the window, and not when the refund was processed correctly. If the basket was for a cake and the cake cannot be made, the order failed, whatever the dashboard says.",
      suggestions: ["How is this day scored?", "What is a substitution?"],
    },
  },
  {
    match: /\b(customer actually|what are they|why did they|intent|purpose|trying to)\b/i,
    reply: {
      text: "Read the basket, not the line that is missing. Items ordered together usually add up to one task — a meal, a recipe, a repair, a baby's night. Once you can name the task, you can tell whether the missing line is incidental or whether it is the whole point of the order, and that is the difference between a refund and a save.",
      suggestions: ["What is a substitution?", "What counts as protected?"],
    },
  },
  {
    match: /\b(hold|holding|stop it|pause|delay)\b/i,
    reply: {
      text: "Holding an order stops it moving to the next stage while you deal with it. It costs time on the clock and it is the only way to change anything before the bag is sealed. Whether it is worth the delay is the judgement being measured — I am not going to make it for you.",
      suggestions: ["What is handover?", "What is CTD?"],
    },
  },
  {
    match: /\b(what should i|what first|where do i start|how do i decide|which option)\b/i,
    reply: {
      text: "Work out what the customer is trying to do, then ask whether what is about to leave the store lets them do it. If it does, let it go. If it does not, the only question left is whether you can fix it before handover. There is no sequence to match here — you are judged on what arrives at the customer's door.",
      suggestions: ["What counts as protected?", "What is a substitution?"],
    },
  },
];

const FALLBACK: CoachReply = {
  text: "I do not have that one. Ask me about anything on the screen — a tote, a nil pick, a substitution, FEFO and batches, the six stages, handover, CTD, or what counts as protected.",
  suggestions: ["What is a tote?", "What is a nil pick?", "What counts as protected?"],
};

const OPENING: CoachReply = {
  text: "Shift Lead. I will tell you what anything on that screen means — the words, the stages, how the day is counted. I am not going to tell you what to do with an order. Ask before you guess; the clock runs either way.",
  suggestions: ["What is a tote?", "What is a nil pick?", "How is this day scored?"],
};

export function openingMessage(): CoachReply {
  return OPENING;
}

export function answer(question: string): CoachReply {
  const found = ENTRIES.find((entry) => entry.match.test(question));
  return found ? found.reply : FALLBACK;
}
