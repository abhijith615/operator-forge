import type { SceneChoice } from "./types";

/**
 * How a shift is dealt.
 *
 * Two things here, both fixes for the same class of problem: anything the
 * operator can learn the shape of stops measuring them.
 */

/** Fisher–Yates. Returns a new array; the input is untouched. */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = out[i]!;
    const b = out[j]!;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/**
 * Options are authored best-first, because that is how they read when you are
 * writing them: the right answer, then the plausible miss, then the one that
 * breaks something. On screen that is a tell. An operator who notices it stops
 * reading the options and takes the top one, which measures pattern-spotting
 * rather than operations judgement — and every run deals them in the same
 * order, so the tell survives being told about it.
 *
 * Shuffled once, when the task lands. Never on re-render: options that move
 * under a cursor mid-decision are worse than options in a known order.
 */
export function dealChoices(choices: readonly SceneChoice[]): SceneChoice[] {
  return shuffle(choices);
}
