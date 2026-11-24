import type { Metadata } from "next";

import {
  ChallengeAlreadyTaken,
  ChallengeDetailsForm,
  ChallengeSignIn,
  OperatorChallenge,
} from "@/components/operator-challenge/challenge";
import { isAdmin } from "@/lib/admin/queries";
import { getOperator } from "@/lib/auth/session";
import type { StartedAttempt } from "@/lib/hiring/actions";
import { readTimeLimit } from "@/lib/hiring/server";
import { ASSESSMENT_SECONDS } from "@/lib/hiring/weights";
import { CHALLENGE_INTRO, CHALLENGE_NAME } from "@/lib/operator-challenge/content";
import { readChallengeAttempt, readChallengeDetails, scoreChallenge } from "@/lib/operator-challenge/server";

export const metadata: Metadata = {
  title: { absolute: `${CHALLENGE_NAME} · Operator Forge` },
  description: CHALLENGE_INTRO.lede,
  alternates: { canonical: "/operator-challenge" },
  openGraph: { title: CHALLENGE_INTRO.title, description: CHALLENGE_INTRO.lede, url: "/operator-challenge", type: "website" },
};

export const dynamic = "force-dynamic";

/**
 * The Startup Operator Challenge.
 *
 * Signed out: what it is, and Continue with Google. Signed in without
 * details: the details form. With details and nothing started: the briefing.
 * Mid-shift: straight back in. Finished: the scorecard. Which of those it is
 * gets decided here, from the database, so reloading never restarts anything.
 *
 * One try per Google account. An admin can take it again from their own
 * scorecard (`?again=1`); the database refuses a second attempt to anybody
 * else whatever the URL says.
 */
export default async function OperatorChallengePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; again?: string; edit?: string }>;
}) {
  const query = await searchParams;
  const operator = await getOperator();
  if (!operator) return <ChallengeSignIn error={query.error} />;

  const [details, attempt, admin] = await Promise.all([readChallengeDetails(), readChallengeAttempt(), isAdmin()]);
  const email = operator.email;
  const name = details?.fullName ?? operator.fullName ?? "";

  if (attempt?.retired) return <ChallengeAlreadyTaken email={email} />;

  if (attempt && attempt.status !== "in_progress") {
    if (admin && query.again === "1") {
      return <OperatorChallenge email={email} name={name} initial={null} scorecard={null} limit={await readTimeLimit()} canRetake />;
    }
    const { scorecard } = scoreChallenge(attempt.scenario_variant, attempt.actions);
    return <OperatorChallenge email={email} name={name} initial={null} scorecard={scorecard} limit={ASSESSMENT_SECONDS} canRetake={admin} />;
  }

  // Details come first, and can be corrected until the shift starts.
  if (!attempt && (!details || query.edit === "1")) {
    return <ChallengeDetailsForm email={email} initial={details ?? { fullName: operator.fullName }} />;
  }

  const initial: StartedAttempt | null = attempt
    ? {
        id: attempt.id,
        form: attempt.scenario_variant,
        status: attempt.status,
        startedAt: Date.parse(attempt.started_at),
        serverNow: attempt.server_now ? Date.parse(attempt.server_now) : Date.now(),
        limit: attempt.time_limit_seconds ?? ASSESSMENT_SECONDS,
        actions: attempt.actions,
      }
    : null;
  const limit = initial ? initial.limit : await readTimeLimit();

  return <OperatorChallenge email={email} name={name} initial={initial} scorecard={null} limit={limit} canRetake={admin} />;
}
