"use client";

import * as React from "react";
import { Film } from "lucide-react";

import type { ExplainerVideoSpec } from "@/lib/challenge/videos";
import { cn } from "@/lib/utils";

/**
 * An explainer video that never holds up the screen it sits on.
 *
 * A YouTube link plays through the privacy-enhanced embed; anything else plays
 * in the browser's own player with its own controls. If a file cannot load —
 * which is what a deployment does until a hosted URL is configured, because
 * local video files are gitignored — the frame says so in a line instead of
 * sitting there as a black rectangle, and every button around it still works.
 */
export function ExplainerVideo({
  video,
  autoPlay = false,
  className,
}: {
  video: ExplainerVideoSpec;
  /**
   * Only for a video reached by a click. Browsers allow sound after the
   * operator has interacted with the page; on a cold page load they would
   * block it, so the brief screens leave the play button to the operator.
   */
  autoPlay?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const { source, title } = video;

  // The <video> arrives in the server HTML and starts loading before React
  // hydrates. If the source fails fast — a missing file answers in a few
  // milliseconds — the error event fires before `onError` is attached and is
  // lost, leaving an empty player. So check the element's own state once we
  // are attached, as well as listening for later failures.
  React.useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    if (element.error || element.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
      setFailed(true);
    }
  }, []);

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-card border border-line-strong bg-void",
        className,
      )}
    >
      {source.kind === "youtube" ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${source.id}?rel=0&modestbranding=1&playsinline=1${autoPlay ? "&autoplay=1" : ""}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="size-full"
        />
      ) : source.kind === "file" && !failed ? (
        <video
          ref={videoRef}
          // `#t=0.1` asks the browser to paint a first frame, so the player
          // shows a picture before play rather than a black box.
          src={`${source.src}#t=0.1`}
          aria-label={title}
          controls
          playsInline
          preload="metadata"
          autoPlay={autoPlay}
          onError={() => setFailed(true)}
          className="size-full object-contain"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center px-6 text-center">
          <div>
            <div className="mx-auto grid size-11 place-items-center rounded-2xl border border-line-strong bg-surface">
              <Film className="size-5 text-lo" aria-hidden />
            </div>
            <p className="mt-4 text-[14px] text-hi">{title}</p>
            <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-mid">
              This video isn&apos;t available right now. Nothing on this screen
              depends on it.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
