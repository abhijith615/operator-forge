import { ACTUAL, coverageOver, deficitOf, evaluate, placeAt, riderHeadcount, workerById } from "./capacity";
import { EVENING_END, PEAK_FROM, PEAK_TO, clockLabel, riderNeedAt } from "./forecast";
import { AUDIT, FLEX, FLEX_BUDGET, REGULARS } from "./workforce";
import {
  DAY_THREE_BAND_RANGE,
  assessDay3,
  operatorCompetencies,
  type Day3Assessment,
} from "./scoring";
import { COVER_LABEL, DAY_THREE_DIMENSIONS, type Day3Dimension, type Day3State, type Station } from "./types";
import type { ChallengeResult, FeedbackItem, WorkforceSummary } from "../types";

/**
 * Day 3 feedback.
 *
 * Every sentence here is about something the operator actually did. The
 * decision timeline is built from their own milestones, the best call is the
 * decision whose absence would have cost the evening most, and the three
 * recommendations are chosen by what went wrong — or, for a clean evening, by
 * what would make the next one cleaner. Nothing is random and nothing is
 * generic enough to fit everyone.
 */

const pct = (value: number) => `${Math.round(value * 100)}%`;
const rupees = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;
const nameOf = (id: string | null | undefined) => (id ? workerById(id)?.name ?? "Someone" : "Someone");
const stationWord = (station: Station | null) => (station ? COVER_LABEL[station].toLowerCase() : "the floor");

/* ── Decision timeline ────────────────────────────────────────────────── */

interface Entry {
  sim: number;
  tone: "good" | "warn";
  text: string;
  /** How much the entry matters, for trimming to seven. */
  weight: number;
}

function buildTimeline(state: Day3State, a: Day3Assessment): WorkforceSummary["timeline"] {
  const m = state.milestones;
  const entries: Entry[] = [];
  const push = (sim: number | undefined, tone: "good" | "warn", text: string, weight: number) => {
    if (sim !== undefined) entries.push({ sim, tone, text, weight });
  };

  if (state.core) {
    const cov = state.core.covInitial;
    const bottleneck = state.core.bottleneck;
    if (a.tags.includes("balanced_core_staffing")) {
      push(m.core?.sim, "good", "Balanced picking, packing and dispatch before the peak", 2);
    } else if (cov.picking - cov.packing > 0.25) {
      push(
        m.core?.sim,
        "warn",
        bottleneck
          ? `Stacked picking — packing would have backed up by ${clockLabel(bottleneck.at)}`
          : "Stacked picking ahead of a thin packing line",
        4,
      );
    } else if (cov.dispatch < 0.8) {
      push(m.core?.sim, "warn", "Left dispatch short in the core plan", 4);
    } else {
      const weakest = (["picking", "packing", "dispatch"] as Station[]).reduce((low, station) =>
        cov[station] < cov[low] ? station : low,
      );
      push(m.core?.sim, "warn", `Core plan left ${stationWord(weakest)} at ${pct(cov[weakest])}`, 3);
    }
  }

  if (state.forecastResponse === "adjusted") {
    push(
      m.forecast?.sim,
      "good",
      a.parts.forecastGain >= 0.04
        ? "Rebuilt the floor when the 7–9 PM forecast moved to +42%"
        : "Revisited the floor when the forecast moved",
      a.parts.forecastGain >= 0.04 ? 3 : 1,
    );
  } else if (state.forecastResponse === "kept") {
    if (a.tags.includes("forecast_change_ignored")) {
      push(m.forecast?.sim, "warn", "Kept a floor the revised forecast had already broken", 4);
    } else if (a.parts.forecastWeak) {
      push(m.forecast?.sim, "good", "Held the floor and let flex absorb the revised forecast", 1);
    } else {
      push(m.forecast?.sim, "good", "Held a floor that already absorbed the revised forecast", 0);
    }
  }

  if (m.flex) {
    const shortAfter = state.planningCoverage ? Math.min(
      state.planningCoverage.picking,
      state.planningCoverage.packing,
      state.planningCoverage.dispatch,
    ) : 1;
    if (a.flex.cost > FLEX_BUDGET) {
      push(m.flex.sim, "warn", `Spent ${rupees(a.flex.cost)} on flex — ${rupees(a.flex.cost - FLEX_BUDGET)} over budget`, 4);
    } else if (a.flex.bookings === 0) {
      if (shortAfter < 0.95) push(m.flex.sim, "warn", "Booked no flex cover for the 7–9 PM gap", 3);
      else push(m.flex.sim, "good", "Needed no flex — the core team covered the peak", 1);
    } else if ((a.flex.inPeakShare ?? 0) >= 0.7 && a.flex.matched > 0) {
      push(m.flex.sim, "good", "Booked flex capacity around 7–9 PM demand", 2);
    } else {
      push(m.flex.sim, "warn", "Booked flex hours outside the window that was short", 2);
    }
  }

  if (m.riders) {
    const need = Math.ceil(riderNeedAt(180, true));
    const gap = need - riderHeadcount(state, 180).count;
    if (state.riders.morning >= 3) {
      push(m.riders.sim, "warn", `Recalled ${state.riders.morning} morning riders — fatigue risk`, 4);
    } else if (state.planningCoverage && state.planningCoverage.riders >= 0.97) {
      push(
        m.riders.sim,
        "good",
        state.riders.nearby > 0
          ? "Closed the rider gap with Store 117's spare riders"
          : "Closed the rider gap before the peak",
        2,
      );
    } else if (gap > 0) {
      push(m.riders.sim, "warn", `Left the 7:30 PM rider gap at −${gap}`, 3);
    }
  }

  const late = state.late;
  if (m.late && late) {
    const who = nameOf(late.workerId);
    if (!a.parts.lateNeeded) {
      push(m.late.sim, "good", `${who}'s delay landed on capacity you had already built`, 1);
    } else if (state.managerCovered) {
      push(m.late.sim, "warn", `Covered ${who}'s gap yourself — nobody was running the floor`, 3);
    } else if ((a.parts.lateRatio ?? 0) >= 0.7) {
      const seconds = state.lateRepairMs ? Math.max(1, Math.round(state.lateRepairMs / 1000)) : null;
      push(
        m.late.sim,
        "good",
        seconds ? `Recovered from ${who}'s delay in ${seconds}s` : `Recovered from ${who}'s delay`,
        3,
      );
    } else if ((a.parts.lateRatio ?? 0) >= 0.3) {
      push(m.late.sim, "warn", `Part-covered ${who}'s delay`, 2);
    } else {
      push(m.late.sim, "warn", `Left ${who}'s ${stationWord(late.station)} gap uncovered`, 4);
    }
  }

  const receiving = state.receiving;
  if (m.receiving && receiving) {
    if (receiving.skipped) {
      push(m.receiving.sim, "warn", "Left high-value electronics unreceived through the peak", 5);
    } else if (!receiving.authorised) {
      push(
        m.receiving.sim,
        "warn",
        `Sent ${nameOf(receiving.workerId)}, who is not authorised, to high-value receiving`,
        5,
      );
    } else if (a.parts.receivingComp >= 100) {
      push(
        m.receiving.sim,
        "good",
        receiving.backfillId
          ? `Protected high-value receiving and backfilled ${nameOf(receiving.workerId)}'s ${stationWord(receiving.vacated)}`
          : "Protected high-value receiving without abandoning the floor",
        3,
      );
    } else {
      push(
        m.receiving.sim,
        "warn",
        `Covered receiving but left ${stationWord(receiving.vacated)} at ${pct(receiving.after)} for twenty minutes`,
        3,
      );
    }
  }

  if (m.faisal) {
    const f = state.faisal;
    if (f.includes("remove")) push(m.faisal.sim, "warn", "Removed a slow but 99.7%-accurate picker from the shift", 4);
    else if (f.includes("packing")) push(m.faisal.sim, "warn", "Moved Faisal to packing, a station he isn't trained on", 4);
    else if (a.parts.faisal >= 88) push(m.faisal.sim, "good", "Adjusted Faisal's peak role and set up his development", 3);
    else if (a.parts.faisal === 70) push(m.faisal.sim, "warn", "Protected the peak but left Faisal without a development plan", 2);
    else if (a.parts.faisal >= 55) push(m.faisal.sim, "warn", "Scheduled Faisal's coaching but left his peak pace to slip", 2);
    else push(m.faisal.sim, "warn", "Faisal's performance issue left without a plan", 4);
  }

  if (m.audit) {
    if (state.auditStart >= EVENING_END) push(m.audit.sim, "good", "Moved the inventory audit to lean operations", 3);
    else if (state.auditStart >= PEAK_TO) push(m.audit.sim, "good", "Moved the audit out of the 7–9 PM peak", 2);
    else push(m.audit.sim, "warn", "Left the inventory audit inside the peak", 4);
  }

  // Five to seven entries: drop the least consequential good ones first.
  while (entries.length > 7) {
    const candidates = entries.filter((entry) => entry.tone === "good");
    const pool = candidates.length > 0 ? candidates : entries;
    const drop = pool.reduce((low, entry) => (entry.weight < low.weight ? entry : low));
    entries.splice(entries.indexOf(drop), 1);
  }

  return entries
    .sort((x, y) => x.sim - y.sim)
    .map((entry) => ({ time: clockLabel(entry.sim), tone: entry.tone, text: entry.text }));
}

/* ── Best call ────────────────────────────────────────────────────────── */

function withoutFlex(state: Day3State): Day3State {
  const flexIds = new Set(FLEX.map((worker) => worker.id));
  return {
    ...state,
    flex: {},
    transfers: state.transfers.filter((transfer) => !flexIds.has(transfer.workerId)),
  };
}

/**
 * The decision whose absence would have cost the evening most, measured in
 * lane-minutes of shortfall — so "best" means "made the biggest difference",
 * not "was on a list of good answers".
 */
function bestCall(state: Day3State, a: Day3Assessment): FeedbackItem | null {
  const base = deficitOf(evaluate(state, ACTUAL));
  const cost = (alternative: Day3State) => deficitOf(evaluate(alternative, ACTUAL)) - base;
  const candidates: { gain: number; item: FeedbackItem }[] = [];

  if (state.auditStart >= PEAK_TO) {
    candidates.push({
      gain: cost({ ...state, auditStart: AUDIT.planned }),
      item: {
        title: "Moved the audit out of the peak",
        body: "Moving the inventory audit out of the 7:30 PM peak preserved two associates when picking demand was highest.",
      },
    });
  }

  const booked = FLEX.filter((worker) => state.flex[worker.id]);
  if (booked.length > 0 && a.flex.cost <= FLEX_BUDGET) {
    const names = booked.map((worker) => worker.name);
    const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
    candidates.push({
      gain: cost(withoutFlex(state)),
      item: {
        title: "Put flex where the forecast broke",
        body: `Booking ${list} for the evening added capacity where the revised forecast had pushed the core team past what it could clear.`,
      },
    });
  }

  const sourced = state.riders.nearby + state.riders.morning + state.riders.local;
  if (sourced > 0 && state.riders.morning < 3) {
    candidates.push({
      gain: cost({ ...state, riders: { nearby: 0, morning: 0, local: 0 } }),
      item: {
        title: "Closed the rider gap early",
        body:
          state.riders.nearby > 0
            ? `Borrowing ${state.riders.nearby} riders from Store 117 closed most of the rider gap without spending anyone's second shift.`
            : `Sourcing ${sourced} riders before 7 PM kept packed orders from waiting at the door.`,
      },
    });
  }

  const receiving = state.receiving;
  if (receiving?.backfillId && receiving.authorised) {
    candidates.push({
      gain: cost({ ...state, transfers: state.transfers.filter((transfer) => transfer.reason !== "backfill") }),
      item: {
        title: "Treated receiving as a temporary transfer",
        body: `Backfilling ${nameOf(receiving.workerId)}'s ${stationWord(receiving.vacated)} with ${nameOf(receiving.backfillId)} for twenty minutes meant high-value receiving cost the floor almost nothing.`,
      },
    });
  }

  const late = state.late;
  if (late?.station && (a.parts.lateRatio ?? 0) >= 0.7 && !state.managerCovered && late.after !== null) {
    candidates.push({
      gain: (late.after - late.atAlert) * (late.arrives - late.due),
      item: {
        title: "Rebuilt the floor around a late arrival",
        body: `You rebuilt ${stationWord(late.station)} within ${Math.max(1, Math.round((state.lateRepairMs ?? 0) / 1000))} seconds of ${nameOf(late.workerId)}'s message, so the ${clockLabel(late.due)} start held.`,
      },
    });
  }

  if (state.faisal.includes("zone") || state.faisal.includes("pair")) {
    candidates.push({
      gain: cost({ ...state, faisal: [] }),
      item: {
        title: "Changed Faisal's work, not his place on the team",
        body: state.faisal.includes("zone")
          ? "Moving Faisal to the simpler zone for the peak lifted his pace without costing his accuracy."
          : "Pairing Faisal with an expert for half an hour cost a little capacity early and bought a faster Faisal for the rest of the peak.",
      },
    });
  }

  if (state.forecastResponse === "adjusted" && a.parts.forecastGain >= 0.04) {
    candidates.push({
      gain: a.parts.forecastGain * 120,
      item: {
        title: "Moved when the forecast moved",
        body: "Rebalancing the floor the moment the 7–9 PM forecast moved closed the gap before a single order had queued.",
      },
    });
  }

  const top = candidates.reduce<{ gain: number; item: FeedbackItem } | null>(
    (best, candidate) => (!best || candidate.gain > best.gain ? candidate : best),
    null,
  );
  return top && top.gain > 3 ? top.item : null;
}

/* ── Development area ─────────────────────────────────────────────────── */

const ORDER: Day3Dimension[] = [...DAY_THREE_DIMENSIONS];

function developmentArea(state: Day3State, a: Day3Assessment): { area: string; body: string } {
  const lowest = ORDER.reduce((low, dimension) => (a.dims[dimension] < a.dims[low] ? dimension : low));
  const receiving = state.receiving;
  const f = state.faisal;

  switch (lowest) {
    case "peopleJudgement":
      if (f.includes("remove")) {
        return {
          area: "People judgement",
          body: "Faisal is slow but 99.7% accurate. Removing him solved an accuracy problem he did not have, and the peak lost his picking capacity entirely.",
        };
      }
      if (f.includes("packing")) {
        return {
          area: "People judgement",
          body: "Faisal isn't trained on packing. Moving him there traded a slow picker for an untrained packer at the busiest hour.",
        };
      }
      if (state.riders.morning >= 3) {
        return {
          area: "Rider fatigue",
          body: `You recalled ${state.riders.morning} riders who had already worked a morning shift. They cover the gap on paper and ride tired in practice — Store 117 had spare riders who had not.`,
        };
      }
      if (a.parts.faisal === 70) {
        return {
          area: "People coaching",
          body: "Moving Faisal to an easier zone protected tonight, but nothing was set up to change the trend behind a PPI that has climbed from 17.8 to 21.4 in a week.",
        };
      }
      return {
        area: "People coaching",
        body: "You recognised Faisal's high PPI but treated it as a staffing issue rather than a performance-development issue.",
      };
    case "workforcePlanning":
      if (a.anticipation < 0.05) {
        return {
          area: "Capacity anticipation",
          body: "None of the evening's predictable gaps were closed while you were still planning. Every one was closed after the plan had already started breaking.",
        };
      }
      if (a.anticipation < 0.5) {
        return {
          area: "Capacity anticipation",
          body: `Only ${pct(a.anticipation)} of the evening's predictable gaps were closed while you were still planning. The rest were closed after the plan had started breaking.`,
        };
      }
      return {
        area: "Peak coverage",
        body: `Critical-station coverage averaged ${pct(a.peak.criticalCoverage)} from 6 to 10 PM. ${stationWord(weakestLane(a))[0]?.toUpperCase()}${stationWord(weakestLane(a)).slice(1)} ran shortest.`,
      };
    case "skillMatching": {
      const worst = a.parts.worstMismatch;
      if (worst) {
        return {
          area: "Skill-to-role matching",
          body: `${worst.worker.name} — ${worst.worker.level.toLowerCase()} — spent the peak on ${stationWord(worst.station)}. Headcount went where it was needed; skill did not follow it.`,
        };
      }
      return {
        area: "Skill-to-role matching",
        body: `${a.risks.untrained} ${a.risks.untrained === 1 ? "person worked a station they aren't" : "people worked stations they aren't"} trained on. That adds headcount, not capacity.`,
      };
    }
    case "adaptability":
      if (a.tags.includes("forecast_change_ignored")) {
        return {
          area: "Adapting to new information",
          body: "The 7–9 PM forecast moved to +42% and the floor stayed as it was. A plan is only as good as the forecast it was built on.",
        };
      }
      if (a.tags.includes("failed_to_replace_late_worker")) {
        return {
          area: "Recovering from disruption",
          body: `${nameOf(state.late?.workerId)} was late and ${stationWord(state.late?.station ?? null)} carried the gap. A cross-trained regular or one more booking would have closed it in two taps.`,
        };
      }
      if (state.forecastResponse === "kept" && a.parts.forecastWeak) {
        return {
          area: "Adapting to new information",
          body: "When the forecast moved, you kept the floor and bought the gap back with flex a few minutes later. Rebalancing the regulars first would have closed some of it for nothing.",
        };
      }
      if (receiving && receiving.authorised && !receiving.backfillId && a.parts.receivingComp < 100) {
        return {
          area: "Temporary capacity transfers",
          body: `${nameOf(receiving.workerId)} went to receiving and ${stationWord(receiving.vacated)} ran at ${pct(receiving.after)} for twenty minutes. A twenty-minute task needed a twenty-minute backfill.`,
        };
      }
      return {
        area: "Adaptability",
        body: "Each disruption was absorbed, but not rebuilt around. The plan survived the evening rather than adapting to it.",
      };
    case "prioritisation":
      if (a.tags.includes("audit_left_during_peak")) {
        return {
          area: "Prioritisation",
          body: "The audit ran inside the peak and took two pickers off the floor at the busiest hour. Not everything important is urgent now.",
        };
      }
      return {
        area: "Prioritisation",
        body: "Flex hours were booked outside the window that was actually short. Capacity is worth most at the hour the queue forms.",
      };
    case "resourceDiscipline":
      if (a.flex.cost > FLEX_BUDGET) {
        return {
          area: "Resource discipline",
          body: `Flex spend reached ${rupees(a.flex.cost)} against a ${rupees(FLEX_BUDGET)} budget, and only ${pct(a.flex.hours > 0 ? a.flex.usefulHours / a.flex.hours : 0)} of those hours landed where a station was short.`,
        };
      }
      if (state.riders.nearby < 6 && state.riders.local + state.riders.morning > 0) {
        return {
          area: "Resource discipline",
          body: `Rider sourcing cost ${rupees(a.riders.cost)}. Store 117 still had spare riders at ₹60 each, and they would have covered more of the same gap for less.`,
        };
      }
      if (a.flex.hours > 0 && a.flex.usefulHours / a.flex.hours < 0.75) {
        return {
          area: "Resource discipline",
          body: `Only ${pct(a.flex.usefulHours / a.flex.hours)} of the ${a.flex.hours.toFixed(0)} flex hours you booked landed where a station was short. The rest paid for capacity the floor already had.`,
        };
      }
      return {
        area: "Resource discipline",
        body: "Spend was sound. The next saving is in the narrowest booking window that still closes each gap.",
      };
  }
}

function weakestLane(a: Day3Assessment): Station {
  const peak = a.peak.peak;
  return (["picking", "packing", "dispatch"] as Station[]).reduce((low, station) =>
    peak[station] < peak[low] ? station : low,
  );
}

/* ── If you ran this shift again ──────────────────────────────────────── */

function recommendations(state: Day3State, a: Day3Assessment): string[] {
  const pool: string[] = [];
  const add = (when: boolean, line: string) => {
    if (when && !pool.includes(line)) pool.push(line);
  };
  const receiving = state.receiving;

  add(
    a.tags.includes("audit_left_during_peak"),
    "Move non-urgent work out of the peak before you staff around it — the 45-minute audit belonged after 10 PM, not at 7:30.",
  );
  add(
    receiving?.skipped === true || (receiving !== null && !receiving.authorised),
    "High-value stock needs authorised hands, however busy the floor is. Send an authorised associate and backfill them, rather than choosing between the two.",
  );
  add(
    a.tags.includes("forecast_change_ignored"),
    "When the forecast moves, re-check the weakest station first. 7–9 PM moved to +42% and packing had no slack left to absorb it.",
  );
  add(
    a.tags.includes("expert_picker_not_backfilled"),
    "Treat a temporary task as a temporary transfer: backfill Arjun's twenty minutes rather than letting picking carry the hole.",
  );
  add(
    state.faisal.includes("remove") || a.parts.faisal <= 60,
    "Separate the peak intervention from long-term coaching: a simpler zone or a pairing tonight, a coaching slot after the peak.",
  );
  add(
    a.tags.includes("failed_to_replace_late_worker") || state.managerCovered,
    "Keep one cross-trained regular as your reserve, so a late temp becomes a two-tap fix instead of a gap or a job for you.",
  );
  add(
    a.flex.cost > FLEX_BUDGET,
    "Book flex for the hours that are actually short — 7 to 9 PM — rather than the whole evening. Every extra hour is spend without capacity.",
  );
  add(
    state.riders.morning >= 3,
    "Borrow from Store 117 before you recall riders who have already worked a shift. Coverage on paper is not coverage at 8 PM.",
  );
  add(
    a.anticipation < 0.5 || a.peak.criticalCoverage < 0.9,
    "Solve predictable capacity gaps before the peak. The 7–9 PM gap was visible at 4:50, not at 6:50.",
  );
  add(
    a.risks.untrained > 0,
    "Keep people off stations they are not trained on. An untrained associate adds a body to the station and very little capacity.",
  );
  add(
    a.tags.includes("overstaffed_picking") || a.tags.includes("understaffed_packing"),
    "Balance flow, not headcount: extra pickers only fill the packing queue faster.",
  );
  add(
    a.dims.skillMatching < 70,
    "Put scarce skills where they are scarce. Expert packers and dispatchers are harder to replace than a fourth picker.",
  );

  const defaults = [
    "Use cross-trained workers as flexibility, not fixed capacity — keep Divya's packing and Akhil's dispatch skill in reserve for the next surprise.",
    "Book flex in the narrowest window that closes the gap. The best temp is the one whose hours all land on the peak.",
    "Share the peak plan with the floor lead before 6 PM, so the next disruption can be absorbed without you.",
  ];
  for (const line of defaults) add(true, line);

  return pool.slice(0, 3);
}

/* ── Strengths, gaps, lessons ─────────────────────────────────────────── */

function strengths(state: Day3State, a: Day3Assessment, best: FeedbackItem | null): FeedbackItem[] {
  const items: FeedbackItem[] = [];
  if (best) items.push(best);
  if (a.tags.includes("balanced_core_staffing") && !items.some((item) => item.title.includes("flow"))) {
    items.push({
      title: "Built for flow, not headcount",
      body: "Your core plan kept picking, packing and dispatch within reach of each other, so no station was filling a queue the next one could not clear.",
    });
  }
  if (a.tags.includes("used_cross_training")) {
    items.push({
      title: "Used cross-training as flexibility",
      body: "You moved a cross-trained associate to the station that needed them, rather than leaving everyone in their usual role.",
    });
  }
  if (a.tags.includes("faisal_coached") && a.tags.includes("faisal_role_adjusted")) {
    items.push({
      title: "Treated a slow picker as a person, not a problem",
      body: "Faisal kept his accuracy, the peak kept his capacity, and his pace has a plan behind it.",
    });
  }
  if (a.tags.includes("audit_moved_to_lean_shift") && !best?.title.includes("audit")) {
    items.push({
      title: "Not everything important is urgent now",
      body: "The audit still happens tonight — at an hour when it costs the customer nothing.",
    });
  }
  return items.slice(0, 4);
}

function gaps(a: Day3Assessment, area: { area: string; body: string }): FeedbackItem[] {
  const items: FeedbackItem[] = [{ title: area.area, body: area.body }];
  for (const breach of a.breaches) items.push({ title: "High-value control", body: breach.label });
  return items.slice(0, 4);
}

const LEARNED: FeedbackItem[] = [
  {
    title: "Capacity is skills × time, not headcount",
    body: "Thirteen people is not thirteen units of capacity. An expert packer on picking, a new temp in their first half hour, a slow picker left alone at the peak — each is a body on the board and a fraction of a person in the queue.",
  },
  {
    title: "The slowest station sets the pace",
    body: "Orders move picking → packing → dispatch → rider. Adding people to the station that is already fast only moves the queue to the next one.",
  },
  {
    title: "Not everything important is urgent now",
    body: "The audit, the coaching conversation, the development plan — all important, none of them at 7:30 PM on Onam Eve. Moving work in time is as powerful as moving people.",
  },
];

/* ── The result ───────────────────────────────────────────────────────── */

function planSummary(state: Day3State, a: Day3Assessment): WorkforceSummary["plan"] {
  const t = 180;
  const count: Record<Station, number> = { picking: 0, packing: 0, dispatch: 0 };
  for (const worker of REGULARS) {
    const place = placeAt(state, ACTUAL, worker, t);
    if (place && place !== "receiving") count[place] += 1;
  }
  const receiving = state.receiving;
  return {
    picking: count.picking,
    packing: count.packing,
    dispatch: count.dispatch,
    flex: Object.keys(state.flex).length,
    riders: riderHeadcount(state, t).count,
    receiving: !receiving || receiving.skipped
      ? "Not received"
      : receiving.authorised
        ? `Covered · ${nameOf(receiving.workerId)}`
        : `Unauthorised · ${nameOf(receiving.workerId)}`,
    audit: state.auditStart >= EVENING_END ? `${clockLabel(state.auditStart)} · lean` : clockLabel(state.auditStart),
    flexCost: a.flex.cost,
    riderCost: a.riders.cost,
  };
}

export function buildDay3Result(state: Day3State): ChallengeResult {
  const a = assessDay3(state);
  const best = bestCall(state, a);
  const area = developmentArea(state, a);
  const peak = a.peak;
  const riderCoverage = coverageOver(evaluate(state, ACTUAL), PEAK_FROM, PEAK_TO).riders;

  const workforce: WorkforceSummary = {
    outcome: {
      title:
        peak.serviceRate >= 0.96 && peak.criticalCoverage >= 0.95 && !peak.abandoned
          ? "PEAK CLEARED"
          : "PEAK SURVIVED",
      ordersHandled: peak.handled,
      ordersForecast: peak.demand,
      peakCoverage: Math.round(peak.criticalCoverage * 100),
      avgPackingQueue: Math.round(peak.avgPackingQueue * 10) / 10,
      riderCoverage: Math.round(Math.min(1, riderCoverage) * 100),
      riderShortageMinutes: peak.riderShortageMinutes,
      tempSpend: a.flex.cost,
      riderSpend: a.riders.cost,
      abandonedStation: peak.abandoned,
    },
    metrics: {
      capacityAnticipation: Math.round(a.anticipation * 100),
      skillUtilisation: Math.round(a.skillUtilisation * 100),
      peakCoverage: Math.round(peak.criticalCoverage * 100),
      flexEfficiency: a.flex.hours > 0 ? Math.round((a.flex.usefulHours / a.flex.hours) * 100) : null,
      flexUsefulHours: Math.round(a.flex.usefulHours * 10) / 10,
      flexHours: Math.round(a.flex.hours * 10) / 10,
      flexBudget: FLEX_BUDGET,
    },
    risks: {
      fatigue: a.risks.fatigue,
      untrainedAssignments: a.risks.untrained,
      expertDependency: a.risks.expertDependency,
      unnecessaryRemoval: a.risks.unnecessaryRemoval,
    },
    plan: planSummary(state, a),
    timeline: buildTimeline(state, a),
    bestCall: best,
    developmentArea: area,
    operatorCompetencies: operatorCompetencies(a),
    lockedByClock: state.lockedBy === "clock",
  };

  const durationMs = state.completedAt
    ? state.completedAt - state.startedAt
    : (state.milestones.lock?.at ?? 0);

  return {
    day: 3,
    score: a.score,
    band: a.band,
    bandRange: DAY_THREE_BAND_RANGE[a.band],
    competencies: a.competencies,
    signature: a.style,
    strengths: strengths(state, a, best),
    gaps: gaps(a, area),
    replay: recommendations(state, a),
    learned: LEARNED,
    // Day 3's control breach is reported in its own words through the gaps and
    // the timeline; Day 1's SOP list is keyed to Day 1's scenes.
    sopViolations: [],
    decisionCount: Object.keys(state.milestones).length,
    workforce,
    durationMs,
  };
}

/** For the harness and the scorecard: the assessment behind a result. */
export { assessDay3 };
