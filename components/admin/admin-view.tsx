"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, RefreshCw } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { setAmaAttended, setRegistrationPaid, testSheetConnection } from "@/lib/admin/actions";
import { cn } from "@/lib/utils";
import type { AdminRegistration, AdminSnapshot } from "@/lib/admin/queries";

const POLL_MS = 15_000;

async function fetchSnapshot(): Promise<AdminSnapshot> {
  const response = await fetch("/api/admin/snapshot", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not read the panel.");
  return (await response.json()) as AdminSnapshot;
}

/** `1830` → `30m 30s`. Drop-off is only legible against the 30-minute shift. */
function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminView({ initial }: { initial: AdminSnapshot }) {
  const { data, isFetching, error, dataUpdatedAt } = useQuery({
    queryKey: ["admin-snapshot"],
    queryFn: fetchSnapshot,
    initialData: initial,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });

  const s = data.summary;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px]",
            error
              ? "border-alert-500/30 bg-alert-500/10 text-alert-500"
              : "border-ion-500/25 bg-ion-500/[0.08] text-ion-400",
          )}
        >
          {error ? <CircleAlert className="size-3" /> : (
            <RefreshCw className={cn("size-3", isFetching && "animate-spin")} />
          )}
          {error ? "Refresh failed" : `Live · every ${POLL_MS / 1000}s`}
        </span>
        <span className="font-mono text-[11.5px] text-faint">
          read {when(new Date(dataUpdatedAt).toISOString())}
        </span>
      </div>

      {/* ── Challenge registrations ─────────────────────────────────────── */}
      <section>
        <SectionTitle count={data.registrations.length}>Challenge registrations</SectionTitle>
        <div className="mb-3 grid grid-cols-3 gap-2.5">
          <Stat label="Registered" value={data.registrations.length} />
          <Stat
            label="Paid"
            value={data.registrations.filter((r) => r.paid_at).length}
            tone="ion"
            hint="can open the challenge"
          />
          <Stat
            label="Awaiting payment"
            value={data.registrations.filter((r) => !r.paid_at).length}
            tone="warn"
          />
        </div>
        <p className="mb-3 text-[12.5px] leading-relaxed text-lo">
          Razorpay payments mark a registration paid on their own when the payer&rsquo;s email (or,
          failing that, phone) matches. Use Mark paid for anything confirmed another way. Paid
          participants get in from the cohort start date and must sign in with the same email. After the live
          AMA, tick who attended — the certificate needs all five simulations and the AMA.
        </p>
        <SheetTest />
        <Table
          head={["Name", "Email", "Phone", "Registered", "Source", "Coupon", "Signed in", "Payment", "AMA"]}
          empty="No registrations yet."
          rowKeys={data.registrations.map((r) => r.id)}
          rows={data.registrations.map((r) => [
            r.name,
            <span key="e" className="font-mono text-[11.5px]">{r.email}</span>,
            <span key="p" className="font-mono text-[11.5px]">{r.phone}</span>,
            when(r.created_at),
            r.attribution?.utm_source ?? <Muted>direct</Muted>,
            r.attribution?.coupon ? (
              <span key="c" className="font-mono text-[11.5px] font-semibold text-ember-400">
                {r.attribution.coupon}
              </span>
            ) : (
              <Muted>—</Muted>
            ),
            r.has_account ? "Yes" : <Muted>Not yet</Muted>,
            <PaidControl key="paid" registration={r} />,
            <AmaControl key="ama" registration={r} />,
          ])}
        />
      </section>

      {data.unmatchedPayments.length > 0 ? (
        <section>
          <SectionTitle count={data.unmatchedPayments.length}>Payments without a registration</SectionTitle>
          <p className="mb-3 text-[12.5px] leading-relaxed text-lo">
            Paid in Razorpay, but no registration matched the email or phone. Find the person&rsquo;s
            registration above and mark it paid with this payment ID. Small amounts are other
            payments on the account and can be ignored.
          </p>
          <Table
            head={["Payment ID", "Amount", "Email", "Phone", "Received"]}
            empty=""
            rowKeys={data.unmatchedPayments.map((p) => p.payment_id)}
            rows={data.unmatchedPayments.map((p) => [
              <span key="id" className="font-mono text-[11.5px]">{p.payment_id}</span>,
              p.amount_paise === null ? <Muted>—</Muted> : `${p.currency ?? ""} ${(p.amount_paise / 100).toFixed(2)}`,
              p.email ? <span key="e" className="font-mono text-[11.5px]">{p.email}</span> : <Muted>—</Muted>,
              p.phone ? <span key="p" className="font-mono text-[11.5px]">{p.phone}</span> : <Muted>—</Muted>,
              when(p.received_at),
            ])}
          />
        </section>
      ) : null}

      {/* ── Counts ─────────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Operators</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat label="Total" value={s.total_operators} />
          <Stat label="New today" value={s.operators_today} tone="ember" />
          <Stat label="Last 7 days" value={s.operators_7d} />
          <Stat
            label="Onboarded"
            value={s.onboarded}
            hint="name and number both given"
          />
        </div>
      </section>

      <section>
        <SectionTitle>Shifts</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat label="Started" value={s.runs_started} />
          <Stat
            label="Completed 30 min"
            value={s.runs_completed}
            tone="ion"
            hint="reached handover"
          />
          <Stat
            label="Dropped off"
            value={s.runs_dropped}
            tone="warn"
            hint="stopped before handover"
          />
          <Stat label="Waitlist" value={s.waitlist_count} tone="flux" />
        </div>
      </section>

      {/* ── Signups per day ────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Signups per day</SectionTitle>
        <DailyChart daily={data.daily} />
      </section>

      {/* ── Operator table ─────────────────────────────────────────────── */}
      <section>
        <SectionTitle count={data.operators.length}>Operator details</SectionTitle>
        <Table
          head={["Name", "Email", "WhatsApp", "Joined", "Runs", "Done", "Best"]}
          empty="No operators yet."
          rows={data.operators.map((o) => [
            o.full_name ?? <Muted>not set</Muted>,
            <span key="e" className="font-mono text-[11.5px]">{o.email}</span>,
            o.whatsapp ? (
              <span className="font-mono text-[11.5px]">{o.whatsapp}</span>
            ) : (
              <Muted>not set</Muted>
            ),
            when(o.created_at),
            o.runs,
            o.completed,
            o.best_rating ?? <Muted>—</Muted>,
          ])}
        />
      </section>

      {/* ── Drop-offs ──────────────────────────────────────────────────── */}
      <section>
        <SectionTitle count={data.dropoffs.length}>
          Drop-offs
        </SectionTitle>
        <p className="mb-3 text-[12.5px] text-lo">
          Runs that never reached handover. The time is the shift clock they got
          to, out of 30 minutes — not how long the tab was open.
        </p>
        <Table
          head={["Name", "Email", "Stopped at", "Status", "Started", "Last seen"]}
          empty="Nobody has dropped off."
          rows={data.dropoffs.map((d) => [
            d.full_name ?? <Muted>not set</Muted>,
            <span key="e" className="font-mono text-[11.5px]">{d.email}</span>,
            <span key="t" className="font-mono text-[12px] text-warn-500">
              {clock(d.elapsed_seconds)}
            </span>,
            d.status,
            when(d.started_at),
            when(d.last_touched),
          ])}
        />
      </section>

      {/* ── Waitlist ───────────────────────────────────────────────────── */}
      <section>
        <SectionTitle count={data.waitlist.length}>Waitlist</SectionTitle>
        <Table
          head={["Email", "Name", "List", "Joined"]}
          empty="Nobody has joined yet."
          rows={data.waitlist.map((w) => [
            <span key="e" className="font-mono text-[11.5px]">{w.email}</span>,
            w.full_name ?? <Muted>not set</Muted>,
            w.topic,
            when(w.created_at),
          ])}
        />
      </section>
    </div>
  );
}

/* ── Pieces ───────────────────────────────────────────────────────────── */

function SectionTitle({
  children,
  count,
}: {
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-lo uppercase">
      {children}
      {count !== undefined ? (
        <span className="rounded-full border border-line-strong px-1.5 py-px text-[10px] tracking-normal text-mid">
          {count}
        </span>
      ) : null}
    </h2>
  );
}

const TONE = {
  neutral: "text-hi",
  ember: "text-ember-400",
  ion: "text-ion-400",
  warn: "text-warn-500",
  flux: "text-flux-400",
} as const;

function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: keyof typeof TONE;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <p className="text-[10.5px] leading-[1.35] font-medium tracking-[0.1em] text-lo uppercase">
        {label}
      </p>
      <p
        data-readout
        className={cn(
          "mt-2.5 text-[26px] leading-[1.15] font-semibold tracking-[-0.035em] tabular-nums",
          TONE[tone],
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11.5px] leading-snug text-lo">{hint}</p> : null}
    </div>
  );
}

function DailyChart({ daily }: { daily: AdminSnapshot["daily"] }) {
  const peak = Math.max(1, ...daily.map((d) => d.signups));

  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <div className="flex h-28 items-end gap-[3px]">
        {/*
          The height goes on the flex item itself. Wrapping it meant the
          percentage resolved against a content-sized parent — which under
          `items-end` is zero, so every bar was zero.
        */}
        {daily.map((d) => (
          <div
            key={d.day}
            title={`${d.day}: ${d.signups} signup${d.signups === 1 ? "" : "s"}`}
            className={cn(
              "flex-1 rounded-sm transition-colors",
              d.signups > 0 ? "bg-ember-500/70" : "bg-white/[0.06]",
            )}
            style={{ height: `${Math.max(2, (d.signups / peak) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10.5px] text-faint">
        <span>{daily[0]?.day ?? ""}</span>
        <span>peak {peak}</span>
        <span>{daily[daily.length - 1]?.day ?? ""}</span>
      </div>
    </div>
  );
}

/** Checks the Google Sheet copy end to end and says what to fix. */
function SheetTest() {
  const [result, setResult] = React.useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = React.useTransition();

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              setResult(await testSheetConnection());
            } catch {
              setResult({ ok: false, message: "The test could not run. Reload the page and try again." });
            }
          })
        }
        className="inline-flex h-8 items-center rounded-full border border-line-strong px-3 text-[12px] font-semibold text-mid transition-colors hover:border-ember-500/50 hover:text-hi disabled:opacity-50"
      >
        {pending ? "Testing…" : "Test Google Sheet"}
      </button>
      {result ? (
        <p role="status" className={cn("text-[12.5px]", result.ok ? "text-ion-400" : "text-alert-500")}>
          {result.message}
        </p>
      ) : null}
    </div>
  );
}

function AmaControl({ registration }: { registration: AdminRegistration }) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const attended = Boolean(registration.ama_attended_at);

  const toggle = () => {
    if (attended && !window.confirm(`Clear AMA attendance for ${registration.email}?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await setAmaAttended(registration.id, !attended);
      if (!result.ok) {
        setError(result.message ?? "Could not save.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-snapshot"] });
    });
  };

  return (
    <div className="flex min-w-[130px] flex-col items-start gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={attended}
        aria-label={`${registration.email} attended the AMA`}
        onClick={toggle}
        disabled={pending}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors disabled:opacity-50",
          attended
            ? "border-ion-500/30 bg-ion-500/10 text-ion-400"
            : "border-line-strong text-mid hover:border-ember-500/50 hover:text-hi",
        )}
      >
        {pending ? "Saving…" : attended ? "Attended" : "Mark attended"}
      </button>
      {error ? <span className="text-[11.5px] text-alert-500">{error}</span> : null}
    </div>
  );
}

function PaidControl({ registration }: { registration: AdminRegistration }) {
  const queryClient = useQueryClient();
  const [ref, setRef] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const save = (paid: boolean) => {
    if (!paid && !window.confirm(`Mark ${registration.email} as unpaid? They will lose access.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await setRegistrationPaid(registration.id, paid, ref);
      if (!result.ok) {
        setError(result.message ?? "Could not save.");
        return;
      }
      setRef("");
      await queryClient.invalidateQueries({ queryKey: ["admin-snapshot"] });
    });
  };

  if (registration.paid_at) {
    return (
      <div className="flex min-w-[180px] flex-wrap items-center gap-2">
        <span className="rounded-full border border-ion-500/30 bg-ion-500/10 px-2 py-0.5 text-[11px] font-medium text-ion-400">
          Paid {when(registration.paid_at)}
        </span>
        {registration.payment_ref ? (
          <span className="font-mono text-[11px] text-lo">{registration.payment_ref}</span>
        ) : null}
        <button
          type="button"
          onClick={() => save(false)}
          disabled={pending}
          className="text-[11.5px] text-faint underline-offset-4 hover:text-mid hover:underline disabled:opacity-50"
        >
          {pending ? "Saving…" : "Undo"}
        </button>
        {error ? <span className="text-[11.5px] text-alert-500">{error}</span> : null}
      </div>
    );
  }

  return (
    <form
      className="flex min-w-[240px] flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        save(true);
      }}
    >
      <input
        value={ref}
        onChange={(event) => setRef(event.target.value)}
        maxLength={64}
        placeholder="Payment ID (optional)"
        aria-label={`Razorpay payment ID for ${registration.email}`}
        className="h-8 w-40 rounded-md border border-line-strong bg-white/[0.03] px-2 font-mono text-[11.5px] text-hi outline-none placeholder:text-faint focus:border-ember-500/60"
      />
      <button
        type="submit"
        disabled={pending}
        className="h-8 rounded-full bg-ember-500 px-3 text-[12px] font-semibold text-void hover:brightness-105 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Mark paid"}
      </button>
      {error ? <span className="w-full text-[11.5px] text-alert-500">{error}</span> : null}
    </form>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-faint">{children}</span>;
}

function Table({
  head,
  rows,
  rowKeys,
  empty,
}: {
  head: string[];
  rows: React.ReactNode[][];
  /** Stable row identities, for rows that hold their own state. */
  rowKeys?: string[];
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-line bg-surface p-6 text-center text-[12.5px] text-lo">
        {empty}
      </div>
    );
  }

  return (
    // Wide tables scroll inside their own box; the page never scrolls sideways.
    <div className="overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line">
            {head.map((cell) => (
              <th
                key={cell}
                className="px-3 py-2.5 text-[10.5px] font-medium tracking-[0.1em] text-lo uppercase"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={rowKeys?.[index] ?? index}
              className="border-b border-line last:border-0 hover:bg-white/[0.02]"
            >
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2.5 text-[12.5px] text-mid">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-40" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-card" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-card" />
    </div>
  );
}
