"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useChatStore } from "@/stores/chat-store";
import { useMissionStore } from "@/stores/mission-store";
import { useTelemetryStore } from "@/stores/telemetry-store";

/**
 * Runs the mission again from the handover.
 *
 * Clears the live run, its conversations and its telemetry — but never the
 * history, so the shift you just finished keeps its place on the leaderboard
 * and the next one can be measured against it.
 */
export function RestartShift({
  variant = "secondary",
}: {
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  function restart() {
    useMissionStore.getState().reset();
    useChatStore.getState().reset();
    useTelemetryStore.getState().reset();
    setOpen(false);
    router.push("/start");
  }

  return (
    <>
      <Button variant={variant} size="md" onClick={() => setOpen(true)}>
        <RotateCcw />
        Run another shift
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Run the shift again?</DialogTitle>
            <DialogDescription>
              You will start from the handover with a fresh hub and a new
              thirty-minute clock.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-3 text-[13.5px] leading-relaxed text-mid">
            <p>
              The shift you just ran stays on your record — it keeps its rating
              and its place in your history, and the next one is measured
              against it.
            </p>
            <p className="text-lo">
              This debrief and its replay will be replaced by the new run.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
            <Button variant="primary" size="md" onClick={restart} className="sm:flex-1">
              Start a new shift
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => setOpen(false)}
              className="sm:flex-1"
            >
              Stay here
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
