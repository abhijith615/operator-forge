"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Lock } from "lucide-react";

import { useIsUnlocked } from "@/components/shell/availability";
import { AGENT_ORDER } from "@/lib/agents/personas";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { navSections } from "@/lib/constants/navigation";
import { easing } from "@/lib/motion";
import { countUnread, useChatStore } from "@/stores/chat-store";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types/navigation";

interface SidebarNavProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavRow({
  item,
  collapsed,
  active,
  locked,
  badge,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  locked: boolean;
  badge: number;
  onNavigate?: () => void;
}) {
  const row = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group/nav relative flex h-9 items-center gap-3 rounded-lg px-2.5",
        "text-[13.5px] transition-colors duration-150",
        active ? "text-hi" : "text-mid hover:text-hi",
        collapsed && "justify-center px-0",
      )}
    >
      {active ? (
        <motion.span
          layoutId="nav-active"
          transition={{ type: "spring", stiffness: 520, damping: 42 }}
          className="absolute inset-0 -z-10 rounded-lg border border-line-strong bg-white/[0.055]"
        />
      ) : (
        <span className="absolute inset-0 -z-10 rounded-lg opacity-0 transition-opacity duration-150 group-hover/nav:bg-white/[0.035] group-hover/nav:opacity-100" />
      )}

      <item.icon
        className={cn(
          "size-[17px] shrink-0 transition-colors duration-150",
          active ? "text-ember-500" : "text-lo group-hover/nav:text-mid",
        )}
      />

      <AnimatePresence initial={false}>
        {!collapsed ? (
          <motion.span
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.16, ease: easing.outQuint }}
            className="flex min-w-0 flex-1 items-center gap-2 whitespace-nowrap"
          >
            <span className="truncate">{item.label}</span>
            {badge > 0 ? (
              <span
                data-readout
                className="ml-auto grid h-4 min-w-4 shrink-0 place-items-center rounded-full bg-ember-500 px-1 text-[10px] font-semibold text-white tabular-nums"
              >
                {badge}
              </span>
            ) : locked ? (
              <Lock className="ml-auto size-3 shrink-0 text-faint" aria-hidden />
            ) : null}
          </motion.span>
        ) : null}
      </AnimatePresence>

      {collapsed && badge > 0 ? (
        <span className="absolute top-1 right-1 size-1.5 rounded-full bg-ember-500 ring-2 ring-obsidian" />
      ) : null}
      {collapsed && badge === 0 && locked ? (
        <span className="absolute top-1.5 right-1.5 size-1 rounded-full bg-faint" />
      ) : null}
    </Link>
  );

  if (!collapsed) return row;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{row}</TooltipTrigger>
      <TooltipContent side="right" className="flex items-center gap-2">
        {item.label}
        {locked ? <Lock className="size-3 text-faint" /> : null}
      </TooltipContent>
    </Tooltip>
  );
}

export function SidebarNav({ collapsed, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const isUnlocked = useIsUnlocked();
  const threads = useChatStore((state) => state.threads);
  const lastReadAt = useChatStore((state) => state.lastReadAt);
  const messageBadge = React.useMemo(
    () =>
      AGENT_ORDER.reduce(
        (total, agentId) => total + countUnread(threads[agentId], lastReadAt[agentId]),
        0,
      ),
    [threads, lastReadAt],
  );

  return (
    <nav className="flex flex-col gap-5 px-3" aria-label="Mission navigation">
      {navSections.map((section) => (
        <div key={section.id}>
          <AnimatePresence initial={false}>
            {!collapsed ? (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: easing.outQuint }}
                className="mb-1.5 overflow-hidden px-2.5 font-mono text-[10px] tracking-[0.16em] text-faint uppercase"
              >
                {section.label}
              </motion.p>
            ) : (
              <div className="mx-auto mb-2 h-px w-6 bg-line" />
            )}
          </AnimatePresence>

          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.href}>
                <NavRow
                  item={item}
                  collapsed={collapsed}
                  active={isActive(pathname, item.href)}
                  locked={!isUnlocked(item.availability)}
                  badge={item.href === "/messages" ? messageBadge : 0}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
