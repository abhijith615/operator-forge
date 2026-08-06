"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { flatNavItems } from "@/lib/constants/navigation";
import { useShellStore } from "@/stores/shell-store";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const typing =
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
  if (!typing) return false;

  // A dismissed overlay can keep focus for the length of its exit animation —
  // and if that animation is skipped entirely (hidden tab, reduced motion) it
  // can keep it indefinitely. Never let a closed surface swallow a shortcut.
  return !target.closest('[data-state="closed"], [aria-hidden="true"], [hidden]');
}

/**
 * Shell keybindings:
 *   ⌘K / Ctrl+K  open the command menu
 *   [            collapse or expand the sidebar
 *   G then <key> jump to a panel (Linear-style chord, 1.2s window)
 */
export function useShellShortcuts() {
  const router = useRouter();
  const toggleCommand = useShellStore((state) => state.toggleCommand);
  const toggleSidebar = useShellStore((state) => state.toggleSidebar);
  const chordArmed = React.useRef(false);

  React.useEffect(() => {
    let chordTimer = 0;

    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggleCommand();
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (chordArmed.current) {
        const target = flatNavItems.find(
          (item) => item.shortcut?.toLowerCase() === event.key.toLowerCase(),
        );
        chordArmed.current = false;
        window.clearTimeout(chordTimer);
        if (target) {
          event.preventDefault();
          router.push(target.href);
        }
        return;
      }

      if (event.key.toLowerCase() === "g") {
        chordArmed.current = true;
        window.clearTimeout(chordTimer);
        chordTimer = window.setTimeout(() => {
          chordArmed.current = false;
        }, 1200);
        return;
      }

      if (event.key === "[") {
        event.preventDefault();
        toggleSidebar();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(chordTimer);
    };
  }, [router, toggleCommand, toggleSidebar]);
}
