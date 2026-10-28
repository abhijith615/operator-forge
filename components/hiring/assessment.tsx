"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail, Phone, UserRound } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { Input } from "@/components/ui/input";
import { idleFormState } from "@/lib/auth/form-state";
import {
  completeAssessment,
  sendHiringLink,
  startAssessment,
  switchHiringAccount,
  type StartFailure,
  type StartedAttempt,
} from "@/lib/hiring/actions";
import { CONSENT_VERSION, DATA_NOTICE, EXPLAINER_VIDEO, HIRING_CONTACT, POSITIONING } from "@/lib/hiring/content";
import { whatsappNumber } from "@/lib/hiring/phone";
import type { CandidateProfile as Profile } from "@/lib/hiring/server";
import { deviceType } from "@/lib/hiring/view";
import { ASSESSMENT_SECONDS } from "@/lib/hiring/weights";
import { useHiringStore, type Attempt } from "@/stores/hiring-store";

import { CandidateProfile } from "./candidate-profile";
import { HiringExplainerVideo } from "./explainer-video";
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

/**
 * Signing in by email link. Not the way in for a candidate any more — they
 * type a name and start — but still here for an admin, and for anybody who
 * has been asked to sit it under their email address.
 */
export function CandidateEntry({ error }: { error?: string }) {
  const [state, action, pending] = useActionState(sendHiringLink, idleFormState);

  return (
    <Frame>
      <p className="mt-10 font-mono text-[12px] tracking-[0.22em] text-ember-500 uppercase">Hiring Test</p>
      <h1 className="mt-2 text-[30px] leading-[1.05] font-bold tracking-[-0.035em] text-hi">Dark Store Manager Simulation</h1>
      <p className="mt-3 text-[14.5px] leading-relaxed text-mid">Sign in with your email address. We will send a link, and your result is recorded against it.</p>

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
      <p className="mt-6 text-center text-[13px] text-lo">
        <a href="/hiring-test/assessment" className="text-mid underline underline-offset-4 hover:text-hi">
          Start with just your name instead
        </a>
      </p>
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
 *
 * Somebody who is not signed in is asked for their name and WhatsApp number
 * here, and for nothing else: no email, no link to wait for.
 */
function Positioning({
  email,
  name,
  onName,
  phone,
  onPhone,
  limit,
  starting,
  onStart,
  failed,
}: {
  /** Null for somebody who is not signed in, and is starting under a name. */
  email: string | null;
  name: string;
  onName: (name: string) => void;
  phone: string;
  onPhone: (phone: string) => void;
  limit: number;
  starting: boolean;
  onStart: () => void;
  failed: StartFailure | null;
}) {
  const [agreed, setAgreed] = React.useState(false);
  const extra = limit - ASSESSMENT_SECONDS;
  const guest = email === null;
  const named = !guest || name.replace(/\s+/g, " ").trim().length >= 2;
  const reachable = !guest || whatsappNumber(phone) !== null;
  // Only say the number is wrong once it is long enough to be a whole one.
  const phoneWrong = guest && !reachable && phone.replace(/\D/g, "").length >= 10;

  return (
    <Frame>
      <p className="mt-10 font-mono text-[12px] tracking-[0.22em] text-ember-500 uppercase">Hiring Test</p>
      <h1 className="mt-2 text-[28px] leading-[1.06] font-bold tracking-[-0.035em] text-hi uppercase">30-minute dark store manager simulation</h1>

      <section aria-labelledby="hiring-explainer" className="mt-6">
        <h2 id="hiring-explainer" className="font-mono text-[11.5px] tracking-[0.18em] text-lo uppercase">
          Watch this first
        </h2>
        <HiringExplainerVideo id={EXPLAINER_VIDEO.id} title={EXPLAINER_VIDEO.title} className="mt-2" />
        <p className="mt-2 text-[13px] leading-snug text-mid">{EXPLAINER_VIDEO.note}</p>
      </section>

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
        before you start. It is arranged in advance against your email address, you then start by signing in with
        that email, and it is not shown on your result.
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

      {guest ? (
        <div className="mt-6">
          <label htmlFor="hiring-name" className="block text-[13px] font-medium text-mid">
            Your full name
          </label>
          <div className="mt-2">
            <Input
              id="hiring-name"
              name="name"
              type="text"
              autoComplete="name"
              autoCapitalize="words"
              spellCheck={false}
              required
              maxLength={80}
              placeholder="As you want it on your result"
              adornment={<UserRound />}
              value={name}
              onChange={(event) => onName(event.target.value)}
              invalid={failed === "name"}
              aria-describedby="hiring-name-note"
            />
          </div>
          <p id="hiring-name-note" className="mt-2 text-[12.5px] leading-snug text-lo">
            Your result is recorded under this name. Stay on this device and browser until you finish: it is how the
            test knows it is you.
          </p>

          <label htmlFor="hiring-phone" className="mt-5 block text-[13px] font-medium text-mid">
            Your WhatsApp number
          </label>
          <div className="mt-2">
            <Input
              id="hiring-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              maxLength={20}
              placeholder="10-digit mobile number"
              adornment={<Phone />}
              value={phone}
              onChange={(event) => onPhone(event.target.value)}
              invalid={failed === "phone" || phoneWrong}
              aria-describedby="hiring-phone-note"
            />
          </div>
          <p id="hiring-phone-note" className={phoneWrong ? "mt-2 text-[12.5px] leading-snug text-alert-500" : "mt-2 text-[12.5px] leading-snug text-lo"}>
            {phoneWrong
              ? "Enter a 10-digit Indian mobile number, for example 98765 43210."
              : "An Indian mobile number on WhatsApp. We use it only to contact you about this assessment."}
          </p>
        </div>
      ) : null}

      {failed ? (
        <p role="alert" className="mt-3 text-[13px] text-alert-500">
          {failed === "name"
            ? "Enter your full name to start."
            : failed === "phone"
              ? "Enter a 10-digit Indian WhatsApp number to start."
              : failed === "busy"
              ? "A lot of people are starting right now. Wait a minute and try again."
                : "The shift could not be started. Check your connection and try again."}
        </p>
      ) : null}

      <PrimaryButton className="mt-6 sm:w-full" disabled={starting || !agreed || !named || !reachable} onClick={onStart}>
        {starting ? "Opening the store…" : "Start shift"}
      </PrimaryButton>
      {!agreed || !named || !reachable ? (
        <p className="mt-2 text-center text-[12.5px] text-lo">{stillNeeded(named, reachable, agreed)} to start.</p>
      ) : null}

      {guest ? (
        <p className="mt-5 text-center text-[13px] text-lo">
          Asked to sit it under your email address?{" "}
          <a href="/hiring-test/assessment?signin=1" className="text-mid underline underline-offset-4 hover:text-hi">
            Sign in by email instead
          </a>
        </p>
      ) : (
        <form action={switchHiringAccount} className="mt-5 text-center text-[13px] text-lo">
          Signed in as <span className="break-all text-mid">{email}</span>.{" "}
          <button type="submit" className="text-mid underline underline-offset-4 hover:text-hi">
            Use a different email
          </button>
        </form>
      )}
    </Frame>
  );
}

/** "Enter your name, your WhatsApp number and tick the box above", or whichever of those is left. */
function stillNeeded(named: boolean, reachable: boolean, agreed: boolean): string {
  const left = [
    named ? null : "your name",
    reachable ? null : "your WhatsApp number",
  ].filter((part): part is string => part !== null);
  const enter = left.length ? `Enter ${left.join(" and ")}` : "";
  if (agreed) return enter;
  return enter ? `${enter} and tick the box above` : "Tick the box above";
}

/* ── The attempt, start to finish ─────────────────────────────────────── */

/** Where an admin goes to sit the test again. The server checks that they are one. */
const RETAKE_ROUTE = "/hiring-test/assessment?again=1";

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
  who,
  initial,
  profile: finished,
  limit,
  canRetake = false,
}: {
  /** The signed-in candidate's email, or null for somebody starting under a name. */
  email: string | null;
  /** The name an attempt was started under, where there is one already. */
  who?: string | null;
  initial: StartedAttempt | null;
  profile: Profile | null;
  /** An admin, who may sit the test again. Shows the way back to the start on their profile. */
  canRetake?: boolean;
  /** Seconds this candidate will be given if they start now. */
  limit: number;
}) {
  const router = useRouter();
  const [phase, setPhase] = React.useState<"loading" | "ready" | "running" | "saving" | "stuck" | "finished">(
    finished ? "finished" : "loading",
  );
  const [profile, setProfile] = React.useState<Profile | null>(finished);
  const [starting, setStarting] = React.useState(false);
  const [failed, setFailed] = React.useState<StartFailure | null>(null);
  const [name, setName] = React.useState(who ?? "");
  const [phone, setPhone] = React.useState("");
  const attempt = useHiringStore((store) => store.attempt);
  // What the profile is headed with: the email signed in with, or the name typed.
  const shown = email ?? (name.replace(/\s+/g, " ").trim() || who || "");

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
    setFailed(null);
    try {
      // Reaching here means the box was ticked: the button is dead until it is.
      const started = await startAssessment(deviceType(), true, email === null ? name : undefined, email === null ? phone : undefined);
      if ("error" in started) {
        setFailed(started.error);
      } else if (started.status === "in_progress") {
        const store = useHiringStore.getState();
        store.begin(toAttempt(started), started.actions);
        // Kept with the attempt's own record of events, as well as on the attempt.
        if (started.actions.length === 0) useHiringStore.getState().note("consent", { version: CONSENT_VERSION });
        // An admin sitting it again arrived with `?again=1`. Drop it, so a reload resumes this attempt.
        if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
        setPhase("running");
      } else {
        // Already sat. The server has the profile.
        router.refresh();
      }
    } catch {
      setFailed("failed");
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

  if (phase === "finished" && profile) return <CandidateProfile profile={profile} email={shown} retakeHref={canRetake ? RETAKE_ROUTE : null} />;
  if (phase === "running" && attempt) return <Simulation attempt={attempt} onFinished={finish} />;
  if (phase === "ready") {
    return (
      <Positioning
        email={email}
        name={name}
        onName={setName}
        phone={phone}
        onPhone={setPhone}
        limit={limit}
        starting={starting}
        onStart={start}
        failed={failed}
      />
    );
  }

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
