/** Static definition of a mission. Runtime state arrives in Phase 2. */
export interface MissionBlueprint {
  id: string;
  codename: string;
  name: string;
  tagline: string;
  /** Minutes of wall-clock time the operator is on the floor. */
  durationMinutes: number;
  industry: string;
  role: string;
  location: string;
  difficulty: "Field Ready" | "Contested" | "Critical";
  summary: string;
  /** What the operator will actually be judged on, in plain language. */
  objectives: readonly string[];
}

/** Where the operator sits relative to their shift. Drives the whole shell. */
export type MissionPhase = "briefing" | "live" | "debrief";

export interface CapabilityDefinition {
  id: string;
  name: string;
  /** One line the operator would actually recognise themselves in. */
  blurb: string;
}
