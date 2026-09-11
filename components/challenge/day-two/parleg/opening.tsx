"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";

import { BiscuitPack } from "@/components/challenge/day-two/parleg/ui";
import { Button } from "@/components/ui/button";
import { SKU_30, SKU_40 } from "@/lib/challenge/day-two/parleg/content";

/**
 * The case opening. Two SKU cards with the system's numbers and a blank where
 * the physical count will go. Nothing about why — the cause is the case.
 */
export function CaseOpening({ clock, onBegin }: { clock: string; onBegin: () => void }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2">
      <div>
        <p data-readout className="font-mono text-[12px] text-lo tabular-nums">
          {clock}
        </p>
        <p className="mt-4 font-mono text-[10px] tracking-[0.2em] text-warn-500 uppercase">
          Case 02 · SKU drift
        </p>
        <h1 className="mt-2 text-[clamp(1.7rem,4.5vw,2.4rem)] leading-[1.05] font-semibold tracking-[-0.04em] text-hi">
          SKU variance detected
        </h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {[SKU_30, SKU_40].map((sku) => (
          <section
            key={sku.id}
            className="flex items-center gap-4 rounded-card border border-line-strong bg-surface p-4"
          >
            <BiscuitPack size={sku.id === "sku30" ? "30" : "40"} large />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-hi">{sku.name}</p>
              <p className="mt-0.5 font-mono text-[11px] text-faint">{sku.bin}</p>
              <dl className="mt-3 flex gap-5">
                <div>
                  <dt className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">
                    System
                  </dt>
                  <dd data-readout className="mt-0.5 font-mono text-[20px] font-semibold text-hi tabular-nums">
                    {sku.system}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">
                    Physical
                  </dt>
                  <dd className="mt-0.5 font-mono text-[15px] leading-[30px] text-warn-500">
                    Pending
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        ))}
      </div>

      <p className="font-mono text-[11px] tracking-[0.18em] text-mid uppercase">
        Verify both shelves
      </p>

      <Button variant="primary" size="lg" className="w-full" onClick={onBegin}>
        Begin count
        <ArrowRight />
      </Button>
    </div>
  );
}
