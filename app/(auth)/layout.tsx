import { Suspense } from "react";
import Link from "next/link";

import { AuthNarrative, AuthNarrativeFallback } from "@/components/auth/auth-narrative";
import { LogoMark } from "@/components/brand/logo";
import { Aurora, GridField } from "@/components/visuals/aurora";

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

        {/* Reads `next` to decide what it is standing beside. */}
        <Suspense fallback={<AuthNarrativeFallback />}>
          <AuthNarrative />
        </Suspense>
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
