import type { Metadata } from "next";
import { Suspense } from "react";

import { ArrowDown, Download } from "lucide-react";

import { AdminView } from "@/components/admin/admin-view";
import { FcAdminDashboard } from "@/components/fc/admin-dashboard";
import { HiringAdminDashboard } from "@/components/hiring/admin-dashboard";
import { PageHeader, PageShell } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { readAdminSnapshot, requireAdmin } from "@/lib/admin/queries";
import { getOperator } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Admin",
  // Personal data behind a guard. Keep it out of any index that reaches it.
  robots: { index: false, follow: false },
};

/** Live data, so nothing about this page may be cached or prerendered. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  await requireAdmin();

  const [snapshot, operator] = await Promise.all([readAdminSnapshot(), getOperator()]);

  return (
    <PageShell className="max-w-6xl">
      <PageHeader
        eyebrow="Admin"
        title="Who has been through"
        description="The two Hiring Tests first, then the 7-day challenge. Straight from the database."
      />

      <nav aria-label="Sections" className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1">
        {[
          ["#hiring-test", "Dark Store Manager test"],
          ["#fc-executive", "FC Executive test"],
          ["#challenge", "7-day challenge"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-mid underline-offset-4 hover:text-hi hover:underline"
          >
            {label}
            <ArrowDown className="size-3.5" aria-hidden />
          </a>
        ))}
      </nav>

      {/*
        The Hiring Tests are separate products with their own tables and their
        own scoring. Each is read on its own, so neither waits on the other and
        nothing in them can change what the challenge panels below show.
      */}
      <div className="mt-4">
        <Suspense fallback={<p className="border-t border-line pt-8 text-[12.5px] text-lo">Reading the Hiring Test…</p>}>
          <HiringAdminDashboard ownEmail={operator?.email ?? null} />
        </Suspense>
      </div>

      <div className="mt-12">
        <Suspense fallback={<p className="border-t border-line pt-8 text-[12.5px] text-lo">Reading the FC Executive test…</p>}>
          <FcAdminDashboard />
        </Suspense>
      </div>

      {/* The 7-day challenge: live panels that refresh on their own. */}
      <section id="challenge" aria-labelledby="challenge-title" className="mt-12 scroll-mt-20">
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line pt-8">
          <div className="min-w-0">
            <h2 id="challenge-title" className="text-[20px] leading-tight font-semibold tracking-[-0.02em] text-hi">
              7-day challenge
            </h2>
            <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-lo">
              Everyone registered for the challenge. These panels refresh on their own.
            </p>
          </div>
          <Button asChild variant="secondary" size="md">
            <a href="/api/admin/report" download>
              <Download />
              Download participant report (Excel)
            </a>
          </Button>
        </div>
        <p className="mt-2 text-[12.5px] text-lo">
          The report has everyone registered, with day-by-day scores, skills, drop-off and start times.
        </p>

        <div className="mt-6">
          {snapshot ? (
            <AdminView initial={snapshot} />
          ) : (
            <p className="text-[13px] text-mid">
              The panel could not be read. That usually means the admin functions
              have not been applied to this project yet — see supabase/schema.sql.
            </p>
          )}
        </div>
      </section>

      <p className="mt-10 text-[12px] leading-relaxed text-faint">
        This page shows other people&rsquo;s names, email addresses and phone
        numbers. It is readable only by accounts listed in the{" "}
        <code className="font-mono">admins</code> table, and there is no key in
        this codebase that could bypass that.
      </p>
    </PageShell>
  );
}
