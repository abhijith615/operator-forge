import { HANDOVER_FLOOR } from "./roster";
import type { FormId, Station } from "./types";

/**
 * Parallel forms.
 *
 * Three versions of the same shift. The behavioural blueprint is identical —
 * the same people, the same decisions, the same evidence rules — and only the
 * surface changes: which high-value line goes missing, which staple nil-picks,
 * and which station the evening surge lands on.
 *
 * That last one matters more than it looks. A candidate who has heard "it's
 * always packing" from someone who sat Form A meets a store on Form B where
 * packing is fine and the bags are stacking at the rider desk. The right move
 * is whatever the evidence in front of them says, which is the thing being
 * measured.
 */

export interface FormContent {
  id: FormId;
  highValue: {
    item: string;
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
    system: number;
    order: string;
  };
  /** Who the outgoing shift left somewhere other than the usual place. */
  handover: Record<string, Station>;
  /** Where the evening surge lands. */
  constraint: Station;
  surgeFactor: number;
  /** What the board says when it lands. */
  surgeHeadline: string;
  surgeDetail: string;
}

export const FORMS: Record<FormId, FormContent> = {
  A: {
    id: "A",
    highValue: {
      item: "Wireless earbuds",
      unitValue: 3999,
      system: 12,
      physical: 9,
      scanOrder: "#5417",
      cancelledOrder: "#5391",
    },
    nilPick: { item: "Milk 1L", system: 17, order: "#5462" },
    handover: { lakshmi: "picking", joseph: "dispatch", anjali: "replenishment" },
    constraint: "packing",
    surgeFactor: 1.15,
    surgeHeadline: "Packing queue",
    surgeDetail: "Evening baskets are bigger. Every order is taking longer on the bench.",
  },
  B: {
    id: "B",
    highValue: {
      item: "Premium face serum",
      unitValue: 2799,
      system: 14,
      physical: 11,
      scanOrder: "#6120",
      cancelledOrder: "#6088",
    },
    nilPick: { item: "Eggs (tray of 6)", system: 22, order: "#6171" },
    handover: { lakshmi: "packing", joseph: "packing", deepa: "dispatch", anjali: "replenishment" },
    constraint: "dispatch",
    surgeFactor: 1.15,
    surgeHeadline: "Dispatch bay",
    surgeDetail: "Riders are arriving in bunches. Sealed bags are stacking in the bay waiting to be handed over.",
  },
  C: {
    id: "C",
    highValue: {
      item: "Smartwatch",
      unitValue: 4499,
      system: 10,
      physical: 7,
      scanOrder: "#7302",
      cancelledOrder: "#7277",
    },
    nilPick: { item: "Bread (400 g loaf)", system: 19, order: "#7345" },
    handover: { lakshmi: "packing", joseph: "dispatch", anjali: "picking" },
    constraint: "replenishment",
    surgeFactor: 1.5,
    surgeHeadline: "Empty pick faces",
    surgeDetail: "Fast lines are selling through. Stock is in inbound and has not reached the shelf.",
  },
};

export const formFor = (id: FormId): FormContent => FORMS[id];

/**
 * The floor each form inherits. Every form starts with exactly one station
 * thin and exactly one person standing somewhere they are not trained for,
 * and putting that right is what fixes the station. On A and C that is one
 * move; on B the packer on the rider desk has to change places with the
 * dispatch-trained packer on the bench. All three end on the same floor.
 */
export const handoverFloor = (id: FormId): Record<string, Station> => ({
  ...HANDOVER_FLOOR,
  ...FORMS[id].handover,
});

/**
 * What the Floor Lead says at 17:48. He is describing what he can see from
 * where he stands, and it is never where the store is actually stuck.
 */
export const FLOOR_LEAD_SAYS: Record<"picking" | "packing", string> = {
  picking: "We need faster pickers.",
  packing: "Packing is too slow tonight.",
};

/** The process change available at each station. Only one of them is where the problem is. */
export const PROCESS_FIX: Record<Station, { label: string; detail: string }> = {
  picking: { label: "Clear Aisle C", detail: "Move the cage blocking the aisle so routes run straight again." },
  packing: { label: "Open packing bench P3", detail: "The third bench is set up and unused. Packers stop queueing for a sealer." },
  dispatch: { label: "Open a second handover lane", detail: "Riders stop queueing at one desk. Bags leave in two lines." },
  replenishment: { label: "Fast lines first", detail: "Put away only the lines that are selling. Everything else waits on the pallet." },
};
