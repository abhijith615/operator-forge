"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RunRecord {
  runId: string;
  /** Epoch ms at handover. */
  completedAt: number;
  rating: number;
  signature: string;
  tasksHandled: number;
  tasksExpired: number;
  hubRating: number;
}

interface HistoryState {
  runs: RunRecord[];
  record: (run: RunRecord) => void;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      runs: [],

      record: (run) => {
        // A run is recorded once; re-opening the debrief must not duplicate it.
        if (get().runs.some((entry) => entry.runId === run.runId)) return;
        set((state) => ({
          runs: [...state.runs, run].sort((a, b) => a.completedAt - b.completedAt),
        }));
      },

      clear: () => set({ runs: [] }),
    }),
    { name: "of.history", version: 1 },
  ),
);

/** ISO week key, so a streak means calendar weeks rather than seven-day windows. */
function weekKey(epoch: number): string {
  const date = new Date(epoch);
  const thursday = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  // ISO weeks are anchored on the Thursday of the same week.
  thursday.setUTCDate(thursday.getUTCDate() + 3 - ((thursday.getUTCDay() + 6) % 7));
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((thursday.getTime() - firstThursday.getTime()) / 86_400_000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Consecutive calendar weeks, counting back from the most recent run. */
export function weeklyStreak(runs: RunRecord[]): number {
  if (runs.length === 0) return 0;

  const weeks = [...new Set(runs.map((run) => weekKey(run.completedAt)))].sort();
  let streak = 1;

  for (let index = weeks.length - 1; index > 0; index -= 1) {
    const current = weeks[index];
    const previous = weeks[index - 1];
    if (!current || !previous) break;

    // Walk back one week from `current` and see whether it matches `previous`.
    const [year, weekPart] = current.split("-W");
    const weekNumber = Number(weekPart);
    const expected =
      weekNumber > 1
        ? `${year}-W${String(weekNumber - 1).padStart(2, "0")}`
        : `${Number(year) - 1}-W52`;

    if (previous === expected) streak += 1;
    else break;
  }

  return streak;
}
