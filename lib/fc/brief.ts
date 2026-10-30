import type { EmployerBrief } from "../hiring/brief";
import type { FcEvidence, FcResult } from "./scoring";
import { FC_COMPETENCIES, FC_COMPETENCY_PLAIN } from "./weights";

/**
 * The two-page FC Executive brief an employer can download and keep.
 *
 * Same shape and the same PDF as the store-manager brief, in a fulfilment
 * centre's everyday terms. Nothing here names a person, vendor, truck, dock or
 * clock time from inside the simulation: an employer has never sat it. Every
 * sentence is fixed text chosen by the score, so the brief can never say
 * anything the scoring did not find.
 */

interface Plain {
  area: string;
  strength: string;
  weakness: string;
  partial?: string;
  ask: string;
  listen: string;
  careful: string;
}

export const FC_PLAIN: Readonly<Record<string, Plain>> = {
  IP1: {
    area: "Checks before unloading",
    strength: "Checked the paperwork, the truck seal and the temperature of a chilled truck before it was unloaded.",
    weakness: "Started unloading a chilled truck before the paperwork, seal and temperature were checked.",
    partial: "Did most of the checks on a chilled truck, but missed one or did it after unloading began.",
    ask: "A chilled truck reaches your dock. What do you check before the doors open, and in what order?",
    listen: "Invoice and ASN against the PO, the seal number and condition, and the truck's temperature record — all before unloading.",
    careful: "Opens the doors first and checks the paperwork later, or never mentions temperature.",
  },
  IP2: {
    area: "Getting the count right",
    strength: "Recounted when the scanned count and the paperwork did not match, before closing the receipt.",
    weakness: "Closed a receipt without settling a gap between the scanned count and the paperwork.",
    partial: "Noticed a count gap, but settled it only partly before closing the receipt.",
    ask: "The scanner shows two cartons fewer than the invoice. What do you do before you close the receipt?",
    listen: "Recounts the pallet, looks for unscanned or damaged cartons, then records any real shortage.",
    careful: "Accepts the invoice figure, or closes on the scan count without looking.",
  },
  IP3: {
    area: "GRN accuracy",
    strength: "Made the GRN only after the count and quality check were complete, for the quantity actually accepted.",
    weakness: "Made the GRN before the count or quality check was settled, or for the wrong quantity.",
    partial: "Made the GRN for nearly the right quantity, or a little before everything was settled.",
    ask: "When is it too early to make a GRN? Tell me about a GRN you had to correct.",
    listen: "Only after the count and QC; the GRN is the accepted quantity, with shortages and rejections recorded separately.",
    careful: "Makes the GRN for the invoice quantity \"to save time\" and plans to fix it later.",
  },
  IP4: {
    area: "Putaway after receiving",
    strength: "Sent accepted stock to the right storage and kept rejected stock clearly apart.",
    weakness: "Mixed accepted and rejected stock, or sent stock to the wrong storage.",
    partial: "Stored accepted stock correctly, but left rejected stock without a clear place.",
    ask: "How do you make sure rejected stock never ends up where pickers can pick it?",
    listen: "A separate, marked quarantine area, clear labels, and the stock held out of available stock in the system.",
    careful: "Says \"the team knows\" — no physical or system separation.",
  },
  IP5: {
    area: "Returns to the vendor",
    strength: "Set aside rejected stock, recorded why, and started the return to the vendor.",
    weakness: "Let stock that should go back to the vendor into normal stock, or left it with no next step.",
    partial: "Set aside rejected stock, but did not complete the return paperwork.",
    ask: "Walk me through what happens to a rejected crate from the dock until the vendor takes it back.",
    listen: "Quarantine, the reason recorded, an RTV raised, the vendor told, and the credit note followed up.",
    careful: "Leaves it in a corner, or throws it away without a record.",
  },

  DP1: {
    area: "Planning the docks",
    strength: "Planned every booked truck onto a dock before arrivals, with chilled stock on the cold dock and no more trucks than crews.",
    weakness: "Started the day with trucks unplanned, chilled stock on a normal dock, or more trucks than crews.",
    partial: "Made a workable dock plan with one gap — a truck unplaced or a crew overloaded for a while.",
    ask: "Before the first truck arrives, how do you plan which truck goes to which dock, and when?",
    listen: "Booking times, truck size, chilled needs, crews available and any dock out of service.",
    careful: "\"First come, first served\", with no plan.",
  },
  DP2: {
    area: "Chilled trucks first",
    strength: "Gave a late chilled truck a cold dock as soon as it arrived.",
    weakness: "Left a chilled truck waiting, or put it on a dock without cold power.",
    partial: "Got a chilled truck onto a cold dock, but only after a delay.",
    ask: "Three trucks arrive together and one is chilled. Who unloads first, and why?",
    listen: "Chilled first, because the risk grows every minute; the others get new slots with notice.",
    careful: "Strict arrival order, or whoever shouts loudest.",
  },
  DP3: {
    area: "Late and unbooked trucks",
    strength: "Fitted late and unbooked trucks in without pushing back confirmed bookings, and told every affected vendor the new time.",
    weakness: "Handled a late or unbooked truck in a way that pushed back confirmed bookings or left vendors uninformed.",
    partial: "Re-planned well, but told only some of the affected vendors.",
    ask: "A truck turns up with no booking and the driver wants to unload now. What do you check before you say yes or no?",
    listen: "Free docks and crews, the effect on confirmed bookings, then a clear time for the driver.",
    careful: "Says yes to keep the driver happy, or turns everyone away by rule.",
  },
  DP4: {
    area: "Docks and crews in step",
    strength: "Kept trucks and crews in step all morning — no truck waiting while a crew stood free.",
    weakness: "Planned more trucks than crews at times, or left trucks waiting while crews were free.",
    partial: "Mostly matched trucks to crews, with one short mismatch.",
    ask: "How do you stop crews standing idle early in the shift and trucks queueing an hour later?",
    listen: "Spreads arrivals, watches how many crews each half-hour needs, and moves bookings early.",
    careful: "Has no view of crew load and reacts only when queues form.",
  },
  DP5: {
    area: "Truck turnaround",
    strength: "Stepped in on a dock that was running over time and gave the waiting truck a real new slot.",
    weakness: "Let a dock run over time, or let a late truck turn into a queue.",
    partial: "Dealt with the overrunning dock, but left the waiting truck without a firm time.",
    ask: "A dock is 40 minutes over and the next truck is waiting. What do you do in the next ten minutes?",
    listen: "Finds why it is slow, adds people or moves the next truck, and gives the driver a real time.",
    careful: "Waits for it to finish on its own.",
  },

  DR1: {
    area: "Reading the tracker",
    strength: "Picked out the numbers that needed action — a pending GRN, the biggest loss and an open discrepancy.",
    weakness: "Focused on numbers that did not need action, or took a wrong total as real.",
    partial: "Found some of the numbers that needed action, but missed one.",
    ask: "You get the inbound tracker in the middle of the shift. What are the first three things you look for?",
    listen: "Pending GRNs, shortage and damage by vendor, open discrepancies and long dock times.",
    careful: "Reads only the total, or says everything looks fine.",
  },
  DR2: {
    area: "Checking before sending",
    strength: "Found a repeated row in the data and fixed the totals before sending anything.",
    weakness: "Sent figures with a repeated row in them, so the totals were wrong.",
    partial: "Fixed the totals only after being warned, or checked the data in a way that would not catch the error.",
    ask: "How do you check a report before you send it? Tell me about a mistake you caught.",
    listen: "Cross-checks totals against the dock schedule or the system, and looks for repeats and gaps.",
    careful: "Sends straight away: \"the system is always right\".",
  },
  DR3: {
    area: "Finding the source of losses",
    strength: "Named the vendor behind most of the day's shortage and damage.",
    weakness: "Named the wrong source of the day's losses.",
    ask: "Losses are up this week. How would you find out which vendor or process is behind it?",
    listen: "Breaks losses down by vendor, product and shift, then looks for the pattern.",
    careful: "Blames the team or \"transport\" without data.",
  },
  DR4: {
    area: "Shift updates",
    strength: "Wrote a shift update with volumes, problems, what is pending and what action is needed.",
    weakness: "Wrote a shift update that was misleading or left out what needed action.",
    partial: "Wrote a clear update, but left out one thing that needed action.",
    ask: "What goes into your end-of-shift update, and what do you leave out?",
    listen: "Volume received, exceptions, pending GRNs and returns, with an owner and next step for each.",
    careful: "\"All okay\" updates, or long stories without numbers.",
  },
  DR5: {
    area: "Escalating with evidence",
    strength: "Escalated a vendor problem with numbers and a clear request.",
    weakness: "Escalated vaguely, with wrong numbers, or not at all.",
    partial: "Escalated with numbers, but without a clear request.",
    ask: "How do you raise a vendor problem with your manager so that something actually happens?",
    listen: "Facts, numbers, the impact and a specific request.",
    careful: "Complains without data, or keeps quiet to avoid trouble.",
  },

  IQ1: {
    area: "Investigating a shortage",
    strength: "Recounted and checked the records, then split the gap correctly into short, damaged and unscannable stock.",
    weakness: "Closed a shortage without checking the count and records properly.",
    partial: "Checked the count, but split the gap only partly correctly.",
    ask: "The invoice says 500 cartons and 488 were scanned. What do you check before you raise a shortage note?",
    listen: "Recounts, looks for damaged or unscannable cartons, checks the truck is empty, then raises a DN for the real gap.",
    careful: "Raises a shortage for the full gap straight away, or ignores small gaps.",
  },
  IQ2: {
    area: "Damaged stock",
    strength: "Kept damaged cartons out of stock and sent them back to the vendor with a claim.",
    weakness: "Let damaged cartons into stock, or left their status unclear.",
    partial: "Kept damaged cartons out of stock, but did not complete the claim.",
    ask: "What do you do with crushed cartons, step by step, so nobody picks them by mistake?",
    listen: "Photos, quarantine, a record, then a return or claim with the vendor.",
    careful: "Sells them anyway, or bins them without a record.",
  },
  IQ3: {
    area: "Holding the quality standard",
    strength: "Rejected stock below the shelf-life rule and recorded why, even though stores needed it.",
    weakness: "Let stock below the quality rule in to protect volume.",
    partial: "Applied the quality rule, but did not fully record or follow through on the rejection.",
    ask: "Stores need a product tonight but a batch fails the shelf-life rule. What do you do, and what do you tell the stores?",
    listen: "Rejects it, records why, tells the stores and Procurement, and looks for other stock.",
    careful: "Lets it through \"just this once\".",
  },
  IQ4: {
    area: "Finding the real cause",
    strength: "Found the real cause of damage from the evidence, such as camera footage, not guesses.",
    weakness: "Blamed a cause the evidence did not show.",
    ask: "How do you find out whether damage happened at the vendor, on the road or on your own dock?",
    listen: "CCTV, how the load was stacked, the seal, and photos taken on arrival.",
    careful: "Blames the driver or their own team by default.",
  },
  IQ5: {
    area: "Stopping repeat problems",
    strength: "Put in a specific fix tied to the cause — for example, a stacking standard for the vendor and a check at the truck door.",
    weakness: "Only reminded people, or changed nothing.",
    partial: "Made one fix tied to the cause, but not a complete one.",
    ask: "After you find what caused damage, what do you change so it does not happen next week?",
    listen: "A specific change, agreed with the vendor or team, and checked afterwards.",
    careful: "Only \"told everyone to be careful\".",
  },

  TL1: {
    area: "Staffing the floor",
    strength: "Put the right people on each job, so unloading, scanning, quality check, putaway and GRN were all covered.",
    weakness: "Left a job short or with nobody on it, or used people away from the work they are trained or licensed for.",
    partial: "Covered every job, but one was a little short or had a person away from their main work.",
    ask: "One receiver is off sick. How do you staff unloading, scanning, QC, putaway and GRN?",
    listen: "Uses skills and licences — only licensed drivers on forklifts and reach trucks, QC never left empty — and moves cross-trained people.",
    careful: "Fills numbers without thinking about skills or licences.",
  },
  TL2: {
    area: "Moving people when work changes",
    strength: "Moved people to putaway as soon as unloading went quiet.",
    weakness: "Left people where they were while the putaway backlog grew.",
    partial: "Moved people to putaway, but later than needed.",
    ask: "Unloading is quiet but putaway is backing up. What do you do, and how fast?",
    listen: "Moves people quickly, uses licensed drivers, and checks again soon after.",
    careful: "Waits for a supervisor or the next shift.",
  },
  TL3: {
    area: "Delegating",
    strength: "Gave hands-on work to the right people and kept their own time for decisions.",
    weakness: "Did hands-on work personally while trained people were free, or gave tasks to people not trained for them.",
    partial: "Delegated most work, but did one hands-on job personally or gave one to the wrong person.",
    ask: "On a busy shift, what work do you never do yourself? Give me a real example.",
    listen: "Gives counts, QC and GRN to trained people and stays free to watch the docks.",
    careful: "Is proud of doing everything personally: \"it is faster if I do it\".",
  },
  TL4: {
    area: "Talking to vendors",
    strength: "Answered an angry vendor with facts, proof and a clear next step.",
    weakness: "Answered a vendor vaguely, angrily or with a threat.",
    partial: "Stayed polite with an angry vendor, but put off the facts until later.",
    ask: "A vendor says your team damaged their stock and threatens to stop supplying. What do you say?",
    listen: "Stays calm, shares the evidence and agrees a next step.",
    careful: "Argues, threatens, or promises without checking.",
  },
  TL5: {
    area: "Updating other teams",
    strength: "Sent Procurement and Inventory a clear update with numbers and who owns what.",
    weakness: "Sent other teams a vague, wrong or overly wide update.",
    partial: "Sent a correct update, but too brief to act on.",
    ask: "Procurement asks if stock will be ready for tonight. What do you send them, and who else needs to know?",
    listen: "Numbers, what is pending, owners and times — only to the teams that need it.",
    careful: "\"All fine\", or copies everyone.",
  },
};

export const FC_FLAG_TEXT: Readonly<Record<string, string>> = {
  coldchain: "Did not protect the cold chain: unloaded chilled stock before checking its temperature, or stored it as normal stock.",
  qcfail: "Accepted stock that had not passed the quality check.",
  grn: "Made a GRN while a known count gap was still open.",
  damaged: "Accepted damaged cartons into normal stock.",
  threat: "Threatened or blamed a vendor without evidence.",
  uncovered: "Left a receiving job with nobody working on it.",
  report: "Reported wrong numbers, or hid a vendor's losses.",
  coldroom: "Put off a required cold-room temperature check during a busy period.",
};

const RECOMMENDATION: Record<string, { label: string; text: string }> = {
  STRONG: { label: "Strong — move to interview", text: "Did well across the shift. Use the interview to confirm the areas below." },
  PROMISING: { label: "Promising — interview and probe", text: "Good overall, with some clear gaps. Spend the interview on the weaknesses below." },
  MIXED: { label: "Mixed — review carefully", text: "Some good decisions and some serious gaps. Interview only if the gaps can be trained." },
  ADDITIONAL: { label: "Not enough evidence yet", text: "The test did not show enough to judge. Consider a further assessment before interviewing." },
  WEAK: { label: "Weak result — further assessment advised", text: "Many decisions went against good warehouse practice. If you still want to consider them, discuss the gaps below in detail or use a further assessment first." },
};

const WORK_SAMPLE = "FC Executive work sample";
const ABOUT =
  "The candidate ran the inbound shift of a fulfilment centre in a 30-minute simulation — planning the docks, receiving trucks, quality checks, the shift data and the team. This report says what they did, in everyday warehouse terms.";

/** Interview topics for somebody who showed no clear weakness: still worth asking. */
const FALLBACK_PROBES = ["TL3", "DR2", "IP3", "IQ1"];

const word = (score: number) => (score >= 80 ? "Strong" : score >= 60 ? "Good" : score >= 40 ? "Needs work" : "Weak");
const said = (event: FcEvidence) => {
  const plain = FC_PLAIN[event.id]!;
  return event.score <= 1 ? plain.weakness : (plain.partial ?? plain.weakness);
};

export function buildFcBrief(result: FcResult, meta: { candidate: string; completedAt?: string | null }): EmployerBrief {
  const evidence = result.evidence.filter((event) => event.reached && FC_PLAIN[event.id]);

  // Weaknesses: 0s first, then 1s, then 2s. The order inside a score follows the competencies.
  const weakEvents = evidence.filter((event) => event.score <= 2).sort((a, b) => a.score - b.score).slice(0, 5);
  const weaknesses = weakEvents.map((event) => ({ area: FC_PLAIN[event.id]!.area, text: said(event) }));

  // Strengths: 3 of 3, one per competency first, then any others.
  const good = evidence.filter((event) => event.score === 3);
  const strengths: { area: string; text: string }[] = [];
  const used = new Set<string>();
  for (const pass of [0, 1]) {
    for (const event of good) {
      if (strengths.length >= 4) break;
      const plain = FC_PLAIN[event.id]!;
      if (strengths.some((item) => item.area === plain.area)) continue;
      if (pass === 0 && used.has(event.competency)) continue;
      used.add(event.competency);
      strengths.push({ area: plain.area, text: plain.strength });
    }
  }

  const probeIds = weakEvents.length ? weakEvents.map((event) => event.id) : FALLBACK_PROBES;
  const probes = probeIds.slice(0, 4).map((id) => {
    const plain = FC_PLAIN[id]!;
    const event = weakEvents.find((entry) => entry.id === id);
    return { area: plain.area, text: event ? said(event) : "No clear weakness here; worth confirming.", ask: plain.ask, listen: plain.listen, careful: plain.careful };
  });

  // The bottom rung means one of two things: too little was reached to judge, or it was reached and went badly.
  const tooLittle = result.incomplete && result.observed / Math.max(1, result.opportunities) < 0.5;
  const key = result.indication === "ADDITIONAL" && !tooLittle ? "WEAK" : result.indication;

  return {
    candidate: meta.candidate,
    date: meta.completedAt ?? null,
    sample: false,
    overall: result.overall,
    recommendation: RECOMMENDATION[key]!,
    completed: !result.incomplete,
    reached: { observed: result.observed, total: result.opportunities },
    skills: FC_COMPETENCIES.map((id) => {
      const competency = result.competencies.find((entry) => entry.id === id)!;
      return { ...FC_COMPETENCY_PLAIN[id], score: competency.score, word: competency.observed ? word(competency.score) : "Not reached", reached: competency.observed > 0 };
    }),
    strengths,
    weaknesses,
    probes,
    flags: result.flags.map((flag) => FC_FLAG_TEXT[flag.id] ?? flag.title),
    workSample: WORK_SAMPLE,
    about: ABOUT,
  };
}

/** Every fixed sentence the brief can use, so a check can prove none of them names the simulation. */
export function allFcBriefText(): string[] {
  return [
    ...Object.values(FC_PLAIN).flatMap((plain) => [plain.area, plain.strength, plain.weakness, plain.partial ?? "", plain.ask, plain.listen, plain.careful]),
    ...Object.values(FC_COMPETENCY_PLAIN).flatMap((area) => [area.name, area.about]),
    ...Object.values(FC_FLAG_TEXT),
    ...Object.values(RECOMMENDATION).flatMap((entry) => [entry.label, entry.text]),
    WORK_SAMPLE,
    ABOUT,
  ].filter(Boolean);
}
