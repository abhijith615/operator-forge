"use client";

import { Switch } from "@/components/ui/switch";
import { playNotificationSound } from "@/lib/sound";
import { useShellStore } from "@/stores/shell-store";

export function SoundToggle() {
  const enabled = useShellStore((state) => state.soundEnabled);
  const setEnabled = useShellStore((state) => state.setSoundEnabled);

  return (
    <div className="flex items-center justify-between gap-4 rounded-card border border-line bg-white/[0.02] px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[13.5px] text-hi">Notification tones</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-lo">
          A short two-note blip when the floor tells you something during a
          shift. Nothing else makes a sound.
        </p>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={(next) => {
          setEnabled(next);
          // Let them hear what they just turned on.
          if (next) playNotificationSound("info");
        }}
        aria-label="Notification tones"
      />
    </div>
  );
}
