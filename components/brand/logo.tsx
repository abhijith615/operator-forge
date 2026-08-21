import { cn } from "@/lib/utils";

/**
 * The supplied logo is a horizontal lockup — mark on the left, "Operator Forge"
 * set in grey to its right, on a 2048×768 canvas.
 *
 * `LogoMark` shows only the mark, cropped in CSS rather than by shipping a
 * second file — one asset to keep in sync instead of two.
 *
 * The wordmark half is deliberately not used at small sizes. It is set in
 * #5F6368, which against this interface's charcoal is about 3.5:1 — fine for a
 * logo, unreadable as a 24px UI element. Wherever the product name appears next
 * to the mark it is set in the interface's own type, which stays crisp at every
 * size and inherits the theme.
 */
export function LogoMark({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      className={cn("block shrink-0 bg-no-repeat size-7", className)}
      style={{
        backgroundImage: "url(/logo.png)",
        // 310% puts 2048 ÷ 3.1 ≈ 660px of source across the box, which is the
        // mark and nothing else. `object-cover` on a square box would show the
        // leftmost 768px and catch the first letter of the wordmark.
        backgroundSize: "310% auto",
        backgroundPosition: "0% 50%",
      }}
      {...props}
    />
  );
}

export function Wordmark({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex items-center gap-2.5", className)} {...props}>
      <LogoMark />
      <span className="text-[13.5px] font-semibold tracking-[0.16em] text-hi">
        OPERATOR<span className="text-lo"> FORGE</span>
      </span>
    </div>
  );
}
