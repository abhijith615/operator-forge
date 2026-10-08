import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * What the thing on the shelf actually looks like.
 *
 * Day 5 asks the operator to read a basket and work out what the customer is
 * trying to do with it. That is a lot harder from five text labels than from
 * five products, which is how a picker sees them — flour, butter, sugar, eggs
 * and a bottle of vanilla read as a cake in about a second, and as a list of
 * words they read as a list of words.
 *
 * Shot on black so they sit on the dark panels without a plate behind them,
 * and small enough that the label is still the thing being read.
 */
const PHOTOS: Record<string, string> = {
  /* Case 1 · milk */
  fresh36: "/day-five/milk.webp",
  fresh72: "/day-five/milk.webp",

  /* Case 2 · the baking basket */
  flour: "/day-five/flour.webp",
  butter: "/day-five/butter.webp",
  sugar: "/day-five/sugar.webp",
  eggs: "/day-five/eggs.webp",
  vanilla: "/day-five/vanilla.webp",
  paste: "/day-five/vanilla-paste.webp",
  essence: "/day-five/vanilla-essence.webp",

  /* Case 3 · the packing bench */
  cleaner: "/day-five/cleaner.webp",
  coriander: "/day-five/coriander.webp",
  apples: "/day-five/apples.webp",
  snacks: "/day-five/snacks.webp",
};

export function hasItemPhoto(id: string): boolean {
  return id in PHOTOS;
}

export function ItemPhoto({
  id,
  size = 40,
  className,
}: {
  /** Basket, batch or pack item id. Unknown ids render nothing. */
  id: string;
  size?: number;
  className?: string;
}) {
  const src = PHOTOS[id];
  if (!src) return null;

  return (
    <span
      className={cn("block shrink-0 overflow-hidden rounded-md bg-black/40", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className="size-full object-cover"
        aria-hidden
      />
    </span>
  );
}
