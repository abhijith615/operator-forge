import { Download } from "lucide-react";

import { formatWhatsapp, whatsappLink } from "@/lib/hiring/phone";
import { levelLabel, readChallengeRows, type ChallengeAdminRow } from "@/lib/operator-challenge/server";
import { cn } from "@/lib/utils";

/**
 * The Startup Operator Challenge section of the admin panel.
 *
 * Everybody who saved their details, with their attempt if they started one.
 * Read on the server from its own database function, and scored by the
 * Hiring Test's scorer from the saved actions. It shares nothing with the
 * Hiring Test's own section but the page.
 */
export async function OperatorChallengeAdmin() {
  const rows = await readChallengeRows();
  return <OperatorChallengeAdminView rows={rows} />;
}

const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })
    : "—";

const STATUS: Record<ChallengeAdminRow["status"], { label: string; tone: string }> = {
  registered: { label: "Not started", tone: "border-line-strong text-lo" },
  in_progress: { label: "In progress", tone: "border-ion-500/30 bg-ion-500/10 text-ion-400" },
  completed: { label: "Finished", tone: "border-ember-500/30 bg-ember-500/10 text-ember-400" },
  expired: { label: "Out of time", tone: "border-warn-500/30 bg-warn-500/10 text-warn-500" },
};

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <p className="text-[10.5px] leading-[1.35] font-medium tracking-[0.1em] text-lo uppercase">{label}</p>
      <p className="mt-2.5 text-[26px] leading-[1.15] font-semibold tracking-[-0.035em] text-hi tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-[11.5px] leading-snug text-lo">{hint}</p> : null}
    </div>
  );
}

export function OperatorChallengeAdminView({ rows }: { rows: ChallengeAdminRow[] | null }) {
  const list = rows ?? [];
  const started = list.filter((row) => row.status !== "registered");
  const scored = list.filter((row) => row.scorecard);
  const average = scored.length ? Math.round(scored.reduce((sum, row) => sum + row.scorecard!.overall, 0) / scored.length) : null;
  const strong = scored.filter((row) => row.scorecard!.level >= 2).length;

  return (
    <section id="operator-challenge" aria-labelledby="operator-challenge-title" className="mt-12 scroll-mt-20 border-t border-line pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-[0.16em] text-lo uppercase">Startup Operator Challenge</p>
          <h2 id="operator-challenge-title" className="mt-1 text-[20px] leading-tight font-semibold tracking-[-0.02em] text-hi">
            Participants
          </h2>
          <p className="mt-1 text-[12.5px] text-lo">
            Signed in with Google at{" "}
            <a href="/operator-challenge" className="text-mid underline underline-offset-4 hover:text-hi">
              /operator-challenge
            </a>
            . The store-manager simulation, scored the same way. Not part of the Hiring Test numbers above.
          </p>
        </div>
        <a
          href="/operator-challenge/results/export"
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-3.5 text-[12.5px] font-semibold text-mid transition-colors hover:border-ember-500/50 hover:text-hi"
        >
          <Download className="size-3.5" aria-hidden />
          Excel
        </a>
      </div>

      {rows === null ? (
        <p className="mt-6 text-[13px] text-lo">The participant list could not be read.</p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Signed up" value={list.length} hint="Saved their details" />
            <Stat label="Started" value={started.length} />
            <Stat label="Scored" value={scored.length} hint="Finished or out of time" />
            <Stat label="Average score" value={average ?? "—"} hint={scored.length ? `${strong} at Strong potential or above` : undefined} />
          </div>

          {list.length === 0 ? (
            <p className="mt-6 text-[13px] text-lo">Nobody has signed up yet.</p>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-card border border-line">
              <table className="w-full min-w-[980px] text-left text-[12.5px]">
                <thead className="bg-surface text-[10.5px] tracking-[0.1em] text-lo uppercase">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 font-medium">Participant</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">WhatsApp</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">City</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Education</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Working</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Score</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Level</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Signed up</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((row) => {
                    const link = whatsappLink(row.phone);
                    const status = STATUS[row.status];
                    return (
                      <tr key={row.userId} className="align-top text-mid">
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-hi">{row.fullName}</p>
                          <p className="break-all text-lo">{row.email}</p>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {link ? (
                            <a href={link} target="_blank" rel="noreferrer" className="text-hi underline underline-offset-4">
                              {formatWhatsapp(row.phone)}
                            </a>
                          ) : (
                            row.phone
                          )}
                        </td>
                        <td className="px-3 py-2.5">{row.city}</td>
                        <td className="px-3 py-2.5">
                          <p className="text-hi">{row.education === "student" ? "Student" : "Graduate"} · {row.gradYear}</p>
                          <p className="text-lo">{row.college}</p>
                        </td>
                        <td className="px-3 py-2.5">{row.working ? "Yes" : "No"}</td>
                        <td className="px-3 py-2.5">
                          <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", status.tone)}>
                            {status.label}
                          </span>
                          {row.earlierVersion ? <p className="mt-1 text-[11px] text-lo">Earlier version</p> : null}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-hi tabular-nums">
                          {row.scorecard ? row.scorecard.overall : "—"}
                          {row.scorecard?.timedOut ? (
                            <p className="text-[11px] font-normal text-lo">
                              {row.scorecard.observed}/{row.scorecard.opportunities} reached
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{row.scorecard ? levelLabel(row.scorecard.level) : "—"}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-lo">{when(row.registeredAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
