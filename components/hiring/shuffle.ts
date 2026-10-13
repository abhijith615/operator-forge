"use client";

import * as React from "react";

import { useHiringStore } from "@/stores/hiring-store";

/**
 * The order options are shown in.
 *
 * A list written by somebody who knows the answer tends to put the answer
 * first, and a candidate notices by the third screen. So every list of
 * choices — what to say, which steps to take, who to give a job to — is shown
 * in an order that depends on the attempt and on the list, and on nothing
 * about which option is the good one.
 *
 * It is a fixed order for a given attempt, not a fresh shuffle on each render:
 * reloading the page, or opening the same list twice, shows it the same way.
 * And it ranks each option on its own, so a list that grows or shrinks (an
 * answer that only appears once something has been checked, a person who is
 * no longer free) keeps everybody else where they were.
 *
 * Only the order changes. What is recorded is the option chosen, by its id,
 * so nothing here touches a score.
 */

/** FNV-1a, then a final mix: a well-spread 32-bit number from a string. */
function rank(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  return hash >>> 0;
}

export function shuffledBy<T extends { id: string }>(items: readonly T[], seed: string): T[] {
  return [...items].sort((a, b) => rank(`${seed}:${a.id}`) - rank(`${seed}:${b.id}`) || a.id.localeCompare(b.id));
}

/** The order for one list in this attempt. `key` names the list. */
export function useShuffle(key: string): <T extends { id: string }>(items: readonly T[]) => T[] {
  const attempt = useHiringStore((store) => store.attempt?.id ?? "");
  return React.useCallback(
    <T extends { id: string }>(items: readonly T[]) => shuffledBy(items, `${attempt}:${key}`),
    [attempt, key],
  );
}
