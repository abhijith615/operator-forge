import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Trophy } from "lucide-react";

import { LandingNav } from "@/components/landing/landing-nav";
import { Footer } from "@/components/landing/footer";
import { Container, Section, SectionHeading } from "@/components/landing/section";
import { Button } from "@/components/ui/button";
import { getOperator } from "@/lib/auth/session";
import { readLeaderboard, readStanding } from "@/lib/challenge/runs";
import { LOGIN_ROUTE } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Challenge Leaderboard",
  robots: { index: false, follow: false },
};

/** Live standings — never cached. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ChallengeLeaderboardPage() {
  const operator = await getOperator();
  if (!operator) redirect(`${LOGIN_ROUTE}?next=%2Fchallenge%2Fleaderboard`);

  const [rows, standing] = await Promise.all([readLeaderboard(1, 50), readStanding(1)]);

  return (
    <>
      <LandingNav />
      <main id="main" className="relative overflow-x-clip">
        <Section className="pt-32 sm:pt-40">
          <Container className="max-w-3xl">
            <SectionHeading
              eyebrow="Day 1 · The 180-Second Shift"
              title="Where the cohort stands."
              description="Every operator who has finished Day 1, ranked by Operational Readiness. Ties break towards whoever got there first."
            />

            {standing ? (
              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 rounded-card border border-ember-500/30 bg-elevated p-5">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.16em] text-lo uppercase">
                    Your rank
                  </p>
                  <p
                    data-readout
                    className="mt-1.5 text-[30px] leading-none font-semibold text-hi tabular-nums"
                  >
                    {standing.rank}
                    <span className="text-[15px] text-lo"> of {standing.total}</span>
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-[0.16em] text-lo uppercase">
                    Your score
                  </p>
                  <p
                    data-readout
                    className="mt-1.5 text-[30px] leading-none font-semibold text-ember-400 tabular-nums"
                  >
                    {standing.score}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-10 rounded-card border border-line border-dashed bg-surface p-6 text-center">
                <p className="text-[13.5px] text-mid">
                  You haven&rsquo;t finished Day 1 yet. Fifteen minutes is all it takes.
                </p>
                <Button asChild variant="primary" size="md" className="mt-4">
                  <Link href="/challenge/day-1">
                    Run the shift
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            )}

            {rows.length === 0 ? (
              <p className="mt-8 rounded-card border border-line bg-surface p-6 text-center text-[13px] text-lo">
                Nobody has completed Day 1 yet. The board fills as the cohort runs it.
              </p>
            ) : (
              <div className="mt-8 overflow-hidden rounded-card border border-line bg-surface">
                <table className="w-full border-collapse text-left">
                  <caption className="sr-only">
                    Day 1 leaderboard, ranked by Operational Readiness score
                  </caption>
                  <thead>
                    <tr className="border-b border-line">
                      {["#", "Operator", "Signature", "Score"].map((head, index) => (
                        <th
                          key={head}
                          scope="col"
                          className={cn(
                            "px-4 py-3 text-[10px] font-medium tracking-[0.1em] text-lo uppercase",
                            index === 3 && "text-right",
                            index === 2 && "hidden sm:table-cell",
                          )}
                        >
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={`${row.rank}-${row.display_name}-${row.completed_at}`}
                        className={cn(
                          "border-b border-line last:border-0",
                          row.is_you && "bg-ember-500/[0.07]",
                        )}
                      >
                        <td className="px-4 py-3">
                          <span
                            data-readout
                            className={cn(
                              "font-mono text-[13px] tabular-nums",
                              row.rank <= 3 ? "font-semibold text-ember-400" : "text-lo",
                            )}
                          >
                            {row.rank}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[13.5px] text-hi">{row.display_name}</span>
                          {row.is_you ? (
                            <span className="ml-2 rounded-full border border-ember-500/40 px-1.5 py-0.5 font-mono text-[9.5px] tracking-[0.1em] text-ember-400 uppercase">
                              You
                            </span>
                          ) : null}
                          <span className="mt-0.5 block text-[11.5px] text-lo sm:hidden">
                            {row.signature}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 text-[12.5px] text-mid sm:table-cell">
                          {row.signature}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            data-readout
                            className="font-mono text-[15px] font-semibold text-hi tabular-nums"
                          >
                            {row.score}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-lo">{row.band}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="mt-6 flex items-center gap-2 text-[12px] leading-relaxed text-faint">
              <Trophy className="size-3.5 shrink-0" aria-hidden />
              Names are shortened to a first name and an initial. Nobody can see
              anyone else&rsquo;s email, phone number or decision record — only
              what is on this board.
            </p>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  );
}
