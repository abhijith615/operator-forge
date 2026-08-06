"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useShellStore } from "@/stores/shell-store";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const collapsed = useShellStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useShellStore((state) => state.toggleSidebar);
  const setCommandOpen = useShellStore((state) => state.setCommandOpen);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? "4.25rem" : "15.5rem" }}
      transition={{ duration: 0.36, ease: easing.outExpo }}
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line",
        "bg-obsidian/70 backdrop-blur-xl lg:flex",
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex h-15 items-center border-b border-line px-4",
          collapsed && "justify-center px-0",
        )}
      >
        <Link href="/mission" className="group flex items-center gap-2.5" aria-label="Mission">
          <LogoMark className="size-6 transition-transform duration-500 ease-out-expo group-hover:rotate-90" />
          {!collapsed ? (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.06 }}
              className="text-[11.5px] font-semibold tracking-[0.18em] whitespace-nowrap text-hi"
            >
              OPERATOR<span className="text-lo"> FORGE</span>
            </motion.span>
          ) : null}
        </Link>
      </div>

      {/* Search trigger */}
      <div className={cn("px-3 pt-4 pb-2", collapsed && "px-3")}>
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className={cn(
            "group flex h-9 w-full items-center gap-2.5 rounded-lg border border-line px-2.5",
            "bg-white/[0.02] text-[13px] text-lo transition-colors duration-150",
            "hover:border-line-strong hover:bg-white/[0.045] hover:text-mid",
            collapsed && "justify-center px-0",
          )}
        >
          <Search className="size-[15px] shrink-0" />
          {!collapsed ? (
            <>
              <span>Search</span>
              <Kbd className="ml-auto">⌘K</Kbd>
            </>
          ) : null}
        </button>
      </div>

      {/* Navigation */}
      <div className="mask-fade-y flex-1 overflow-y-auto py-3">
        <SidebarNav collapsed={collapsed} />
      </div>

      {/* Collapse */}
      <div
        className={cn(
          "flex h-13 items-center border-t border-line px-3",
          collapsed && "justify-center",
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleSidebar}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-lg px-2 text-[12.5px] text-lo",
                "transition-colors duration-150 hover:bg-white/[0.05] hover:text-mid",
                collapsed ? "w-8 justify-center px-0" : "w-full",
              )}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <>
                  <PanelLeftClose className="size-4" />
                  <span>Collapse</span>
                  <Kbd className="ml-auto">[</Kbd>
                </>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {collapsed ? "Expand sidebar" : "Collapse sidebar"}
          </TooltipContent>
        </Tooltip>
      </div>
    </motion.aside>
  );
}
