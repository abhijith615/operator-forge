import type { MissionBlueprint } from "@/types/mission";

export const FIRST_SHIFT: MissionBlueprint = {
  id: "first-shift",
  codename: "M-01",
  name: "The First Shift",
  tagline: "Your manager is stuck in traffic. The hub opens in four minutes.",
  durationMinutes: 30,
  industry: "Quick Commerce",
  role: "Assistant Hub Supervisor",
  location: "Dark Store 114 · Indiranagar",
  difficulty: "Contested",
  summary:
    "Thirty minutes on the floor of a ten-minute delivery hub. Orders keep arriving, and so does everything else — absences, complaints, suppliers, head office. You will not get through all of it. Nobody will tell you what the right answer is, because on a real morning nobody knows it yet.",
  objectives: [
    "Keep the hub open and orders moving",
    "Protect the customer rating you inherited",
    "Decide what to fix now and what to escalate",
    "Leave the next shift better than you found it",
  ],
} as const;

/** The message that lands before the shift. Delivered as a WhatsApp beat. */
export const HANDOVER_MESSAGE = {
  from: "Hub Manager",
  handle: "Rohit Menon",
  lines: [
    "Morning.",
    "I'm stuck in traffic.",
    "You'll have to manage today's first shift.",
    "Good luck.",
  ],
} as const;
