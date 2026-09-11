"use client";

import * as React from "react";
import { ScanLine } from "lucide-react";

import {
  BiscuitPack,
  HhtPanel,
  StageHeading,
  VarianceBadge,
} from "@/components/challenge/day-two/parleg/ui";
import { Button } from "@/components/ui/button";
import { SKUS, varianceOf, type SkuSpec } from "@/lib/challenge/day-two/parleg/content";
import type { ParleGState, PgSku } from "@/lib/challenge/day-two/parleg/types";
import { cn } from "@/lib/utils";

/**
 * Stage 1 — scan and count.
 *
 * The two bins sit side by side because they do on the shelf, and because
 * that adjacency is the answer the learner will reach two stages later. Rows
 * are counted by tapping a row of facings rather than thirty-eight individual
 * packs: counting in facings is how a shelf is actually counted, and it keeps
 * the stage under a minute.
 */
export function SkuCountStage({
  state,
  onScan,
  onCountRow,
  onConfirm,
}: {
  state: ParleGState;
  onScan: (sku: PgSku) => void;
  onCountRow: (sku: PgSku, row: number) => void;
  onConfirm: (sku: PgSku) => void;
}) {
  return (
    <div className="space-y-4">
      <StageHeading
        eyebrow="Stage 1 · Spot the pattern"
        title="Count both shelves."
        sub="Scan each location, count the facings row by row, and confirm what is physically there."
      />

      <div className="rounded-panel border border-line-strong bg-gradient-to-b from-elevated to-surface p-3 sm:p-4">
        <p className="mb-3 font-mono text-[10px] tracking-[0.16em] text-lo uppercase">
          Bay B-12 · Shelf 03–04 · Biscuits
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {(["sku30", "sku40"] as PgSku[]).map((sku) => (
            <ShelfBin
              key={sku}
              spec={SKUS[sku]}
              scanned={state.locationScanned[sku]}
              countedRows={state.countedRows[sku]}
              confirmed={state.confirmed[sku]}
              onScan={() => onScan(sku)}
              onCountRow={(row) => onCountRow(sku, row)}
              onConfirm={() => onConfirm(sku)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ShelfBin({
  spec,
  scanned,
  countedRows,
  confirmed,
  onScan,
  onCountRow,
  onConfirm,
}: {
  spec: SkuSpec;
  scanned: boolean;
  countedRows: number[];
  confirmed: boolean;
  onScan: () => void;
  onCountRow: (row: number) => void;
  onConfirm: () => void;
}) {
  const counted = countedRows.reduce((total, row) => total + (spec.rows[row] ?? 0), 0);
  const allCounted = countedRows.length === spec.rows.length;
  const variance = varianceOf(spec);
  const size = spec.id === "sku30" ? "30" : "40";

  return (
    <section
      aria-label={`Bin ${spec.bin}, ${spec.name}`}
      className={cn(
        "rounded-card border bg-void/50 p-3 transition-colors",
        confirmed
          ? variance > 0
            ? "border-warn-500/50"
            : "border-alert-500/50"
          : "border-line-strong",
      )}
    >
      <header className="flex items-center gap-2">
        <span className="font-mono text-[12px] font-semibold text-hi">{spec.bin}</span>
        <span className="truncate text-[12px] text-mid">{spec.name}</span>
        <span className="ml-auto shrink-0 rounded-full border border-line-bright px-2 py-0.5 font-mono text-[11px] font-semibold text-hi">
          {spec.weight}
        </span>
      </header>

      <div className="mt-3">
        {scanned ? (
          <HhtPanel
            lines={[
              { text: `LOC ${spec.bin}`, state: "ok" },
              { text: `EAN ${spec.barcode}`, state: "info" },
              { text: `${spec.name} · product verified`, state: "ok" },
            ]}
          />
        ) : (
          <Button variant="secondary" size="md" className="w-full" onClick={onScan}>
            <ScanLine className="size-4" aria-hidden />
            Scan {spec.bin}
          </Button>
        )}
      </div>

      <ul className="mt-3 space-y-1.5">
        {spec.rows.map((packs, row) => {
          const done = countedRows.includes(row);
          const tappable = scanned && !confirmed && !done;
          return (
            <li key={row}>
              <button
                type="button"
                onClick={() => onCountRow(row)}
                disabled={!tappable}
                aria-pressed={done}
                aria-label={`Row ${row + 1}, ${packs} packs${done ? ", counted" : ""}`}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                  done ? "border-ion-500/40 bg-ion-500/[0.06]" : "border-line",
                  tappable && "cursor-pointer hover:border-ember-500/50 hover:bg-white/[0.03]",
                )}
              >
                <span className="flex min-w-0 flex-1 flex-wrap gap-[3px]">
                  {Array.from({ length: packs }, (_, i) => (
                    <BiscuitPack key={i} size={size} counted={done} dim={!scanned} />
                  ))}
                </span>
                <span
                  className={cn(
                    "w-12 shrink-0 text-right font-mono text-[11px] tabular-nums",
                    done ? "text-ion-400" : "text-faint",
                  )}
                >
                  {done ? `+${packs}` : `Row ${row + 1}`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <footer className="mt-3 flex items-center gap-3">
        <span className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">Counted</span>
        <span
          data-readout
          className="font-mono text-[22px] leading-none font-semibold text-hi tabular-nums"
          aria-live="polite"
        >
          {counted}
        </span>
        {!confirmed ? (
          <Button
            variant="primary"
            size="sm"
            className="ml-auto"
            disabled={!allCounted}
            onClick={onConfirm}
          >
            {allCounted ? `Confirm ${counted}` : `${countedRows.length}/${spec.rows.length} rows`}
          </Button>
        ) : null}
      </footer>

      {confirmed ? (
        <dl className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line">
          <div className="bg-surface px-3 py-2">
            <dt className="font-mono text-[9px] tracking-[0.14em] text-faint uppercase">System</dt>
            <dd data-readout className="mt-0.5 font-mono text-[17px] font-semibold text-hi tabular-nums">
              {spec.system}
            </dd>
          </div>
          <div className="bg-surface px-3 py-2">
            <dt className="font-mono text-[9px] tracking-[0.14em] text-faint uppercase">Physical</dt>
            <dd data-readout className="mt-0.5 font-mono text-[17px] font-semibold text-hi tabular-nums">
              {spec.physical}
            </dd>
          </div>
          <div className="bg-surface px-3 py-2">
            <dt className="font-mono text-[9px] tracking-[0.14em] text-faint uppercase">Variance</dt>
            <dd className="mt-1">
              <VarianceBadge value={variance} pulse />
            </dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
