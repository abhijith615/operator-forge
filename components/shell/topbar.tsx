"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { PanelLeft } from "lucide-react";

import { MissionProgress, MissionStatus } from "@/components/shell/mission-status";
import { Notifications } from "@/components/shell/notifications";
import { ProfileMenu } from "@/components/shell/profile-menu";
import { flatNavItems } from "@/lib/constants/navigation";
import { easing } from "@/lib/motion";
import { useShellStore } from "@/stores/shell-store";
import type { Operator } from "@/types/operator";

function useCurrentNavItem() {
  const pathname = usePathname();
  return flatNavItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}

export function Topbar({ operator }: { operator: Operator }) {
  const current = useCurrentNavItem();
  const setMobileNavOpen = useShellStore((state) => state.setMobileNavOpen);

  return (
    <header className="sticky top-0 z-50 flex h-15 shrink-0 items-center gap-3 border-b border-line bg-void/72 px-4 backdrop-blur-xl sm:px-6">
      <button
        type="button"
        onClick={() => setMobileNavOpen(true)}
        className="-ml-1 grid size-8 shrink-0 place-items-center rounded-lg text-lo transition-colors hover:bg-white/[0.06] hover:text-hi lg:hidden"
        aria-label="Open navigation"
      >
        <PanelLeft className="size-[17px]" />
      </button>

      <div className="min-w-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current?.href ?? "unknown"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: easing.outQuint }}
          >
            <h1 className="truncate text-[14.5px] font-medium tracking-[-0.01em] text-hi">
              {current?.label ?? "Operator Forge"}
            </h1>
            <p className="hidden truncate text-[12px] text-lo md:block">
              {current?.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <MissionProgress />
        <MissionStatus />
        <span className="hidden h-5 w-px bg-line sm:block" />
        <Notifications />
        <ProfileMenu operator={operator} />
      </div>
    </header>
  );
}
