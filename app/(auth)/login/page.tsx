import type { Metadata } from "next";

import { LoginPanel } from "@/components/auth/login-panel";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Report for your shift at Operator Forge.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return <LoginPanel configured={isSupabaseConfigured} initialError={error} />;
}
