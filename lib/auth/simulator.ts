import "server-only";

import { cookies } from "next/headers";

import type { Operator } from "@/types/operator";

export const SIMULATOR_COOKIE = "of.simulator.operator";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
} as const;

/**
 * Simulator Mode identity, persisted as an opaque cookie. This is a local
 * development affordance only — it is never used when Supabase is configured,
 * and it carries no privileges beyond rendering the shell.
 */
export async function readSimulatorOperator(): Promise<Operator | null> {
  const jar = await cookies();
  const raw = jar.get(SIMULATOR_COOKIE)?.value;
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    );
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as Partial<Operator>;
    // `fullName` is legitimately empty between sign-in and onboarding, so only
    // identity is required here.
    if (!candidate.id || !candidate.email) return null;

    return {
      id: candidate.id,
      email: candidate.email,
      fullName: candidate.fullName ?? "",
      whatsapp: candidate.whatsapp ?? null,
      avatarUrl: candidate.avatarUrl ?? null,
      onboarded: Boolean(candidate.onboarded),
      createdAt: candidate.createdAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function writeSimulatorOperator(operator: Operator): Promise<void> {
  const jar = await cookies();
  jar.set(
    SIMULATOR_COOKIE,
    Buffer.from(JSON.stringify(operator), "utf8").toString("base64url"),
    COOKIE_OPTIONS,
  );
}

export async function clearSimulatorOperator(): Promise<void> {
  const jar = await cookies();
  jar.delete(SIMULATOR_COOKIE);
}
