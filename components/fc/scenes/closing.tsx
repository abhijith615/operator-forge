"use client";

import * as React from "react";
import { AlertTriangle, ArrowRight, Check, Flag, Send } from "lucide-react";

import { ActionBar, Card, Choice, Eyebrow, Notice, PrimaryButton, QuietButton, SceneHeading, Speech } from "@/components/hiring/ui";
import {
  BUCKET_LABEL,
  BUCKET_NOTE,
  DO_NOW_LIMIT,
  DRIVER_OPTIONS,
  ESCALATIONS,
  PEAK_ITEMS,
  PROCUREMENT_LINE,
  PROCUREMENT_MESSAGES,
  REPORT_LINES,
  SCHEDULE_PLAN_TOTAL,
  SHEET,
  SHEET_TOOLS,
  SHEET_TOOL_LIMIT,
  SIGNALS,
  VENDOR_LINE,
  VENDOR_REPLIES,
  type Bucket,
  type PeakItemId,
} from "@/lib/fc/content";
import { outcomeOf } from "@/lib/fc/engine";
import { cn } from "@/lib/utils";

import { Lines, useFcShuffle, type SceneProps } from "../shared";

const fmt = (n: number) => n.toLocaleString("en-IN");

/* ── 11:00 Data ───────────────────────────────────────────────────────── */

function Tracker({ state, act }: SceneProps) {
  const d = state.data;
  const toolOrder = useFcShuffle("sheetTools");
  const rows = SHEET.filter((row) => !(row.duplicate && d.deduped));
  const spotted = d.flags.some((id) => id === "spice" || id === "spice2");
  const found = d.tools.includes("duplicates") || spotted;
  const checksLeft = SHEET_TOOL_LIMIT - d.tools.length - d.flags.length;
  const sum = (key: "plan" | "accepted" | "damaged" | "short") => rows.reduce((total, row) => total + row[key], 0);
  return (
    <div>
      <p className="mb-1.5 text-right text-[11.5px] text-lo sm:hidden">Swipe the sheet sideways to see every column →</p>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[560px] border-collapse font-mono text-[12.5px]">
          <thead>
            <tr className="bg-[#16301f] text-left text-[11px] tracking-[0.04em] text-[#9fd9b4] uppercase">
              {["Vendor", "Plan", "Accepted", "Damaged / rejected", "Short", "GRN", "Dock min"].map((h, i) => (
                <th key={h} className={cn("border border-[#2a3a2f] px-2 py-1.5 font-semibold", i > 0 ? "text-right" : "sticky left-0 z-10 bg-[#16301f]")}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const flagged = found && row.duplicate;
              return (
                <tr key={row.id} className={cn("text-hi", flagged ? "bg-warn-500/15" : "bg-white/[0.02]")}>
                  <td className={cn("sticky left-0 z-10 border border-line px-2 py-1.5 font-sans text-[13px]", flagged ? "bg-[#2b2414]" : "bg-[#161616]")}>
                    <button
                      type="button"
                      disabled={d.flags.includes(row.id) || checksLeft <= 0 || d.deduped}
                      onClick={() => act({ t: "flagRow", id: row.id })}
                      aria-label={`Flag the ${row.vendor} row as wrong`}
                      className="group inline-flex items-center gap-1.5 text-left disabled:cursor-default"
                    >
                      <Flag className={cn("size-3 shrink-0", d.flags.includes(row.id) ? "fill-warn-500 text-warn-500" : "text-faint group-hover:text-ember-500 group-disabled:text-faint")} aria-hidden />
                      {row.vendor}
                    </button>
                    {flagged ? <span className="ml-1.5 font-sans text-[11px] font-semibold text-warn-500">repeated</span> : null}
                  </td>
                  <td className="tabular border border-line px-2 py-1.5 text-right">{fmt(row.plan)}</td>
                  <td className="tabular border border-line px-2 py-1.5 text-right">{fmt(row.accepted)}</td>
                  <td className="tabular border border-line px-2 py-1.5 text-right">{row.damaged}</td>
                  <td className="tabular border border-line px-2 py-1.5 text-right">{row.short}</td>
                  <td className="border border-line px-2 py-1.5 text-right font-sans text-[12.5px]">{row.grn}</td>
                  <td className="tabular border border-line px-2 py-1.5 text-right">{row.dockMinutes}</td>
                </tr>
              );
            })}
            <tr className="bg-white/[0.06] font-semibold text-hi">
              <td className="sticky left-0 z-10 border border-line bg-[#1f1f1f] px-2 py-1.5 font-sans text-[13px]">TOTAL</td>
              <td className="tabular border border-line px-2 py-1.5 text-right">{fmt(sum("plan"))}</td>
              <td className="tabular border border-line px-2 py-1.5 text-right">{fmt(sum("accepted"))}</td>
              <td className="tabular border border-line px-2 py-1.5 text-right">{sum("damaged")}</td>
              <td className="tabular border border-line px-2 py-1.5 text-right">{sum("short")}</td>
              <td className="border border-line px-2 py-1.5" />
              <td className="border border-line px-2 py-1.5" />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <p className="text-[13.5px] font-semibold text-hi">Check the sheet</p>
        <p className="tabular text-[12.5px] text-lo">
          Checks left: {checksLeft} of {SHEET_TOOL_LIMIT}
        </p>
      </div>
      <p className="mt-0.5 text-[12.5px] text-lo">
        You have time for {SHEET_TOOL_LIMIT} checks before the update is due. Run one below, or tap a vendor’s name in the sheet to flag a row that looks wrong — each uses one check.
      </p>
      {d.flags.length ? (
        <ul className="mt-2 space-y-1">
          {d.flags.map((id) => {
            const row = SHEET.find((r) => r.id === id);
            const dup = id === "spice" || id === "spice2";
            return (
              <li key={id} className="border-l-2 border-line-strong pl-3 text-[13px] leading-snug text-mid">
                Flagged {row?.vendor}:{" "}
                {dup
                  ? d.deduped
                    ? "the repeated row has been removed."
                    : "Spice Route Foods is on the sheet twice, with the same numbers. Only one Spice Route truck came in today."
                  : "this row matches a truck that came in, and its numbers add up."}
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className="mt-2 space-y-1.5">
        {toolOrder(SHEET_TOOLS).map((tool) => {
          const used = d.tools.includes(tool.id);
          return (
            <div key={tool.id}>
              <Choice go={!used} selected={used} disabled={!used && checksLeft <= 0} onClick={used ? undefined : () => act({ t: "sheetTool", id: tool.id })}>
                {tool.label}
              </Choice>
              {used ? (
                <p className="mt-1 mb-2 ml-1 border-l-2 border-line-strong pl-3 text-[13px] leading-snug text-mid">
                  {tool.id === "totals"
                    ? `Plan total on the sheet: ${fmt(sum("plan"))}. Today’s trucks on the dock schedule: ${fmt(SCHEDULE_PLAN_TOTAL)}. ${sum("plan") === SCHEDULE_PLAN_TOTAL ? "They match." : "They don’t match."}`
                    : tool.id === "duplicates"
                      ? d.deduped
                        ? "Every row now matches one truck."
                        : "Spice Route Foods is on the sheet twice, with the same numbers. Only one Spice Route truck came in today."
                      : tool.result}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      {d.deduped ? (
        <Notice tone="good" className="mt-2">
          The repeated Spice Route row has been removed.
        </Notice>
      ) : null}
      {(found || d.prompted) && !d.deduped ? (
        <QuietButton className="mt-2 sm:w-full" onClick={() => act({ t: "removeDuplicate" })}>
          Remove the repeated row
        </QuietButton>
      ) : null}
    </div>
  );
}

function Pick({ options, picked, onToggle, max }: { options: { id: string; label: string }[]; picked: string[]; onToggle: (id: string) => void; max: number }) {
  return (
    <div className="space-y-1.5">
      {options.map((o) => (
        <Choice key={o.id} selected={picked.includes(o.id)} disabled={!picked.includes(o.id) && picked.length >= max} onClick={() => onToggle(o.id)}>
          {o.label}
        </Choice>
      ))}
    </div>
  );
}

export function DataScene({ state, act }: SceneProps) {
  const d = state.data;
  const [signals, setSignals] = React.useState<string[]>([]);
  const [lines, setLines] = React.useState<string[]>([]);
  const signalOrder = useFcShuffle("signals");
  const driverOrder = useFcShuffle("driver");
  const lineOrder = useFcShuffle("report");
  const escalateOrder = useFcShuffle("escalate");
  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (id: string) =>
    setter((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  const step = !d.signals ? 1 : !d.driver ? 2 : !d.report ? 3 : 4;

  return (
    <>
      <SceneHeading eyebrow="11:00 · Data" title="The inbound tracker" sub="Neha has sent this morning's tracker. Read it, check it, then send your shift update." />

      <Card className="mb-4">
        <Tracker state={state} act={act} />
      </Card>

      <section className={cn("transition-opacity", step < 1 && "opacity-40")}>
        <Eyebrow className="mb-2">1 · What needs action today? Pick up to 3</Eyebrow>
        {d.signals ? (
          <Lines lines={d.signals.map((id) => SIGNALS.find((s) => s.id === id)?.label ?? id)} />
        ) : (
          <>
            <Pick options={signalOrder(SIGNALS)} picked={signals} onToggle={toggle(setSignals)} max={3} />
            <QuietButton className="mt-2 sm:w-full" disabled={!signals.length} onClick={() => act({ t: "signals", picks: signals })}>
              Confirm
            </QuietButton>
          </>
        )}
      </section>

      {step >= 2 ? (
        <section className="mt-6 animate-in fade-in-0 slide-in-from-bottom-2">
          <Eyebrow className="mb-2">2 · Which vendor is behind most of today’s short and damaged stock?</Eyebrow>
          {d.driver ? (
            <p className="text-[14.5px] font-medium text-hi">{DRIVER_OPTIONS.find((o) => o.id === d.driver)?.label}</p>
          ) : (
            <div className="space-y-1.5">
              {driverOrder(DRIVER_OPTIONS).map((o) => (
                <Choice key={o.id} go onClick={() => act({ t: "driver", id: o.id })}>
                  {o.label}
                </Choice>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {step >= 3 ? (
        <section className="mt-6 animate-in fade-in-0 slide-in-from-bottom-2">
          <Eyebrow className="mb-2">3 · Your shift update to the FC team. Pick up to 5 lines</Eyebrow>
          {d.report ? (
            <Card>
              <Lines lines={d.report.lines.map((id) => REPORT_LINES.find((l) => l.id === id)?.text ?? id)} />
            </Card>
          ) : (
            <>
              <Pick options={lineOrder(REPORT_LINES).map((l) => ({ id: l.id, label: l.text }))} picked={lines} onToggle={toggle(setLines)} max={5} />
              {d.prompted && !d.deduped ? (
                <Notice tone="caution" className="mt-3">
                  <span className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn-500" aria-hidden />
                    <span>The tracker’s plan total (4,570) does not match today’s trucks on the dock schedule (3,370). Send anyway?</span>
                  </span>
                </Notice>
              ) : null}
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <QuietButton className="sm:flex-1" disabled={!lines.length} onClick={() => act({ t: "report", lines })}>
                  <Send className="size-4" aria-hidden /> Send the update
                </QuietButton>
                {d.prompted && !d.deduped ? (
                  <QuietButton className="sm:flex-1" disabled={!lines.length} onClick={() => act({ t: "report", lines, sendAnyway: true })}>
                    Send anyway
                  </QuietButton>
                ) : null}
              </div>
            </>
          )}
        </section>
      ) : null}

      {step >= 4 ? (
        <section className="mt-6 animate-in fade-in-0 slide-in-from-bottom-2">
          <Eyebrow className="mb-2">4 · Message to your Operations Manager about the vendor losses</Eyebrow>
          <div className="space-y-1.5">
            {escalateOrder(ESCALATIONS).map((e) => (
              <Choice key={e.id} go onClick={() => act({ t: "escalate", id: e.id })}>
                {e.text}
              </Choice>
            ))}
          </div>
        </section>
      ) : null}

      <div className="h-6" />
    </>
  );
}

/* ── 11:30 Peak ───────────────────────────────────────────────────────── */

const BUCKETS: Bucket[] = ["now", "delegate", "reschedule", "escalate"];

export function Peak({ state, act }: SceneProps) {
  const p = state.peak;
  const [plan, setPlan] = React.useState<Partial<Record<PeakItemId, Bucket>>>({});
  const vendorOrder = useFcShuffle("vendor");
  const procurementOrder = useFcShuffle("procurement");
  const nows = Object.values(plan).filter((b) => b === "now").length;
  const complete = PEAK_ITEMS.every((item) => plan[item.id]);
  const brightDock = state.board.bright?.dock;

  if (!p.buckets) {
    return (
      <>
        <SceneHeading eyebrow="11:30 · Peak" title="Five things at once" sub="Decide for each one: do it now yourself, delegate it, reschedule it, or escalate it." />
        <div className="mb-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {BUCKETS.map((b) => (
            <div key={b} className="rounded-[12px] border border-line bg-white/[0.02] px-2.5 py-2">
              <p className="text-[12.5px] font-bold tracking-[0.04em] text-hi uppercase">{BUCKET_LABEL[b]}</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-lo">{BUCKET_NOTE[b]}</p>
            </div>
          ))}
        </div>
        <p className={cn("mb-3 text-right text-[13px] font-semibold", nows >= DO_NOW_LIMIT ? "text-ember-500" : "text-mid")}>
          Doing yourself: {nows} of {DO_NOW_LIMIT}
        </p>
        <div className="space-y-2.5">
          {PEAK_ITEMS.map((item, index) => (
            <Card key={item.id} className="animate-in fade-in-0 slide-in-from-right-4" style={{ animationDelay: `${index * 80}ms`, animationFillMode: "backwards" }}>
              <p className="text-[15.5px] font-semibold text-hi">{item.title}</p>
              <p className="mt-1 text-[13.5px] leading-snug text-mid">
                {item.id === "overrun" && brightDock ? item.text.replace("its dock", `Dock ${brightDock.slice(1)}`) : item.text}
              </p>
              <div role="group" aria-label={`What you do: ${item.title}`} className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {BUCKETS.map((b) => {
                  const on = plan[item.id] === b;
                  const blocked = b === "now" && !on && nows >= DO_NOW_LIMIT;
                  return (
                    <button
                      key={b}
                      type="button"
                      aria-pressed={on}
                      disabled={blocked}
                      onClick={() => setPlan((current) => ({ ...current, [item.id]: b }))}
                      className={cn(
                        "min-h-[44px] rounded-[12px] border px-1 text-[12px] font-bold tracking-[0.04em] uppercase transition-colors",
                        on ? "border-ember-500 bg-ember-500 text-void" : "border-line-strong bg-white/[0.03] text-mid hover:border-line-bright hover:text-hi",
                        "disabled:opacity-30",
                      )}
                    >
                      {BUCKET_LABEL[b]}
                    </button>
                  );
                })}
              </div>
              {plan[item.id] === "delegate" ? <p className="mt-2 text-[12.5px] text-lo">To {item.delegateTo}</p> : null}
            </Card>
          ))}
        </div>
        <ActionBar note={complete ? undefined : "Choose for all five"}>
          <PrimaryButton disabled={!complete} onClick={() => act({ t: "peakPlan", buckets: plan as Record<PeakItemId, Bucket> })}>
            Go
          </PrimaryButton>
        </ActionBar>
      </>
    );
  }

  if (!p.vendorReply) {
    return (
      <>
        <SceneHeading eyebrow="11:40 · Vendor" title="Crunchy Snacks is on the phone" sub="Their sales manager is angry about the 6 damaged cartons." />
        <Card className="mb-4">
          <Speech who="Vikram" role="Crunchy Snacks" lines={[VENDOR_LINE]} />
        </Card>
        <Eyebrow className="mb-2">What do you say?</Eyebrow>
        <div className="space-y-1.5">
          {vendorOrder(VENDOR_REPLIES).map((r) => (
            <Choice key={r.id} go onClick={() => act({ t: "vendorReply", id: r.id })}>
              {r.text}
            </Choice>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <SceneHeading eyebrow="11:50 · Procurement" title="Pooja needs an update" sub="Pick the message you send." />
      <Card className="mb-4">
        <Speech who="Pooja" role="Procurement" lines={[PROCUREMENT_LINE]} />
      </Card>
      <div className="space-y-1.5">
        {procurementOrder(PROCUREMENT_MESSAGES).map((m) => (
          <Choice key={m.id} go detail={`To: ${m.to}`} onClick={() => act({ t: "procurement", id: m.id })}>
            {m.text}
          </Choice>
        ))}
      </div>
    </>
  );
}

/* ── 12:00 End of shift ───────────────────────────────────────────────── */

export function Outcome({ state, act }: SceneProps) {
  const outcome = outcomeOf(state);
  return (
    <>
      <SceneHeading eyebrow="12:00 · Handover" title="Your shift is done" sub="Here is how the morning ended. Hand over to the afternoon lead." />
      <Card>
        <ul className="space-y-2.5">
          {outcome.lines.map((line) => (
            <li key={line} className="flex items-start gap-2.5 text-[15px] leading-snug text-hi">
              <Check className="mt-0.5 size-4 shrink-0 text-ion-400" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
      </Card>
      <ActionBar>
        <PrimaryButton onClick={() => act({ t: "finish" })}>
          Finish shift <ArrowRight className="size-4" aria-hidden />
        </PrimaryButton>
      </ActionBar>
    </>
  );
}
