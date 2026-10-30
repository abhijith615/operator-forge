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
    note: "Night shift, ends at 06:30. He may be asked to stay for the breakfast rush.",
    stats: [
      { label: "Seconds per item", value: "12.8" },
      { label: "Correct picks", value: "99.3%" },
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
    note: "Runs the receiving area. Knows every bin in the store.",
  },
  {
    id: "rahul",
    name: "Rahul",
    title: "Senior picker",
    skills: skills(1.05, 0.6, 0.5),
    auth: { ...none, riders: true },
    tenure: "19 months",
    fatigue: 0,
    note: "Organises the riders at the pickup point when it gets busy. The riders listen to him.",
  },
  {
    id: "riya",
    name: "Riya",
    title: "New joiner",
    skills: skills(0.5, 0.55, 0.2),
    auth: none,
    tenure: "Day 2",
    fatigue: 0,
    note: "Joined yesterday through the agency. Training: putaway only.",
  },
  {
    id: "sneha",
    name: "Sneha",
    title: "Picker",
    skills: skills(1.0, 1.0, 0.5),
    auth: { ...none, inwarding: true },
    tenure: "9 months",
    fatigue: 0,
    note: "Trained for putaway.",
  },
  {
    id: "farhan",
    name: "Farhan",
    title: "Picker · stock counts",
    skills: skills(1.0, 0.7, 1.1),
    auth: { ...none, audit: true, highValue: true },
    tenure: "11 months",
    fatigue: 0,
    note: "Trained to count stock. Allowed into the cage for expensive items.",
  },
  {
    id: "deepa",
    name: "Deepa",
    title: "Picker",
    skills: skills(0.95, 0.7, 0.9),
    auth: none,
    tenure: "8 months",
    fatigue: 0,
    note: "Does the fresh food check most mornings. Steady. Rarely picks a wrong item.",
  },
  {
    id: "kiran",
    name: "Kiran",
    title: "Picker",
    skills: skills(0.9, 0.9, 0.4),
    auth: { ...none, inwarding: true },
    tenure: "6 months",
    fatigue: 0.2,
    note: "Does picking and putaway about equally well.",
  },
  {
    id: "lakshmi",
    name: "Lakshmi",
    title: "Stock checker",
    skills: skills(0.85, 0.6, 1.0),
    auth: { ...none, audit: true, riders: true },
    tenure: "13 months",
    fatigue: 0,
    note: "Runs the stock counts. Has run the rider pickup point on Rahul's days off.",
  },
  {
    id: "vishnu",
    name: "Vishnu",
    title: "Picker",
    skills: skills(1.05, 0.8, 0.4),
    auth: none,
    tenure: "16 months",
    fatigue: 0.5,
    note: "Closed the store at midnight and is back for 06:00. Quick, but tired.",
  },
  {
    id: "anjali",
    name: "Anjali",
    title: "Putaway",
    skills: skills(0.7, 1.1, 0.55),
    auth: { ...none, inwarding: true },
    tenure: "10 months",
    fatigue: 0,
    note: "Knows where everything in the receiving area is.",
  },
  {
    id: "joseph",
    name: "Joseph",
    title: "Picker",
    skills: skills(0.9, 0.8, 0.5),
    auth: { ...none, riders: true },
    tenure: "5 months",
    fatigue: 0,
    note: "Picking and putaway. Second in line for the rider pickup point.",
  },
];

/** An agency picker, if one is booked. Picking only, and not quick. */
export const TEMP: Employee = {
  id: "temp",
  name: "Agency picker",
  title: "Paid by the hour",
  skills: skills(0.7, 0, 0),
  auth: none,
  tenure: "First shift here",
  fatigue: 0,
  note: "Sent by the agency. Does not know the racks.",
};

/**
 * Extra hands from the staffing agency, paid by the hour. Up to two can be
 * called in for the morning; each is booked for at least four hours, and
 * neither arrives before 06:20.
 */
export const AGENCY_RATE = 160;
export const AGENCY_HOURS = 4;
export const AGENCY_COST = AGENCY_RATE * AGENCY_HOURS;
export const AGENCY_MAX = 2;

const TEMPS: Employee[] = [TEMP, { ...TEMP, id: "temp2", name: "Agency picker 2" }];
export const TEMP_IDS = TEMPS.map((employee) => employee.id);
export function isTemp(id: string): boolean {
  return TEMP_IDS.includes(id);
}

export const BY_ID: Record<string, Employee> = Object.fromEntries(
  [...ROSTER, ...TEMPS].map((employee) => [employee.id, employee]),
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
  auditing: "Checking",
  riders: "Riders",
};

/** The place the work happens, for sentences. */
export const STATION_PLACE: Record<Stage, string> = {
  picking: "picking floor",
  putaway: "receiving area",
  auditing: "stock checks",
  riders: "rider pickup point",
};

/** What one line of the device list says. */
export const LOCK_LABEL = {
  locked: "Locked to this job",
  unlocked: "Unlocked · gets orders when it is busy",
} as const;

export const nameOf = (id: string): string => BY_ID[id]?.name ?? (id === "me" ? "You" : id);
