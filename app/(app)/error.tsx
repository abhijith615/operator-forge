"use client";

import * as React from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { PageShell } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[operator-forge]", error);
  }, [error]);

  return (
    <PageShell className="max-w-xl">
      <div className="panel sheen mt-12 p-8 text-center">
        <div className="mx-auto grid size-11 place-items-center rounded-full border border-alert-500/25 bg-alert-500/10">
          <TriangleAlert className="size-5 text-alert-500" />
        </div>
        <h2 className="mt-6 text-[20px] font-semibold tracking-[-0.02em] text-hi">
          This panel dropped out.
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-mid">
          Something failed while loading the floor. Retrying usually brings it
          back — nothing you did during a mission is lost.
        </p>
        {error.digest ? (
          <p className="mt-4 font-mono text-[11px] text-faint">
            Reference {error.digest}
          </p>
        ) : null}
        <Button variant="secondary" size="md" onClick={reset} className="mt-7">
          <RotateCcw />
          Try again
        </Button>
      </div>
    </PageShell>
  );
}
