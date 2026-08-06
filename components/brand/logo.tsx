import { cn } from "@/lib/utils";

/**
 * The mark: an aperture mid-iris. Four arcs closing on a single point —
 * attention narrowing onto a decision.
 */
export function LogoMark({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn("size-7", className)}
      {...props}
    >
      <defs>
        <linearGradient id="of-mark" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF9257" />
          <stop offset="1" stopColor="#F04E0C" />
        </linearGradient>
      </defs>
      <circle
        cx="16"
        cy="16"
        r="13"
        stroke="url(#of-mark)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="14 6.4"
        strokeDashoffset="7"
      />
      <path
        d="M16 8.5V16L21.5 19"
        stroke="url(#of-mark)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="2.1" fill="url(#of-mark)" />
    </svg>
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
