"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Phone, RotateCcw, Sparkles, Target, UserRound } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { PrimaryButton, QuietButton } from "@/components/hiring/ui";
import { Input } from "@/components/ui/input";
import { completeFc, fcStartOver, startFc, type FcStartFailure, type FcStarted } from "@/lib/fc/actions";
import { DATA_NOTICE, FC_CONSENT_VERSION, FC_TITLE, HIRING_CONTACT, POSITIONING } from "@/lib/fc/content";
import type { FcCandidateProfile } from "@/lib/fc/server";
import { FC_COMPETENCY_PLAIN, type FcCompetencyId } from "@/lib/fc/weights";
import { whatsappNumber } from "@/lib/hiring/phone";
import { deviceType } from "@/lib/hiring/view";
import { cn } from "@/lib/utils";
import { useFcStore, type FcAttempt } from "@/stores/fc-store";

import { FcSimulation } from "./simulation";

function Frame({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-dvh bg-void text-hi">
      <main id="main" className={cn("mx-auto flex min-h-dvh flex-col px-5 py-10", wide ? "max-w-3xl" : "max-w-md justify-center")}>
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

const toAttempt = (started: FcStarted): FcAttempt => ({
  id: started.id,
  startedAt: started.startedAt,
  skew: started.serverNow - Date.now(),
  limit: started.limit,
});

/* ── Before the shift ─────────────────────────────────────────────────── */

function Start({ starting, failed, onStart }: { starting: boolean; failed: FcStartFailure | null; onStart: (name: string, phone: string) => void }) {
  const [agreed, setAgreed] = React.useState(false);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const named = name.replace(/\s+/g, " ").trim().length >= 2;
  const reachable = whatsappNumber(phone) !== null;
  const phoneWrong = !reachable && phone.replace(/\D/g, "").length >= 10;
  const missing = [!named && "your name", !reachable && "your WhatsApp number"].filter(Boolean) as string[];

  return (
    <Frame>
      <p className="mt-10 font-mono text-[12px] tracking-[0.22em] text-ember-500 uppercase">Hiring Test · {FC_TITLE}</p>
      <h1 className="mt-2 text-[28px] leading-[1.06] font-bold tracking-[-0.035em] text-hi uppercase">30-minute fulfilment centre inbound shift</h1>

      <ul className="mt-6 space-y-3">
        {POSITIONING.map((line) => (
          <li key={line} className="flex gap-3 text-[15px] leading-snug text-hi">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-ember-500" />
            {line}
          </li>
        ))}
      </ul>

      <p className="mt-6 rounded-[14px] border border-line-strong bg-white/[0.03] px-3.5 py-3 text-[13px] leading-snug text-mid">
        You have <span className="font-semibold text-hi">30 minutes</span>. The time starts when you press Start Shift and does not pause. You have one attempt. If the page reloads or your connection drops, you come back to where you were. Use the same phone or computer until you finish.
      </p>

      <section aria-labelledby="fc-notice" className="mt-6 rounded-[16px] border border-line-strong bg-surface p-4">
        <h2 id="fc-notice" className="font-mono text-[11.5px] tracking-[0.18em] text-lo uppercase">
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
          <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[#f5c400]" />
          <span className="text-[13.5px] leading-snug text-hi">I have read this, and I agree to take the assessment and to my data being used as described.</span>
        </label>
      </section>

      <div className="mt-6">
        <label htmlFor="fc-name" className="block text-[13px] font-medium text-mid">
          Your full name
        </label>
        <div className="mt-2">
          <Input
            id="fc-name"
            name="name"
            autoComplete="name"
            autoCapitalize="words"
            spellCheck={false}
            maxLength={80}
            placeholder="As you want it on your result"
            adornment={<UserRound />}
            value={name}
            onChange={(event) => setName(event.target.value)}
            invalid={failed === "name"}
          />
        </div>
        <label htmlFor="fc-phone" className="mt-5 block text-[13px] font-medium text-mid">
          Your WhatsApp number
        </label>
        <div className="mt-2">
          <Input
            id="fc-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            placeholder="10-digit mobile number"
            adornment={<Phone />}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            invalid={failed === "phone" || phoneWrong}
            aria-describedby="fc-phone-note"
          />
        </div>
        <p id="fc-phone-note" className={cn("mt-2 text-[12.5px] leading-snug", phoneWrong ? "text-alert-500" : "text-lo")}>
          {phoneWrong ? "Enter a 10-digit Indian mobile number, for example 98765 43210." : "An Indian mobile number on WhatsApp. We use it only to contact you about this assessment."}
        </p>
      </div>

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

      <PrimaryButton className="mt-6 sm:w-full" disabled={starting || !agreed || !named || !reachable} onClick={() => onStart(name, phone)}>
        {starting ? "Opening the dock…" : "Start shift"}
      </PrimaryButton>
      {!agreed || missing.length ? (
        <p className="mt-2 text-center text-[12.5px] text-lo">
          {[missing.length ? `Enter ${missing.join(" and ")}` : null, !agreed ? (missing.length ? "tick the box above" : "Tick the box above") : null].filter(Boolean).join(" and ")} to start.
        </p>
      ) : null}
    </Frame>
  );
}

/* ── After the shift ──────────────────────────────────────────────────── */

function tone(score: number) {
  return score >= 75 ? "bg-ion-500" : score >= 50 ? "bg-ember-500" : "bg-warn-500";
}

export function FcProfile({ profile, name, canRetake }: { profile: FcCandidateProfile; name: string; canRetake?: boolean }) {
  const router = useRouter();
  const [again, setAgain] = React.useState(false);
  return (
    <Frame wide>
      <p className="mt-10 font-mono text-[11.5px] tracking-[0.2em] text-ember-500 uppercase">Operator Forge · Hiring Test</p>
      <h1 className="mt-2 text-[clamp(1.9rem,7vw,2.8rem)] leading-[1.03] font-bold tracking-[-0.04em] text-hi">Your {FC_TITLE} profile</h1>
      <p className="mt-2 text-[14px] text-lo">{name}</p>

      {profile.timedOut ? (
        <p className="mt-4 rounded-[14px] border border-warn-500/40 bg-warn-500/[0.07] px-3.5 py-3 text-[13.5px] text-hi">
          Time ran out before the end. You reached {profile.observed} of {profile.opportunities} decision points; only those are scored.
        </p>
      ) : null}

      <section className="mt-6 grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
        <div className="rounded-[20px] border border-line bg-surface px-6 py-5 text-center">
          <p className="font-mono text-[11px] tracking-[0.18em] text-lo uppercase">Overall</p>
          <p className="tabular mt-1 text-[64px] leading-none font-bold tracking-[-0.05em] text-hi">{profile.overall}</p>
          <p className="text-[13px] text-lo">out of 100</p>
        </div>
        <div className="rounded-[20px] border border-line bg-surface p-5">
          <ul className="space-y-3">
            {profile.competencies.map((c) => (
              <li key={c.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[14px] font-medium text-hi">{FC_COMPETENCY_PLAIN[c.id as FcCompetencyId]?.name ?? c.label}</span>
                  <span className="tabular text-[15px] font-semibold text-hi">{c.observed ? c.score : "—"}</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.07]">
                  <div className={cn("h-full rounded-full", tone(c.score))} style={{ width: `${c.observed ? c.score : 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {profile.strengths.length ? (
        <section className="mt-6">
          <h2 className="flex items-center gap-2 font-mono text-[12px] tracking-[0.18em] text-ion-400 uppercase">
            <Sparkles className="size-4" aria-hidden /> What you did well
          </h2>
          <ul className="mt-3 space-y-2">
            {profile.strengths.map((s) => (
              <li key={s.title} className="rounded-[16px] border border-line bg-surface px-4 py-3">
                <p className="text-[15px] font-semibold text-hi">{s.title}</p>
                <p className="mt-0.5 text-[13.5px] leading-snug text-mid">{s.text}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile.development ? (
        <section className="mt-6">
          <h2 className="flex items-center gap-2 font-mono text-[12px] tracking-[0.18em] text-ember-500 uppercase">
            <Target className="size-4" aria-hidden /> One area to work on
          </h2>
          <div className="mt-3 rounded-[16px] border border-ember-500/30 bg-ember-500/[0.05] px-4 py-3">
            <p className="text-[15px] font-semibold text-hi">{profile.development.title}</p>
            <p className="mt-0.5 text-[13.5px] leading-snug text-mid">{profile.development.text}</p>
          </div>
        </section>
      ) : null}

      <p className="mt-8 text-[13px] leading-snug text-lo">
        Your result goes to Operator Forge and the employer who asked you to take this test. A person decides what happens next; nothing rejects you automatically.
      </p>

      {canRetake ? (
        <div className="mt-6">
          <QuietButton
            disabled={again}
            onClick={async () => {
              setAgain(true);
              useFcStore.getState().reset();
              await fcStartOver();
              router.refresh();
            }}
          >
            <RotateCcw className="size-4" aria-hidden /> Sit the test again
          </QuietButton>
          <p className="mt-2 text-[12.5px] text-lo">You see this because you are an admin. This attempt stays in the results list.</p>
        </div>
      ) : null}
    </Frame>
  );
}

/* ── Start → shift → profile ──────────────────────────────────────────── */

export function FcAssessment({
  initial,
  profile: finished,
  name: initialName,
  canRetake = false,
}: {
  initial: FcStarted | null;
  profile: FcCandidateProfile | null;
  name: string | null;
  canRetake?: boolean;
}) {
  const [phase, setPhase] = React.useState<"loading" | "ready" | "running" | "saving" | "stuck" | "finished">(finished ? "finished" : "loading");
  const [profile, setProfile] = React.useState<FcCandidateProfile | null>(finished);
  const [starting, setStarting] = React.useState(false);
  const [failed, setFailed] = React.useState<FcStartFailure | null>(null);
  const [name, setName] = React.useState(initialName ?? "");
  const attempt = useFcStore((store) => store.attempt);

  React.useEffect(() => {
    if (finished) {
      useFcStore.getState().reset();
      return;
    }
    if (initial?.status === "in_progress") {
      const store = useFcStore.getState();
      store.begin(toAttempt(initial), initial.actions);
      if (initial.actions.length) store.note("resume");
      setPhase("running");
    } else {
      setPhase("ready");
    }
  }, [initial, finished]);

  const start = async (typedName: string, phone: string) => {
    setStarting(true);
    setFailed(null);
    try {
      const started = await startFc(deviceType(), true, typedName, phone);
      if ("error" in started) {
        setFailed(started.error);
      } else {
        setName(typedName.replace(/\s+/g, " ").trim());
        const store = useFcStore.getState();
        store.begin(toAttempt(started), started.actions);
        if (started.actions.length === 0) useFcStore.getState().note("consent", { version: FC_CONSENT_VERSION });
        setPhase("running");
      }
    } catch {
      setFailed("failed");
    } finally {
      setStarting(false);
    }
  };

  const finish = React.useCallback(async () => {
    const held = useFcStore.getState();
    if (!held.attempt) return;
    setPhase("saving");
    try {
      const result = await completeFc(held.attempt.id, held.actions);
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

  if (phase === "finished" && profile) return <FcProfile profile={profile} name={name} canRetake={canRetake} />;
  if (phase === "running" && attempt) return <FcSimulation attempt={attempt} onFinished={finish} />;
  if (phase === "ready") return <Start starting={starting} failed={failed} onStart={start} />;

  return (
    <Frame>
      <div className="mt-10" role="status">
        {phase === "stuck" ? (
          <>
            <h1 className="text-[24px] leading-tight font-bold tracking-[-0.03em] text-hi">Your shift is finished, and not yet saved.</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-mid">Your choices are kept on this device. Check your connection and try again.</p>
            <PrimaryButton className="mt-6 sm:w-full" onClick={finish}>
              Try again
            </PrimaryButton>
          </>
        ) : (
          <p className="text-[15px] text-mid">{phase === "saving" ? "Saving your shift…" : "Opening…"}</p>
        )}
      </div>
    </Frame>
  );
}

