import { Check, Wifi } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";
import type { Operator } from "@/types/operator";

function maskNumber(value: string | null): string {
  if (!value) return "Not on file";
  const tail = value.slice(-4);
  return `${"•".repeat(Math.max(0, value.length - 4))}${tail}`;
}

/** Facts about this operator's readiness. Every row is derived, not decorative. */
export function Readiness({ operator }: { operator: Operator }) {
  const rows = [
    { label: "On the roster", value: operator.fullName, done: true },
    { label: "WhatsApp on file", value: maskNumber(operator.whatsapp), done: true },
    { label: "Contact email", value: operator.email, done: Boolean(operator.email) },
  ];

  return (
    <Reveal className="panel sheen p-6">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10.5px] tracking-[0.16em] text-faint uppercase">
          Readiness
        </p>
        <span className="flex items-center gap-1.5 text-[11.5px] text-ion-400">
          <Wifi className="size-3" />
          Connected
        </span>
      </div>

      <ul className="mt-5 space-y-3.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-3">
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full border",
                row.done
                  ? "border-ion-500/35 bg-ion-500/12 text-ion-400"
                  : "border-line-strong text-faint",
              )}
            >
              {row.done ? <Check className="size-3" strokeWidth={3} /> : null}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-mid">{row.label}</p>
              <p className="truncate text-[13px] text-hi">{row.value}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-6 border-t border-line pt-4 text-[12.5px] leading-relaxed text-lo">
        Set aside a clear half hour on a device you can concentrate on. The shift
        runs once and does not pause.
      </p>
    </Reveal>
  );
}
