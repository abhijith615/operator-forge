"use client";

import * as React from "react";
import { Play } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The explainer a candidate can watch before the shift.
 *
 * It sits on the screen before Start Shift, where the clock has not started,
 * so watching it costs nothing. Nothing is requested from YouTube until the
 * candidate presses play: the frame is a button until then, and the video is
 * loaded through the privacy-enhanced player when it is asked for. A candidate
 * who does not want it, or cannot load it, starts the shift exactly as before.
 */
export function HiringExplainerVideo({ id, title, className }: { id: string; title: string; className?: string }) {
  const [playing, setPlaying] = React.useState(false);

  return (
    <div className={cn("relative aspect-video w-full overflow-hidden rounded-[16px] border border-line-strong bg-surface", className)}>
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play video: ${title}`}
          className="group absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 text-center transition-colors hover:bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none focus-visible:ring-inset"
        >
          <span className="grid size-14 place-items-center rounded-full bg-ember-500 text-void transition-transform group-hover:scale-105">
            <Play className="ml-0.5 size-6" fill="currentColor" aria-hidden />
          </span>
          <span className="text-[15px] font-semibold text-hi">{title}</span>
          <span className="text-[12.5px] leading-snug text-lo">Plays from YouTube once you press play.</span>
        </button>
      )}
    </div>
  );
}
