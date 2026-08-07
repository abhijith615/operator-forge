"use client";

import * as React from "react";

/**
 * Minimal surface of the YouTube IFrame API we actually use. Pulling in the
 * full typings for four members is not worth the dependency.
 */
interface YouTubePlayerInstance {
  destroy: () => void;
}

interface YouTubeApi {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
        onError?: () => void;
      };
    },
  ) => YouTubePlayerInstance;
  PlayerState: { ENDED: number };
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YouTubeApi> | null = null;

/** Loads the IFrame API once per page, however many players mount. */
function loadYouTubeApi(): Promise<YouTubeApi> {
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }

    const timeout = window.setTimeout(
      () => reject(new Error("YouTube player did not load")),
      8000,
    );

    // The API calls this global once it is ready; chain rather than clobber.
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      window.clearTimeout(timeout);
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube player did not initialise"));
    };

    if (!document.getElementById("youtube-iframe-api")) {
      const script = document.createElement("script");
      script.id = "youtube-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error("YouTube player script blocked"));
      };
      document.head.appendChild(script);
    }
  }).catch((error: unknown) => {
    // Allow a later mount to retry rather than caching the failure forever.
    apiPromise = null;
    throw error;
  });

  return apiPromise;
}

interface YouTubePlayerProps {
  videoId: string;
  /** Fired when playback reaches the end, so the count-in can start. */
  onEnded: () => void;
  /** Fired when the API cannot load — the caller falls back to a bare embed. */
  onUnavailable?: () => void;
}

export function YouTubePlayer({ videoId, onEnded, onUnavailable }: YouTubePlayerProps) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const endedRef = React.useRef(onEnded);
  const unavailableRef = React.useRef(onUnavailable);

  // Keep the latest callbacks without re-creating the player on every render.
  endedRef.current = onEnded;
  unavailableRef.current = onUnavailable;

  React.useEffect(() => {
    let player: YouTubePlayerInstance | null = null;
    let cancelled = false;

    // The API replaces the element it is given, so hand it a child we own.
    const mount = document.createElement("div");
    mount.className = "size-full";
    hostRef.current?.appendChild(mount);

    void loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        player = new YT.Player(mount, {
          videoId,
          playerVars: {
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            controls: 1,
          },
          events: {
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.ENDED) endedRef.current();
            },
            onError: () => unavailableRef.current?.(),
          },
        });
      })
      .catch(() => {
        if (!cancelled) unavailableRef.current?.();
      });

    return () => {
      cancelled = true;
      try {
        player?.destroy();
      } catch {
        // The iframe may already be gone; nothing to clean up.
      }
      mount.remove();
    };
  }, [videoId]);

  return <div ref={hostRef} className="size-full [&_iframe]:size-full" />;
}
