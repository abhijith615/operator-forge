"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ShellState {
  /** Rail mode: icons only. Persisted per device. */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  /** Mobile drawer. Never persisted. */
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;

  /** ⌘K palette. */
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  toggleCommand: () => void;

  /** Notification tones during a shift. Persisted per device. */
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;

  /**
   * Which control-room column is showing below `xl`. Lives here rather than in
   * the component so the walkthrough can bring a lane into view before it tries
   * to point at something inside it.
   */
  missionLane: "comms" | "floor" | "queue";
  setMissionLane: (lane: "comms" | "floor" | "queue") => void;

  /** The orientation tour runs once, then never again unless replayed. */
  walkthroughSeen: boolean;
  setWalkthroughSeen: (seen: boolean) => void;
  walkthroughReplay: boolean;
  setWalkthroughReplay: (replay: boolean) => void;
}

export const useShellStore = create<ShellState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      mobileNavOpen: false,
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),

      commandOpen: false,
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      toggleCommand: () => set((state) => ({ commandOpen: !state.commandOpen })),

      soundEnabled: true,
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),

      missionLane: "queue",
      setMissionLane: (missionLane) => set({ missionLane }),

      walkthroughSeen: false,
      setWalkthroughSeen: (walkthroughSeen) => set({ walkthroughSeen }),
      walkthroughReplay: false,
      setWalkthroughReplay: (walkthroughReplay) => set({ walkthroughReplay }),
    }),
    {
      name: "of.shell",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        soundEnabled: state.soundEnabled,
        walkthroughSeen: state.walkthroughSeen,
      }),
    },
  ),
);
