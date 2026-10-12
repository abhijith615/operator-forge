import type { Employee, Stage, Station } from "./types";

/**
 * Store 114's morning floor.
 *
 * Twelve people present out of fourteen rostered, and they stay the same
 * twelve for the whole thirty minutes. Nobody here is a hero and nobody is a
 * problem: each is good at something, limited at something else, and the
 * shift goes well or badly depending on where they are put, whether their
 * device is locked to that job, and how they are spoken to.
 *
 * Skill is output at a workflow against a competent full-time hand at 1.0.
 * For picking that is the sixteen-second item: somebody at 1.0 picks an item
 * every 16 seconds, somebody at 1.25 every 12.8, and a second-day joiner at
 * 0.5 every 32.
 */

const skills = (picking: number, putaway: number, auditing: number): Record<Station, number> => ({
  picking,
  putaway,
  auditing,
});

const none = { highValue: false, audit: false, riders: false, inwarding: false };

/** The store's picking standard, in seconds an item. */
export const PPI_TARGET = 16;

export const ROSTER: Employee[] = [
  {
    id: "arjun",
    name: "Arjun",
    title: "Expert picker",
    skills: skills(1.25, 0.7, 0.5),
    auth: { ...none, highValue: true },
    tenure: "14 months",
    fatigue: 0,
    note: "Overnight shift, off at 06:30. Has been asked about staying on for the breakfast peak.",
    stats: [
      { label: "PPI", value: "12.8 sec" },
      { label: "Accuracy", value: "99.3%" },
    ],
  },
  {
    id: "manu",
    name: "Manu",
    title: "Putaway lead",
    skills: skills(0.8, 1.25, 0.6),
    auth: { ...none, inwarding: true },
    tenure: "2 years",
    fatigue: 0,
    note: "Runs the inward dock. Knows every bin code in the store.",
  },
  {
    id: "rahul",
    name: "Rahul",
    title: "Senior picker",
    skills: skills(1.05, 0.6, 0.5),
    auth: { ...none, riders: true },
    tenure: "19 months",
    fatigue: 0,
    note: "Sequences riders at the handover point when it backs up. The riders answer to him.",
  },
  {
    id: "riya",
    name: "Riya",
    title: "New joiner",
    skills: skills(0.5, 0.55, 0.2),
    auth: none,
    tenure: "Day 2",
    fatigue: 0,
    note: "Joined through the agency yesterday. Induction: putaway only.",
  },
  {
    id: "sneha",
    name: "Sneha",
    title: "Picker",
    skills: skills(1.0, 1.0, 0.5),
    auth: { ...none, inwarding: true },
    tenure: "9 months",
    fatigue: 0,
    note: "Putaway trained.",
  },
  {
    id: "farhan",
    name: "Farhan",
    title: "Picker · cycle counts",
    skills: skills(1.0, 0.7, 1.1),
    auth: { ...none, audit: true, highValue: true },
    tenure: "11 months",
    fatigue: 0,
    note: "Cycle-count trained. Cleared for the high-value cage.",
  },
  {
    id: "deepa",
    name: "Deepa",
    title: "Picker",
    skills: skills(0.95, 0.7, 0.9),
    auth: none,
    tenure: "8 months",
    fatigue: 0,
    note: "Does the perishables check most mornings. Steady, rarely mis-picks.",
  },
  {
    id: "kiran",
    name: "Kiran",
    title: "Picker",
    skills: skills(0.9, 0.9, 0.4),
    auth: { ...none, inwarding: true },
    tenure: "6 months",
    fatigue: 0.2,
    note: "Picking and putaway, about evenly.",
  },
  {
    id: "lakshmi",
    name: "Lakshmi",
    title: "Auditor",
    skills: skills(0.85, 0.6, 1.0),
    auth: { ...none, audit: true, riders: true },
    tenure: "13 months",
    fatigue: 0,
    note: "Runs the cycle counts. Has covered the rider handover on Rahul's days off.",
  },
  {
    id: "vishnu",
    name: "Vishnu",
    title: "Picker",
    skills: skills(1.05, 0.8, 0.4),
    auth: none,
    tenure: "16 months",
    fatigue: 0.5,
    note: "Closed the store at midnight and is back for 06:00. Quick, and tired.",
  },
  {
    id: "anjali",
    name: "Anjali",
    title: "Putaway",
    skills: skills(0.7, 1.1, 0.55),
    auth: { ...none, inwarding: true },
    tenure: "10 months",
    fatigue: 0,
    note: "Knows where everything on the inward dock is.",
  },
  {
    id: "joseph",
    name: "Joseph",
    title: "Picker",
    skills: skills(0.9, 0.8, 0.5),
    auth: { ...none, riders: true },
    tenure: "5 months",
    fatigue: 0,
    note: "Picking and putaway. Second on the rider handover.",
  },
];

/** The agency's replacement picker, if one is booked. Picking only, and not quick. */
export const TEMP: Employee = {
  id: "temp",
  name: "Agency picker",
  title: "4-hour booking",
  skills: skills(0.7, 0, 0),
  auth: none,
  tenure: "First shift here",
  fatigue: 0,
  note: "Sent by the staffing agency. Does not know the racks.",
};

export const BY_ID: Record<string, Employee> = Object.fromEntries(
  [...ROSTER, TEMP].map((employee) => [employee.id, employee]),
);

/**
 * Where the night shift left the eight people who are in the same place on
 * every form. The other four — Deepa, Lakshmi, Anjali and Joseph — are placed
 * by the form, and one of them is always somewhere the night needed and the
 * morning does not.
 */
export const HANDOVER_FLOOR: Record<string, Station> = {
  arjun: "picking",
  rahul: "picking",
  sneha: "picking",
  vishnu: "picking",
  kiran: "picking",
  manu: "putaway",
  riya: "putaway",
  farhan: "auditing",
};

export const STATION_LABEL: Record<Stage, string> = {
  picking: "Picking",
  putaway: "Putaway",
  auditing: "Auditing",
  riders: "Riders",
};

/** The place the work happens, for sentences. */
export const STATION_PLACE: Record<Stage, string> = {
  picking: "picking floor",
  putaway: "inward dock",
  auditing: "audit round",
  riders: "rider handover",
};

/** What one line of the device list says. */
export const LOCK_LABEL = {
  locked: "Locked to this role",
  unlocked: "Unlocked · takes orders in a spike",
} as const;

export const nameOf = (id: string): string => BY_ID[id]?.name ?? (id === "me" ? "You" : id);
