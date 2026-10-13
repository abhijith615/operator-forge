import { HANDOVER_FLOOR } from "./roster";
import type { FormId, Stage, Station } from "./types";

/**
 * Parallel forms.
 *
 * Three versions of the same shift. The behavioural blueprint is identical —
 * the same people, the same decisions, the same evidence rules — and only the
 * surface changes: which high-value line goes missing, which staple nil-picks,
 * and where the breakfast surge lands.
 *
 * That last one matters more than it looks, because the three answers pull in
 * different directions. On Form A every device was left locked, so the app
 * cannot send orders to anybody when the rush comes: the fix is to unlock. On
 * Form C the putaway devices were left unlocked, so the app drags the people
 * filling the shelves onto orders and the pickers arrive at empty bins: the
 * fix is to lock. On Form B the floor is fine and the bags are stacking
 * because two riders never logged in. A candidate who has heard "just unlock
 * everyone" from someone who sat Form A meets a store where that is the
 * mistake. The right move is whatever the evidence in front of them says,
 * which is the thing being measured.
 */

/** The six items that have a picture: one high-value line and one staple per form. */
export type ItemPhotoId = "earbuds" | "serum" | "smartwatch" | "milk" | "eggs" | "bread";

export interface FormContent {
  id: FormId;
  highValue: {
    item: string;
    photo: ItemPhotoId;
    unitValue: number;
    system: number;
    physical: number;
    /** The delivered order whose item scan was missed. */
    scanOrder: string;
    /** The cancelled order that went to the exception tote. */
    cancelledOrder: string;
  };
  nilPick: {
    item: string;
    photo: ItemPhotoId;
    system: number;
    order: string;
  };
  /** Who the night shift left somewhere other than the usual place. */
  handover: Record<string, Station>;
  /** The devices the night shift left locked to their role. */
  locked: string[];
  /** Riders logged in at 05:55, of nine rostered. */
  ridersOn: number;
  /** Where the breakfast surge lands. */
  constraint: Stage;
  surgeFactor: number;
  /** What the board says when it lands. */
  surgeHeadline: string;
  surgeDetail: string;
  /** The same thing as a sentence: as it starts, and as it has turned out by 06:35. */
  surgeAlert: string;
  surgeOutcome: { good: string; warn: string; bad: string };
}

export const RIDERS_ROSTERED = 9;
export const STANDBY_RIDERS = 2;

export const FORMS: Record<FormId, FormContent> = {
  A: {
    id: "A",
    highValue: {
      item: "Wireless earbuds",
      photo: "earbuds",
      unitValue: 3999,
      system: 12,
      physical: 9,
      scanOrder: "#5417",
      cancelledOrder: "#5391",
    },
    nilPick: { item: "Milk 1L", photo: "milk", system: 17, order: "#5462" },
    handover: { deepa: "picking", lakshmi: "auditing", anjali: "putaway", joseph: "auditing" },
    locked: ["manu", "anjali", "farhan", "lakshmi", "joseph"],
    ridersOn: 9,
    constraint: "picking",
    surgeFactor: 1.15,
    surgeHeadline: "Orders waiting to be picked",
    surgeDetail: "Breakfast baskets are bigger. Every order has more items in it, and at sixteen seconds an item that is more time on each one.",
    surgeAlert: "Orders are backing up",
    surgeOutcome: {
      good: "The pick queue is back under control.",
      warn: "The pick queue is holding, just.",
      bad: "The pick queue is still growing.",
    },
  },
  B: {
    id: "B",
    highValue: {
      item: "Premium face serum",
      photo: "serum",
      unitValue: 2799,
      system: 14,
      physical: 11,
      scanOrder: "#6120",
      cancelledOrder: "#6088",
    },
    nilPick: { item: "Eggs (tray of 6)", photo: "eggs", system: 22, order: "#6171" },
    handover: { deepa: "picking", lakshmi: "putaway", anjali: "putaway", joseph: "picking" },
    locked: ["manu", "anjali", "lakshmi"],
    ridersOn: 7,
    constraint: "riders",
    surgeFactor: 1.15,
    surgeHeadline: "Bags waiting for a rider",
    surgeDetail: "Orders are coming from the far end of the delivery radius. Each trip is longer, and packed bags are stacking on the staging shelf.",
    surgeAlert: "Bags are stacking at staging",
    surgeOutcome: {
      good: "Bags are leaving staging as fast as they are packed.",
      warn: "Staging is holding, just.",
      bad: "Bags are still stacking at staging.",
    },
  },
  C: {
    id: "C",
    highValue: {
      item: "Smartwatch",
      photo: "smartwatch",
      unitValue: 4499,
      system: 10,
      physical: 7,
      scanOrder: "#7302",
      cancelledOrder: "#7277",
    },
    nilPick: { item: "Bread (400 g loaf)", photo: "bread", system: 19, order: "#7345" },
    handover: { deepa: "picking", lakshmi: "auditing", anjali: "picking", joseph: "picking" },
    locked: [],
    ridersOn: 9,
    constraint: "putaway",
    surgeFactor: 1.5,
    surgeHeadline: "Empty bins",
    surgeDetail: "Fast lines are selling through. The stock is in crates on the inward dock and has not reached the bins.",
    surgeAlert: "Bins are running empty",
    surgeOutcome: {
      good: "The fast-line bins are being kept full.",
      warn: "The bins are holding, just.",
      bad: "Fast-line bins are still running empty.",
    },
  },
};

export const formFor = (id: FormId): FormContent => FORMS[id];

/**
 * The floor each form inherits. Every form starts with exactly one stage thin
 * and exactly one person standing somewhere they are not trained for. Putting
 * the person right is one move on every form; putting the stage right is the
 * second thing, and it is a different thing each time — unlock the auditors,
 * call in the standby riders, lock the putaway devices. All three end on the
 * same floor.
 */
export const handoverFloor = (id: FormId): Record<string, Station> => ({
  ...HANDOVER_FLOOR,
  ...FORMS[id].handover,
});

export const handoverLocks = (id: FormId): Record<string, boolean> =>
  Object.fromEntries(FORMS[id].locked.map((emp) => [emp, true]));

/**
 * What the Floor Lead says at 06:18.
 *
 * He is giving his read of it, and it is never where the store is actually
 * stuck. But it is never invented either: each time he starts from something
 * that is true and can be seen from where he stands — crates still on the
 * dock, a bad pick speed, orders not leaving — and draws the wrong conclusion
 * from it. A claim with nothing behind it reads as a mistake in the test; a
 * true observation with the wrong cause attached is what a manager is
 * actually handed, and has to check.
 */
export function floorLeadSays(blamed: Station | null, constraint: Stage | null): string {
  if (blamed === "putaway") return "There are still crates all over the dock. I think putaway is too slow this morning.";
  if (constraint === "riders") return "Orders aren’t getting out. I think we need faster pickers.";
  return "Look at the pick speed. I think we need faster pickers.";
}

/** The process change available at each stage. Only one of them is where the problem is. */
export const PROCESS_FIX: Record<Stage, { label: string; detail: string }> = {
  picking: { label: "Clear Aisle C", detail: "Move the inward crates blocking the aisle so pick routes run straight again." },
  putaway: { label: "Fast lines first", detail: "Put away only the lines that are selling. Everything else waits in its crate." },
  auditing: { label: "Pause the cycle count", detail: "Stop the routine counts until the rush has passed. The perishables check still runs." },
  riders: { label: "Batch by lane", detail: "Two nearby orders to one rider. Fewer trips, and the bags leave in order." },
};
