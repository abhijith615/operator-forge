"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Mail, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { GoogleMark } from "@/components/auth/google-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  sendMagicLink,
  signInWithGoogle,
  startSimulatorSession,
} from "@/lib/auth/actions";
import { idleFormState } from "@/lib/auth/form-state";
import { easing } from "@/lib/motion";

interface LoginPanelProps {
  /** False when Supabase env vars are absent — enables Simulator Mode. */
  configured: boolean;
  initialError?: string;
}

export function LoginPanel({ configured, initialError }: LoginPanelProps) {
  const [state, formAction, pending] = React.useActionState(
    sendMagicLink,
    idleFormState,
  );
  const [oauthPending, startOAuth] = React.useTransition();
  const notified = React.useRef(false);

  React.useEffect(() => {
    if (initialError && !notified.current) {
      notified.current = true;
      toast.error("Sign-in failed", { description: initialError });
    }
  }, [initialError]);

  function handleProvider(action: () => Promise<{ status: string; message: string }>) {
    startOAuth(async () => {
      const result = await action();
      if (result?.status === "error") {
        toast.error(result.message);
      }
    });
  }

  const busy = pending || oauthPending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.75, ease: easing.outExpo }}
    >
      <p className="font-mono text-[10.5px] tracking-[0.2em] text-ember-500 uppercase">
        Operator access
      </p>
      <h2 className="mt-4 text-[27px] leading-tight font-semibold tracking-[-0.03em] text-hi">
        Report for your shift.
      </h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-mid">
        One account, one mission record. We use it to reach you if the hub needs
        you before you are online.
      </p>

      {/* ── Google ───────────────────────────────────────────────────── */}
      <Button
        type="button"
        variant="secondary"
        size="lg"
        loading={oauthPending}
        disabled={busy}
        onClick={() =>
          handleProvider(configured ? signInWithGoogle : startSimulatorSession)
        }
        className="mt-8 w-full rounded-xl"
      >
        <GoogleMark className="size-[18px]" />
        Continue with Google
      </Button>

      {/* ── Divider ──────────────────────────────────────────────────── */}
      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-line" />
        <span className="font-mono text-[10px] tracking-[0.18em] text-faint uppercase">
          or
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>

      {/* ── Magic link ───────────────────────────────────────────────── */}
      {state.status === "success" ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: easing.outExpo }}
          className="panel flex gap-3 p-5"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ion-400" />
          <div>
            <p className="text-[14px] font-medium text-hi">Check your inbox</p>
            <p className="mt-1 text-[13px] leading-relaxed text-mid">
              {state.message}
            </p>
          </div>
        </motion.div>
      ) : (
        <form action={formAction} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="email">Work or personal email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              required
              disabled={busy}
              invalid={Boolean(state.fieldErrors?.email)}
              adornment={<Mail />}
            />
            {state.fieldErrors?.email ? (
              <p className="flex items-center gap-1.5 text-[12.5px] text-alert-500">
                <TriangleAlert className="size-3.5" />
                {state.fieldErrors.email}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={pending}
            disabled={busy}
            className="w-full rounded-xl"
          >
            Send magic link
            <ArrowRight className="transition-transform duration-300 ease-out-expo group-hover/btn:translate-x-1" />
          </Button>

          {state.status === "error" && !state.fieldErrors ? (
            <p className="flex items-center gap-1.5 text-[12.5px] text-alert-500">
              <TriangleAlert className="size-3.5" />
              {state.message}
            </p>
          ) : null}
        </form>
      )}

      <p className="mt-6 text-[12px] leading-relaxed text-faint">
        By continuing you agree that your decisions during a mission are recorded
        and used to build your Operator Genome.
      </p>

      {!configured ? (
        <div className="mt-8 rounded-xl border border-warn-500/25 bg-warn-500/[0.06] p-4">
          <p className="text-[12.5px] font-medium text-warn-500">Simulator Mode</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-mid">
            Supabase is not configured, so sign-in creates a local operator
            identity on this device only. Add your keys to <code>.env.local</code>{" "}
            to enable real Google and magic-link auth.
          </p>
        </div>
      ) : null}
    </motion.div>
  );
}
