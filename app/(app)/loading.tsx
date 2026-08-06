import { PageShell } from "@/components/shell/page-header";
import { Skeleton } from "@/components/ui/skeleton";

/** Instrument warm-up. Mirrors the mission page grid so nothing jumps. */
export default function AppLoading() {
  return (
    <PageShell>
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-4 h-8 w-72" />
      <Skeleton className="mt-3 h-4 w-full max-w-md" />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.65fr_1fr]">
        <Skeleton className="h-96 rounded-panel" />
        <div className="grid content-start gap-6">
          <Skeleton className="h-52 rounded-panel" />
          <Skeleton className="h-64 rounded-panel" />
        </div>
      </div>
    </PageShell>
  );
}
