"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Boxes,
  Camera,
  ClipboardList,
  FileSearch,
  KeyRound,
  PackageOpen,
  ScanLine,
  Volume2,
  VolumeX,
  X,
  type LucideIcon,
} from "lucide-react";

import { ActionBoard } from "@/components/challenge/day-two/action-board";
import { AuditQueue } from "@/components/challenge/day-two/audit-queue";
import { CasePanel } from "@/components/challenge/day-two/case-panel";
import { CountCage } from "@/components/challenge/day-two/count-cage";
import { EvidenceTray } from "@/components/challenge/day-two/evidence-tray";
import { DayTwoIntro, InspectionBriefing } from "@/components/challenge/day-two/intro";
import { LedgerBoard } from "@/components/challenge/day-two/ledger-board";
import { ParleGSimulation } from "@/components/challenge/day-two/parleg/simulation";
import { Reconciliation } from "@/components/challenge/day-two/reconciliation";
import { Day2Scorecard } from "@/components/challenge/day-two/scorecard";
import {
  AccessLogTool,
  CctvTool,
  ExceptionTool,
  MovementLogTool,
  OrdersTool,
  ScanLogTool,
} from "@/components/challenge/day-two/tools";
import { CountdownPill, MoneyCounter, Reveal } from "@/components/challenge/day-two/ui";
import { Button } from "@/components/ui/button";
import { SHIFT_SECONDS, timeScale } from "@/lib/challenge/clock";
import { MANAGER_BRIEF, TOOL_META } from "@/lib/challenge/day-two/earbuds";
import {
  addEvidence,
  canClassifyIssue,
  canRecoverUnit,
  caseLedger,
  classifyProcessVariance,
  closeOnTimeout,
  commitActions,
  confirmCount,
  createCase,
  dayMaster,
  hasEvidence,
  inspectTote,
  logFinding,
  openOrderTrace,
  openTool,
  placeAction,
  recoverUnit,
  scanAllUnits,
  scanUnit,
  signReconciliation,
  viewCctvMarker,
} from "@/lib/challenge/day-two/engine";
import { buildDay2Result, caseInsight } from "@/lib/challenge/day-two/feedback";
import {
  DAY_TWO_BRIEF,
  EARBUDS_ROW,
  LOSS_ROWS,
  PARLEG_ROW,
  auditClock,
  rupees,
} from "@/lib/challenge/day-two/ledger";
import {
  AFFECTED_PICKS,
  NET_VALUE_IMPACT,
  RECORD_UNITS_AFFECTED,
} from "@/lib/challenge/day-two/parleg/content";
import {
  closeParleG,
  createParleG,
  openParleG,
  pgClosed,
  pgReached,
  pgRecordUnitsCorrected,
} from "@/lib/challenge/day-two/parleg/engine";
import type { ParleGState } from "@/lib/challenge/day-two/parleg/types";
import type { CaseState, Day2Tool, FindingId, MasterLedger } from "@/lib/challenge/day-two/types";
import { logEvent } from "@/lib/challenge/telemetry";
import { saveChallengeRun } from "@/lib/challenge/save-run";
import type { ChallengeResult } from "@/lib/challenge/types";
import { easing } from "@/lib/motion";
import { playNotificationSound, playScanBeep } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { useShellStore } from "@/stores/shell-store";

const TOOL_ICON: Record<Day2Tool, LucideIcon> = {
  movement: ClipboardList,
  orders: FileSearch,
  scans: ScanLine,
  access: KeyRound,
  cctv: Camera,
  exception: PackageOpen,
};

type Chime = "critical" | "warning" | "info" | "positive" | "neutral";

/**
 * Day 2 — inventory forensics.
 *
 * One fifteen-minute audit, two cases, one ledger. This component owns both
 * cases' state and the clock, because the clock has to be able to close
 * whichever case is open when time runs out, and the ledger has to add up
 * across both. Everything below it is a view.
 *
 * The day is stored once, when it ends — on "finish" or at 0:00 — so the
 * scorecard reflects both cases rather than whichever was signed first.
 */
export function DayTwoSimulation({ operatorName }: { operatorName: string }) {
  // The brief sits outside the audit so the fifteen minutes start when the
  // operator says so, not when the page happens to finish loading.
  const [started, setStarted] = React.useState(false);
  if (!started) return <DayTwoIntro onStart={() => setStarted(true)} />;
  return <Audit operatorName={operatorName} />;
}

function Audit({ operatorName }: { operatorName: string }) {
  const [state, setState] = React.useState<CaseState>(() => createCase());
  const [pg, setPg] = React.useState<ParleGState>(() => createParleG());
  const [pgOpen, setPgOpen] = React.useState(false);
  const [tool, setTool] = React.useState<Day2Tool | null>(null);
  const [elapsed, setElapsed] = React.useState(0);
  const [trayOpen, setTrayOpen] = React.useState(false);
  const [result, setResult] = React.useState<ChallengeResult | null>(null);
  const [showScorecard, setShowScorecard] = React.useState(false);
  const [dayTimedOut, setDayTimedOut] = React.useState(false);
  /** Which line of the variance report is open in the queue. */
  const [selectedCase, setSelectedCase] = React.useState<string>("earbuds");
  /** Whether the inspection video has been passed on the way into the count. */
  const [inspectionDone, setInspectionDone] = React.useState(false);
  const reduced = useReducedMotion();
  const soundEnabled = useShellStore((s) => s.soundEnabled);
  const setSoundEnabled = useShellStore((s) => s.setSoundEnabled);

  const ledger = caseLedger(state);
  const master = dayMaster(state, pg);
  const earbudsSigned = state.stage === "complete" && !state.tags.includes("audit_timed_out");
  const completedIds = [
    ...(earbudsSigned ? ["earbuds"] : []),
    ...(pg.reconciled ? ["biscuits"] : []),
  ];
  const remaining = Math.max(0, SHIFT_SECONDS - elapsed);
  const dayFinished = result !== null;

  /**
   * Every transition goes through these.
   *
   * The engine functions are pure, so the next state is computed *before*
   * setState rather than inside an updater. React may call an updater more
   * than once, and telemetry emitted from inside one would double-count the
   * very actions the assessment reads. The refs carry the latest state so
   * several applies in one handler still compose.
   */
  const stateRef = React.useRef(state);
  const apply = React.useCallback(
    (fn: (s: CaseState) => CaseState, after?: (prev: CaseState, next: CaseState) => void) => {
      const prev = stateRef.current;
      const next = fn(prev);
      stateRef.current = next;
      setState(next);
      after?.(prev, next);
    },
    [],
  );

  const pgRef = React.useRef(pg);
  const applyPg = React.useCallback(
    (fn: (s: ParleGState) => ParleGState, after?: (prev: ParleGState, next: ParleGState) => void) => {
      const prev = pgRef.current;
      const next = fn(prev);
      pgRef.current = next;
      setPg(next);
      after?.(prev, next);
    },
    [],
  );

  /** Sound follows the app's own setting, read at the moment of playing. */
  const chime = React.useCallback((tone: Chime) => {
    if (useShellStore.getState().soundEnabled) playNotificationSound(tone);
  }, []);
  const pgSound = React.useCallback((kind: "scan" | "found" | "done") => {
    if (!useShellStore.getState().soundEnabled) return;
    if (kind === "scan") playScanBeep();
    else playNotificationSound(kind === "found" ? "positive" : "neutral");
  }, []);

  React.useEffect(() => {
    logEvent("day2_started", { operator: operatorName }, 2);
  }, [operatorName]);

  /* Fifteen minutes, like every day of the challenge. One tick drives both the
     countdown and the in-world audit clock, so they cannot disagree. It runs
     until the day ends — not until Case 01 is signed, because Case 02 may
     still be ahead. */
  React.useEffect(() => {
    if (dayFinished) return;
    const timer = window.setInterval(
      () => setElapsed((v) => v + 1),
      1000 / timeScale(),
    );
    return () => window.clearInterval(timer);
  }, [dayFinished]);

  /* ── Case 01 transitions ── */

  const openEarbuds = () => {
    logEvent("earbuds_case_opened", {}, 2);
    logEvent("physical_count_started", {}, 2);
    apply((s) => (s.stage === "brief" ? { ...s, stage: "count" } : s));
  };

  const doScan = (id: string) =>
    apply(
      (s) => scanUnit(s, id),
      (prev, next) => {
        if (next !== prev) {
          logEvent("physical_unit_counted", { unit: id, counted: next.scannedUnits.length }, 2);
        }
      },
    );

  const doConfirmCount = () =>
    apply(confirmCount, (prev, next) => {
      if (next === prev) return;
      logEvent(
        "physical_count_confirmed",
        { systemStock: prev.systemStock, physicalCount: next.physicalCount },
        2,
      );
      chime("critical");
    });

  const selectTool = (next: Day2Tool) => {
    setTool(next);
    logEvent("investigation_tool_opened", { tool: next }, 2);
    if (next === "movement") logEvent("movement_log_viewed", {}, 2);
    if (next === "access") logEvent("access_log_viewed", {}, 2);
    if (next === "cctv") logEvent("cctv_opened", {}, 2);
    if (next === "exception") logEvent("exception_area_checked", {}, 2);
    apply((s) => openTool(s, next));
  };

  const doOpenTrace = (orderId: string) =>
    apply(
      (s) => openOrderTrace(s, orderId),
      (prev, next) => {
        logEvent("order_trace_opened", { orderId }, 2);
        if (
          next.tags.includes("missing_scan_identified") &&
          !prev.tags.includes("missing_scan_identified")
        ) {
          logEvent("missing_scan_discovered", { orderId }, 2);
        }
      },
    );

  const doAddEvidence = (id: string) =>
    apply(
      (s) => addEvidence(s, id),
      (prev, next) => {
        if (next !== prev) logEvent("evidence_added", { evidenceId: id }, 2);
      },
    );

  const doViewMarker = (time: string) =>
    apply(
      (s) => viewCctvMarker(s, time),
      () => logEvent("cctv_timestamp_viewed", { time }, 2),
    );

  const doInspectTote = () =>
    apply(inspectTote, (prev, next) => {
      if (next !== prev) logEvent("cancelled_order_found", { order: "6188" }, 2);
    });

  const doClassify = () =>
    apply(classifyProcessVariance, (prev, next) => {
      if (next === prev) return;
      const after = caseLedger(next);
      logEvent(
        "process_variance_confirmed",
        { explainedValue: after.explainedValue, unresolvedValue: after.unresolvedValue },
        2,
      );
      chime("info");
    });

  const doRecover = () =>
    apply(recoverUnit, (prev, next) => {
      if (next === prev) return;
      const after = caseLedger(next);
      logEvent(
        "stock_recovered",
        { recoveredValue: after.recoveredValue, unresolvedValue: after.unresolvedValue },
        2,
      );
      chime("positive");
    });

  const doLogFinding = (id: FindingId) =>
    apply(
      (s) => logFinding(s, id, elapsed),
      (_prev, next) => {
        const logged = next.findings.find((f) => f.id === id);
        logEvent("hypothesis_created", { finding: id, supported: logged?.supported ?? false }, 2);
        if (id === "staff_theft" && logged && !logged.supported) {
          logEvent("premature_theft_assumption", { at: elapsed }, 2);
        }
      },
    );

  const doCommitActions = () =>
    apply(commitActions, (prev) => {
      logEvent("action_board_completed", { actions: prev.actions }, 2);
    });

  const doSign = () =>
    apply(signReconciliation, (_prev, next) => {
      logEvent("earbuds_reconciliation_signed", { ledger: caseLedger(next) }, 2);
      logEvent("earbuds_case_completed", {}, 2);
      chime("neutral");
    });

  /* ── Case 02 ── */

  const openParleg = () => {
    applyPg(
      (s) => openParleG(s, earbudsSigned, Date.now()),
      (prev, next) => {
        if (next !== prev) logEvent("parleg_case_started", { earbudsSigned }, 2);
      },
    );
    setPgOpen(true);
  };

  const returnFromParleg = () => {
    const current = pgRef.current;
    if (current.reconciled) {
      logEvent("parleg_case_completed", { rootCause: current.flowSolved, tags: current.tags }, 2);
    }
    setPgOpen(false);
    setSelectedCase(earbudsSigned ? "biscuits" : "earbuds");
  };

  const openCaseById = (id: string) => {
    if (id === "earbuds") openEarbuds();
    else if (id === "biscuits") openParleg();
  };

  /* ── The end of the day ── */

  const finishDay = React.useCallback((earbuds: CaseState, parleg: ParleGState) => {
    const built = buildDay2Result(earbuds, parleg);
    setResult(built);
    logEvent("day2_completed", { score: built.score, band: built.band }, 2);
    const decisions = [
      ...earbuds.findings.map((f) => ({ scene: "earbuds", action: f.id })),
      ...(["fixNow", "preventRepeat", "notNeeded"] as const).flatMap((lane) =>
        parleg.actions[lane].map((id) => ({ scene: "parleg", action: `${lane}:${id}` })),
      ),
    ];
    void saveChallengeRun(built, decisions, 2);
  }, []);

  /* The clock ran out. Both cases close exactly where they stand — whichever
     stage the operator was on — and the day is stored like any other. */
  React.useEffect(() => {
    if (remaining > 0 || dayFinished) return;
    apply(closeOnTimeout);
    applyPg((s) => closeParleG(s, "timeout", Date.now()));
    logEvent(
      "day2_timed_out",
      { earbudsStage: stateRef.current.stage, parlegStage: pgRef.current.stage },
      2,
    );
    setPgOpen(false);
    setTrayOpen(false);
    setDayTimedOut(true);
    finishDay(stateRef.current, pgRef.current);
    chime("critical");
  }, [remaining, dayFinished, apply, applyPg, finishDay, chime]);

  /** The operator chooses to end the day. An open Case 02 is closed as left open. */
  const finishAndShow = () => {
    if (!result) {
      const current = pgRef.current;
      if (pgReached(current) && !pgClosed(current)) {
        applyPg((s) => closeParleG(s, "abandoned", Date.now()));
      }
      finishDay(stateRef.current, pgRef.current);
    }
    setShowScorecard(true);
  };

  /* ── Views ── */

  if (showScorecard && result) return <Day2Scorecard result={result} />;

  const insight = state.stage === "complete" ? caseInsight(state) : null;
  const pgSummary = pg.reconciled
    ? pg.flowSolved
      ? `${AFFECTED_PICKS} transactions reviewed · ${RECORD_UNITS_AFFECTED} units corrected · ${rupees(NET_VALUE_IMPACT)} classified`
      : `${RECORD_UNITS_AFFECTED} units corrected · cause not established`
    : null;
  const pgStillOpen = !pg.reconciled && !pgClosed(pg);
  const viewKey = pgOpen ? "parleg" : state.stage + (tool ?? "");

  return (
    <div className="flex min-h-dvh flex-col bg-obsidian">
      <Header
        elapsed={elapsed}
        remaining={remaining}
        unresolved={master.unresolvedValue}
        dayFinished={dayFinished}
        timedOut={dayTimedOut}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
      />

      <div className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col gap-3 p-3 lg:flex-row lg:p-4">
        {/* ── Workspace ── */}
        <main id="main" className="min-w-0 flex-1 pb-24 lg:pb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={viewKey}
              initial={reduced ? false : { y: 8 }}
              animate={{ y: 0 }}
              exit={reduced ? undefined : { y: -4 }}
              transition={{ duration: 0.25, ease: easing.outExpo }}
            >
              {pgOpen ? (
                <ParleGSimulation
                  state={pg}
                  apply={applyPg}
                  clock={auditClock(elapsed)}
                  sound={pgSound}
                  onReturn={returnFromParleg}
                />
              ) : state.stage === "brief" ? (
                <Brief
                  master={master}
                  selectedId={selectedCase}
                  onSelect={setSelectedCase}
                  completedIds={completedIds}
                  onOpenCase={openCaseById}
                  parlegSummary={pgSummary}
                  recordUnitsCorrected={pgRecordUnitsCorrected(pg)}
                />
              ) : state.stage === "count" && !inspectionDone ? (
                <InspectionBriefing onContinue={() => setInspectionDone(true)} />
              ) : state.stage === "count" ? (
                <CountCage
                  scanned={state.scannedUnits}
                  onScan={doScan}
                  onScanAll={() => apply(scanAllUnits)}
                  onConfirm={doConfirmCount}
                  physicalCount={state.physicalCount}
                  // No tool is pre-selected. Which record they reach for
                  // first is one of the signals, so choosing it for them
                  // would be answering the question we are asking.
                  onContinue={() => apply((s) => ({ ...s, stage: "investigate" }))}
                />
              ) : state.stage === "investigate" ? (
                <Investigation
                  state={state}
                  tool={tool}
                  onSelectTool={selectTool}
                  onOpenTrace={doOpenTrace}
                  onAddEvidence={doAddEvidence}
                  onViewMarker={doViewMarker}
                  onInspectTote={doInspectTote}
                  onClassify={doClassify}
                  onRecover={doRecover}
                  onProceed={() => apply((s) => ({ ...s, stage: "actions" }))}
                />
              ) : state.stage === "actions" ? (
                <ActionBoard
                  actions={state.actions}
                  onPlace={(id, lane) => apply((s) => placeAction(s, id, lane))}
                  onCommit={doCommitActions}
                />
              ) : state.stage === "reconcile" ? (
                <Reconciliation ledger={ledger} onSign={doSign} />
              ) : (
                <div className="space-y-4">
                  {insight ? (
                    <section className="rounded-card border border-ember-500/30 bg-ember-500/[0.05] p-5">
                      <p className="font-mono text-[10px] tracking-[0.2em] text-ember-500 uppercase">
                        Case 01 · {insight.headline}
                      </p>
                      <ul className="mt-3 space-y-2.5">
                        {insight.lines.map((line) => (
                          <li key={line} className="text-[13.5px] leading-relaxed text-mid">
                            {line}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  {pg.reconciled && pgSummary ? (
                    <section className="rounded-card border border-ion-500/35 bg-ion-500/[0.05] p-5">
                      <p className="font-mono text-[10px] tracking-[0.2em] text-ion-400 uppercase">
                        Case 02 · Reconciled
                      </p>
                      <p className="mt-2 text-[15px] font-semibold text-hi">{PARLEG_ROW.product}</p>
                      <p className="mt-1.5 text-[13px] text-mid">{pgSummary}</p>
                    </section>
                  ) : !dayFinished && pgStillOpen ? (
                    <NextCaseCard resumed={pgReached(pg)} onOpen={openParleg} />
                  ) : null}

                  <LedgerBoard
                    master={master}
                    selectedId={null}
                    onSelect={() => undefined}
                    completedIds={completedIds}
                    timedOut={dayTimedOut}
                    recordUnitsCorrected={pgRecordUnitsCorrected(pg)}
                  />

                  <div className="space-y-2">
                    {!dayFinished && pgStillOpen ? (
                      <p className="text-center text-[12px] leading-relaxed text-faint">
                        Case 02 is still open. Finishing now leaves both Parle-G records wrong on
                        tonight&apos;s report.
                      </p>
                    ) : null}
                    <Button
                      variant={!dayFinished && pgStillOpen ? "secondary" : "primary"}
                      size="lg"
                      className="w-full"
                      onClick={finishAndShow}
                    >
                      {dayFinished ? "See your Day 2 assessment" : "Finish Day 2 and see your assessment"}
                      <ArrowRight />
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* ── Evidence tray · desktop ── */}
        {!pgOpen && (state.stage === "investigate" || state.stage === "actions") ? (
          <aside
            aria-label="Evidence tray"
            className="hidden w-[320px] shrink-0 self-start rounded-card border border-line bg-surface lg:flex lg:max-h-[calc(100dvh-7rem)] lg:flex-col"
          >
            <EvidenceTray
              evidence={state.evidence}
              findings={state.findings}
              onLogFinding={doLogFinding}
            />
          </aside>
        ) : null}
      </div>

      {/* ── Mobile toolbar + tray ── */}
      {!pgOpen && state.stage === "investigate" ? (
        <MobileBar
          tool={tool}
          onSelectTool={selectTool}
          evidenceCount={state.evidence.length}
          onOpenTray={() => setTrayOpen(true)}
        />
      ) : null}

      <AnimatePresence>
        {trayOpen ? (
          <MobileTray onClose={() => setTrayOpen(false)}>
            <EvidenceTray
              evidence={state.evidence}
              findings={state.findings}
              onLogFinding={doLogFinding}
            />
          </MobileTray>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ── Header ───────────────────────────────────────────────────────────── */

function Header({
  elapsed,
  remaining,
  unresolved,
  dayFinished,
  timedOut,
  soundEnabled,
  onToggleSound,
}: {
  elapsed: number;
  remaining: number;
  unresolved: number;
  dayFinished: boolean;
  timedOut: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
}) {
  const settled = dayFinished && !timedOut;
  return (
    <header className="sticky top-0 z-30 h-12 border-b border-line bg-obsidian/92 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-[1500px] items-center gap-3 px-4">
        <span data-readout className="font-mono text-[13px] leading-none text-lo tabular-nums">
          {auditClock(elapsed)}
        </span>
        <CountdownPill remaining={remaining} />
        <span className="hidden text-[11.5px] text-faint lg:inline">
          {DAY_TWO_BRIEF.context}
        </span>

        <span className="ml-auto flex items-center gap-2.5">
          <span className="hidden font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase sm:inline">
            {settled ? "Day closed" : timedOut ? "Closed at time" : "Unreconciled"}
          </span>
          <span
            className={cn(
              "rounded-full border px-2.5 py-1 font-mono text-[13px] font-semibold tabular-nums",
              settled ? "border-info-500/40 text-info-500" : "border-alert-500/45 text-alert-500",
            )}
            aria-live="polite"
          >
            <MoneyCounter value={unresolved} />
          </span>
          <button
            type="button"
            onClick={onToggleSound}
            aria-pressed={!soundEnabled}
            aria-label={soundEnabled ? "Mute sounds" : "Turn sounds on"}
            className="grid size-8 place-items-center rounded-full text-lo transition-colors hover:bg-white/[0.06] hover:text-hi focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
          >
            {soundEnabled ? (
              <Volume2 className="size-4" aria-hidden />
            ) : (
              <VolumeX className="size-4" aria-hidden />
            )}
          </button>
          <span className="hidden font-mono text-[10px] tracking-[0.14em] text-faint uppercase sm:inline">
            Day 2
          </span>
        </span>
      </div>
    </header>
  );
}

/* ── Case 02 surfacing ────────────────────────────────────────────────── */

function NextCaseCard({ resumed, onOpen }: { resumed: boolean; onOpen: () => void }) {
  return (
    <section className="rounded-card border border-warn-500/40 bg-warn-500/[0.05] p-5">
      <p className="font-mono text-[10px] tracking-[0.2em] text-warn-500 uppercase">
        SKU drift · Case 02
      </p>
      <h2 className="mt-2 text-[18px] leading-tight font-semibold tracking-[-0.02em] text-hi">
        {PARLEG_ROW.product}
      </h2>
      <p className="mt-1.5 text-[13px] text-mid">{PARLEG_ROW.note}</p>
      <Button variant="primary" size="lg" className="mt-4 w-full" onClick={onOpen}>
        {resumed ? "Resume Case 02" : "Open Case 02"}
        <ArrowRight />
      </Button>
    </section>
  );
}

/* ── Brief ────────────────────────────────────────────────────────────── */

/**
 * The Day 2 landing surface: the audit queue beside the loss ledger.
 *
 * The operator picks which line to open. Going at the ₹11,997 secure cage
 * first is the stronger call on exposure; the biscuit bay carries more wrong
 * records. Both are theirs to choose.
 */
function Brief({
  master,
  selectedId,
  onSelect,
  completedIds,
  onOpenCase,
  parlegSummary,
  recordUnitsCorrected,
}: {
  master: MasterLedger;
  selectedId: string;
  onSelect: (id: string) => void;
  completedIds: string[];
  onOpenCase: (id: string) => void;
  parlegSummary: string | null;
  recordUnitsCorrected: number;
}) {
  const row = LOSS_ROWS.find((r) => r.id === selectedId) ?? EARBUDS_ROW;

  return (
    <div className="space-y-4">
      <section>
        <p className="font-mono text-[10px] tracking-[0.2em] text-alert-500 uppercase">
          Day 2 · {DAY_TWO_BRIEF.clock} · {DAY_TWO_BRIEF.store}
        </p>
        <h1 className="mt-2.5 text-[clamp(1.7rem,4vw,2.4rem)] leading-[1.05] font-semibold tracking-[-0.04em] text-hi">
          {rupees(master.totalOriginalVariance)} is missing.
        </h1>
        <p className="mt-2.5 max-w-prose text-[14.5px] leading-relaxed text-mid">
          {DAY_TWO_BRIEF.subtitle}
        </p>
      </section>

      <section className="rounded-card border border-line-strong bg-elevated p-4">
        <p className="font-mono text-[10px] tracking-[0.14em] text-ember-500 uppercase">
          Senior Store Manager · {DAY_TWO_BRIEF.clock}
        </p>
        <div className="mt-2.5 space-y-1.5">
          {MANAGER_BRIEF.map((line) => (
            <p key={line} className="text-[14px] leading-relaxed text-hi">
              {line}
            </p>
          ))}
        </div>
      </section>

      {/* Queue and ledger, side by side above xl. */}
      <div className="grid gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside
          aria-label="Audit queue"
          className="self-start rounded-card border border-line bg-surface"
        >
          <AuditQueue selectedId={selectedId} onSelect={onSelect} completedIds={completedIds} />
        </aside>

        <div className="min-w-0 space-y-3">
          <CasePanel
            row={row}
            completed={completedIds.includes(row.id)}
            summaryLine={row.id === "biscuits" ? parlegSummary : null}
            onOpen={() => onOpenCase(row.id)}
            onOpenEarbuds={() => onSelect("earbuds")}
          />
          <LedgerBoard
            master={master}
            selectedId={selectedId}
            onSelect={onSelect}
            completedIds={completedIds}
            recordUnitsCorrected={recordUnitsCorrected}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Case 01 investigation workspace ──────────────────────────────────── */

function Investigation({
  state,
  tool,
  onSelectTool,
  onOpenTrace,
  onAddEvidence,
  onViewMarker,
  onInspectTote,
  onClassify,
  onRecover,
  onProceed,
}: {
  state: CaseState;
  tool: Day2Tool | null;
  onSelectTool: (tool: Day2Tool) => void;
  onOpenTrace: (id: string) => void;
  onAddEvidence: (id: string) => void;
  onViewMarker: (time: string) => void;
  onInspectTote: () => void;
  onClassify: () => void;
  onRecover: () => void;
  onProceed: () => void;
}) {
  const ledger = caseLedger(state);
  const has = (id: string) => hasEvidence(state, id);
  const settledAll = state.settled.length >= 2;

  const toolProps = { onAddEvidence, hasEvidence: has };

  return (
    <div className="space-y-4">
      {/* Case header — always shows where the money currently stands. */}
      <section className="rounded-card border border-line bg-surface p-4">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.16em] text-lo uppercase">
              Case 01 · Wireless Earbuds
            </p>
            <p className="mt-1 text-[13px] text-mid">
              System 12 · Physical {state.physicalCount ?? "—"} · Variance{" "}
              {ledger.varianceUnits > 0 ? `-${ledger.varianceUnits}` : "—"}
            </p>
          </div>
          <p className="ml-auto text-right">
            <span className="block font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">
              Unexplained in this case
            </span>
            <span
              data-readout
              className="mt-0.5 block text-[22px] leading-none font-semibold text-alert-500 tabular-nums"
            >
              <MoneyCounter value={ledger.unresolvedValue} />
            </span>
          </p>
        </div>

        {state.settled.length > 0 ? (
          <ul className="mt-3.5 flex flex-wrap gap-2 border-t border-line pt-3">
            {ledger.explainedUnits > 0 ? (
              <li className="rounded-full border border-info-500/40 px-2.5 py-1 text-[11.5px] text-info-500">
                {ledger.explainedUnits} explained · {rupees(ledger.explainedValue)}
              </li>
            ) : null}
            {ledger.recoveredUnits > 0 ? (
              <li className="rounded-full border border-ion-500/40 px-2.5 py-1 text-[11.5px] text-ion-400">
                {ledger.recoveredUnits} recovered · {rupees(ledger.recoveredValue)}
              </li>
            ) : null}
          </ul>
        ) : null}
      </section>

      {/* Tool rail — desktop. Order is the learner's, never suggested. */}
      <nav aria-label="Investigation tools" className="hidden lg:block">
        <ul className="grid grid-cols-3 gap-2 xl:grid-cols-6">
          {(Object.keys(TOOL_META) as Day2Tool[]).map((id) => {
            const Icon = TOOL_ICON[id];
            const active = tool === id;
            const seen = state.toolOpens.includes(id);
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onSelectTool(id)}
                  aria-pressed={active}
                  className={cn(
                    "flex w-full flex-col items-start gap-1.5 rounded-card border px-3 py-2.5 text-left transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                    active
                      ? "border-ember-500/60 bg-ember-500/[0.09]"
                      : "border-line bg-surface hover:border-ember-500/40",
                  )}
                >
                  <Icon
                    className={cn("size-4", active ? "text-ember-400" : seen ? "text-mid" : "text-lo")}
                    aria-hidden
                  />
                  <span className="text-[12px] leading-tight font-medium text-hi">
                    {TOOL_META[id].label}
                  </span>
                  <span className="text-[10.5px] leading-tight text-faint">
                    {TOOL_META[id].hint}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* The open record */}
      {tool === "movement" ? (
        <MovementLogTool {...toolProps} />
      ) : tool === "orders" ? (
        <OrdersTool
          {...toolProps}
          onOpenTrace={onOpenTrace}
          opened={state.orderTracesOpened}
        />
      ) : tool === "scans" ? (
        <ScanLogTool {...toolProps} />
      ) : tool === "access" ? (
        <AccessLogTool {...toolProps} />
      ) : tool === "cctv" ? (
        <CctvTool
          {...toolProps}
          viewed={state.cctvMarkersViewed}
          onView={onViewMarker}
          canClassify={canClassifyIssue(state)}
          classified={state.settled.includes("explained")}
          onClassify={onClassify}
        />
      ) : tool === "exception" ? (
        <ExceptionTool
          {...toolProps}
          inspected={state.toteInspected}
          onInspect={onInspectTote}
          canRecover={canRecoverUnit(state)}
          recovered={state.settled.includes("recovered")}
          onRecover={onRecover}
        />
      ) : (
        <p className="rounded-card border border-line border-dashed bg-surface px-4 py-10 text-center text-[13px] text-lo">
          Open a record. Nothing here will tell you which one matters.
        </p>
      )}

      {/* Settling reveals */}
      {state.settled.includes("explained") ? (
        <Reveal
          eyebrow="1 unit accounted for · process variance"
          headline={`${rupees(ledger.explainedValue)} explained`}
          tone="info"
          body="A high-value item was physically issued into a live customer order without the corresponding item scan. The stock genuinely left the store — what failed was the record, not the shelf. This is not money recovered."
        />
      ) : null}

      {state.settled.includes("recovered") ? (
        <Reveal
          eyebrow="Unit found · physical stock"
          headline={`${rupees(ledger.recoveredValue)} recovered`}
          tone="ion"
          body="Cancelled-order stock was retained in the exception bay and never restowed to the cage. Physical count moves from 9 to 10. This unit is back."
        />
      ) : null}

      {/* Always an action available. */}
      <div className="rounded-card border border-line bg-surface p-4">
        <p className="text-[12.5px] leading-relaxed text-mid">
          {settledAll
            ? `${ledger.unresolvedUnits} unit remains unaccounted for at ${rupees(ledger.unresolvedValue)}. Decide what happens next.`
            : "Close the investigation whenever you are ready. Anything you have not accounted for stays on the report as unexplained."}
        </p>
        <Button
          variant={settledAll ? "primary" : "secondary"}
          size="lg"
          className="mt-3 w-full"
          onClick={onProceed}
        >
          Close investigation and decide actions
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}

/* ── Mobile chrome ────────────────────────────────────────────────────── */

function MobileBar({
  tool,
  onSelectTool,
  evidenceCount,
  onOpenTray,
}: {
  tool: Day2Tool | null;
  onSelectTool: (tool: Day2Tool) => void;
  evidenceCount: number;
  onOpenTray: () => void;
}) {
  return (
    <nav
      aria-label="Investigation tools"
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-obsidian/95 backdrop-blur-md lg:hidden"
    >
      {/* Tools scroll; the tray button does not. It is the control the
          learner reaches for most, and letting it slide off the end of an
          overflow container is how it stops being found at all. */}
      <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto px-2 py-2">
        {(Object.keys(TOOL_META) as Day2Tool[]).map((id) => {
          const Icon = TOOL_ICON[id];
          const active = tool === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTool(id)}
              aria-pressed={active}
              className={cn(
                "flex min-h-[54px] min-w-[64px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg px-2 transition-colors",
                active ? "bg-ember-500/15 text-ember-400" : "text-lo",
              )}
            >
              <Icon className="size-4" aria-hidden />
              <span className="text-[10px] leading-none font-medium">
                {TOOL_META[id].label.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onOpenTray}
        className="flex min-h-[54px] min-w-[72px] shrink-0 flex-col items-center justify-center gap-1 border-l border-line px-2 text-hi"
      >
        <Boxes className="size-4" aria-hidden />
        <span className="text-[10px] leading-none font-medium">
          Evidence {evidenceCount}
        </span>
      </button>
    </nav>
  );
}

function MobileTray({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <motion.button
        type="button"
        aria-label="Close evidence tray"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-void/70 backdrop-blur-sm"
      />
      <motion.div
        initial={reduced ? false : { y: "100%" }}
        animate={{ y: 0 }}
        exit={reduced ? undefined : { y: "100%" }}
        transition={{ duration: 0.3, ease: easing.outExpo }}
        className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-panel border-t border-line bg-obsidian"
      >
        <div className="flex items-center justify-between px-4 pt-3">
          <span aria-hidden className="mx-auto h-1 w-10 rounded-full bg-line-bright" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-full p-1.5 text-lo hover:text-hi"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </motion.div>
    </div>
  );
}
