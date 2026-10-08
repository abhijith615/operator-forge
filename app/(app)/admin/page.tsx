import type { Metadata } from "next";

import { Download } from "lucide-react";

import { AdminView } from "@/components/admin/admin-view";
import { PageHeader, PageShell } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { readAdminSnapshot, requireAdmin } from "@/lib/admin/queries";

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

  const snapshot = await readAdminSnapshot();

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
      </div>

      {snapshot ? (
        <AdminView initial={snapshot} />
      ) : (
        <p className="mt-8 text-[13px] text-mid">
          The panel could not be read. That usually means the admin functions
          have not been applied to this project yet — see supabase/schema.sql.
        </p>
      )}

      <p className="mt-10 text-[12px] leading-relaxed text-faint">
        This page shows other people&rsquo;s names, email addresses and phone
        numbers. It is readable only by accounts listed in the{" "}
        <code className="font-mono">admins</code> table, and there is no key in
        this codebase that could bypass that.
      </p>
    </PageShell>
  );
}
