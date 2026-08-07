"use client";

import { toast } from "sonner";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useShellStore } from "@/stores/shell-store";

export function WalkthroughReplay() {
  const seen = useShellStore((state) => state.walkthroughSeen);
  const setReplay = useShellStore((state) => state.setWalkthroughReplay);

  return (
    <div className="flex items-center justify-between gap-4 rounded-card border border-line bg-white/[0.02] px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[13.5px] text-hi">Orientation walkthrough</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-lo">
          {seen
            ? "You have seen it. Replay it and it will run the next time a shift is live."
            : "Runs automatically the first time a shift opens."}
        </p>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setReplay(true);
          toast.success("It will run on your next live shift.");
        }}
      >
        <Compass />
        Replay
      </Button>
    </div>
  );
}
