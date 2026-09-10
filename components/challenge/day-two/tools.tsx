"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  CircleAlert,
  Package,
  Plus,
  ScanLine,
  X,
} from "lucide-react";

import { LogRow, RecordPanel } from "@/components/challenge/day-two/ui";
import { Button } from "@/components/ui/button";
import {
  ACCESS_LOG,
  CCTV_MARKERS,
  CCTV_WINDOW,
  EARBUDS,
  EXCEPTION_BAY,
  EXCEPTION_TOTE,
  MOVEMENT_LOG,
  ORDERS,
  SCAN_LOG,
  type OrderRecord,
} from "@/lib/challenge/day-two/earbuds";
import { rupees } from "@/lib/challenge/day-two/ledger";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The six evidence surfaces.
 *
 * Each one holds one source, one thing worth noticing and one action — and
 * none of them interprets itself. The interpretation is the learner's job, and
 * an interface that does it for them is a quiz with better graphics.
 */

export interface ToolProps {
  onAddEvidence: (id: string) => void;
  hasEvidence: (id: string) => boolean;
}

/* ── Add-to-tray control ──────────────────────────────────────────────── */

function AddEvidence({
  id,
  label,
  onAdd,
  added,
}: {
  id: string;
  label: string;
  onAdd: (id: string) => void;
  added: boolean;
}) {
  return (
    <Button
      variant={added ? "secondary" : "primary"}
      size="sm"
      disabled={added}
      onClick={() => onAdd(id)}
      className="w-full sm:w-auto"
    >
      {added ? (
        <>
          <Check className="size-3.5" aria-hidden />
          In evidence tray
        </>
      ) : (
        <>
          <Plus className="size-3.5" aria-hidden />
          {label}
        </>
      )}
    </Button>
  );
}

/* ── Movement log ─────────────────────────────────────────────────────── */

export function MovementLogTool({ onAddEvidence, hasEvidence }: ToolProps) {
  return (
    <RecordPanel
      title="Movement log"
      meta={`${EARBUDS.sku} · secure cage · since 17:55`}
      footer={
        <AddEvidence
          id="system-consumed"
          label="Add: three units consumed through orders"
          onAdd={onAddEvidence}
          added={hasEvidence("system-consumed")}
        />
      }
    >
      <ol className="space-y-1">
        {MOVEMENT_LOG.map((entry) => (
          <li key={entry.time + entry.title}>
            <LogRow
              time={entry.time}
              title={entry.title}
              detail={entry.detail}
              right={
                entry.balance !== null ? (
                  <span
                    data-readout
                    className="shrink-0 font-mono text-[12px] font-semibold text-mid tabular-nums"
                  >
                    {entry.balance}
                  </span>
                ) : null
              }
            />
          </li>
        ))}
      </ol>
      <p className="mt-3 border-t border-line pt-3 text-[11.5px] leading-relaxed text-faint">
        Balance is what the system believes remains in the cage after each event.
      </p>
    </RecordPanel>
  );
}

/* ── Orders ───────────────────────────────────────────────────────────── */

export function OrdersTool({
  onOpenTrace,
  opened,
  onAddEvidence,
  hasEvidence,
}: ToolProps & {
  onOpenTrace: (orderId: string) => void;
  opened: string[];
}) {
  const [active, setActive] = React.useState<string | null>(null);
  const order = ORDERS.find((o) => o.id === active) ?? null;

  if (order) {
    return (
      <OrderTrace
        order={order}
        onBack={() => setActive(null)}
        onAddEvidence={onAddEvidence}
        hasEvidence={hasEvidence}
      />
    );
  }

  return (
    <RecordPanel title="Orders" meta="High-value lines against the secure cage tonight">
      <ul className="space-y-1.5">
        {ORDERS.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => {
                onOpenTrace(entry.id);
                setActive(entry.id);
              }}
              className="flex w-full items-center gap-3 rounded-lg border border-line bg-elevated px-3.5 py-3 text-left transition-colors hover:border-ember-500/40 focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
            >
              <span className="font-mono text-[13px] font-semibold text-hi tabular-nums">
                #{entry.id}
              </span>
              <span className="text-[12px] text-lo">{entry.placed}</span>
              <span className="ml-auto flex items-center gap-2.5">
                <span className="font-mono text-[12px] text-mid tabular-nums">
                  {rupees(entry.value)}
                </span>
                <span className="rounded-full border border-line-strong px-2 py-0.5 text-[10px] text-lo">
                  {entry.status}
                </span>
                {opened.includes(entry.id) ? (
                  <span className="text-[10px] text-faint">Seen</span>
                ) : null}
                <ArrowRight className="size-3.5 text-lo" aria-hidden />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-line pt-3 text-[11.5px] leading-relaxed text-faint">
        Open a line to see every step it passed through.
      </p>
    </RecordPanel>
  );
}

/**
 * Stage 4 — the lifecycle trace.
 *
 * The missing step is highlighted and nothing else is. There is no "this
 * caused the loss" copy anywhere on this surface, because that conclusion has
 * not been earned yet — the camera has not been watched.
 */
function OrderTrace({
  order,
  onBack,
  onAddEvidence,
  hasEvidence,
}: ToolProps & { order: OrderRecord; onBack: () => void }) {
  const reduced = useReducedMotion();
  const gap = order.steps.some((step) => step.state === "missing");

  return (
    <RecordPanel
      title={`Order #${order.id}`}
      meta={`Placed ${order.placed} · ${rupees(order.value)} · ${order.status}`}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            Back to orders
          </Button>
          {gap ? (
            <AddEvidence
              id="missing-scan"
              label="Add: order completed without the expected item scan"
              onAdd={onAddEvidence}
              added={hasEvidence("missing-scan")}
            />
          ) : null}
        </div>
      }
    >
      <ol className="relative space-y-0">
        {order.steps.map((step, index) => {
          const missing = step.state === "missing";
          const last = index === order.steps.length - 1;
          return (
            <li key={step.label} className="relative flex gap-3 pb-3 last:pb-0">
              {!last ? (
                <span
                  aria-hidden
                  className="absolute top-6 bottom-0 left-[11px] w-px bg-line-strong"
                />
              ) : null}
              <span
                className={cn(
                  "relative z-10 mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-full border",
                  missing
                    ? "border-warn-500 bg-warn-500/15 text-warn-500"
                    : "border-ion-500/45 bg-ion-500/10 text-ion-400",
                )}
              >
                {missing ? (
                  <X className="size-3" strokeWidth={3} aria-hidden />
                ) : (
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                )}
              </span>
              <span className="min-w-0 flex-1 pt-0.5">
                <span
                  className={cn(
                    "block text-[13px] leading-snug font-medium",
                    missing ? "text-warn-500" : "text-hi",
                  )}
                >
                  {step.label}
                  {missing ? (
                    <span className="ml-2 font-mono text-[10px] tracking-[0.12em] uppercase">
                      No record
                    </span>
                  ) : null}
                </span>
                {step.time ? (
                  <span className="mt-0.5 block font-mono text-[11px] text-faint tabular-nums">
                    {step.time}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>

      {gap ? (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: easing.outExpo }}
          className="mt-4 rounded-card border border-warn-500/40 bg-warn-500/[0.05] p-3.5"
        >
          <p className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.16em] text-warn-500 uppercase">
            <CircleAlert className="size-3.5" aria-hidden />
            Movement gap detected
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-mid">
            A physical high-value item may have left controlled storage without
            the expected inventory scan.
          </p>
        </motion.div>
      ) : null}
    </RecordPanel>
  );
}

/* ── Scan logs ────────────────────────────────────────────────────────── */

export function ScanLogTool({ onAddEvidence, hasEvidence }: ToolProps) {
  return (
    <RecordPanel
      title="Scan logs"
      meta="Handheld and bench devices · 18:00 – 19:30"
      footer={
        <AddEvidence
          id="cage-event"
          label="Add: cage event at 18:43 with no item scan following"
          onAdd={onAddEvidence}
          added={hasEvidence("cage-event")}
        />
      }
    >
      <ul className="space-y-1">
        {SCAN_LOG.map((row) => (
          <li key={row.time + row.device}>
            <LogRow
              time={row.time}
              title={row.device}
              detail={row.result}
              flag={!row.ok}
              right={
                <span
                  className={cn(
                    "shrink-0 font-mono text-[10.5px] tracking-wide",
                    row.ok ? "text-lo" : "text-warn-500",
                  )}
                >
                  {row.sku}
                </span>
              }
            />
          </li>
        ))}
      </ul>
    </RecordPanel>
  );
}

/* ── Access log ───────────────────────────────────────────────────────── */

/**
 * Stage 5 — deliberately the weakest evidence in the case.
 *
 * The circumstantial row is labelled as circumstantial *on the surface itself*,
 * before any conclusion is committed. That is not giving the answer away: it
 * is teaching the category. What the interface never does is suggest what the
 * presence might mean.
 */
export function AccessLogTool({ onAddEvidence, hasEvidence }: ToolProps) {
  return (
    <RecordPanel
      title="Access log"
      meta="Secure storage · Bay H1"
      footer={
        <AddEvidence
          id="proximity"
          label="Add: associate present during the unscanned movement"
          onAdd={onAddEvidence}
          added={hasEvidence("proximity")}
        />
      }
    >
      <ul className="space-y-1">
        {ACCESS_LOG.map((row) => (
          <li key={row.time + row.who}>
            <LogRow
              time={row.time}
              title={row.who}
              detail={row.event}
              right={
                row.circumstantial ? (
                  <span className="shrink-0 rounded-full border border-line-strong px-2 py-0.5 font-mono text-[9.5px] tracking-[0.1em] text-lo uppercase">
                    Presence only
                  </span>
                ) : null
              }
            />
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-line pt-3 text-[11.5px] leading-relaxed text-faint">
        An access record establishes who was where. It does not establish what
        anybody did.
      </p>
    </RecordPanel>
  );
}

/* ── CCTV ─────────────────────────────────────────────────────────────── */

/**
 * Stage 6 — a scrubbable timeline rather than a video.
 *
 * Still frames described in words carry the information a clip would and cost
 * nothing to load, which matters on a store handheld over a store's wifi. The
 * classification button below is gated on evidence, not on having watched:
 * seeing the unit leave means nothing until you know the scan is missing.
 */
export function CctvTool({
  viewed,
  onView,
  onAddEvidence,
  hasEvidence,
  canClassify,
  classified,
  onClassify,
}: ToolProps & {
  viewed: string[];
  onView: (time: string) => void;
  canClassify: boolean;
  classified: boolean;
  onClassify: () => void;
}) {
  const [active, setActive] = React.useState<string>(CCTV_MARKERS[0]!.time);
  const marker = CCTV_MARKERS.find((m) => m.time === active) ?? CCTV_MARKERS[0]!;
  const reduced = useReducedMotion();

  function select(time: string) {
    setActive(time);
    onView(time);
  }

  return (
    <RecordPanel
      title="CCTV"
      meta={`Bay H1 · ${CCTV_WINDOW.from} – ${CCTV_WINDOW.to}`}
      footer={
        <div className="space-y-2.5">
          <AddEvidence
            id="cctv-issue"
            label="Add: unit physically issued into a live customer order"
            onAdd={onAddEvidence}
            added={hasEvidence("cctv-issue")}
          />
          {classified ? (
            <p className="text-[11.5px] text-ion-400">
              Classified as a process variance. One unit accounted for.
            </p>
          ) : canClassify ? (
            <Button variant="secondary" size="sm" onClick={onClassify} className="w-full sm:w-auto">
              Classify this movement
            </Button>
          ) : (
            <p className="text-[11.5px] leading-relaxed text-faint">
              Classifying this movement needs both the camera and the order
              record in the tray. Watching a box leave does not say whether it
              was supposed to.
            </p>
          )}
        </div>
      }
    >
      {/* Track */}
      <div className="pt-1 pb-5">
        <div className="relative h-8">
          <div
            aria-hidden
            className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line-strong"
          />
          {CCTV_MARKERS.map((m) => {
            const isActive = m.time === active;
            const seen = viewed.includes(m.time);
            return (
              <button
                key={m.time}
                type="button"
                onClick={() => select(m.time)}
                aria-label={`Jump to ${m.time}`}
                aria-current={isActive}
                style={{ left: `${m.position * 100}%` }}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 p-2 focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "block rounded-full transition-all duration-200",
                    isActive
                      ? "size-3.5 bg-ember-500 ring-4 ring-ember-500/25"
                      : seen
                        ? "size-2.5 bg-mid"
                        : "size-2.5 bg-lo hover:bg-mid",
                  )}
                />
              </button>
            );
          })}
        </div>
        <div className="flex justify-between font-mono text-[10px] text-faint tabular-nums">
          <span>{CCTV_WINDOW.from}</span>
          <span>{CCTV_WINDOW.to}</span>
        </div>
      </div>

      {/* Frame */}
      <motion.div
        key={marker.time}
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="rounded-card border border-line-strong bg-void p-4"
      >
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-alert-500" aria-hidden />
          <span
            data-readout
            className="font-mono text-[12px] font-semibold text-hi tabular-nums"
          >
            {marker.time}
          </span>
          <span className="ml-auto font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">
            Cam 04 · Bay H1
          </span>
        </div>
        <p
          className={cn(
            "mt-3 text-[14px] leading-snug font-semibold",
            marker.material ? "text-hi" : "text-lo",
          )}
        >
          {marker.headline}
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-mid">{marker.detail}</p>
      </motion.div>

      <p className="mt-3 text-[11.5px] leading-relaxed text-faint">
        {viewed.length} of {CCTV_MARKERS.length} timestamps reviewed.
      </p>
    </RecordPanel>
  );
}

/* ── Exception bay ────────────────────────────────────────────────────── */

/**
 * Stage 7 — where the second unit actually is.
 *
 * Four totes, one of which holds something. The learner opens totes; nothing
 * points at EXC-03 beyond a high-value tag being visible, which is the same
 * thing a person walking the bay would see.
 */
export function ExceptionTool({
  inspected,
  onInspect,
  onAddEvidence,
  hasEvidence,
  canRecover,
  recovered,
  onRecover,
}: ToolProps & {
  inspected: boolean;
  onInspect: () => void;
  canRecover: boolean;
  recovered: boolean;
  onRecover: () => void;
}) {
  const [opened, setOpened] = React.useState<string[]>([]);
  const reduced = useReducedMotion();

  function open(id: string, holds: boolean) {
    if (!opened.includes(id)) setOpened((prev) => [...prev, id]);
    if (holds) onInspect();
  }

  return (
    <RecordPanel
      title="Exception bay"
      meta="Cancelled and returned stock awaiting restow"
      footer={
        inspected ? (
          <div className="space-y-2.5">
            <AddEvidence
              id="tote-unit"
              label="Add: unit in tote EXC-03 against cancelled order #6188"
              onAdd={onAddEvidence}
              added={hasEvidence("tote-unit")}
            />
            {recovered ? (
              <p className="text-[11.5px] text-ion-400">
                Unit restowed to the cage. Physical count is now 10.
              </p>
            ) : canRecover ? (
              <Button variant="primary" size="sm" onClick={onRecover} className="w-full sm:w-auto">
                <ScanLine className="size-3.5" aria-hidden />
                Restow unit to secure cage
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      <ul className="grid gap-2 sm:grid-cols-2">
        {EXCEPTION_BAY.map((tote) => {
          const isOpen = opened.includes(tote.id);
          return (
            <li key={tote.id}>
              <button
                type="button"
                onClick={() => open(tote.id, tote.holds)}
                aria-expanded={isOpen}
                className={cn(
                  "flex w-full items-center gap-3 rounded-card border px-3.5 py-3 text-left transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                  isOpen && tote.holds
                    ? "border-ion-500/50 bg-ion-500/[0.07]"
                    : "border-line bg-elevated hover:border-ember-500/40",
                )}
              >
                <Package
                  className={cn(
                    "size-4 shrink-0",
                    isOpen && tote.holds ? "text-ion-400" : "text-lo",
                  )}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block font-mono text-[12px] font-semibold text-hi">
                    {tote.tote}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] leading-snug text-mid">
                    {isOpen ? tote.contents : "Not inspected"}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {inspected ? (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: easing.outExpo }}
          className="mt-4 rounded-card border border-ion-500/40 bg-ion-500/[0.05] p-4"
        >
          <p className="font-mono text-[10.5px] tracking-[0.16em] text-ion-400 uppercase">
            {EXCEPTION_TOTE.tote} · {EARBUDS.name}
          </p>
          <p className="mt-2 text-[13px] font-medium text-hi">
            Order #{EXCEPTION_TOTE.orderId} · {EXCEPTION_TOTE.status}
          </p>
          <ol className="mt-3 space-y-1.5">
            {EXCEPTION_TOTE.timeline.map((step) => {
              const missing = step.state === "missing";
              return (
                <li key={step.label} className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "grid size-4 shrink-0 place-items-center rounded-full border",
                      missing
                        ? "border-warn-500 bg-warn-500/15 text-warn-500"
                        : "border-ion-500/45 text-ion-400",
                    )}
                  >
                    {missing ? (
                      <X className="size-2" strokeWidth={3} aria-hidden />
                    ) : (
                      <Check className="size-2" strokeWidth={3} aria-hidden />
                    )}
                  </span>
                  <span
                    data-readout
                    className="w-11 font-mono text-[11px] text-faint tabular-nums"
                  >
                    {step.time ?? "—"}
                  </span>
                  <span
                    className={cn(
                      "text-[12.5px]",
                      missing ? "font-medium text-warn-500" : "text-mid",
                    )}
                  >
                    {step.label}
                    {missing ? (
                      <span className="ml-2 font-mono text-[10px] tracking-[0.12em] uppercase">
                        No record
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ol>
        </motion.div>
      ) : null}
    </RecordPanel>
  );
}
