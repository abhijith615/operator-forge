"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { easing } from "@/lib/motion";
import { useShellStore } from "@/stores/shell-store";

export function MobileNav() {
  const open = useShellStore((state) => state.mobileNavOpen);
  const setOpen = useShellStore((state) => state.setMobileNavOpen);
  const pathname = usePathname();

  // Close on route change and on Escape.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, setOpen]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-90 bg-void/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.36, ease: easing.outExpo }}
            className="fixed inset-y-0 left-0 z-100 flex w-70 flex-col border-r border-line bg-obsidian"
            role="dialog"
            aria-label="Navigation"
          >
            <div className="flex h-15 items-center justify-between border-b border-line px-4">
              <div className="flex items-center gap-2.5">
                <LogoMark className="size-6" />
                <span className="text-[11.5px] font-semibold tracking-[0.18em] text-hi">
                  OPERATOR<span className="text-lo"> FORGE</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-8 place-items-center rounded-lg text-lo hover:bg-white/[0.06] hover:text-hi"
                aria-label="Close navigation"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mask-fade-y flex-1 overflow-y-auto py-4">
              <SidebarNav collapsed={false} onNavigate={() => setOpen(false)} />
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
