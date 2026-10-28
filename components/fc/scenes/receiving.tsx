"use client";

import * as React from "react";
import {
  Camera,
  ClipboardList,
  FileText,
  Lock,
  MessageSquareWarning,
  Minus,
  NotebookPen,
  PackageCheck,
  Plus,
  ScanLine,
  ShieldCheck,
  Snowflake,
  Thermometer,
  CalendarCheck,
} from "lucide-react";

import { ActionBar, Card, Choice, Eyebrow, PrimaryButton, QuietButton, SceneHeading, Sheet, Speech, Tile } from "@/components/hiring/ui";
import {
  CAUSE_OPTIONS,
  COUNT_OPTIONS,
  DAMAGED_FATES,
  DISC_EVIDENCE,
  DISC_EXPECTED,
  DISC_SCANNED,
  DOCK_INFO,
  GATE_CHECKS,
  PREVENT_OPTIONS,
  PUTAWAY_OPTIONS,
  QC_DECISIONS,
  QC_RESULT,
  RECOUNT_RESULT,
  UNSCANNABLE_FATES,
  nameOf,
  type EvidenceId,
  type GateCheckId,
  type JobId,
} from "@/lib/fc/content";
import type { Action, Owner } from "@/lib/fc/types";
import { cn } from "@/lib/utils";

import { Lines, OwnerPicker, Rail, useFcShuffle, type SceneProps } from "../shared";

const CHECK_ICON: Record<GateCheckId, React.ReactNode> = {
  appointment: <CalendarCheck />,
  seal: <Lock />,
  documents: <FileText />,
  temperature: <Thermometer />,
};

/** A step's card: what it is, and a way to do it. */
function StepCard({ title, done, locked, children, icon }: { title: string; done?: boolean; locked?: boolean; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <section className={cn("rounded-[18px] border p-4 transition-colors", done ? "border-ion-500/30 bg-ion-500/[0.04]" : "border-line bg-surface", locked && "opacity-55")}>
      <h2 className="flex items-center gap-2 text-[15.5px] font-semibold text-hi">
        <span className={cn("[&_svg]:size-[18px]", done ? "text-ion-400" : "text-ember-500")}>{icon}</span>
        {title}
        {done ? <span className="ml-auto text-[12px] font-medium text-ion-400">Done</span> : null}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** The handheld scanner's screen. */
function Scanner({ scanned, expected, label }: { scanned: number; expected: number; label: string }) {
  const match = scanned === expected;
  return (
    <div className="mx-auto w-full max-w-[240px] rounded-[22px] border-[6px] border-[#2a2d33] bg-[#0d1014] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
      <p className="flex items-center justify-between font-mono text-[10px] tracking-[0.14em] text-[#7fa39a] uppercase">
        <span>WMS · Inward</span>
        <ScanLine className="size-3.5" aria-hidden />
      </p>
      <p className="mt-2 text-[11.5px] text-[#9aa5ae]">{label}</p>
      <p className="tabular mt-1 font-mono text-[34px] leading-none font-semibold" style={{ color: match ? "#5ee0b8" : "#ffc24d" }}>
        {scanned}
        <span className="text-[16px] text-[#6c7680]"> / {expected}</span>
      </p>
      <p className="mt-1.5 font-mono text-[11px]" style={{ color: match ? "#5ee0b8" : "#ffc24d" }}>
        {match ? "COUNT MATCHES ASN" : `MISMATCH · ${expected - scanned} NOT SCANNED`}
      </p>
    </div>
  );
}

/* ── 09:00 Receive FreshFarm Dairy ────────────────────────────────────── */

export function Receive({ state, act }: SceneProps) {
  const r = state.receive;
  const [sheet, setSheet] = React.useState<GateCheckId | null>(null);
  const [picker, setPicker] = React.useState<JobId | null>(null);
  const [grnQty, setGrnQty] = React.useState<number | null>(null);
  const countOrder = useFcShuffle("count");
  const qcOrder = useFcShuffle("qc");
  const putawayOrder = useFcShuffle("putaway");

  const dock = state.board.dairy?.dock;
  const unloaded = r.steps.unload !== undefined;
  const counted = r.steps.count !== undefined;
  const check = GATE_CHECKS.find((c) => c.id === sheet);

  const pick = (owner: Owner) => {
    if (picker === "recountCrates") act({ t: "count", choice: "recount", owner });
    if (picker === "qcCheck") act({ t: "qcCheck", owner });
    if (picker === "grnEntry" && grnQty) act({ t: "grn", qty: grnQty, owner });
  };

  const notDone = [
    !unloaded && "unloading",
    !counted && "count",
    !r.qc?.decision && "QC",
    !r.grn && "GRN",
    !r.putaway && "putaway",
  ].filter(Boolean) as string[];

  return (
    <>
      <SceneHeading
        eyebrow="09:00 · Receive"
        title="FreshFarm Dairy has arrived"
        sub={`${dock ? `At ${DOCK_INFO[dock].label}${dock === "D3" ? " (cold dock)" : ""}` : "At the gate — it has no dock on your plan, so it was waved to the first free dock"}. 240 crates of milk and curd, chilled. Receive it, step by step, in the order you choose.`}
        media={
          <span className="grid size-14 shrink-0 place-items-center rounded-[16px] bg-[#5cc8f0]/15 text-[#5cc8f0]">
            <Snowflake className="size-7" aria-hidden />
          </span>
        }
      />

      <Card className="mb-3">
        <Rail
          steps={[
            { id: "gate", label: "Checks", done: Object.keys(r.checks).length > 0, current: !unloaded },
            { id: "unload", label: "Unload", done: unloaded },
            { id: "count", label: "Count", done: counted },
            { id: "qc", label: "QC", done: Boolean(r.qc?.decision) },
            { id: "grn", label: "GRN", done: Boolean(r.grn) },
            { id: "putaway", label: "Putaway", done: Boolean(r.putaway) },
          ]}
        />
      </Card>

      <div className="space-y-3">
        <StepCard title="At the truck" icon={<ShieldCheck />} done={Object.keys(r.checks).length === GATE_CHECKS.length}>
          <div className="grid gap-2 sm:grid-cols-2">
            {GATE_CHECKS.map((c) => (
              <Tile
                key={c.id}
                label={c.label}
                detail={c.detail}
                icon={CHECK_ICON[c.id]}
                opened={r.checks[c.id] !== undefined}
                onClick={() => {
                  if (r.checks[c.id] === undefined) act({ t: "gateCheck", id: c.id });
                  setSheet(c.id);
                }}
              />
            ))}
          </div>
          <div className="mt-3">
            <PrimaryButton className="sm:w-full" disabled={unloaded} onClick={() => act({ t: "unload" })}>
              {unloaded ? "Unloaded" : "Open the doors and unload"}
            </PrimaryButton>
          </div>
        </StepCard>

        <StepCard title="Count and scan" icon={<ScanLine />} done={counted} locked={!unloaded}>
          {!unloaded ? (
            <p className="text-[13.5px] text-lo">After unloading.</p>
          ) : (
            <>
              <Scanner scanned={r.reconciled ? 240 : 238} expected={240} label="FreshFarm · crates scanned" />
              {r.reconciled ? <p className="mt-3 text-center text-[13.5px] text-mid">Recount found 2 crates hidden behind the pallet wrap. Both scanned.</p> : null}
              {r.count?.asked && !counted ? (
                <Speech className="mt-3" who="Driver" role="FreshFarm" lines={["I loaded 240 myself. Count again if you want."]} />
              ) : null}
              {!counted ? (
                <div className="mt-3 space-y-1.5">
                  {countOrder(COUNT_OPTIONS)
                    .filter((o) => !(o.id === "driver" && r.count?.asked))
                    .map((o) => (
                      <Choice key={o.id} go detail={o.detail} onClick={() => (o.id === "recount" ? setPicker("recountCrates") : act({ t: "count", choice: o.id }))}>
                        {o.label}
                      </Choice>
                    ))}
                </div>
              ) : (
                <p className="mt-3 text-center text-[13px] text-lo">
                  {r.count?.choice === "recount" ? `Recounted by ${nameOf(r.count.owner ?? "me")}.` : r.count?.choice === "close" ? "Count closed at 238." : "Accepted 240 from the invoice."}
                </p>
              )}
            </>
          )}
        </StepCard>

        <StepCard title="Quality check" icon={<ClipboardList />} done={Boolean(r.qc?.decision)} locked={!unloaded}>
          {!unloaded ? (
            <p className="text-[13.5px] text-lo">After unloading.</p>
          ) : !r.qc ? (
            <QuietButton className="sm:w-full" onClick={() => setPicker("qcCheck")}>
              Do the quality check
            </QuietButton>
          ) : (
            <>
              <p className="mb-2 text-[12.5px] text-lo">Checked by {nameOf(r.qc.owner)}:</p>
              <Lines lines={QC_RESULT} />
              {!r.qc.decision ? (
                <div className="mt-3 space-y-1.5">
                  {qcOrder(QC_DECISIONS).map((o) => (
                    <Choice key={o.id} go detail={o.detail} onClick={() => act({ t: "qcDecide", choice: o.id })}>
                      {o.label}
                    </Choice>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-[13.5px] font-medium text-hi">Decision: {QC_DECISIONS.find((d) => d.id === r.qc!.decision)?.label}</p>
              )}
            </>
          )}
        </StepCard>

        <StepCard title="GRN" icon={<NotebookPen />} done={Boolean(r.grn)} locked={!unloaded}>
          {!unloaded ? (
            <p className="text-[13.5px] text-lo">After unloading.</p>
          ) : r.grn ? (
            <p className="text-[14px] text-hi">
              GRN made for <span className="font-semibold">{r.grn.qty} crates</span> by {nameOf(r.grn.owner)}.
            </p>
          ) : (
            <>
              <p className="text-[13.5px] text-mid">How many crates go into stock?</p>
              <div className="mt-2 grid grid-cols-3 gap-1.5" role="group" aria-label="GRN quantity">
                {[240, 238, 228].map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    aria-pressed={grnQty === qty}
                    onClick={() => setGrnQty(qty)}
                    className={cn(
                      "tabular min-h-[48px] rounded-[12px] border text-[16px] font-semibold transition-colors",
                      grnQty === qty ? "border-ember-500 bg-ember-500 text-void" : "border-line-strong bg-white/[0.03] text-hi hover:border-line-bright",
                    )}
                  >
                    {qty}
                  </button>
                ))}
              </div>
              <QuietButton className="mt-2 sm:w-full" disabled={!grnQty} onClick={() => setPicker("grnEntry")}>
                Make the GRN
              </QuietButton>
            </>
          )}
        </StepCard>

        <StepCard title="Putaway" icon={<PackageCheck />} done={Boolean(r.putaway)} locked={!unloaded}>
          {!unloaded ? (
            <p className="text-[13.5px] text-lo">After unloading.</p>
          ) : r.putaway ? (
            <p className="text-[14px] text-hi">{PUTAWAY_OPTIONS.find((p) => p.id === r.putaway)?.label}</p>
          ) : (
            <div className="space-y-1.5">
              {putawayOrder(PUTAWAY_OPTIONS).map((o) => (
                <Choice key={o.id} go detail={o.detail} onClick={() => act({ t: "putaway", choice: o.id })}>
                  {o.label}
                </Choice>
              ))}
            </div>
          )}
        </StepCard>
      </div>

      <Sheet open={check !== undefined} onOpenChange={() => setSheet(null)} title={check?.label ?? ""} description={check?.detail}>
        {check ? <Lines lines={check.result} /> : null}
      </Sheet>
      {picker ? <OwnerPicker open onOpenChange={(open) => !open && setPicker(null)} job={picker} onPick={pick} state={state} /> : null}

      <ActionBar note={notDone.length ? `Not done: ${notDone.join(", ")}` : "All steps done"}>
        <PrimaryButton onClick={() => act({ t: "closeReceipt" })}>Close the receipt</PrimaryButton>
      </ActionBar>
    </>
  );
}

/* ── 10:00 Discrepancy: Crunchy Snacks ────────────────────────────────── */

const EVIDENCE_ICON: Record<EvidenceId, React.ReactNode> = {
  asn: <FileText />,
  scan: <ScanLine />,
  qcnote: <ClipboardList />,
  log: <NotebookPen />,
  cctv: <Camera />,
  vendor: <MessageSquareWarning />,
};

/** Twelve pallets of forty. What is known about the missing cartons fills in as it is found out. */
function Pallets({ state }: Pick<SceneProps, "state">) {
  const seen = (id: EvidenceId) => state.disc.evidence.includes(id);
  const recount = state.disc.recount !== null;
  const gap: Record<number, { n: number; colour: string; label: string }> = {};
  if (seen("scan")) {
    gap[3] = { n: 6, colour: seen("qcnote") || recount ? "#f0614a" : "#ffc24d", label: seen("qcnote") ? "crushed" : "not scanned" };
    gap[7] = { n: 2, colour: recount ? "transparent" : "#ffc24d", label: recount ? "missing" : "not scanned" };
    gap[9] = { n: 4, colour: seen("log") || recount ? "#b38cf2" : "#ffc24d", label: seen("log") ? "bad label" : "not scanned" };
  }
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] font-medium text-mid">{seen("scan") ? "Scans by pallet" : "Scanned so far"}</p>
        <p className="tabular font-mono text-[14px] font-semibold text-hi">
          {DISC_SCANNED} <span className="text-lo">/ {DISC_EXPECTED}</span>
        </p>
      </div>
      {seen("scan") ? (
        <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-12">
          {Array.from({ length: 12 }, (_, i) => {
            const pallet = i + 1;
            const g = gap[pallet];
            return (
              <div key={pallet} className="rounded-[8px] border border-line bg-white/[0.02] p-1">
                <div className="grid grid-cols-5 gap-[2px]">
                  {Array.from({ length: 40 }, (_, k) => {
                    const missing = g && k >= 40 - g.n;
                    return (
                      <span
                        key={k}
                        className={cn("aspect-square rounded-[1.5px]", missing ? (g.colour === "transparent" ? "border border-dashed border-white/40" : "") : "bg-ion-500/45")}
                        style={missing && g.colour !== "transparent" ? { background: g.colour } : undefined}
                      />
                    );
                  })}
                </div>
                <p className="mt-1 text-center font-mono text-[9.5px] text-lo">P{pallet}</p>
                {g ? <p className="text-center text-[9px] leading-tight text-mid">{g.label}</p> : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-warn-500/70">
          <div className="h-full rounded-full bg-ion-500" style={{ width: `${(DISC_SCANNED / DISC_EXPECTED) * 100}%` }} />
        </div>
      )}
    </div>
  );
}

function Stepper({ label, value, onChange, max }: { label: string; value: number; onChange: (n: number) => void; max: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[12px] border border-line bg-white/[0.02] px-3 py-2">
      <span className="text-[14px] font-medium text-hi">{label}</span>
      <span className="flex items-center gap-2">
        <button type="button" aria-label={`Fewer ${label}`} disabled={value <= 0} onClick={() => onChange(value - 1)} className="grid size-9 place-items-center rounded-full border border-line-strong text-mid disabled:opacity-30">
          <Minus className="size-4" />
        </button>
        <span className="tabular w-7 text-center text-[18px] font-semibold text-hi" aria-live="polite">
          {value}
        </span>
        <button type="button" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="grid size-9 place-items-center rounded-full border border-line-strong text-mid disabled:opacity-30">
          <Plus className="size-4" />
        </button>
      </span>
    </div>
  );
}

export function Discrepancy({ state, act }: SceneProps) {
  const [sheet, setSheet] = React.useState<EvidenceId | "recount" | null>(null);
  const [picker, setPicker] = React.useState<JobId | null>(null);
  const [counts, setCounts] = React.useState({ short: 0, damaged: 0, unscannable: 0 });
  const [damagedFate, setDamagedFate] = React.useState<"rtv" | "scrap" | "accept" | null>(null);
  const [unscanFate, setUnscanFate] = React.useState<"relabel" | "reject" | "short" | null>(null);
  const [cause, setCause] = React.useState<(typeof CAUSE_OPTIONS)[number]["id"] | null>(null);
  const [prevent, setPrevent] = React.useState<(typeof PREVENT_OPTIONS)[number]["id"] | null>(null);
  const evidenceOrder = useFcShuffle("evidence");
  const damagedOrder = useFcShuffle("damagedFate");
  const unscanOrder = useFcShuffle("unscanFate");
  const causeOrder = useFcShuffle("cause");
  const preventOrder = useFcShuffle("prevent");

  const total = counts.short + counts.damaged + counts.unscannable;
  const set = (key: keyof typeof counts) => (n: number) => setCounts((c) => ({ ...c, [key]: Math.max(0, n) }));
  const ready =
    total === 12 && cause !== null && prevent !== null && (counts.damaged === 0 || damagedFate !== null) && (counts.unscannable === 0 || unscanFate !== null);

  const submit = (relabelOwner?: Owner) => {
    const action: Action = {
      t: "classify",
      ...counts,
      damagedFate: damagedFate ?? "rtv",
      unscanFate: unscanFate ?? "short",
      cause: cause!,
      prevent: prevent!,
      ...(relabelOwner ? { relabelOwner } : {}),
    };
    act(action);
  };

  const close = () => {
    if (counts.unscannable > 0 && unscanFate === "relabel") setPicker("relabel");
    else submit();
  };

  const evidence = DISC_EVIDENCE.find((e) => e.id === sheet);

  return (
    <>
      <SceneHeading eyebrow="10:00 · Discrepancy" title="Crunchy Snacks: 12 cartons don't match" sub="480 cartons were sent. 468 scanned. Find out what happened to the other 12, then close it." />

      <Card className="mb-3">
        <Pallets state={state} />
      </Card>

      <Eyebrow className="mb-2">What you can check</Eyebrow>
      <div className="grid gap-2 sm:grid-cols-2">
        {evidenceOrder(DISC_EVIDENCE).map((e) => (
          <Tile
            key={e.id}
            label={e.label}
            detail={e.detail}
            icon={EVIDENCE_ICON[e.id]}
            opened={state.disc.evidence.includes(e.id)}
            onClick={() => {
              act({ t: "evidence", id: e.id });
              setSheet(e.id);
            }}
          />
        ))}
        <Tile
          label="Recount the short pallets"
          detail={state.disc.recount ? `Recounted by ${nameOf(state.disc.recount)}` : "Somebody counts them physically"}
          icon={<ClipboardList />}
          opened={state.disc.recount !== null}
          onClick={() => (state.disc.recount ? setSheet("recount") : setPicker("recountPallet"))}
        />
      </div>

      <Card className="mt-5">
        <Eyebrow className="text-ember-500">Close the discrepancy</Eyebrow>
        <p className="mt-1 text-[13.5px] text-mid">Split the 12 cartons. They must add up to 12.</p>
        <div className="mt-3 space-y-1.5">
          <Stepper label="Short (never arrived)" value={counts.short} onChange={set("short")} max={12} />
          <Stepper label="Damaged" value={counts.damaged} onChange={set("damaged")} max={12} />
          <Stepper label="Here but can't be scanned" value={counts.unscannable} onChange={set("unscannable")} max={12} />
        </div>
        <p className={cn("tabular mt-2 text-right text-[13px] font-semibold", total === 12 ? "text-ion-400" : "text-warn-500")}>{total} of 12</p>

        {counts.damaged > 0 ? (
          <>
            <Eyebrow className="mt-4 mb-2">The damaged cartons</Eyebrow>
            <div className="space-y-1.5">
              {damagedOrder(DAMAGED_FATES).map((o) => (
                <Choice key={o.id} selected={damagedFate === o.id} onClick={() => setDamagedFate(o.id)} detail={o.detail}>
                  {o.label}
                </Choice>
              ))}
            </div>
          </>
        ) : null}

        {counts.unscannable > 0 ? (
          <>
            <Eyebrow className="mt-4 mb-2">The cartons that can’t be scanned</Eyebrow>
            <div className="space-y-1.5">
              {unscanOrder(UNSCANNABLE_FATES).map((o) => (
                <Choice key={o.id} selected={unscanFate === o.id} onClick={() => setUnscanFate(o.id)} detail={o.detail}>
                  {o.label}
                </Choice>
              ))}
            </div>
          </>
        ) : null}

        <Eyebrow className="mt-4 mb-2">Why were cartons damaged?</Eyebrow>
        <div className="space-y-1.5">
          {causeOrder(CAUSE_OPTIONS).map((o) => (
            <Choice key={o.id} selected={cause === o.id} onClick={() => setCause(o.id)}>
              {o.label}
            </Choice>
          ))}
        </div>

        <Eyebrow className="mt-4 mb-2">What will you change?</Eyebrow>
        <div className="space-y-1.5">
          {preventOrder(PREVENT_OPTIONS).map((o) => (
            <Choice key={o.id} selected={prevent === o.id} onClick={() => setPrevent(o.id)}>
              {o.label}
            </Choice>
          ))}
        </div>
      </Card>

      <Sheet
        open={sheet !== null}
        onOpenChange={() => setSheet(null)}
        title={sheet === "recount" ? "Recount" : (evidence?.label ?? "")}
        description={sheet === "recount" ? "Pallets 3, 7 and 9, counted by hand." : evidence?.detail}
      >
        <Lines lines={sheet === "recount" ? RECOUNT_RESULT : (evidence?.result ?? [])} />
      </Sheet>

      {picker ? (
        <OwnerPicker
          open
          onOpenChange={(open) => !open && setPicker(null)}
          job={picker}
          state={state}
          onPick={(owner) => {
            if (picker === "recountPallet") {
              act({ t: "recountPallet", owner });
              setSheet("recount");
            } else submit(owner);
          }}
        />
      ) : null}

      <ActionBar note={ready ? undefined : total !== 12 ? "The split must add up to 12" : "Answer each part above"}>
        <PrimaryButton disabled={!ready} onClick={close}>
          Close the discrepancy
        </PrimaryButton>
      </ActionBar>
    </>
  );
}

