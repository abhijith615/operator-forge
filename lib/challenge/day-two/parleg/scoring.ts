import { rupees } from "../ledger";
import { PARLEG_DIMENSIONS, type ParlegDimension } from "../types";
import { NET_VALUE_IMPACT, RECORD_UNITS_AFFECTED } from "./content";
import { pgReached } from "./engine";
import type { ParleGState, PgTag } from "./types";

/**
 * Case 02 assessment. Every number that shapes its scores is in this file.
 *
 * Bounds are the reachable range walked from the content: `ceiling` is what a
 * careful, proportionate run actually accumulates, `floor` what a run that
 * skips the investigation and overreacts does. Checked against the brief's
 * five personas before any of it was wired to a screen.
 */

const PG_BOUNDS: Record<ParlegDimension, { floor: number; ceiling: number }> = {
  patternRecognition: { floor: -3, ceiling: 4 },
  inventoryReasoning: { floor: -10, ceiling: 12 },
  rootCause: { floor: -7, ceiling: 9 },
  processDiscipline: { floor: -5, ceiling: 8 },
  correctiveAction: { floor: -3, ceiling: 5 },
  prioritisation: { floor: -9, ceiling: 6 },
  evidenceDiscipline: { floor: -1, ceiling: 4 },
};

const SOFT_FLOOR = 35;

export interface PgBreach {
  tag: PgTag;
  label: string;
  severity: number;
}

/** Overreactions. They multiply the day's score, as Case 01's breaches do. */
const PG_BREACHES: PgBreach[] = [
  {
    tag: "unnecessary_store_shutdown",
    label: "Proposed stopping all picking for a two-SKU drift",
    severity: 0.9,
  },
  {
    tag: "blind_writeoff",
    label: "Moved to write off stock that was on the shelf",
    severity: 0.9,
  },
  {
    tag: "unnecessary_catalogue_removal",
    label: "Proposed delisting a product over a picking error",
    severity: 0.93,
  },
  {
    tag: "whole_store_recount_overreaction",
    label: "Proposed a whole-store recount for an isolated pattern",
    severity: 0.96,
  },
];

export function pgBreaches(state: ParleGState): PgBreach[] {
  return PG_BREACHES.filter((breach) => state.tags.includes(breach.tag));
}

export const OVERREACH_TAGS: PgTag[] = PG_BREACHES.map((breach) => breach.tag);

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

/** Null when the case was never opened — its dimensions are not read at all. */
export function scoreParleG(
  state: ParleGState,
): Partial<Record<ParlegDimension, number>> | null {
  if (!pgReached(state)) return null;
  const severe = pgBreaches(state).length >= 2;
  const scores: Partial<Record<ParlegDimension, number>> = {};

  for (const dimension of PARLEG_DIMENSIONS) {
    const { floor, ceiling } = PG_BOUNDS[dimension];
    const normalised = clamp(
      Math.round(((state.signals[dimension] - floor) / (ceiling - floor)) * 100),
    );
    scores[dimension] = severe ? normalised : Math.max(normalised, SOFT_FLOOR);
  }
  return scores;
}

/* ── Case insight ─────────────────────────────────────────────────────── */

/**
 * The compact note shown after reconciling. Deterministic templates, each
 * gated on something the run actually did — so every line is true of this
 * learner, and none of them is praise.
 */
export function parlegInsight(state: ParleGState): string[] {
  const has = (t: PgTag) => state.tags.includes(t);
  const overreached = OVERREACH_TAGS.some(has);
  const lines: string[] = [];

  if (has("case_timed_out")) {
    lines.push("The clock closed the case before the two SKUs were reconciled.");
  } else if (has("case_left_open")) {
    lines.push("The day finished with this case open — both records still disagree with their shelves.");
  }

  if (has("corrected_without_cause")) {
    lines.push(
      "You corrected both records without establishing why they drifted. Nothing about the pick process has changed, so the same drift can rebuild.",
    );
  } else if (state.flowSolved && has("mirrored_variance_recognised")) {
    lines.push(
      "You spotted the mirrored +17 / −17 variance and traced it to the pick process before changing inventory.",
    );
  } else if (state.flowSolved) {
    lines.push("You traced the drift to the pick process before changing inventory.");
  }

  if (has("flow_needed_retries")) {
    lines.push(
      "The wrong-size pick was clear; how one physical mistake leaves +17 on one SKU and −17 on the other took more than one pass.",
    );
  }

  if (state.reconciled && !has("corrected_without_cause")) {
    if (
      has("scan_control_selected") &&
      (has("shelf_separation_selected") || has("targeted_coaching_selected")) &&
      !overreached
    ) {
      lines.push(
        "You corrected the stock and addressed the control failure that caused it — not just the numbers.",
      );
    } else if (!has("scan_control_selected")) {
      lines.push(
        "You reconciled the quantities, but your prevention plan left the barcode-verification failure unresolved.",
      );
    }
  }

  if (overreached) {
    lines.push("You identified the issue but proposed controls broader than the problem required.");
  }

  if (state.reconciled) {
    lines.push(
      `${rupees(NET_VALUE_IMPACT)} of value, ${RECORD_UNITS_AFFECTED} record units. The second number is the one that would have caused tomorrow's nil picks.`,
    );
  }

  return lines.slice(0, 4);
}
