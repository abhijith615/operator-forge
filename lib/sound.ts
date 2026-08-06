"use client";

import type { TimelineTone } from "@/types/mission-run";

/**
 * Notification tones, synthesised rather than shipped as audio files — a short
 * two-note blip with a soft envelope. Quiet enough to live with for an hour.
 */
let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context ??= new Ctor();
  return context;
}

const TONE_PITCH: Record<TimelineTone, [number, number]> = {
  critical: [520, 392],
  warning: [494, 415],
  info: [587, 698],
  positive: [659, 880],
  neutral: [587, 659],
};

export function playNotificationSound(tone: TimelineTone = "neutral"): void {
  const ctx = getContext();
  if (!ctx) return;

  // Browsers suspend the context until a gesture; resume is a no-op otherwise.
  void ctx.resume().catch(() => undefined);

  const [first, second] = TONE_PITCH[tone];
  const now = ctx.currentTime;

  for (const [index, frequency] of [first, second].entries()) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = frequency;

    const start = now + index * 0.09;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.045, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);

    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.24);
  }
}

/** A softer single note for an incoming message. */
export function playMessageSound(): void {
  const ctx = getContext();
  if (!ctx) return;
  void ctx.resume().catch(() => undefined);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;

  osc.type = "sine";
  osc.frequency.value = 784;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.03, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}
