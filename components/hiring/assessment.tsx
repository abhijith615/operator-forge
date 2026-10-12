"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { Input } from "@/components/ui/input";
import { idleFormState } from "@/lib/auth/form-state";
import {
  completeAssessment,
  sendHiringLink,
  startAssessment,
  switchHiringAccount,
  type StartedAttempt,
} from "@/lib/hiring/actions";
import { CONSENT_VERSION, DATA_NOTICE, HIRING_CONTACT, POSITIONING } from "@/lib/hiring/content";
import type { CandidateProfile as Profile } from "@/lib/hiring/server";
import { deviceType } from "@/lib/hiring/view";
import { ASSESSMENT_SECONDS } from "@/lib/hiring/weights";
import { useHiringStore, type Attempt } from "@/stores/hiring-store";

import { CandidateProfile } from "./candidate-profile";
import { Simulation } from "./simulation";
import { PrimaryButton, QuietButton } from "./ui";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-void text-hi">
      <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-[13.5px] font-semibold tracking-[0.16em] text-hi">
            OPERATOR<span className="text-lo"> FORGE</span>
          </span>
        </div>
        {children}
      </main>
    </div>
  );
}

/* ── The way in ───────────────────────────────────────────────────────── */

/** OPERATOR FORGE · HIRING TEST · an email address. Nothing else is asked. */
export function CandidateEntry({ error }: { error?: string }) {
  const [state, action, pending] = useActionState(sendHiringLink, idleFormState);

  return (
    <Frame>
      <p className="mt-10 font-mono text-[12px] tracking-[0.22em] text-ember-500 uppercase">Hiring Test</p>
      <h1 className="mt-2 text-[30px] leading-[1.05] font-bold tracking-[-0.035em] text-hi">Dark Store Manager Simulation</h1>
      <p className="mt-3 text-[14.5px] leading-relaxed text-mid">Enter your email address. We will send a link to sign you in, and your result is recorded against it.</p>

      {state.status === "success" ? (
        <div className="mt-7 rounded-[16px] border border-ion-500/35 bg-ion-500/[0.07] p-4" role="status">
          <p className="text-[15px] font-semibold text-hi">Check your inbox.</p>
          <p className="mt-1 text-[14px] leading-snug text-mid">{state.message}</p>
        </div>
      ) : (
        <form action={action} className="mt-7 space-y-3" noValidate>
          <label htmlFor="hiring-email" className="block text-[13px] font-medium text-mid">
            Email address
          </label>
          <Input
            id="hiring-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            placeholder="you@example.com"
            adornment={<Mail />}
            invalid={Boolean(state.fieldErrors?.email)}
            aria-describedby={state.status === "error" ? "hiring-email-error" : undefined}
          />
          {state.status === "error" || error ? (
            <p id="hiring-email-error" role="alert" className="text-[13px] text-alert-500">
              {state.fieldErrors?.email ?? (state.message || error)}
            </p>
          ) : null}
          <PrimaryButton type="submit" disabled={pending} className="sm:w-full">
            {pending ? "Sending…" : "Continue"}
            <ArrowRight className="size-4" aria-hidden />
          </PrimaryButton>
        </form>
      )}
    </Frame>
  );
}

/* ── Before the shift ─────────────────────────────────────────────────── */

/** "30 minutes", "37 minutes 30 seconds". */
function spoken(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes} minutes${rest ? ` ${rest} seconds` : ""}`;
}

/**
 * The last screen before the clock starts.
 *
 * What the shift is, how long the candidate has, what is recorded about them
 * and who sees it — and a box to tick. Start Shift does nothing until it is
 * ticked, and the server will not start an attempt without it either.
 */
function Positioning({
  email,
  limit,
  starting,
  onStart,
  failed,
}: {
  email: string;
  limit: number;
  starting: boolean;
  onStart: () => void;
  failed: boolean;
}) {
  const [agreed, setAgreed] = React.useState(false);
  const extra = limit - ASSESSMENT_SECONDS;

  return (
    <Frame>
      <p className="mt-10 font-mono text-[12px] tracking-[0.22em] text-ember-500 uppercase">Hiring Test</p>
      <h1 className="mt-2 text-[28px] leading-[1.06] font-bold tracking-[-0.035em] text-hi uppercase">30-minute dark store manager simulation</h1>

      <ul className="mt-6 space-y-3">
        {POSITIONING.map((line) => (
          <li key={line} className="flex gap-3 text-[15px] leading-snug text-hi">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-ember-500" />
            {line}
          </li>
        ))}
      </ul>

      <p className="mt-6 rounded-[14px] border border-line-strong bg-white/[0.03] px-3.5 py-3 text-[13px] leading-snug text-mid">
        You have <span className="font-semibold text-hi">{spoken(limit)}</span>
        {extra > 0 ? " — that includes the extra time arranged for you" : ""}. The time starts when you press Start
        Shift and does not pause. You have one attempt. If the page reloads or your connection drops, you come back
        to where you were. The bar at the top shows the six parts of the shift: yellow is where you are, and the
        white mark is where the time is.
      </p>

      <p className="mt-3 text-[13px] leading-snug text-lo">
        Need extra time or another adjustment because of a disability or a health condition? Write to{" "}
        <a href={`mailto:${HIRING_CONTACT}?subject=Hiring%20Test%20%E2%80%94%20adjustment`} className="text-mid underline underline-offset-4 hover:text-hi">
          {HIRING_CONTACT}
        </a>{" "}
        before you start. It is arranged in advance and is not shown on your result.
      </p>

      <section aria-labelledby="hiring-notice" className="mt-6 rounded-[16px] border border-line-strong bg-surface p-4">
        <h2 id="hiring-notice" className="font-mono text-[11.5px] tracking-[0.18em] text-lo uppercase">
          Your data
        </h2>
        <dl className="mt-3 space-y-3">
          {DATA_NOTICE.map((item) => (
            <div key={item.title}>
              <dt className="text-[13.5px] font-semibold text-hi">{item.title}</dt>
              <dd className="mt-0.5 text-[13px] leading-snug text-mid">{item.text}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[13px] leading-snug text-mid">
          Contact:{" "}
          <a href={`mailto:${HIRING_CONTACT}`} className="text-hi underline underline-offset-4">
            {HIRING_CONTACT}
          </a>
          . More in the{" "}
          <a href="/privacy" target="_blank" rel="noreferrer" className="text-hi underline underline-offset-4">
            privacy policy
          </a>
          .
        </p>

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-[12px] border border-line-strong bg-white/[0.03] p-3">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-[#f5c400]"
          />
          <span className="text-[13.5px] leading-snug text-hi">
            I have read this, and I agree to take the assessment and to my data being used as described.
          </span>
        </label>
      </section>

      {failed ? (
        <p role="alert" className="mt-3 text-[13px] text-alert-500">
          The shift could not be started. Check your connection and try again.
        </p>
      ) : null}

      <PrimaryButton className="mt-6 sm:w-full" disabled={starting || !agreed} onClick={onStart}>
        {starting ? "Opening the store…" : "Start shift"}
      </PrimaryButton>
      {!agreed ? <p className="mt-2 text-center text-[12.5px] text-lo">Tick the box above to start.</p> : null}

      <form action={switchHiringAccount} className="mt-5 text-center text-[13px] text-lo">
        Signed in as <span className="break-all text-mid">{email}</span>.{" "}
        <button type="submit" className="text-mid underline underline-offset-4 hover:text-hi">
          Use a different email
        </button>
      </form>
    </Frame>
  );
}

/* ── The attempt, start to finish ─────────────────────────────────────── */

const toAttempt = (started: StartedAttempt): Attempt => ({
  id: started.id,
  form: started.form,
  startedAt: started.startedAt,
  skew: started.serverNow - Date.now(),
  limit: started.limit,
  local: false,
});

/**
 * Positioning → the shift → the candidate's profile.
 *
 * The server decides which of the three this is on arrival: nothing started,
 * an attempt under way (resume it), or one already finished (show the
 * profile). Refreshing never restarts anything.
 */
export function HiringAssessment({
  email,
  initial,
  profile: finished,
  limit,
}: {
  email: string;
  initial: StartedAttempt | null;
  profile: Profile | null;
  /** Seconds this candidate will be given if they start now. */
  limit: number;
}) {
  const router = useRouter();
  const [phase, setPhase] = React.useState<"loading" | "ready" | "running" | "saving" | "stuck" | "finished">(
    finished ? "finished" : "loading",
  );
  const [profile, setProfile] = React.useState<Profile | null>(finished);
  const [starting, setStarting] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const attempt = useHiringStore((store) => store.attempt);

  React.useEffect(() => {
    if (finished) {
      useHiringStore.getState().reset();
      return;
    }
    if (initial?.status === "in_progress") {
      const store = useHiringStore.getState();
      store.begin(toAttempt(initial), initial.actions);
      if (initial.actions.length || store.actions.length) useHiringStore.getState().note("resume");
      setPhase("running");
    } else {
      setPhase("ready");
    }
  }, [initial, finished]);

  const start = async () => {
    setStarting(true);
    setFailed(false);
    try {
      // Reaching here means the box was ticked: the button is dead until it is.
      const started = await startAssessment(deviceType(), true);
      if (!started) {
        setFailed(true);
      } else if (started.status === "in_progress") {
        const store = useHiringStore.getState();
        store.begin(toAttempt(started), started.actions);
        // Kept with the attempt's own record of events, as well as on the attempt.
        if (started.actions.length === 0) useHiringStore.getState().note("consent", { version: CONSENT_VERSION });
        setPhase("running");
      } else {
        // Already sat. The server has the profile.
        router.refresh();
      }
    } catch {
      setFailed(true);
    } finally {
      setStarting(false);
    }
  };

  const finish = React.useCallback(async () => {
    const held = useHiringStore.getState();
    if (!held.attempt) return;
    setPhase("saving");
    try {
      const result = await completeAssessment(held.attempt.id, held.actions);
      if (!result) {
        setPhase("stuck");
        return;
      }
      setProfile(result);
      held.reset();
      setPhase("finished");
      window.scrollTo({ top: 0 });
    } catch {
      setPhase("stuck");
    }
  }, []);

  if (phase === "finished" && profile) return <CandidateProfile profile={profile} email={email} />;
  if (phase === "running" && attempt) return <Simulation attempt={attempt} onFinished={finish} />;
  if (phase === "ready") return <Positioning email={email} limit={limit} starting={starting} onStart={start} failed={failed} />;

  return (
    <Frame>
      <div className="mt-10" role="status">
        {phase === "stuck" ? (
          <>
            <h1 className="text-[24px] leading-tight font-bold tracking-[-0.03em] text-hi">Your shift is finished, and not yet saved.</h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-mid">
              Your decisions are held on this device. Check your connection and try again — nothing will be lost.
            </p>
            <QuietButton className="mt-5 sm:w-full" onClick={finish}>
              Try again
            </QuietButton>
          </>
        ) : (
          <p className="text-[15px] text-mid">{phase === "saving" ? "Closing the shift…" : "Opening the store…"}</p>
        )}
      </div>
    </Frame>
  );
}
