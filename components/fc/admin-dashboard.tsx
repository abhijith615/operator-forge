import Link from "next/link";
import { ArrowUpRight, Download } from "lucide-react";

import { buildFcDashboard, FC_INDICATIONS, type FcAttemptSummary, type FcDashboardData } from "@/lib/fc/dashboard";
import { readFcAttempts } from "@/lib/fc/server";
import { formatWhatsapp, whatsappLink } from "@/lib/hiring/phone";
import { cn } from "@/lib/utils";

/**
 * The FC Executive section of the admin panel.
 *
 * Rendered on the server, on its own, from the FC test's own reads and
 * scoring. It shares nothing with the challenge panels or the store-manager
 * Hiring Test above it but the page.
 */
export async function FcAdminDashboard() {
  const data = buildFcDashboard(await readFcAttempts());
  return <FcAdminDashboardView data={data} />;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

const SHORT: Record<string, string> = Object.fromEntries(FC_INDICATIONS.map((entry) => [entry.key, entry.label.split(" · ")[0]!]));

const INDICATION_TONE: Record<string, string> = {
  STRONG: "border-ion-500/30 bg-ion-500/10 text-ion-400",
  PROMISING: "border-ember-500/30 bg-ember-500/10 text-ember-400",
  MIXED: "border-warn-500/30 bg-warn-500/10 text-warn-500",
  ADDITIONAL: "border-line-strong text-mid",
};

const pill =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-3.5 text-[12.5px] font-semibold text-mid transition-colors hover:border-ember-500/50 hover:text-hi";

function Stat({ label, value, hint, tone }: { label: string; value: number | string; hint?: string; tone?: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <p className="text-[10.5px] leading-[1.35] font-medium tracking-[0.1em] text-lo uppercase">{label}</p>
      <p data-readout className={cn("mt-2.5 text-[26px] leading-[1.15] font-semibold tracking-[-0.035em] tabular-nums", tone ?? "text-hi")}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11.5px] leading-snug text-lo">{hint}</p> : null}
    </div>
  );
}

function SubTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-lo uppercase">
      {children}
      {count !== undefined ? (
        <span className="rounded-full border border-line-strong px-1.5 py-px text-[10px] tracking-normal text-mid">{count}</span>
      ) : null}
    </h3>
  );
}

function Bar({ label, value }: { label: string; value: number | null }) {
  return (
    <li className="flex items-center gap-3">
      <span className="w-52 shrink-0 text-[12.5px] text-mid">{label}</span>
      <span className="h-2 flex-1 rounded-full bg-white/[0.06]">
        {value !== null ? <span className="block h-full rounded-full bg-ember-500/70" style={{ width: `${Math.max(2, value)}%` }} /> : null}
      </span>
      <span className="w-10 shrink-0 text-right text-[12.5px] tabular-nums text-hi">{value ?? "—"}</span>
    </li>
  );
}

function Result({ attempt }: { attempt: FcAttemptSummary }) {
  if (attempt.state === "in_progress") return <span className="text-faint">In progress</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", INDICATION_TONE[attempt.indication ?? "ADDITIONAL"])}>
        {SHORT[attempt.indication ?? "ADDITIONAL"]}
      </span>
      {attempt.state === "not_completed" ? (
        <span className="text-[11.5px] text-lo">
          not finished · {attempt.observed} of {attempt.opportunities} moments · {attempt.reached} on those
        </span>
      ) : null}
    </span>
  );
}

export function FcAdminDashboardView({ data }: { data: FcDashboardData }) {
  const t = data.totals;

  return (
    <section id="fc-executive" aria-labelledby="fc-executive-title" className="scroll-mt-20">
      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line pt-8">
        <div className="min-w-0">
          <h2 id="fc-executive-title" className="text-[20px] leading-tight font-semibold tracking-[-0.02em] text-hi">
            Hiring Test · FC Executive
          </h2>
          <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-lo">
            The 30-minute inbound-shift simulation for FC Executive candidates, version {data.version}. Test link for candidates:{" "}
            <span className="font-mono text-mid">operatorforge.in/hiring-test/fc-executive</span>. One row per attempt. Read when this
            page loaded; reload for the latest.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/hiring-test/fc-executive/results/export" download className={pill}>
            <Download className="size-3.5" aria-hidden />
            Item-level data (Excel)
          </a>
          <Link href="/hiring-test/fc-executive/results" className={pill}>
            Every attempt
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Candidates" value={t.candidates} hint="attempts started" />
        <Stat label="Finished" value={t.finished} tone="text-ion-400" hint={`${t.completed} completed the shift`} />
        <Stat label="Did not finish" value={t.notCompleted} tone={t.notCompleted ? "text-warn-500" : undefined} hint="unreached moments count as zero" />
        <Stat label="In progress" value={t.inProgress} hint="inside their time now" />
        <Stat label="Average score" value={t.average ?? "—"} tone="text-ember-400" hint="completed shifts, out of 100" />
        <Stat label="With flags" value={t.flagged} tone={t.flagged ? "text-alert-500" : undefined} hint="for a person to review" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div>
          <SubTitle>Hiring indication</SubTitle>
          <ul className="space-y-2 rounded-card border border-line bg-surface p-4">
            {data.indications.map((entry) => (
              <li key={entry.key} className="flex items-center justify-between gap-3">
                <span className="text-[12.5px] text-mid">{entry.label}</span>
                <span className="text-[14px] font-semibold tabular-nums text-hi">{entry.count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <SubTitle>Average by competency</SubTitle>
          <ul className="space-y-2.5 rounded-card border border-line bg-surface p-4">
            {data.competencies.map((entry) => (
              <Bar key={entry.id} label={entry.label} value={entry.average} />
            ))}
          </ul>
        </div>
      </div>
      {t.completed === 0 ? (
        <p className="mt-3 text-[12.5px] text-lo">No candidate has completed version {data.version} yet, so there is nothing to average.</p>
      ) : null}

      <div className="mt-6">
        <SubTitle count={data.attempts.length}>Candidates</SubTitle>
        {data.attempts.length === 0 ? (
          <div className="rounded-card border border-line bg-surface p-6 text-center text-[12.5px] text-lo">
            Nobody has sat version {data.version} of the FC Executive test yet.
          </div>
        ) : (
          // Wide tables scroll inside their own box; the page never scrolls sideways.
          <div className="overflow-x-auto rounded-card border border-line bg-surface">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  {["Candidate", "Sat", "Device", "Result", "Score", "Flags", ""].map((cell) => (
                    <th key={cell} className="px-3 py-2.5 text-[10.5px] font-medium tracking-[0.1em] text-lo uppercase">
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.attempts.map((row) => (
                  <tr key={row.id} className="border-b border-line last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3 py-2.5 text-[12.5px] text-mid">
                      <span className="text-[13px] font-medium text-hi">{row.name}</span>
                      {row.phone ? (
                        <a
                          href={whatsappLink(row.phone) ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-0.5 block font-mono text-[11.5px] whitespace-nowrap text-lo underline-offset-4 hover:text-hi hover:underline"
                          aria-label={`WhatsApp ${row.name} on ${formatWhatsapp(row.phone)}`}
                        >
                          {formatWhatsapp(row.phone)}
                        </a>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-[12.5px] whitespace-nowrap text-mid">{when(row.startedAt)}</td>
                    <td className="px-3 py-2.5 text-[12.5px] text-mid">{row.device ?? <span className="text-faint">—</span>}</td>
                    <td className="px-3 py-2.5 text-[12.5px] text-mid">
                      <Result attempt={row} />
                    </td>
                    <td className="px-3 py-2.5 text-[15px] font-semibold tabular-nums text-hi">{row.score ?? <span className="text-faint">—</span>}</td>
                    <td className="px-3 py-2.5 text-[12.5px] text-mid">
                      {row.flags ? (
                        <span className="rounded-full border border-alert-500/40 px-2 py-0.5 text-[11px] font-medium text-alert-500">{row.flags}</span>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[12.5px]">
                      {row.state === "in_progress" ? null : (
                        <span className="inline-flex items-center gap-3 whitespace-nowrap">
                          <Link
                            href={`/hiring-test/fc-executive/results/${row.id}`}
                            className="inline-flex items-center gap-1 font-semibold text-ember-400 underline-offset-4 hover:underline"
                          >
                            Profile
                            <ArrowUpRight className="size-3.5" aria-hidden />
                          </Link>
                          <a
                            href={`/hiring-test/fc-executive/results/${row.id}/pdf`}
                            download
                            aria-label={`Download the 2-page PDF for ${row.name}`}
                            className="inline-flex items-center gap-1 font-semibold text-mid underline-offset-4 hover:text-hi hover:underline"
                          >
                            PDF
                            <Download className="size-3.5" aria-hidden />
                          </a>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-[11.5px] leading-relaxed text-lo">
          Candidates start with a name and a WhatsApp number and no sign-in: neither is verified, and two rows with the same name may be one
          person. An attempt left open past its 30 minutes is scored, with what was not reached counting as zero.
          {data.earlier > 0
            ? ` ${data.earlier} attempt${data.earlier === 1 ? " was" : "s were"} sat on an earlier version of the simulation and ${data.earlier === 1 ? "is" : "are"} not counted here.`
            : ""}
        </p>
      </div>
    </section>
  );
}
