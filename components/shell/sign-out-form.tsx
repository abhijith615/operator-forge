"use client";

import { signOut } from "@/lib/auth/actions";

import { clearOperatorScope } from "./operator-scope";

/**
 * The only way out of the shell.
 *
 * `signOut` is a server action, so it can end the session but cannot touch
 * localStorage — where the shift, the conversations and the telemetry live.
 * `onSubmit` runs before the action is dispatched, which is the one moment
 * both sides are reachable.
 *
 * Client component so a server page can still use it: the form is what needs
 * the handler, not the page around it.
 */
export function SignOutForm({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form action={signOut} onSubmit={() => clearOperatorScope()} className={className}>
      {children}
    </form>
  );
}
