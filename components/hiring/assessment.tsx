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
import { POSITIONING } from "@/lib/hiring/content";
import type { CandidateProfile as Profile } from "@/lib/hiring/server";
import { deviceType } from "@/lib/hiring/view";
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

function Positioning({ email, starting, onStart, failed }: { email: string; starting: boolean; onStart: () => void; failed: boolean }) {
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
        The thirty minutes start when you press Start Shift and do not pause. You have one attempt. If the page reloads
        or your connection drops, you come back to where you were. The bar at the top shows the six parts of the
        shift: yellow is where you are, and the white mark is where the time is.
      </p>

      {failed ? (
        <p role="alert" className="mt-3 text-[13px] text-alert-500">
          The shift could not be started. Check your connection and try again.
        </p>
      ) : null}

      <PrimaryButton className="mt-6 sm:w-full" disabled={starting} onClick={onStart}>
        {starting ? "Opening the store…" : "Start shift"}
      </PrimaryButton>

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
}: {
  email: string;
  initial: StartedAttempt | null;
  profile: Profile | null;
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
      const started = await startAssessment(deviceType());
      if (!started) {
        setFailed(true);
      } else if (started.status === "in_progress") {
        useHiringStore.getState().begin(toAttempt(started), started.actions);
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
  if (phase === "ready") return <Positioning email={email} starting={starting} onStart={start} failed={failed} />;

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
