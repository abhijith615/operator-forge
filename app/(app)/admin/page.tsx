import type { Metadata } from "next";
import { Suspense } from "react";

import { ArrowDown, Download } from "lucide-react";

import { AdminView } from "@/components/admin/admin-view";
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
        description="Live, straight from the database. Refreshes on its own."
      />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button asChild variant="secondary" size="md">
          <a href="/api/admin/report" download>
            <Download />
            Download participant report (Excel)
          </a>
        </Button>
        <p className="text-[12.5px] text-lo">
          Everyone registered, with day-by-day scores, skills, drop-off and start times.
        </p>
        <a
          href="#hiring-test"
          className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-mid underline-offset-4 hover:text-hi hover:underline"
        >
          Hiring Test dashboard
          <ArrowDown className="size-3.5" aria-hidden />
        </a>
      </div>

      {snapshot ? (
        <AdminView initial={snapshot} />
      ) : (
        <p className="mt-8 text-[13px] text-mid">
          The panel could not be read. That usually means the admin functions
          have not been applied to this project yet — see supabase/schema.sql.
        </p>
      )}

      {/*
        The Hiring Test is a separate product with its own tables and its own
        scoring. It gets its own section, read on its own, so nothing above
        waits on it and nothing in it can change what the panels above show.
      */}
      <div className="mt-12">
        <Suspense fallback={<p className="border-t border-line pt-8 text-[12.5px] text-lo">Reading the Hiring Test…</p>}>
          <HiringAdminDashboard ownEmail={operator?.email ?? null} />
        </Suspense>
      </div>

      <p className="mt-10 text-[12px] leading-relaxed text-faint">
        This page shows other people&rsquo;s names, email addresses and phone
        numbers. It is readable only by accounts listed in the{" "}
        <code className="font-mono">admins</code> table, and there is no key in
        this codebase that could bypass that.
      </p>
    </PageShell>
  );
}
