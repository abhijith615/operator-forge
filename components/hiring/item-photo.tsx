import Image from "next/image";

import type { ItemPhotoId } from "@/lib/hiring/forms";
import { cn } from "@/lib/utils";

/**
 * What the item in question looks like.
 *
 * A high-value alert about "Premium face serum" is a line of text; a small
 * frosted bottle is a thing somebody can picture going missing from a cage.
 * Generated images, unbranded, shot on black so they sit on the dark panels
 * without a plate behind them. One per item across the three forms, so no
 * form is more vivid than another.
 */
const ITEM_PHOTOS: Record<ItemPhotoId, string> = {
  earbuds: "/hiring/earbuds.webp",
  serum: "/hiring/serum.webp",
  smartwatch: "/hiring/smartwatch.webp",
  milk: "/hiring/milk.webp",
  eggs: "/hiring/eggs.webp",
  bread: "/hiring/bread.webp",
};

export function ItemPhoto({ id, alt, size = 76, className }: { id: ItemPhotoId; alt: string; size?: number; className?: string }) {
  return (
    <span
      className={cn("block shrink-0 overflow-hidden rounded-[14px] border border-line-strong bg-black", className)}
      style={{ width: size, height: size }}
    >
      <Image src={ITEM_PHOTOS[id]} alt={alt} width={size} height={size} className="size-full object-cover" />
    </span>
  );
}
