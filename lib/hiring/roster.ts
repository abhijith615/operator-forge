import type { Employee, Station } from "./types";

/**
 * Store 114's evening floor.
 *
 * Twelve people present out of fourteen scheduled, and they stay the same
 * twelve for the whole thirty minutes. Nobody here is a hero and nobody is a
 * problem: each is good at something, limited at something else, and the
 * shift goes well or badly depending on where they are put and how they are
 * spoken to.
 *
 * Skill is output at a station against a competent full-time hand at 1.0.
 * The cross-training is the interesting part — who can cover a second station
 * properly is what a manager finds out the hard way at ten to six.
 */

const skills = (
  picking: number,
  packing: number,
  dispatch: number,
  replenishment: number,
): Record<Station, number> => ({ picking, packing, dispatch, replenishment });

const none = { highValue: false, inventoryCount: false, riders: false, inwarding: false };

export const ROSTER: Employee[] = [
  {
    id: "arjun",
    name: "Arjun",
    title: "Expert picker",
    skills: skills(1.25, 0.95, 0.3, 0.6),
    auth: { ...none, highValue: true },
    tenure: "14 months",
    fatigue: 0,
    note: "Day shift, off at 18:00. Packing trained. Has been asked about staying on.",
    stats: [
      { label: "PPI", value: "9.8 sec" },
      { label: "Accuracy", value: "99.3%" },
    ],
  },
  {
    id: "manu",
    name: "Manu",
    title: "Packing expert",
    skills: skills(0.6, 1.25, 0.9, 0.5),
    auth: none,
    tenure: "2 years",
    fatigue: 0,
    note: "Runs bench P1. Dispatch trained.",
  },
  {
    id: "rahul",
    name: "Rahul",
    title: "Dispatch lead",
    skills: skills(0.75, 0.5, 1.25, 0.5),
    auth: { ...none, riders: true },
    tenure: "19 months",
    fatigue: 0,
    note: "Rider coordination. The riders answer to him.",
  },
  {
    id: "riya",
    name: "Riya",
    title: "New picker",
    skills: skills(0.62, 0.4, 0.25, 0.5),
    auth: none,
    tenure: "11 days",
    fatigue: 0,
    note: "Currently on Zone C.",
    stats: [
      { label: "PPI", value: "21.4 sec" },
      { label: "Accuracy", value: "99.7%" },
    ],
  },
  {
    id: "sneha",
    name: "Sneha",
    title: "Picker",
    skills: skills(1.0, 0.4, 0.3, 1.0),
    auth: { ...none, inwarding: true },
    tenure: "9 months",
    fatigue: 0,
    note: "Replenishment trained.",
  },
  {
    id: "farhan",
    name: "Farhan",
    title: "Picker",
    skills: skills(1.0, 0.5, 0.3, 0.7),
    auth: { ...none, inventoryCount: true, highValue: true },
    tenure: "11 months",
    fatigue: 0,
    note: "Inventory count trained. Cleared for high-value counts.",
  },
  {
    id: "deepa",
    name: "Deepa",
    title: "Packer",
    skills: skills(0.7, 1.05, 0.5, 0.5),
    auth: none,
    tenure: "8 months",
    fatigue: 0,
    note: "Bench P2. Steady, rarely repacks.",
  },
  {
    id: "kiran",
    name: "Kiran",
    title: "Picker",
    skills: skills(0.9, 0.6, 0.3, 0.9),
    auth: { ...none, inwarding: true },
    tenure: "6 months",
    fatigue: 0.2,
    note: "Picking and putaway, about evenly.",
  },
  {
    id: "lakshmi",
    name: "Lakshmi",
    title: "Packer",
    skills: skills(0.6, 0.9, 0.95, 0.5),
    auth: { ...none, riders: true },
    tenure: "13 months",
    fatigue: 0,
    note: "Dispatch trained. Has run the rider desk on Rahul's days off.",
  },
  {
    id: "vishnu",
    name: "Vishnu",
    title: "Picker",
    skills: skills(1.05, 0.4, 0.4, 0.8),
    auth: none,
    tenure: "16 months",
    fatigue: 0.5,
    note: "On since 09:00 covering a swap. Quick, and tired.",
  },
  {
    id: "anjali",
    name: "Anjali",
    title: "Floor & putaway",
    skills: skills(0.7, 0.55, 0.3, 1.1),
    auth: { ...none, inwarding: true },
    tenure: "10 months",
    fatigue: 0,
    note: "Knows where everything in inbound is.",
  },
  {
    id: "joseph",
    name: "Joseph",
    title: "Dispatch desk",
    skills: skills(0.6, 0.8, 0.85, 0.5),
    auth: { ...none, riders: true },
    tenure: "5 months",
    fatigue: 0,
    note: "Second on the rider desk. Packing trained.",
  },
];

/** The on-demand picker, if one is booked. Picking only, and not quick. */
export const TEMP: Employee = {
  id: "temp",
  name: "On-demand picker",
  title: "4-hour booking",
  skills: skills(0.7, 0, 0, 0),
  auth: none,
  tenure: "First shift here",
  fatigue: 0,
  note: "Booked through the on-demand app. Does not know the store.",
};

export const BY_ID: Record<string, Employee> = Object.fromEntries(
  [...ROSTER, TEMP].map((employee) => [employee.id, employee]),
);

/**
 * Where the outgoing shift left the nine people who are in the same place on
 * every form. The other three — Lakshmi, Joseph and Anjali — are placed by the
 * form, and one of them is always somewhere the afternoon needed and the
 * evening does not.
 */
export const HANDOVER_FLOOR: Record<string, Station> = {
  arjun: "picking",
  sneha: "picking",
  farhan: "picking",
  vishnu: "picking",
  riya: "picking",
  manu: "packing",
  deepa: "packing",
  rahul: "dispatch",
  kiran: "replenishment",
};

export const STATION_LABEL: Record<Station, string> = {
  picking: "Picking",
  packing: "Packing",
  dispatch: "Dispatch",
  replenishment: "Replenishment / floor",
};

/** The place a person stands to do the work, for sentences. */
export const STATION_PLACE: Record<Station, string> = {
  picking: "picking line",
  packing: "packing bench",
  dispatch: "rider desk",
  replenishment: "putaway",
};

export const nameOf = (id: string): string => BY_ID[id]?.name ?? (id === "me" ? "You" : id);
