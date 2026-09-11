"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  FileSearch,
  Hand,
  Play,
  RotateCcw,
  ScanLine,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import {
  BiscuitPack,
  MicroLine,
  StageHeading,
} from "@/components/challenge/day-two/parleg/ui";
import { Button } from "@/components/ui/button";
import {
  AFFECTED_ORDERS,
  AFFECTED_PICKS,
  PICK_LOG,
  REPLAY_PICK,
  SKU_30,
  SKU_40,
  clockAt,
  pickerBreakdown,
} from "@/lib/challenge/day-two/parleg/content";
import type { ParleGState, PgEvidence, PgSku } from "@/lib/challenge/day-two/parleg/types";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

const TABS: { id: PgEvidence; label: string; hint: string; icon: LucideIcon }[] = [
  { id: "orders", label: "Orders", hint: "What the system recorded", icon: FileSearch },
  { id: "scans", label: "Scan log", hint: "Every 30 g pick tonight", icon: ScanLine },
  { id: "replay", label: "Pick replay", hint: "One transaction, rebuilt", icon: Play },
];

/**
 * Stage 2 — trace the pick.
 *
 * Three records, none of them mandatory and none of them labelled as the one
 * that matters. The orders look normal on purpose: the system recorded exactly
 * what it was told. The scan log shows what it was never told. The replay
 * shows what actually left the shelf. Which order they are opened in is part
 * of the assessment, so the stage opens on none of them.
 */
export function PickTrace({
  state,
  onOpen,
  onFilter,
  onGuess,
  onContinue,
}: {
  state: ParleGState;
  onOpen: (kind: PgEvidence) => void;
  onFilter: () => void;
  onGuess: (sku: PgSku) => void;
  onContinue: () => void;
}) {
  const [tab, setTab] = React.useState<PgEvidence | null>(null);

  function select(id: PgEvidence) {
    setTab(id);
    onOpen(id);
  }

  return (
    <div className="space-y-4">
      <StageHeading
        eyebrow="Stage 2 · Trace the pick"
        title={`Follow the ${AFFECTED_PICKS} units.`}
        sub="The records are all here. Open what you think matters."
      />

      <div role="tablist" aria-label="Evidence" className="grid grid-cols-3 gap-2">
        {TABS.map(({ id, label, hint, icon: Icon }) => {
          const active = tab === id;
          const seen = state.evidenceOpened.includes(id);
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => select(id)}
              className={cn(
                "flex min-h-[64px] flex-col items-start gap-1 rounded-card border px-3 py-2.5 text-left transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                active
                  ? "border-ember-500/60 bg-ember-500/[0.09]"
                  : "border-line bg-surface hover:border-line-bright",
              )}
            >
              <span className="flex w-full items-center gap-1.5">
                <Icon className={cn("size-4", active ? "text-ember-400" : "text-lo")} aria-hidden />
                {seen && !active ? (
                  <span className="ml-auto text-[9.5px] text-faint">Seen</span>
                ) : null}
              </span>
              <span className="text-[12.5px] leading-tight font-medium text-hi">{label}</span>
              <span className="hidden text-[10.5px] leading-tight text-faint sm:block">{hint}</span>
            </button>
          );
        })}
      </div>

      {tab === "orders" ? (
        <OrdersView />
      ) : tab === "scans" ? (
        <ScanLogView filtered={state.scanFilterApplied} onFilter={onFilter} />
      ) : tab === "replay" ? (
        <PickReplayView
          guesses={state.replayGuesses}
          found={state.mismatchFound}
          onGuess={onGuess}
        />
      ) : (
        <p className="rounded-card border border-line border-dashed bg-surface px-4 py-10 text-center text-[13px] text-lo">
          Open a record. Nothing here will tell you which one matters.
        </p>
      )}

      {state.mismatchFound ? (
        <Button variant="primary" size="lg" className="w-full" onClick={onContinue}>
          Solve the drift
          <ArrowRight />
        </Button>
      ) : null}
    </div>
  );
}

/* ── Orders ───────────────────────────────────────────────────────────── */

function OrdersView() {
  const shown = AFFECTED_ORDERS.slice(0, 4);
  const breakdown = pickerBreakdown();
  const most = breakdown[0]?.picks ?? 1;

  return (
    <section className="space-y-3 rounded-card border border-line bg-surface p-4">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-mono text-[10.5px] tracking-[0.16em] text-lo uppercase">
          Orders against {SKU_30.bin}
        </h2>
        <p className="text-[12.5px] font-medium text-hi">
          {AFFECTED_ORDERS.length} affected transactions found
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              {["Order", "Time", "Ordered", "System pick", "Picker"].map((head) => (
                <th
                  key={head}
                  scope="col"
                  className="px-2 py-2 font-mono text-[9.5px] tracking-[0.12em] text-faint uppercase"
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((order) => (
              <tr key={order.order} className="border-b border-line last:border-0">
                <td className="px-2 py-2 font-mono text-[12.5px] font-semibold text-hi">
                  #{order.order}
                </td>
                <td className="px-2 py-2 font-mono text-[12px] text-faint">{clockAt(order.at)}</td>
                <td className="px-2 py-2 text-[12.5px] text-mid">{order.ordered}</td>
                <td className="px-2 py-2 text-[12.5px] text-mid">
                  <span className="inline-flex items-center gap-1">
                    <Check className="size-3 text-ion-400" aria-hidden />
                    {order.systemPick}
                  </span>
                </td>
                <td className="px-2 py-2 font-mono text-[12px] text-mid">{order.picker}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11.5px] text-faint">
        +{AFFECTED_ORDERS.length - shown.length} more — every one identical on the record.
      </p>

      <div className="border-t border-line pt-3">
        <p className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">
          Picks by picker
        </p>
        <ul className="mt-2 space-y-1.5">
          {breakdown.map((row) => (
            <li key={row.picker} className="flex items-center gap-3">
              <span className="w-12 font-mono text-[11.5px] text-mid">{row.picker}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <span
                  className="block h-full rounded-full bg-info-500/70"
                  style={{ width: `${(row.picks / most) * 100}%` }}
                />
              </span>
              <span className="w-6 text-right font-mono text-[11.5px] text-mid tabular-nums">
                {row.picks}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="inline-flex rounded-full border border-line-strong px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] text-mid uppercase">
        System record looks normal
      </p>
    </section>
  );
}

/* ── Scan log ─────────────────────────────────────────────────────────── */

function ScanLogView({ filtered, onFilter }: { filtered: boolean; onFilter: () => void }) {
  const rows = filtered ? PICK_LOG.filter((pick) => !pick.productScanned) : PICK_LOG;
  const sample = PICK_LOG.find((pick) => !pick.productScanned)!;

  return (
    <section className="space-y-4 rounded-card border border-line bg-surface p-4">
      {/* One pick, step by step. */}
      <div>
        <p className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">
          Pick trace · #{sample.order} · {sample.picker}
        </p>
        <ol className="mt-2 space-y-1.5">
          {[
            { label: `Shelf ${sample.bin}`, note: "location scanned", ok: true },
            { label: "Product barcode", note: "verification missing", ok: false },
            { label: "Pick confirmed", note: `${sample.systemPick} recorded`, ok: true },
          ].map((step) => (
            <li key={step.label} className="flex items-center gap-2.5 text-[12.5px]">
              {step.ok ? (
                <Check className="size-3.5 shrink-0 text-ion-400" aria-hidden />
              ) : (
                <TriangleAlert className="size-3.5 shrink-0 text-warn-500" aria-hidden />
              )}
              <span className="font-medium text-hi">{step.label}</span>
              <span className={step.ok ? "text-mid" : "text-warn-500"}>{step.note}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
        <p className="text-[12px] text-mid">
          {filtered
            ? `${rows.length} of ${PICK_LOG.length} picks`
            : `${PICK_LOG.length} picks of ${SKU_30.weight} tonight`}
        </p>
        <Button
          variant={filtered ? "secondary" : "outline"}
          size="sm"
          className="ml-auto"
          disabled={filtered}
          onClick={onFilter}
        >
          {filtered ? "Showing picks with no product scan" : "Show picks with no product scan"}
        </Button>
      </div>

      {filtered ? (
        <div className="rounded-card border border-warn-500/40 bg-warn-500/[0.05] p-4">
          <p className="font-mono text-[26px] leading-none font-semibold text-warn-500 tabular-nums">
            {rows.length} picks
          </p>
          <p className="mt-1.5 font-mono text-[11px] tracking-[0.16em] text-warn-500 uppercase">
            Product verification incomplete
          </p>
          <div className="mt-3 flex flex-wrap gap-1" aria-hidden>
            {rows.map((pick) => (
              <span key={pick.order} className="h-4 w-1.5 rounded-full bg-warn-500/80" />
            ))}
          </div>
          <div className="mt-3">
            <MicroLine tone="warn">{rows.length} verification gaps.</MicroLine>
          </div>
        </div>
      ) : null}

      <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
        {rows.map((pick) => (
          <li
            key={pick.order}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 font-mono text-[11px]",
              pick.productScanned ? "border-transparent" : "border-warn-500/25 bg-warn-500/[0.04]",
            )}
          >
            <span className="w-11 text-faint tabular-nums">{clockAt(pick.at)}</span>
            <span className="w-12 text-hi">#{pick.order}</span>
            <span className="w-10 text-mid">{pick.picker}</span>
            <span className="ml-auto flex items-center gap-2 text-[10px]">
              <span className="text-ion-400">LOC ✓</span>
              <span className={pick.productScanned ? "text-ion-400" : "text-warn-500"}>
                EAN {pick.productScanned ? "✓" : "⚠"}
              </span>
              <span className="text-ion-400">CONF ✓</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Pick replay ──────────────────────────────────────────────────────── */

const REPLAY_STEPS = [
  { title: "Customer order", body: `#${REPLAY_PICK.order} · ${SKU_30.name} × 1` },
  { title: "Picker arrives", body: `${REPLAY_PICK.picker} at ${SKU_30.bin} / ${SKU_40.bin}` },
  { title: "Hand reaches", body: "A pack is taken from the shelf" },
  { title: "Physical item", body: "One pack leaves the store" },
  { title: "System record", body: `Pick confirmed · ${SKU_30.name}` },
];

/**
 * The strongest moment of the stage, built as a schematic rather than a video.
 * The pack in the hand has no visible label — what identifies it is which bin
 * the hand went into, which is the observation the learner has to make.
 */
function PickReplayView({
  guesses,
  found,
  onGuess,
}: {
  guesses: PgSku[];
  found: boolean;
  onGuess: (sku: PgSku) => void;
}) {
  const reduced = useReducedMotion();
  const [step, setStep] = React.useState(-1);

  React.useEffect(() => {
    if (step < 0 || step >= REPLAY_STEPS.length - 1) return;
    const timer = window.setTimeout(() => setStep((s) => s + 1), reduced ? 0 : 850);
    return () => window.clearTimeout(timer);
  }, [step, reduced]);

  const finished = step >= REPLAY_STEPS.length - 1;
  const lastGuess = guesses[guesses.length - 1];
  const missed = !found && lastGuess === "sku30";
  const handAtForty = step >= 2;

  return (
    <section className="space-y-4 rounded-card border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">
          Replay · #{REPLAY_PICK.order} · {clockAt(REPLAY_PICK.at)}
        </p>
        <span className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setStep(0)}>
            {step < 0 ? (
              <>
                <Play className="size-3.5" aria-hidden />
                Play replay
              </>
            ) : (
              <>
                <RotateCcw className="size-3.5" aria-hidden />
                Replay
              </>
            )}
          </Button>
          {step >= 0 && !finished ? (
            <Button variant="ghost" size="sm" onClick={() => setStep(REPLAY_STEPS.length - 1)}>
              Skip
            </Button>
          ) : null}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* The shelf, with the hand */}
        <div className="relative rounded-card border border-line-strong bg-void p-3 pt-10">
          <motion.div
            className="absolute top-2 z-10 -translate-x-1/2"
            initial={false}
            animate={{ left: handAtForty ? "75%" : "25%" }}
            transition={{ duration: reduced ? 0 : 0.6, ease: easing.outExpo }}
            style={{ left: "25%" }}
          >
            {step >= 1 ? (
              <span className="flex flex-col items-center">
                <Hand
                  className={cn("size-6", step >= 2 ? "text-ember-400" : "text-mid")}
                  aria-hidden
                />
                {step >= 3 ? <BiscuitPack size="40" hideLabel className="mt-1" /> : null}
              </span>
            ) : null}
          </motion.div>

          <div className="grid grid-cols-2 gap-2">
            {[SKU_30, SKU_40].map((sku) => {
              const reached = (sku.id === "sku40" && handAtForty) || (sku.id === "sku30" && step === 1);
              return (
                <div
                  key={sku.id}
                  className={cn(
                    "rounded-lg border p-2 transition-colors",
                    reached ? "border-ember-500/60 bg-ember-500/[0.06]" : "border-line",
                  )}
                >
                  <p className="font-mono text-[10px] text-mid">
                    {sku.bin} · <span className="font-semibold text-hi">{sku.weight}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-[3px]">
                    {Array.from({ length: 6 }, (_, i) => (
                      <BiscuitPack key={i} size={sku.id === "sku30" ? "30" : "40"} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* The sequence */}
        <ol className="space-y-1.5">
          {REPLAY_STEPS.map((entry, index) => {
            const shown = index <= step;
            return (
              <li
                key={entry.title}
                className={cn(
                  "flex gap-3 rounded-lg border px-3 py-2 transition-colors",
                  shown ? "border-line-strong bg-elevated" : "border-line border-dashed opacity-40",
                )}
              >
                <span className="font-mono text-[11px] text-faint tabular-nums">{index + 1}</span>
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-medium text-hi">{entry.title}</span>
                  <span className="block text-[11.5px] text-mid">{shown ? entry.body : "—"}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {finished && !found ? (
        <div className="space-y-3 border-t border-line pt-4">
          <p className="text-[13px] font-medium text-hi">Which pack physically left the shelf?</p>
          <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
            {([
              ["sku30", "30", SKU_30.weight],
              ["sku40", "40", SKU_40.weight],
            ] as const).map(([sku, size, label]) => (
              <button
                key={sku}
                type="button"
                onClick={() => onGuess(sku)}
                className="flex flex-col items-center gap-2 rounded-card border border-line bg-elevated px-3 py-3 transition-colors hover:border-ember-500/50 focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
              >
                <BiscuitPack size={size} large />
                <span className="font-mono text-[12px] font-semibold text-hi">{label}</span>
              </button>
            ))}
          </div>
          {missed ? <MicroLine tone="mid">Watch which bin the hand goes into.</MicroLine> : null}
        </div>
      ) : null}

      {found ? (
        <div className="space-y-3 border-t border-line pt-4">
          <div className="rounded-card border border-alert-500/45 bg-alert-500/[0.06] p-4">
            <p className="font-mono text-[11px] tracking-[0.2em] text-alert-500 uppercase">
              Mismatch found
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3">
                <BiscuitPack size="40" large />
                <div>
                  <p className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">
                    Physical pick
                  </p>
                  <p className="font-mono text-[18px] font-semibold text-hi">{SKU_40.weight}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <BiscuitPack size="30" large />
                <div>
                  <p className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">
                    System pick
                  </p>
                  <p className="font-mono text-[18px] font-semibold text-hi">{SKU_30.weight}</p>
                </div>
              </div>
            </div>
            <p className="mt-3 font-mono text-[12px] font-semibold tracking-[0.1em] text-alert-500">
              PHYSICAL PICK ≠ SYSTEM PICK
            </p>
          </div>
          <MicroLine>Physical movement doesn&apos;t match system movement.</MicroLine>
        </div>
      ) : null}
    </section>
  );
}
