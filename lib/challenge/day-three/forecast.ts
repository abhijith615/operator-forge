/**
 * Onam Eve's demand, and the evening's clock.
 *
 * Times are minutes after 4:30 PM. After midnight the count keeps going —
 * 12:30 AM is 480 — so a block dragged into the night never wraps around.
 *
 * The numbers are this fictional store's, not an industry standard: a normal
 * evening peaks near 232 orders an hour, and tonight is forecast well above it.
 */

export const EVENING_START = 0;
/** 7:00 PM. */
export const PEAK_FROM = 150;
/** 9:00 PM. */
export const PEAK_TO = 270;
/** 10:00 PM — the evening crew's last minute. */
export const EVENING_END = 330;
/** 1:00 AM — the far edge of the board. */
export const NIGHT_END = 510;
/** The peak outcome is measured from 6:00 PM. */
export const OUTCOME_FROM = 90;

export function at(hour: number, minute = 0): number {
  return (hour - 16) * 60 + minute - 30;
}

function parts(t: number): { h24: number; m: number } {
  const total = 16 * 60 + 30 + Math.round(t);
  return { h24: Math.floor(total / 60) % 24, m: total % 60 };
}

export function clockLabel(t: number): string {
  const { h24, m } = parts(t);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h24 >= 12 ? "PM" : "AM"}`;
}

/** "7:30", for axis ticks where the half of the day is obvious. */
export function shortClock(t: number): string {
  const { h24, m } = parts(t);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")}`;
}

export type DemandLevel = "LOW" | "BUILDING" | "HIGH" | "VERY HIGH" | "LEAN";

export interface DemandBand {
  from: number;
  to: number;
  level: DemandLevel;
  /** Orders an hour in the 4:30 forecast. */
  initial: number;
  /** Orders an hour once the 7–9 PM forecast is revised. */
  revised: number;
}

/** A normal evening's peak, which tonight is measured against. */
export const NORMAL_PEAK = 232;

export const DEMAND: DemandBand[] = [
  { from: 0, to: 30, level: "LOW", initial: 120, revised: 120 },
  { from: 30, to: 90, level: "BUILDING", initial: 180, revised: 180 },
  { from: 90, to: 150, level: "HIGH", initial: 280, revised: 280 },
  { from: 150, to: 270, level: "VERY HIGH", initial: 302, revised: 330 },
  { from: 270, to: 330, level: "HIGH", initial: 240, revised: 240 },
  { from: 330, to: 510, level: "LEAN", initial: 60, revised: 60 },
];

export function bandAt(t: number): DemandBand {
  return DEMAND.find((band) => t >= band.from && t < band.to) ?? DEMAND[DEMAND.length - 1]!;
}

export function demandAt(t: number, revised: boolean): number {
  const band = bandAt(t);
  return revised ? band.revised : band.initial;
}

/** "+30%" in the 4:30 forecast, "+42%" once it is revised. */
export function peakLift(revised: boolean): number {
  return Math.round((demandAt(PEAK_FROM, revised) / NORMAL_PEAK - 1) * 100);
}

/** Orders one rider clears in an hour at this store, batching included. */
export const ORDERS_PER_RIDER_HOUR = 12.7;

export function riderNeedAt(t: number, revised: boolean): number {
  return demandAt(t, revised) / ORDERS_PER_RIDER_HOUR;
}

export const HIGH_DEMAND_CATEGORIES = [
  "Milk",
  "Bread",
  "Snacks",
  "Beverages",
  "Festival essentials",
];
