import type { Metadata } from "next";

import { LoginPanel } from "@/components/auth/login-panel";
import { safeNext } from "@/lib/constants/routes";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Report for your shift at Operator Forge.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <LoginPanel
      configured={isSupabaseConfigured}
      initialError={error}
      next={safeNext(next)}
    />
  );
}
