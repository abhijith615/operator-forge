"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CloudRain,
  Info,
  TriangleAlert,
  X,
  Zap,
} from "lucide-react";

import { hubClock } from "@/lib/mission/config";
import { playNotificationSound } from "@/lib/sound";
import { easing } from "@/lib/motion";
import { useMissionStore } from "@/stores/mission-store";
import { useShellStore } from "@/stores/shell-store";
import { cn } from "@/lib/utils";
import type { TimelineTone } from "@/types/mission-run";

const DWELL_MS = 11_000;

const TONE = {
  critical: { icon: TriangleAlert, ring: "border-alert-500/30", dot: "bg-alert-500", text: "text-alert-500" },
  warning: { icon: CloudRain, ring: "border-warn-500/30", dot: "bg-warn-500", text: "text-warn-500" },
  info: { icon: Info, ring: "border-info-500/30", dot: "bg-info-500", text: "text-info-500" },
  positive: { icon: Zap, ring: "border-ion-500/30", dot: "bg-ion-500", text: "text-ion-400" },
  neutral: { icon: Info, ring: "border-line-strong", dot: "bg-lo", text: "text-mid" },
} satisfies Record<TimelineTone, unknown> as Record<
  TimelineTone,
  { icon: typeof Info; ring: string; dot: string; text: string }
>;

/**
 * Events arrive the way an operating system tells you something: from the edge,
 * quietly, dismissible, never blocking the floor.
 */
export function EventToasts() {
  const notifications = useMissionStore((state) => state.notifications);
  const dismiss = useMissionStore((state) => state.dismissNotification);
  const soundEnabled = useShellStore((state) => state.soundEnabled);
  const announced = React.useRef(new Set<string>());

  React.useEffect(() => {
    for (const notification of notifications) {
      if (announced.current.has(notification.id)) continue;
      announced.current.add(notification.id);
      if (soundEnabled) playNotificationSound(notification.tone);
    }
  }, [notifications, soundEnabled]);

  return (
    // Top-right, under the topbar, is the reserved notification lane: no panel
    // puts interactive controls there. It was bottom-right, which sat on top of
    // the chat composer and quietly ate clicks on it.
    <div className="pointer-events-none fixed top-18 right-4 z-70 flex w-[min(23rem,calc(100vw-2rem))] flex-col gap-2.5 sm:right-6">
      <AnimatePresence initial={false}>
        {notifications.slice(-3).map((notification) => (
          <Toast
            key={notification.id}
            id={notification.id}
            at={notification.at}
            tone={notification.tone}
            title={notification.title}
            body={notification.body}
            href={notification.href}
            actionLabel={notification.actionLabel}
            onDismiss={dismiss}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ToastProps {
  id: string;
  at: number;
  tone: TimelineTone;
  title: string;
  body: string;
  href?: string;
  actionLabel?: string;
  onDismiss: (id: string) => void;
}

function Toast({ id, at, tone, title, body, href, actionLabel, onDismiss }: ToastProps) {
  const style = TONE[tone];
  const Icon = style.icon;

  React.useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(id), DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 44, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.97, transition: { duration: 0.2 } }}
      transition={{ duration: 0.5, ease: easing.outExpo }}
      className={cn(
        // Opaque, not `glass`. These land on top of the task queue, and 5%
        // white over a blur lets the heading and the chips underneath read
        // straight through the notification sitting on them. `border` carries
        // the width so the tone class only has to set the colour.
        "pointer-events-auto relative overflow-hidden rounded-xl border bg-raised p-4",
        "shadow-[0_24px_60px_-30px_rgba(0,0,0,1)]",
        style.ring,
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 shrink-0", style.text)}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[13.5px] font-medium text-hi">{title}</p>
            <span
              data-readout
              className="ml-auto shrink-0 font-mono text-[10px] text-faint tabular-nums"
            >
              {hubClock(at)}
            </span>
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-mid">{body}</p>
          {href && actionLabel ? (
            <Link
              href={href}
              onClick={() => onDismiss(id)}
              className="mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] text-ember-400 transition-colors hover:text-ember-200"
            >
              {actionLabel}
              <ArrowRight className="size-3" />
            </Link>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(id)}
          className="-mt-1 -mr-1 grid size-6 shrink-0 place-items-center rounded-full text-faint transition-colors hover:bg-white/[0.07] hover:text-hi"
          aria-label="Dismiss"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: DWELL_MS / 1000, ease: "linear" }}
        className={cn("absolute inset-x-0 bottom-0 h-px origin-left", style.dot)}
      />
    </motion.div>
  );
}
