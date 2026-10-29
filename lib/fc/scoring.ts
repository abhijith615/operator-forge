import {
  BOOKED,
  COLD_DOCK,
  CONFIRMED,
  CREWS_AT_FULL_TEAM,
  DOCKS,
  ESCALATIONS,
  PROCUREMENT_MESSAGES,
  REPORT_LINES,
  SIGNALS,
  SLOTS,
  VEHICLES,
  VENDOR_REPLIES,
  nameOf,
  type VehicleId,
} from "./content";
import { arrivesAt, busyAt, canPlace, crewsOf, outcomeOf } from "./engine";
import { SCENES, type FcState, type Placement, type SceneId } from "./types";
import { FC_COMPETENCIES, FC_COMPETENCY_LABEL, FC_COMPETENCY_PLAIN, FC_VERSION, FC_WEIGHTS, type FcCompetencyId } from "./weights";

/**
 * FC Executive scoring.
 *
 * Twenty-five behaviours, five per competency, each scored 0–3 by fixed rules
 * from what the candidate did. Nothing here is a judgement made at run time:
 * the same actions always give the same score.
 *
 * A behaviour whose moment the candidate never reached, because the thirty
 * minutes ran out, is "not reached" and left out — not scored as a zero.
 * One they reached and skipped (closing a receipt with no QC, say) is a zero:
 * skipping it was the decision.
 */

export interface FcEvidence {
  id: string;
  competency: FcCompetencyId;
  title: string;
  /** What they did, in plain words. */
  did: string;
  score: 0 | 1 | 2 | 3;
  reached: boolean;
}

export interface FcFlag {
  id: string;
  title: string;
  detail: string;
}

export interface FcCompetencyResult {
  id: FcCompetencyId;
  label: string;
  score: number;
  observed: number;
  opportunities: number;
}

export interface FcResult {
  version: string;
  overall: number;
  incomplete: boolean;
  observed: number;
  opportunities: number;
  competencies: FcCompetencyResult[];
  evidence: FcEvidence[];
  flags: FcFlag[];
  indication: "STRONG" | "PROMISING" | "MIXED" | "ADDITIONAL";
  indicationLabel: string;
  probes: { area: string; seen: string; ask: string }[];
  strengths: { title: string; text: string }[];
  development: { title: string; text: string } | null;
  outcome: { title: string; lines: string[] };
}

/* ── The catalogue ────────────────────────────────────────────────────── */

interface Def {
  id: string;
  c: FcCompetencyId;
  /** The scene the behaviour is decided in. Not reached if time ran out before it, or in it undecided. */
  scene: SceneId;
  title: string;
  /** Said to an employer when it went well, and to the candidate as a strength. */
  strength: string;
  /** Said when it went badly. */
  weakness: string;
  /** An interview question for this behaviour. */
  ask: string;
}

export const FC_BEHAVIOURS: Def[] = [
  { id: "IP1", c: "IP", scene: "receive", title: "Checks before unloading", strength: "Checked the documents, seal and temperature before the chilled truck was unloaded.", weakness: "Unloaded a chilled truck before all the checks were done.", ask: "A chilled truck reaches your dock. What do you check before the doors open, and why in that order?" },
  { id: "IP2", c: "IP", scene: "receive", title: "Quantity control", strength: "Recounted when the scan and the paperwork disagreed, before closing the count.", weakness: "Closed the count without settling a gap between the scan and the paperwork.", ask: "The scanner shows 238 and the invoice says 240. What do you do before you close the receipt?" },
  { id: "IP3", c: "IP", scene: "receive", title: "GRN accuracy", strength: "Made the GRN only after the count and QC were complete, for the right quantity.", weakness: "Made the GRN before the count or QC was settled, or for the wrong quantity.", ask: "When is it too early to make a GRN? Tell me about a GRN you had to correct." },
  { id: "IP4", c: "IP", scene: "receive", title: "Putaway handover", strength: "Sent good stock to the right storage and kept rejected stock clearly apart.", weakness: "Mixed accepted and rejected stock, or sent stock on without a clear status.", ask: "How do you make sure rejected stock never ends up in a pick location?" },
  { id: "IP5", c: "IP", scene: "receive", title: "Returns and exceptions", strength: "Set aside the rejected stock, recorded why and started the return to the vendor.", weakness: "Let stock that should go back to the vendor enter normal stock, or left it with no next step.", ask: "Walk me through what happens to a rejected crate from the dock until the vendor takes it back." },

  { id: "DP1", c: "DP", scene: "plan", title: "Dock plan before arrivals", strength: "Built a dock plan with every truck placed, the chilled truck on the cold dock, and no more trucks than crews.", weakness: "Started the day with a dock plan that left trucks unplaced or crews overloaded.", ask: "Before the first truck arrives, how do you plan which truck goes to which dock?" },
  { id: "DP2", c: "DP", scene: "replan", title: "Priority to the right truck", strength: "Put the late chilled truck straight onto the cold dock when it arrived.", weakness: "Left the chilled truck waiting, or put it on a dock without cold power.", ask: "Three trucks arrive together and one is chilled. How do you decide who unloads first?" },
  { id: "DP3", c: "DP", scene: "replan", title: "Late and unbooked trucks", strength: "Fitted the late and unbooked trucks in without pushing back confirmed bookings, and told vendors the new times.", weakness: "Handled the late or unbooked truck in a way that disrupted confirmed bookings or left vendors uninformed.", ask: "A truck turns up with no booking and the driver wants to unload now. What do you check before you say yes or no?" },
  { id: "DP4", c: "DP", scene: "replan", title: "Docks and crews in step", strength: "Kept trucks and crews matched across the morning: no truck waiting while a crew stood free.", weakness: "Planned more trucks than crews at times, or left trucks waiting while crews were free.", ask: "How do you stop the situation where crews are idle at 9 and three trucks queue at 10?" },
  { id: "DP5", c: "DP", scene: "peak", title: "Protecting turnaround", strength: "Stepped in on an overrunning dock and gave the late truck a real new slot.", weakness: "Let a dock overrun or a late truck turn into a queue.", ask: "A dock is 40 minutes over and the next truck is waiting. What do you do in the next ten minutes?" },

  { id: "DR1", c: "DR", scene: "data", title: "Reading the tracker", strength: "Picked out the numbers that needed action: a pending GRN, the biggest loss and the open discrepancy.", weakness: "Picked numbers that did not need action, or read a wrong total as real.", ask: "You get the inbound tracker at 11. What are the first three things you look for?" },
  { id: "DR2", c: "DR", scene: "data", title: "Checking before sending", strength: "Found the repeated row and fixed the totals before sending anything.", weakness: "Sent numbers that did not match the dock schedule.", ask: "How do you check a report before you send it? Tell me about a mistake you caught." },
  { id: "DR3", c: "DR", scene: "data", title: "Finding the driver", strength: "Named the vendor behind most of the day's short and damaged stock.", weakness: "Named the wrong source of the day's losses.", ask: "Losses are up this week. How would you find out which vendor or process is behind it?" },
  { id: "DR4", c: "DR", scene: "data", title: "A useful shift update", strength: "Wrote an update with volume, exceptions, what is pending and what action is needed.", weakness: "Wrote an update that was misleading or missed what needed action.", ask: "What goes into your end-of-shift update, and what do you leave out?" },
  { id: "DR5", c: "DR", scene: "data", title: "Escalating with evidence", strength: "Escalated the vendor problem with numbers and a clear request.", weakness: "Escalated vaguely, with wrong numbers, or not at all.", ask: "How do you raise a vendor problem with your manager so that something actually happens?" },

  { id: "IQ1", c: "IQ", scene: "discrepancy", title: "Investigating a shortage", strength: "Recounted and checked the records, then split the gap correctly into short, damaged and unscannable.", weakness: "Closed the shortage without checking the count and records properly.", ask: "480 expected, 468 scanned. What do you check before you raise a shortage note?" },
  { id: "IQ2", c: "IQ", scene: "discrepancy", title: "Damaged stock", strength: "Kept damaged cartons out of stock and sent them back to the vendor with a claim.", weakness: "Let damaged cartons into stock, or left their status unclear.", ask: "What do you do with crushed cartons, step by step, so nobody picks them by mistake?" },
  { id: "IQ3", c: "IQ", scene: "receive", title: "Holding the QC standard", strength: "Rejected crates below the shelf-life rule and wrote down why, even though stores needed them.", weakness: "Let stock below the QC rule in to protect volume.", ask: "Stores need curd tonight but a batch fails the shelf-life rule. What do you do, and what do you tell the stores?" },
  { id: "IQ4", c: "IQ", scene: "discrepancy", title: "Finding the root cause", strength: "Found the real cause of the damage using the camera, not guesses.", weakness: "Blamed a cause the evidence did not show.", ask: "How do you find out whether damage happened at the vendor, on the road or on your dock?" },
  { id: "IQ5", c: "IQ", scene: "discrepancy", title: "Stopping it happening again", strength: "Put in a specific fix tied to the cause: the vendor's stacking and a check at the truck door.", weakness: "Only reminded people, or changed nothing.", ask: "After you find what caused damage, what do you change so it does not happen next week?" },

  { id: "TL1", c: "TL", scene: "plan", title: "Staffing the floor", strength: "Put people on the right work so every activity, including QC, was covered.", weakness: "Left an activity short or with nobody on it.", ask: "One receiver is off sick. How do you staff unloading, scanning, QC, putaway and GRN?" },
  { id: "TL2", c: "TL", scene: "peak", title: "Moving people when work changes", strength: "Moved people to putaway as soon as unloading quietened.", weakness: "Left people where they were while the backlog grew.", ask: "Unloading is quiet but putaway is backing up. What do you do, and how fast?" },
  { id: "TL3", c: "TL", scene: "receive", title: "Delegating", strength: "Gave hands-on work to the right people and kept their own time for decisions.", weakness: "Did hands-on work personally while trained people were free.", ask: "On a busy shift, what work do you never do yourself? Give me a real example." },
  { id: "TL4", c: "TL", scene: "peak", title: "Talking to vendors", strength: "Answered the angry vendor with facts, proof and a clear next step.", weakness: "Answered the vendor vaguely, angrily or with a threat.", ask: "A vendor says your team damaged their stock and threatens to stop supplying. What do you say?" },
  { id: "TL5", c: "TL", scene: "peak", title: "Updating other teams", strength: "Sent Procurement and Inventory a clear update with numbers and who owns what.", weakness: "Sent a vague, wrong or too-wide update.", ask: "Procurement asks if stock will be ready for tonight. What do you send them, and who else needs it?" },
];

const DEF = Object.fromEntries(FC_BEHAVIOURS.map((d) => [d.id, d])) as Record<string, Def>;

/* ── Helpers ──────────────────────────────────────────────────────────── */

const clamp = (n: number) => Math.max(0, Math.min(3, n)) as 0 | 1 | 2 | 3;
const fromIssues = (issues: number) => clamp(3 - issues);
const sceneIndex = (scene: SceneId) => SCENES.indexOf(scene);

type Board = Partial<Record<VehicleId, Placement>>;

function overloads(board: Board, crews: number): number {
  let count = 0;
  for (let slot = 0; slot < SLOTS; slot += 1) if (busyAt(board, slot).length > crews) count += 1;
  return count;
}

/** A truck waited although a dock and a crew were free for its whole unload earlier. */
function idleWaits(state: FcState, board: Board, crews: number): number {
  let count = 0;
  for (const v of Object.keys(board) as VehicleId[]) {
    const p = board[v]!;
    const arrive = arrivesAt(state, v);
    if (p.start <= arrive) continue;
    const without: Board = { ...board };
    delete without[v];
    const probe = { ...state, board: without };
    for (let t = arrive; t < p.start; t += 1) {
      const crewFree = Array.from({ length: VEHICLES[v].length }, (_, k) => busyAt(without, t + k).length < crews).every(Boolean);
      const dockFree = DOCKS.some((dock) => (VEHICLES[v].chilled ? dock === COLD_DOCK : true) && canPlace(probe, v, dock, t));
      if (crewFree && dockFree) {
        count += 1;
        break;
      }
    }
  }
  return count;
}

const timeOf = (p: Placement | undefined) => (p ? `${p.dock.replace("D", "Dock ")} at ${["07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00"][p.start]}` : "not placed");

/* ── Each behaviour ───────────────────────────────────────────────────── */

type Eval = { score: 0 | 1 | 2 | 3; did: string } | null;

function evaluate(state: FcState, id: string): Eval {
  const r = state.receive;
  const d = state.disc.decision;
  const data = state.data;
  const peak = state.peak;
  switch (id) {
    /* Dock planning */
    case "DP1": {
      const plan = state.initialPlan;
      if (!plan) return null;
      let issues = 0;
      const notes: string[] = [];
      for (const v of BOOKED) {
        const p = plan[v];
        if (!p) {
          issues += 2;
          notes.push(`${VEHICLES[v].vendor} not placed`);
          continue;
        }
        if (VEHICLES[v].chilled && p.dock !== COLD_DOCK) {
          issues += 1;
          notes.push("chilled truck not on the cold dock");
        }
        if (p.start - (VEHICLES[v].booked ?? p.start) >= 2) {
          issues += 1;
          notes.push(`${VEHICLES[v].vendor} pushed back an hour or more`);
        }
      }
      const over = overloads(plan, CREWS_AT_FULL_TEAM);
      if (over) notes.push(`more trucks than crews in ${over} half-hour${over === 1 ? "" : "s"}`);
      issues += over;
      return { score: fromIssues(issues), did: notes.length ? `First dock plan: ${notes.join("; ")}.` : "First dock plan: every truck placed, chilled truck on the cold dock, never more than 3 at once." };
    }

    case "DP2": {
      const plan = state.finalPlan;
      if (!plan) return null;
      const p = plan.dairy;
      const score = !p || p.dock !== COLD_DOCK ? 0 : p.start <= 3 ? 3 : p.start === 4 ? 2 : 1;
      return { score, did: `Late chilled truck (at the gate 09:00): ${p ? timeOf(p) : "not placed"}.` };
    }

    case "DP3": {
      const plan = state.finalPlan;
      if (!plan) return null;
      const crews = crewsOf(state.team);
      const delayed = CONFIRMED.filter((v) => !plan[v] || plan[v]!.start > (VEHICLES[v].booked ?? 0));
      const over = overloads(plan, crews);
      const qb = state.quickbev;
      let score: 0 | 1 | 2 | 3;
      if (over >= 2) score = 0;
      else if (qb === null || qb === "turnaway") score = 1;
      else if (delayed.length >= 2) score = 1;
      else if (delayed.length === 1) score = state.notified ? 2 : 1;
      else score = state.notified ? 3 : 2;
      const qbText = { board: "gave QuickBev a slot", offpeak: "asked QuickBev to wait for a quiet slot", turnaway: "turned QuickBev away" }[qb ?? "turnaway"];
      return {
        score,
        did: `${qb ? qbText[0]!.toUpperCase() + qbText.slice(1) : "Left QuickBev waiting at the gate with no decision"}; ${delayed.length ? `pushed back ${delayed.map((v) => VEHICLES[v].vendor).join(", ")}` : "kept every confirmed booking on time"}; ${state.notified ? "sent vendors their new times" : "did not tell vendors the new times"}.`,
      };
    }

    case "DP4": {
      const plan = state.finalPlan;
      if (!plan) return null;
      const crews = crewsOf(state.team);
      const over = overloads(plan, crews);
      const idle = idleWaits(state, plan, crews);
      const missing = (["spice", "dairy", "bright", "crunchy", "mega"] as VehicleId[]).filter((v) => !plan[v]).length;
      const issues = over + idle + missing * 2;
      const parts = [
        over ? `more trucks than crews (${crews}) in ${over} half-hour${over === 1 ? "" : "s"}` : null,
        idle ? `${idle} truck${idle === 1 ? "" : "s"} waiting while a dock and crew were free` : null,
        missing ? `${missing} booked truck${missing === 1 ? "" : "s"} left off the board` : null,
      ].filter(Boolean);
      return { score: fromIssues(issues), did: parts.length ? `Final plan: ${parts.join("; ")}.` : `Final plan kept trucks and ${crews} crews in step all morning.` };
    }

    case "DP5": {
      if (!peak.buckets) return null;
      const a = { now: 3, delegate: 2, escalate: 1, reschedule: 1 }[peak.buckets.overrun];
      const b = { reschedule: 3, escalate: 2, delegate: 1, now: 1 }[peak.buckets.megaLate];
      const score = clamp(Math.floor((a + b) / 2));
      const word = { now: "dealt with it personally", delegate: "delegated it", reschedule: "rescheduled it", escalate: "escalated it" };
      return { score, did: `Overrunning dock: ${word[peak.buckets.overrun]}. Late 32-ft truck: ${word[peak.buckets.megaLate]}.` };
    }

    /* Inbound process */
    case "IP1": {
      if (r.steps.unload === undefined && !r.closed) return null;
      const unloadAt = r.steps.unload ?? Infinity;
      const grnAt = r.steps.grn ?? Infinity;
      const required = ["documents", "seal", "temperature"] as const;
      const before = required.filter((c) => (r.checks[c] ?? Infinity) < unloadAt).length;
      const beforeGrn = required.filter((c) => (r.checks[c] ?? Infinity) < grnAt).length;
      const score = r.steps.unload === undefined ? 0 : before === 3 ? 3 : beforeGrn === 3 ? 2 : beforeGrn >= 1 ? 1 : 0;
      const missed = required.filter((c) => (r.checks[c] ?? Infinity) >= unloadAt);
      return { score, did: missed.length ? `Unloaded before checking: ${missed.join(", ")}.` : "Checked documents, seal and temperature before unloading." };
    }

    case "IP2": {
      if (!r.count || r.count.choice === "driver") {
        if (!r.closed) return null;
        return { score: 0, did: "Closed the receipt without settling the 238 vs 240 count." };
      }
      const c = r.count.choice;
      const score = c === "recount" ? (r.count.asked ? 2 : 3) : c === "invoice" ? 1 : 0;
      const text = { recount: "had the crates recounted and found the 2 missing scans", invoice: "accepted 240 from the invoice without checking", close: "closed the count at 238 and raised a shortage note", driver: "" }[c];
      return { score, did: `Scan 238, invoice 240: ${r.count.asked ? "asked the driver, then " : ""}${text}.` };
    }

    case "IP3": {
      if (!r.grn) {
        if (!r.closed) return null;
        return { score: 1, did: "Closed the receipt without making a GRN." };
      }
      const rejected = r.qc?.decision === "reject" || r.qc?.decision === "rejectNoted";
      const expected = rejected ? 228 : 240;
      const known = !r.grn.reconciled || r.grn.qty === 238 || (rejected && r.grn.qty === 240);
      const score = known ? 0 : !r.grn.afterQc ? 1 : r.grn.qty === expected ? 3 : 2;
      return {
        score,
        did: `GRN for ${r.grn.qty} crates${r.grn.afterQc ? " after QC" : " before QC was finished"}${r.grn.reconciled ? "" : ", with the count not settled"}.`,
      };
    }

    case "IP4": {
      if (!r.putaway) {
        if (!r.closed) return null;
        return { score: 1, did: "Closed the receipt with stock still on the dock." };
      }
      const rejected = r.qc?.decision === "reject" || r.qc?.decision === "rejectNoted";
      let score: 0 | 1 | 2 | 3 = { split: 3, allCold: rejected ? 0 : 3, dockAside: rejected ? 2 : 3, ambient: 1 }[r.putaway] as 0 | 1 | 2 | 3;
      const early = r.steps.grn === undefined || (r.steps.putaway ?? 0) < r.steps.grn;
      if (early) score = Math.min(score, 1) as 0 | 1;
      const text = {
        split: "good stock to the cold room, rejected crates to cold quarantine with an RTV note",
        allCold: "everything to the cold room, to sort later",
        dockAside: "good stock to the cold room, rejected crates left by the dock",
        ambient: "everything to normal (not cold) storage",
      }[r.putaway];
      return { score, did: `Putaway: ${text}${early ? ", before the GRN was made" : ""}.` };
    }

    case "IP5": {
      if (!r.closed && !r.qc?.decision) return null;
      const dec = r.qc?.decision ?? null;
      if (!dec) return { score: 0, did: "No QC decision, so nothing was set aside for return." };
      if (dec === "acceptAll") return { score: 0, did: "Accepted the 12 crates that failed the shelf-life rule into stock." };
      if (dec === "holdAll") return { score: 1, did: "Held the whole truck instead of returning only the failed crates." };
      const s = r.putaway === "split" ? (dec === "rejectNoted" ? 3 : 2) : r.putaway === "dockAside" || !r.putaway ? 1 : 0;
      return { score: s as 0 | 1 | 2 | 3, did: `Rejected 12 crates${dec === "rejectNoted" ? " with the reason written down" : ""}; ${r.putaway === "split" ? "sent them to cold quarantine with an RTV note" : r.putaway === "dockAside" ? "left them by the dock" : r.putaway ? "mixed them back into storage" : "no putaway decision"}.` };
    }

    /* Issue resolution */
    case "IQ3": {
      if (!r.qc?.decision) {
        if (!r.closed) return null;
        return { score: 0, did: r.qc ? "Did the QC check but made no decision on the failed crates." : "Closed the receipt without a quality check." };
      }
      const score = { rejectNoted: 3, reject: 2, holdAll: 1, acceptAll: 0 }[r.qc.decision] as 0 | 1 | 2 | 3;
      const text = { rejectNoted: "rejected the 12 crates and wrote down why", reject: "rejected the 12 crates", holdAll: "held the whole truck", acceptAll: "accepted all 240 to keep stores supplied" }[r.qc.decision];
      return { score, did: `12 crates with 60% shelf life (rule: 70%): ${text}.` };
    }

    case "IQ1": {
      if (!d) return null;
      const docs = (["scan", "qcnote", "log"] as const).filter((e) => state.disc.evidence.includes(e)).length;
      const recount = state.disc.recount !== null;
      const correct = d.short === 2 && d.damaged === 6 && d.unscannable === 4;
      const score = docs === 0 && !recount ? 0 : correct && recount && docs >= 2 ? 3 : correct ? 2 : 1;
      return { score, did: `Split the 12 as ${d.short} short, ${d.damaged} damaged, ${d.unscannable} unscannable (true: 2, 6, 4). ${recount ? "Recounted the short pallets" : "No recount"}; opened ${docs} of 3 records.` };
    }

    case "IQ2": {
      if (!d) return null;
      const score = d.damaged === 0 ? 1 : ({ rtv: 3, scrap: 2, accept: 0 } as const)[d.damagedFate];
      const text = { rtv: "quarantined and sent back on RTV", scrap: "thrown away with no vendor claim", accept: "accepted into stock" }[d.damagedFate];
      return { score, did: d.damaged === 0 ? "Did not identify any damaged cartons, so their status stayed unclear." : `Damaged cartons: ${text}.` };
    }

    case "IQ4": {
      if (!d) return null;
      const sawCamera = state.disc.evidence.includes("cctv");
      const score = d.cause === "vendorStacking" ? (sawCamera ? 3 : 2) : d.cause === "ourUnloading" ? 0 : 1;
      const text = { vendorStacking: "vendor stacked pallets two high", ourUnloading: "our team dropped them", transport: "bad roads", unsure: "not sure yet" }[d.cause];
      return { score, did: `Cause given: ${text}${d.cause === "vendorStacking" && !sawCamera ? " (without checking the camera)" : ""}.` };
    }

    case "IQ5": {
      if (!d) return null;
      const score = { gateCheck: 3, review: 2, remind: 1, nothing: 0 }[d.prevent] as 0 | 1 | 2 | 3;
      const text = { gateCheck: "stop double stacking and check pallets at the truck door", review: "raise it at the monthly vendor review", remind: "remind the team to be careful", nothing: "no change" }[d.prevent];
      return { score, did: `Fix chosen: ${text}.` };
    }

    /* Data */
    case "DR1": {
      if (!data.signals) return null;
      const real = data.signals.filter((id) => SIGNALS.find((s) => s.id === id)?.real).length;
      const wrong = data.signals.length - real;
      return { score: clamp(real - wrong), did: `Picked ${real} of the 3 real signals${wrong ? ` and ${wrong} that did not need action` : ""}.` };
    }

    case "DR2": {
      if (!data.report) return null;
      if (data.report.inconsistent) return { score: 0, did: "Sent the update with a repeated row in the totals." };
      if (data.dedupedAfterPrompt) return { score: data.tools.some((t) => t === "totals" || t === "duplicates") ? 2 : 1, did: "Fixed the repeated row only after the system warned the totals did not match." };
      return { score: 3, did: "Found and removed the repeated row before sending." };
    }

    case "DR3": {
      if (!data.driver) return null;
      const score = ({ spice: 3, grocery: 2, spread: 1, crunchy: 0, dairy: 0 } as Record<string, number>)[data.driver] ?? 0;
      return { score: clamp(score), did: `Named as the main source of losses: ${({ spice: "Spice Route", grocery: "grocery vendors in general", spread: "spread across all vendors", crunchy: "Crunchy Snacks", dairy: "FreshFarm Dairy" } as Record<string, string>)[data.driver] ?? data.driver}.` };
    }

    case "DR4": {
      if (!data.report) return null;
      const lines = data.report.lines.map((id) => REPORT_LINES.find((l) => l.id === id)).filter(Boolean);
      if (lines.some((l) => l!.kind === "misleading")) return { score: 0, did: "The update included a misleading line." };
      const kinds = new Set(lines.map((l) => l!.kind));
      const covered = (["volume", "exceptions", "status", "action"] as const).filter((k) => kinds.has(k)).length;
      return { score: covered === 4 ? 3 : covered === 3 ? 2 : 1, did: `The update covered ${covered} of 4: volume, exceptions, pending work, action needed.` };
    }

    case "DR5": {
      if (!data.escalation) return null;
      const score = ({ evidence: 3, partial: 2, vague: 1, wrong: 0, hide: 0 } as Record<string, number>)[data.escalation] ?? 0;
      return { score: clamp(score), did: `To the Operations Manager: “${ESCALATIONS.find((e) => e.id === data.escalation)?.text ?? ""}”` };
    }

    /* Team */
    case "TL1": {
      if (!state.teamLocked) return null;
      const P = Math.min(3, Math.max(1, state.plannedPeak));
      const have = (task: string) => Object.values(state.team).filter((t) => t === task).length;
      const need: Record<string, number> = { unload: 2 * P, scan: P, qc: 1, putaway: 2, grn: 1 };
      const empty = Object.keys(need).filter((t) => have(t) === 0);
      const short = Math.max(...Object.keys(need).map((t) => need[t]! - have(t)));
      const surplus = Math.max(have("unload") - need.unload!, have("scan") - need.scan!);
      const score = empty.length ? 0 : short >= 2 ? 1 : short === 1 ? 2 : surplus >= 3 ? 1 : 3;
      const label: Record<string, string> = { unload: "unloading", scan: "scanning", qc: "QC", putaway: "putaway", grn: "GRN" };
      return {
        score,
        did: empty.length
          ? `Left nobody on ${empty.map((t) => label[t]).join(", ")}.`
          : `Team: ${Object.keys(need).map((t) => `${label[t]} ${have(t)}/${need[t]}`).join(", ")}.`,
      };
    }

    case "TL2": {
      if (!peak.buckets) return null;
      const score = ({ delegate: 3, now: 2, escalate: 1, reschedule: 0 } as const)[peak.buckets.backlog];
      const text = { delegate: "moved the drivers and two loaders to putaway", now: "drove the pallet truck personally", escalate: "asked the manager for overtime staff", reschedule: "left the backlog for later" }[peak.buckets.backlog];
      return { score, did: `46-pallet putaway backlog: ${text}.` };
    }

    case "TL3": {
      if (state.reachedAt.receive === undefined) return null;
      const self = state.personal.length;
      const wrong = state.handed.filter((h) => !h.suited).length;
      const score = fromIssues(Math.max(0, self + wrong - 1));
      const parts = [
        self ? `did ${self} hands-on job${self === 1 ? "" : "s"} personally` : "did no hands-on jobs personally",
        wrong ? `gave ${wrong} job${wrong === 1 ? "" : "s"} to someone not trained for it (${state.handed.filter((h) => !h.suited).map((h) => nameOf(h.to)).join(", ")})` : null,
      ].filter(Boolean);
      return { score, did: `Across the shift: ${parts.join("; ")}.` };
    }

    case "TL4": {
      if (!peak.vendorReply) return null;
      const score = ({ facts: 3, later: 2, angry: 1, threat: 0 } as Record<string, number>)[peak.vendorReply] ?? 0;
      return { score: clamp(score), did: `To the vendor: “${VENDOR_REPLIES.find((v) => v.id === peak.vendorReply)?.text ?? ""}”` };
    }

    case "TL5": {
      if (!peak.procurement) return null;
      const score = ({ full: 3, brief: 2, broadcast: 1, allFine: 0 } as Record<string, number>)[peak.procurement] ?? 0;
      const m = PROCUREMENT_MESSAGES.find((p) => p.id === peak.procurement);
      return { score: clamp(score), did: `To ${m?.to ?? "?"}: “${m?.text ?? ""}”` };
    }
  }
  return null;
}

/* ── Flags ────────────────────────────────────────────────────────────── */

function flagsOf(state: FcState, byId: Record<string, FcEvidence>): FcFlag[] {
  const flags: FcFlag[] = [];
  const r = state.receive;
  const got = (id: string) => byId[id];
  const tempBeforeUnload = (r.checks.temperature ?? Infinity) < (r.steps.unload ?? Infinity);
  if ((r.steps.unload !== undefined && !tempBeforeUnload) || r.putaway === "ambient") {
    flags.push({ id: "coldchain", title: "Cold chain not protected", detail: r.putaway === "ambient" ? "Chilled stock was sent to normal storage." : "A chilled truck was unloaded before its temperature was checked." });
  }
  if (r.qc?.decision === "acceptAll" || (r.closed && !r.qc?.decision)) {
    flags.push({ id: "qcfail", title: "Stock accepted without passing QC", detail: r.qc?.decision === "acceptAll" ? "12 crates below the 70% shelf-life rule were accepted into stock." : "The chilled receipt was closed with no QC decision." });
  }
  if (got("IP3")?.reached && got("IP3")!.score === 0) flags.push({ id: "grn", title: "GRN made with a known discrepancy", detail: got("IP3")!.did });
  if (state.disc.decision?.damagedFate === "accept" && state.disc.decision.damaged > 0) flags.push({ id: "damaged", title: "Damaged stock accepted", detail: "Crushed cartons were accepted into normal stock." });
  if (state.peak.vendorReply === "threat") flags.push({ id: "threat", title: "Vendor threatened or blamed without evidence", detail: "The reply blamed the driver and threatened the vendor's bookings." });
  if (got("TL1")?.reached && got("TL1")!.score === 0) flags.push({ id: "uncovered", title: "An activity left with nobody", detail: got("TL1")!.did });
  if (state.data.report?.inconsistent || state.data.escalation === "wrong" || state.data.escalation === "hide") {
    flags.push({ id: "report", title: "Wrong numbers reported, or a loss hidden", detail: state.data.report?.inconsistent ? "The shift update was sent with a repeated row in the totals." : "The escalation gave wrong numbers or hid the vendor's losses." });
  }
  const temp = state.peak.buckets?.tempLog;
  if (temp === "reschedule" || temp === "escalate") flags.push({ id: "coldroom", title: "Cold-room temperature check missed", detail: "The 2-hourly cold-room check was put off during the peak." });
  return flags;
}

/* ── The result ───────────────────────────────────────────────────────── */

const INDICATION_LABEL = {
  STRONG: "Strong evidence — proceed to interview",
  PROMISING: "Promising — probe specific areas",
  MIXED: "Mixed evidence — review",
  ADDITIONAL: "Additional assessment recommended",
} as const;

export function scoreFc(state: FcState): FcResult {
  const expiredAt = state.expiredIn ? sceneIndex(state.expiredIn) : Infinity;

  const evidence: FcEvidence[] = FC_BEHAVIOURS.map((def) => {
    const e = evaluate(state, def.id);
    if (e) return { id: def.id, competency: def.c, title: def.title, did: e.did, score: e.score, reached: true };
    // Undecided: never got there, or time ran out with it open — not reached. Otherwise it was skipped.
    const reached = sceneIndex(def.scene) < expiredAt && state.reachedAt[def.scene] !== undefined && sceneIndex(state.scene) > sceneIndex(def.scene);
    return reached
      ? { id: def.id, competency: def.c, title: def.title, did: "Not done.", score: 0, reached: true }
      : { id: def.id, competency: def.c, title: def.title, did: "Not reached before time ran out.", score: 0, reached: false };
  });

  const byId = Object.fromEntries(evidence.map((e) => [e.id, e]));

  const competencies: FcCompetencyResult[] = FC_COMPETENCIES.map((c) => {
    const mine = evidence.filter((e) => e.competency === c);
    const seen = mine.filter((e) => e.reached);
    const earned = seen.reduce((sum, e) => sum + e.score, 0);
    return {
      id: c,
      label: FC_COMPETENCY_LABEL[c],
      score: seen.length ? Math.round((earned / (seen.length * 3)) * 100) : 0,
      observed: seen.length,
      opportunities: mine.length,
    };
  });

  // Equal weights; a competency only partly seen counts for the share of it that was seen.
  const weightSeen = competencies.reduce((sum, c) => sum + FC_WEIGHTS[c.id] * (c.observed / c.opportunities), 0);
  const overall = weightSeen ? Math.round(competencies.reduce((sum, c) => sum + c.score * FC_WEIGHTS[c.id] * (c.observed / c.opportunities), 0) / weightSeen) : 0;

  const observed = evidence.filter((e) => e.reached).length;
  const opportunities = evidence.length;
  // Finished means every decision was made — even if the clock ran out on the closing screen.
  const incomplete = state.peak.procurement === null;
  const flags = flagsOf(state, byId);

  const share = observed / opportunities;
  const seenComps = competencies.filter((c) => c.observed > 0);
  // "Strong" means strong throughout: no flag, no weak area, and nothing done the opposite way.
  const anyZero = evidence.some((e) => e.reached && e.score === 0);
  const earned =
    overall >= 75 && flags.length === 0 && !anyZero && seenComps.every((c) => c.score >= 60) ? 3
    : overall >= 62 && seenComps.every((c) => c.score >= 40) ? 2
    : overall >= 48 ? 1
    : 0;
  const ceiling = !incomplete ? 3 : share >= 0.85 ? 2 : share >= 0.5 ? 1 : 0;
  const indication = (["ADDITIONAL", "MIXED", "PROMISING", "STRONG"] as const)[Math.min(earned, ceiling)]!;

  const reachedLow = evidence.filter((e) => e.reached && e.score <= 1).sort((a, b) => a.score - b.score);
  const probes = reachedLow.slice(0, 4).map((e) => ({ area: DEF[e.id]!.title, seen: DEF[e.id]!.weakness, ask: DEF[e.id]!.ask }));

  const strengths = evidence
    .filter((e) => e.reached && e.score === 3)
    .filter((e, i, all) => all.findIndex((x) => x.competency === e.competency) === i)
    .slice(0, 3)
    .map((e) => ({ title: DEF[e.id]!.title, text: DEF[e.id]!.strength }));

  const weakest = [...competencies].filter((c) => c.observed > 0).sort((a, b) => a.score - b.score)[0];
  const weakestBehaviour = weakest ? evidence.filter((e) => e.competency === weakest.id && e.reached).sort((a, b) => a.score - b.score)[0] : undefined;
  const development = weakest && weakestBehaviour && weakestBehaviour.score < 3 ? { title: FC_COMPETENCY_PLAIN[weakest.id].name, text: DEF[weakestBehaviour.id]!.weakness } : null;

  return {
    version: FC_VERSION,
    overall,
    incomplete,
    observed,
    opportunities,
    competencies,
    evidence,
    flags,
    indication,
    indicationLabel: INDICATION_LABEL[indication],
    probes,
    strengths,
    development,
    outcome: outcomeOf(state),
  };
}
