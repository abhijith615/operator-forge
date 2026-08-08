"use client";

import * as React from "react";

import { AchievementToast } from "@/components/mission/achievements";
import { EventToasts } from "@/components/mission/event-toasts";
import { Walkthrough } from "@/components/mission/walkthrough";
import { CommandMenu } from "@/components/shell/command-menu";
import { MobileNav } from "@/components/shell/mobile-nav";
import { PageTransition } from "@/components/shell/page-transition";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { useMissionTick } from "@/hooks/use-mission";
import { useRecordRun } from "@/hooks/use-record-run";
import { useRunSync } from "@/hooks/use-run-sync";
import { useShellShortcuts } from "@/hooks/use-shell-shortcuts";
import { useTelemetry } from "@/hooks/use-telemetry";
import { useShellStore } from "@/stores/shell-store";
import type { Operator } from "@/types/operator";

export function AppShell({
  operator,
  isAdmin = false,
  children,
}: {
  operator: Operator;
  /** Decided by the database on the server. Only controls what the menu shows. */
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  const setIsAdmin = useShellStore((state) => state.setIsAdmin);
  React.useEffect(() => {
    setIsAdmin(isAdmin);
  }, [isAdmin, setIsAdmin]);

  useShellShortcuts();
  // Mounted once: the floor keeps moving whichever panel is open.
  useMissionTick();
  useRunSync();
  // Invisible to the operator; the debrief is built from it.
  useTelemetry();
  useRecordRun();

  return (
    <div className="relative flex min-h-dvh bg-void">
      <Sidebar />
      <MobileNav />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar operator={operator} />
        <main id="main" className="relative flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      <EventToasts />
      <AchievementToast />
      <Walkthrough />
      <CommandMenu />
    </div>
  );
}
