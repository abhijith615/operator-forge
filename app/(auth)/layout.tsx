import Link from "next/link";

import { LogoMark } from "@/components/brand/logo";
import { Aurora, GridField } from "@/components/visuals/aurora";
import { FIRST_SHIFT } from "@/lib/constants/mission";

const MARKERS = [
  { k: "Mission", v: FIRST_SHIFT.name },
  { k: "Role", v: FIRST_SHIFT.role },
  { k: "Duration", v: `${FIRST_SHIFT.durationMinutes} minutes` },
  { k: "Store", v: FIRST_SHIFT.location },
] as const;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* ── Narrative side ─────────────────────────────────────────────── */}
      <aside className="relative hidden overflow-hidden border-r border-line lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Aurora />
        <GridField className="[mask-image:radial-gradient(ellipse_80%_70%_at_30%_40%,black,transparent_80%)]" />

        <Link href="/" className="relative flex w-fit items-center gap-2.5">
          <LogoMark className="size-6" />
          <span className="text-[12.5px] font-semibold tracking-[0.18em] text-hi">
            OPERATOR<span className="text-lo"> FORGE</span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <p className="font-mono text-[10.5px] tracking-[0.22em] text-ember-500 uppercase">
            {FIRST_SHIFT.codename} · Standing by
          </p>
          <h1 className="mt-6 text-[clamp(2rem,3.4vw,2.9rem)] leading-[1.05] font-semibold tracking-[-0.04em] text-gradient text-balance">
            The store opens at nine. Somebody has to run it.
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-mid">
            {FIRST_SHIFT.tagline}
          </p>
        </div>

        <dl className="relative grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-line bg-line">
          {MARKERS.map((marker) => (
            <div key={marker.k} className="bg-obsidian/80 px-5 py-4 backdrop-blur-sm">
              <dt className="font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
                {marker.k}
              </dt>
              <dd className="mt-1.5 text-[13.5px] text-hi">{marker.v}</dd>
            </div>
          ))}
        </dl>
      </aside>

      {/* ── Form side ──────────────────────────────────────────────────── */}
      <main
        id="main"
        className="relative flex flex-col justify-center px-5 py-16 sm:px-10 lg:px-16"
      >
        <Aurora className="opacity-40 lg:hidden" />
        <Link
          href="/"
          className="relative mx-auto mb-12 flex w-fit items-center gap-2.5 lg:hidden"
        >
          <LogoMark className="size-6" />
          <span className="text-[12.5px] font-semibold tracking-[0.18em] text-hi">
            OPERATOR<span className="text-lo"> FORGE</span>
          </span>
        </Link>
        <div className="relative mx-auto w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
