"use client";

import * as React from "react";
import { Play } from "lucide-react";

import { track } from "@/components/offer/meta-pixel";
import { cn } from "@/lib/utils";

/**
 * A YouTube player that costs nothing until it is wanted.
 *
 * The embed pulls roughly a megabyte of script before anyone presses play,
 * which on a phone arriving from an ad is a slower page for most visitors and
 * no video for most of them either. This shows YouTube's own thumbnail and
 * loads the iframe on the first click — which also counts as a signal that
 * somebody wanted to see the product.
 */
export function YouTubeFacade({
  id,
  title,
  className,
}: {
  id: string;
  title: string;
  className?: string;
}) {
  const [playing, setPlaying] = React.useState(false);

  const play = () => {
    setPlaying(true);
    track("ViewContent", { content_name: title, content_type: "video" });
  };

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-[16px] bg-[#0B0B0B]",
        className,
      )}
    >
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={play}
          aria-label={`Play ${title}`}
          className="group absolute inset-0 size-full cursor-pointer focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
        >
          {/* YouTube's own still, so there is no second asset to keep in sync. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
            alt=""
            loading="lazy"
            decoding="async"
            width={480}
            height={360}
            className="size-full scale-[1.34] object-cover"
          />
          <span aria-hidden className="absolute inset-0 bg-[#0B0B0B]/25 transition-colors group-hover:bg-[#0B0B0B]/10" />
          <span
            aria-hidden
            className="absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ember-500 text-[#0B0B0B] shadow-[0_12px_30px_-12px_rgba(0,0,0,0.8)] transition-transform group-hover:scale-105 sm:size-20"
          >
            <Play className="ml-0.5 size-7 fill-current sm:size-9" />
          </span>
        </button>
      )}
    </div>
  );
}
