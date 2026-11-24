"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, GraduationCap, MapPin, Phone, RotateCcw, UserRound } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { HiringExplainerVideo } from "@/components/hiring/explainer-video";
import { Simulation } from "@/components/hiring/simulation";
import { PrimaryButton, QuietButton } from "@/components/hiring/ui";
import { Input } from "@/components/ui/input";
import { idleFormState } from "@/lib/auth/form-state";
import type { StartedAttempt } from "@/lib/hiring/actions";
import { EXPLAINER_VIDEO } from "@/lib/hiring/content";
import { whatsappNumber } from "@/lib/hiring/phone";
import { deviceType } from "@/lib/hiring/view";
import { ASSESSMENT_SECONDS } from "@/lib/hiring/weights";
import {
  challengeGoogleSignIn,
  completeChallenge,
  saveChallengeDetails,
  startChallenge,
  switchChallengeAccount,
  type ChallengeStartFailure,
} from "@/lib/operator-challenge/actions";
import {
  BRIEFING,
  CHALLENGE_CONSENT_VERSION,
  CHALLENGE_CONTACT,
  CHALLENGE_INTRO,
  CHALLENGE_NOTICE,
  CHALLENGE_ROUTE,
  CONSENT_LABEL,
  DETAILS_COPY,
  LEVELS,
  SCORECARD_COPY,
} from "@/lib/operator-challenge/content";
import type { ChallengeDetails, ChallengeScorecard } from "@/lib/operator-challenge/server";
import { cn } from "@/lib/utils";
import { useHiringStore, type Attempt } from "@/stores/hiring-store";

/* ── Shared frame ─────────────────────────────────────────────────────── */

function Frame({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-dvh bg-void text-hi">
      <main id="main" className={cn("mx-auto flex min-h-dvh flex-col px-5 py-10", wide ? "max-w-2xl" : "max-w-md justify-center")}>
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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="mt-10 font-mono text-[12px] tracking-[0.22em] text-ember-500 uppercase">{children}</p>;
}

/* ── Signing in ───────────────────────────────────────────────────────── */

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-5">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** The way in: what this is, and one button. */
export function ChallengeSignIn({ error }: { error?: string }) {
  const [state, action, pending] = useActionState(challengeGoogleSignIn, idleFormState);
  const failed = state.status === "error" ? state.message : error;

  return (
    <Frame>
      <Eyebrow>{CHALLENGE_INTRO.eyebrow}</Eyebrow>
      <h1 className="mt-2 text-[32px] leading-[1.05] font-bold tracking-[-0.035em] text-hi">{CHALLENGE_INTRO.title}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-mid">{CHALLENGE_INTRO.lede}</p>

      <ul className="mt-6 space-y-3">
        {CHALLENGE_INTRO.points.map((point) => (
          <li key={point} className="flex gap-3 text-[15px] leading-snug text-hi">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-ember-500" />
            {point}
          </li>
        ))}
      </ul>

      <form action={action} className="mt-8">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-full bg-white px-5 text-[15px] font-semibold text-[#1f1f1f] transition-[filter,opacity] hover:brightness-95 disabled:opacity-60"
        >
          <GoogleMark />
          {pending ? "Opening Google…" : CHALLENGE_INTRO.signInButton}
        </button>
      </form>
      <p className="mt-3 text-center text-[13px] leading-snug text-lo">{CHALLENGE_INTRO.signInNote}</p>
      {failed ? (
        <p role="alert" className="mt-3 text-center text-[13px] text-alert-500">
          {failed}
        </p>
      ) : null}
    </Frame>
  );
}

/* ── Details ──────────────────────────────────────────────────────────── */

function Field({
  id,
  label,
  error,
  note,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-mid">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[12.5px] leading-snug text-alert-500">
          {error}
        </p>
      ) : note ? (
        <p id={`${id}-note`} className="mt-1.5 text-[12.5px] leading-snug text-lo">
          {note}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Two choices as big tap targets. A real radio group underneath, for the
 * keyboard and screen readers, but what is submitted is the hidden field:
 * React resets a form after its action runs, which would untick radios that
 * belonged to it while the choice is still shown. These belong to no form.
 */
function Choice({
  name,
  legend,
  options,
  value,
  onChange,
  error,
}: {
  name: string;
  legend: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <fieldset>
      <legend className="block text-[13px] font-medium text-mid">{legend}</legend>
      <input type="hidden" name={name} value={value} />
      <div className="mt-2 grid grid-cols-2 gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-3 text-[15px] font-semibold transition-colors",
              "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ember-500/60",
              value === option.value ? "border-ember-500 bg-ember-500/15 text-hi" : "border-line-strong bg-white/[0.025] text-mid hover:text-hi",
              error && value !== option.value && "border-alert-500/55",
            )}
          >
            <input
              type="radio"
              // Owned by no form, so the form's reset never unticks it.
              form="oc-detached"
              name={`${name}-choice`}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
      {error ? <p className="mt-1.5 text-[12.5px] leading-snug text-alert-500">{error}</p> : null}
    </fieldset>
  );
}

/**
 * Name, WhatsApp, city, education, college, graduation year, working now.
 * Controlled, so nothing typed is lost if the server sends a field back.
 */
export function ChallengeDetailsForm({ email, initial }: { email: string; initial: Partial<ChallengeDetails> & { fullName?: string } }) {
  const [state, action, pending] = useActionState(saveChallengeDetails, idleFormState);
  const [name, setName] = React.useState(initial.fullName ?? "");
  const [phone, setPhone] = React.useState(initial.phone ? initial.phone.replace(/^\+91/, "") : "");
  const [city, setCity] = React.useState(initial.city ?? "");
  const [education, setEducation] = React.useState<string>(initial.education ?? "");
  const [college, setCollege] = React.useState(initial.college ?? "");
  const [gradYear, setGradYear] = React.useState(initial.gradYear ? String(initial.gradYear) : "");
  const [working, setWorking] = React.useState<string>(initial.working === undefined ? "" : initial.working ? "yes" : "no");
  const errors = state.fieldErrors ?? {};
  const phoneWrong = !errors.phone && phone.replace(/\D/g, "").length >= 10 && whatsappNumber(phone) === null;

  return (
    <Frame>
      <Eyebrow>{CHALLENGE_INTRO.eyebrow}</Eyebrow>
      <h1 className="mt-2 text-[28px] leading-[1.06] font-bold tracking-[-0.035em] text-hi">{DETAILS_COPY.title}</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-mid">{DETAILS_COPY.lede}</p>

      <form action={action} className="mt-7 space-y-5" noValidate>
        <Field id="oc-name" label={DETAILS_COPY.name.label} error={errors.name}>
          <Input
            id="oc-name"
            name="name"
            autoComplete="name"
            autoCapitalize="words"
            maxLength={80}
            required
            placeholder={DETAILS_COPY.name.placeholder}
            adornment={<UserRound />}
            value={name}
            onChange={(event) => setName(event.target.value)}
            invalid={Boolean(errors.name)}
          />
        </Field>

        <Field
          id="oc-phone"
          label={DETAILS_COPY.phone.label}
          error={errors.phone ?? (phoneWrong ? DETAILS_COPY.phone.wrong : undefined)}
          note={DETAILS_COPY.phone.note}
        >
          <Input
            id="oc-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            required
            placeholder={DETAILS_COPY.phone.placeholder}
            adornment={<Phone />}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            invalid={Boolean(errors.phone) || phoneWrong}
          />
        </Field>

        <Field id="oc-city" label={DETAILS_COPY.city.label} error={errors.city}>
          <Input
            id="oc-city"
            name="city"
            autoComplete="address-level2"
            autoCapitalize="words"
            maxLength={60}
            required
            placeholder={DETAILS_COPY.city.placeholder}
            adornment={<MapPin />}
            value={city}
            onChange={(event) => setCity(event.target.value)}
            invalid={Boolean(errors.city)}
          />
        </Field>

        <Choice
          name="education"
          legend={DETAILS_COPY.education.label}
          options={DETAILS_COPY.education.options}
          value={education}
          onChange={setEducation}
          error={errors.education}
        />

        <Field id="oc-college" label={DETAILS_COPY.college.label} error={errors.college}>
          <Input
            id="oc-college"
            name="college"
            autoComplete="organization"
            autoCapitalize="words"
            maxLength={120}
            required
            placeholder={DETAILS_COPY.college.placeholder}
            adornment={<Building2 />}
            value={college}
            onChange={(event) => setCollege(event.target.value)}
            invalid={Boolean(errors.college)}
          />
        </Field>

        <Field
          id="oc-year"
          label={education === "student" ? DETAILS_COPY.gradYear.studentLabel : DETAILS_COPY.gradYear.label}
          error={errors.gradYear}
        >
          <Input
            id="oc-year"
            name="gradYear"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            required
            placeholder={DETAILS_COPY.gradYear.placeholder}
            adornment={<GraduationCap />}
            value={gradYear}
            onChange={(event) => setGradYear(event.target.value.replace(/\D/g, "").slice(0, 4))}
            invalid={Boolean(errors.gradYear)}
          />
        </Field>

        <Choice
          name="working"
          legend={DETAILS_COPY.working.label}
          options={DETAILS_COPY.working.options}
          value={working}
          onChange={setWorking}
          error={errors.working}
        />

        {state.status === "error" ? (
          <p role="alert" className="text-[13px] text-alert-500">
            {state.message}
          </p>
        ) : null}

        <PrimaryButton type="submit" disabled={pending} className="sm:w-full">
          {pending ? DETAILS_COPY.saving : DETAILS_COPY.submit}
          <ArrowRight className="size-4" aria-hidden />
        </PrimaryButton>
      </form>

      <SignedInAs email={email} />
    </Frame>
  );
}

function SignedInAs({ email }: { email: string }) {
  return (
    <form action={switchChallengeAccount} className="mt-6 text-center text-[13px] text-lo">
      Signed in as <span className="break-all text-mid">{email}</span>.{" "}
      <button type="submit" className="text-mid underline underline-offset-4 hover:text-hi">
        Use a different account
      </button>
    </form>
  );
}

/* ── Before the shift ─────────────────────────────────────────────────── */

function spoken(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes} minutes${rest ? ` ${rest} seconds` : ""}`;
}

function Briefing({
  email,
  name,
  limit,
  starting,
  failed,
  onStart,
}: {
  email: string;
  name: string;
  limit: number;
  starting: boolean;
  failed: ChallengeStartFailure | null;
  onStart: () => void;
}) {
  const [agreed, setAgreed] = React.useState(false);
  const extra = limit - ASSESSMENT_SECONDS;

  return (
    <Frame>
      <Eyebrow>{BRIEFING.eyebrow}</Eyebrow>
      <h1 className="mt-2 text-[28px] leading-[1.06] font-bold tracking-[-0.035em] text-hi uppercase">{BRIEFING.title}</h1>
      {name ? <p className="mt-2 text-[14px] text-mid">Good luck, {name.split(" ")[0]}.</p> : null}

      <section aria-labelledby="oc-explainer" className="mt-6">
        <h2 id="oc-explainer" className="font-mono text-[11.5px] tracking-[0.18em] text-lo uppercase">
          Watch this first
        </h2>
        <HiringExplainerVideo id={EXPLAINER_VIDEO.id} title={EXPLAINER_VIDEO.title} className="mt-2" />
        <p className="mt-2 text-[13px] leading-snug text-mid">{EXPLAINER_VIDEO.note}</p>
      </section>

      <ul className="mt-6 space-y-3">
        {BRIEFING.lines.map((line) => (
          <li key={line} className="flex gap-3 text-[15px] leading-snug text-hi">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-ember-500" />
            {line}
          </li>
        ))}
      </ul>

      <p className="mt-6 rounded-[14px] border border-line-strong bg-white/[0.03] px-3.5 py-3 text-[13px] leading-snug text-mid">
        You have <span className="font-semibold text-hi">{spoken(limit)}</span>
        {extra > 0 ? " (this includes your extra time)" : ""}. The time starts when you press Start shift. It does not
        stop. You get one try. If the page reloads or the internet stops, you come back to the same place. The bar at
        the top shows the 6 parts of the shift. Yellow is where you are. The white mark shows where your time is. Parts
        you do not reach before the time ends count as zero, so keep moving.
      </p>

      <p className="mt-3 text-[13px] leading-snug text-lo">
        Need extra time because of a disability or a health condition? Write to{" "}
        <a href={`mailto:${CHALLENGE_CONTACT}?subject=Startup%20Operator%20Challenge%20%E2%80%94%20adjustment`} className="text-mid underline underline-offset-4 hover:text-hi">
          {CHALLENGE_CONTACT}
        </a>{" "}
        from {email} before you start. It is not shown on your scorecard.
      </p>

      <section aria-labelledby="oc-notice" className="mt-6 rounded-[16px] border border-line-strong bg-surface p-4">
        <h2 id="oc-notice" className="font-mono text-[11.5px] tracking-[0.18em] text-lo uppercase">
          Your data
        </h2>
        <dl className="mt-3 space-y-3">
          {CHALLENGE_NOTICE.map((item) => (
            <div key={item.title}>
              <dt className="text-[13.5px] font-semibold text-hi">{item.title}</dt>
              <dd className="mt-0.5 text-[13px] leading-snug text-mid">{item.text}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[13px] leading-snug text-mid">
          Contact:{" "}
          <a href={`mailto:${CHALLENGE_CONTACT}`} className="text-hi underline underline-offset-4">
            {CHALLENGE_CONTACT}
          </a>
          . Read more in the{" "}
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
          <span className="text-[13.5px] leading-snug text-hi">{CONSENT_LABEL}</span>
        </label>
      </section>

      {failed ? (
        <p role="alert" className="mt-3 text-[13px] text-alert-500">
          {failed === "details"
            ? "Save your details first."
            : failed === "signin"
              ? "Your sign-in has ended. Reload the page and sign in again."
              : "The shift could not start. Check your internet and try again."}
        </p>
      ) : null}

      <PrimaryButton className="mt-6 sm:w-full" disabled={starting || !agreed} onClick={onStart}>
        {starting ? BRIEFING.starting : BRIEFING.start}
      </PrimaryButton>
      {!agreed ? <p className="mt-2 text-center text-[12.5px] text-lo">Tick the box above to start.</p> : null}

      <p className="mt-5 text-center text-[13px] text-lo">
        Something wrong in your details?{" "}
        <a href={`${CHALLENGE_ROUTE}?edit=1`} className="text-mid underline underline-offset-4 hover:text-hi">
          Edit them
        </a>
      </p>
      <SignedInAs email={email} />
    </Frame>
  );
}

/* ── The scorecard ────────────────────────────────────────────────────── */

export function Scorecard({
  scorecard,
  name,
  email,
  retakeHref = null,
}: {
  scorecard: ChallengeScorecard;
  name: string;
  email: string;
  retakeHref?: string | null;
}) {
  const level = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, scorecard.level))]!;

  return (
    <Frame wide>
      <Eyebrow>{SCORECARD_COPY.eyebrow}</Eyebrow>
      <h1 className="mt-2 text-[clamp(1.9rem,7vw,2.6rem)] leading-[1.04] font-bold tracking-[-0.04em] text-hi">{SCORECARD_COPY.title}</h1>
      <p className="mt-2 text-[14px] break-all text-lo">
        {name ? `${name} · ` : ""}
        {email}
      </p>

      <section aria-label="Your result" className="mt-7 grid gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="rounded-[18px] border border-ember-500/40 bg-ember-500/[0.08] p-5">
          <p className="font-mono text-[11px] tracking-[0.18em] text-lo uppercase">{SCORECARD_COPY.scoreLabel}</p>
          <p className="mt-2 text-[56px] leading-none font-bold tracking-[-0.05em] text-hi tabular-nums">
            {scorecard.overall}
            <span className="text-[22px] font-semibold text-lo"> / 100</span>
          </p>
        </div>
        <div className="rounded-[18px] border border-line-strong bg-surface p-5">
          <p className="font-mono text-[11px] tracking-[0.18em] text-lo uppercase">{SCORECARD_COPY.levelLabel}</p>
          <p className="mt-2 text-[24px] leading-tight font-bold tracking-[-0.03em] text-ember-500">{level.label}</p>
          <p className="mt-1.5 text-[14px] leading-snug text-mid">{level.text}</p>
        </div>
      </section>

      {scorecard.timedOut ? (
        <p className="mt-3 rounded-[14px] border border-line-strong bg-white/[0.03] px-3.5 py-3 text-[13px] leading-snug text-mid">
          {SCORECARD_COPY.unfinished(scorecard.observed, scorecard.opportunities)}
        </p>
      ) : null}

      {scorecard.strengths.length ? (
        <section aria-labelledby="oc-strengths" className="mt-7">
          <h2 id="oc-strengths" className="font-mono text-[11.5px] tracking-[0.18em] text-lo uppercase">
            {SCORECARD_COPY.strengthsTitle}
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {scorecard.strengths.map((item) => (
              <li key={item.title} className="rounded-[16px] border border-line-strong bg-surface p-4">
                <p className="text-[15px] font-semibold text-hi">{item.title}</p>
                <p className="mt-1 text-[13.5px] leading-snug text-mid">{item.text}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="oc-grow" className="mt-7">
        <h2 id="oc-grow" className="font-mono text-[11.5px] tracking-[0.18em] text-lo uppercase">
          {SCORECARD_COPY.growTitle}
        </h2>
        <div className="mt-3 rounded-[16px] border border-line-strong bg-surface p-4">
          <p className="text-[15px] font-semibold text-hi">{scorecard.grow.label}</p>
          <p className="mt-1 text-[13.5px] leading-snug text-mid">{scorecard.grow.text}</p>
        </div>
      </section>

      <section aria-labelledby="oc-bootcamp" className="mt-8 rounded-[20px] bg-ember-500 p-6 text-void">
        <h2 id="oc-bootcamp" className="text-[22px] leading-tight font-bold tracking-[-0.03em]">
          {SCORECARD_COPY.bootcamp.title}
        </h2>
        <p className="mt-2 text-[14.5px] leading-snug font-medium">{SCORECARD_COPY.bootcamp.text}</p>
        <a
          href={SCORECARD_COPY.bootcamp.href}
          className="mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-void px-5 text-[14px] font-bold text-hi transition-[filter] hover:brightness-125"
        >
          {SCORECARD_COPY.bootcamp.cta}
          <ArrowRight className="size-4" aria-hidden />
        </a>
      </section>

      <p className="mt-6 text-[13px] leading-snug text-lo">{SCORECARD_COPY.oneTry}</p>

      {retakeHref ? (
        <div className="mt-4">
          <a
            href={retakeHref}
            className="inline-flex min-h-[46px] items-center gap-2 rounded-full border border-line-strong bg-white/[0.04] px-5 text-[13.5px] font-bold tracking-[0.06em] text-hi uppercase transition-colors hover:border-line-bright hover:bg-white/[0.08]"
          >
            <RotateCcw className="size-4" aria-hidden />
            Take it again
          </a>
          <p className="mt-2 text-[12.5px] leading-snug text-lo">
            You see this because you are an admin. Everyone else gets one try. This attempt stays in the admin list.
          </p>
        </div>
      ) : null}
    </Frame>
  );
}

/* ── Start to finish ──────────────────────────────────────────────────── */

const RETAKE_ROUTE = `${CHALLENGE_ROUTE}?again=1`;

const toAttempt = (started: StartedAttempt): Attempt => ({
  id: started.id,
  form: started.form,
  startedAt: started.startedAt,
  skew: started.serverNow - Date.now(),
  limit: started.limit,
  local: false,
});

/**
 * Briefing → the shift → the scorecard. The server decides which on arrival:
 * nothing started, a shift under way (resume it), or one already finished.
 * Refreshing never restarts anything.
 */
export function OperatorChallenge({
  email,
  name,
  initial,
  scorecard: finished,
  limit,
  canRetake = false,
}: {
  email: string;
  name: string;
  initial: StartedAttempt | null;
  scorecard: ChallengeScorecard | null;
  limit: number;
  canRetake?: boolean;
}) {
  const router = useRouter();
  const [phase, setPhase] = React.useState<"loading" | "ready" | "running" | "saving" | "stuck" | "finished">(
    finished ? "finished" : "loading",
  );
  const [scorecard, setScorecard] = React.useState<ChallengeScorecard | null>(finished);
  const [starting, setStarting] = React.useState(false);
  const [failed, setFailed] = React.useState<ChallengeStartFailure | null>(null);
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
    setFailed(null);
    try {
      const started = await startChallenge(deviceType(), true);
      if ("error" in started) {
        setFailed(started.error);
      } else if (started.status === "in_progress") {
        const store = useHiringStore.getState();
        store.begin(toAttempt(started), started.actions);
        if (started.actions.length === 0) useHiringStore.getState().note("consent", { version: CHALLENGE_CONSENT_VERSION });
        if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
        setPhase("running");
      } else {
        // Already taken. The server has the scorecard.
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
      const result = await completeChallenge(held.attempt.id, held.actions);
      if (!result) {
        setPhase("stuck");
        return;
      }
      setScorecard(result);
      held.reset();
      setPhase("finished");
      window.scrollTo({ top: 0 });
    } catch {
      setPhase("stuck");
    }
  }, []);

  if (phase === "finished" && scorecard) {
    return <Scorecard scorecard={scorecard} name={name} email={email} retakeHref={canRetake ? RETAKE_ROUTE : null} />;
  }
  if (phase === "running" && attempt) return <Simulation attempt={attempt} onFinished={finish} />;
  if (phase === "ready") {
    return <Briefing email={email} name={name} limit={limit} starting={starting} failed={failed} onStart={start} />;
  }

  return (
    <Frame>
      <div className="mt-10" role="status">
        {phase === "stuck" ? (
          <>
            <h1 className="text-[24px] leading-tight font-bold tracking-[-0.03em] text-hi">Your shift is finished, but not saved yet.</h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-mid">
              Your choices are kept on this device. Check your internet and try again. Nothing will be lost.
            </p>
            <QuietButton className="mt-5 sm:w-full" onClick={finish}>
              Try again
            </QuietButton>
          </>
        ) : (
          <p className="text-[15px] text-mid">{phase === "saving" ? "Ending the shift…" : "Opening the store…"}</p>
        )}
      </div>
    </Frame>
  );
}

/** One try, already used on a simulation that has since been rebuilt. */
export function ChallengeAlreadyTaken({ email }: { email: string }) {
  return (
    <Frame>
      <Eyebrow>{CHALLENGE_INTRO.eyebrow}</Eyebrow>
      <h1 className="mt-2 text-[26px] leading-tight font-bold tracking-[-0.03em] text-hi">You have already taken the challenge.</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-mid">
        You took an earlier version of this challenge, and everyone gets one try. If you think this is wrong, write to{" "}
        <a href={`mailto:${CHALLENGE_CONTACT}`} className="underline underline-offset-4 hover:text-hi">
          {CHALLENGE_CONTACT}
        </a>{" "}
        from {email}.
      </p>
      <SignedInAs email={email} />
    </Frame>
  );
}
