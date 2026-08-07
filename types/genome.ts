import type { CapabilityId } from "@/lib/constants/site";

/**
 * Bands, not percentages. The operator is never shown a number, because a
 * number invites them to optimise it rather than understand it.
 */
export type Band = "emerging" | "developing" | "solid" | "strong" | "distinctive";

/** How much the shift actually told us. Thin evidence is said out loud. */
export type Confidence = "low" | "medium" | "high";

export interface GenomeMoment {
  /** Elapsed mission seconds. */
  at: number;
  text: string;
}

export interface CapabilityReading {
  id: CapabilityId;
  name: string;
  /** 0–1. Internal: drives the radar shape and the band, never rendered. */
  score: number;
  band: Band;
  confidence: Confidence;
  evidenceCount: number;
  /** One sentence about this operator, not about the capability. */
  headline: string;
  moments: GenomeMoment[];
}

export type StoryTone = "positive" | "neutral" | "critical";

export interface StoryBeat {
  at: number;
  title: string;
  body: string;
  tone: StoryTone;
}

export interface GenomeStats {
  tasksHandled: number;
  tasksExpired: number;
  medianLatency: number;
  peakQueue: number;
  promptsSent: number;
  termsOpened: number;
  panelsVisited: number;
  ratingAtClose: number;
  otifAtClose: number;
}

export interface OperatorGenome {
  runId: string;
  /** Epoch ms. */
  generatedAt: number;
  capabilities: CapabilityReading[];
  /** 1200–1900. The only number the operator sees, and it is a rating not a mark. */
  rating: number;
  /** Archetype drawn from the two strongest capabilities. */
  signature: string;
  signatureBlurb: string;
  summary: string;
  strengths: CapabilityId[];
  growth: CapabilityId[];
  story: StoryBeat[];
  stats: GenomeStats;
}

export const BAND_LABEL: Record<Band, string> = {
  emerging: "Emerging",
  developing: "Developing",
  solid: "Solid",
  strong: "Strong",
  distinctive: "Distinctive",
};

export function bandOf(score: number): Band {
  if (score < 0.35) return "emerging";
  if (score < 0.5) return "developing";
  if (score < 0.68) return "solid";
  if (score < 0.82) return "strong";
  return "distinctive";
}

export function confidenceOf(evidenceCount: number): Confidence {
  if (evidenceCount < 3) return "low";
  if (evidenceCount < 8) return "medium";
  return "high";
}
