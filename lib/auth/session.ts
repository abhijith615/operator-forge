import "server-only";

import { cache } from "react";

import { redirect } from "next/navigation";

import { LOGIN_ROUTE } from "@/lib/constants/routes";
import { OPERATORS_TABLE } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Operator } from "@/types/operator";

import { readSimulatorOperator } from "./simulator";

interface OperatorRow {
  id: string;
  full_name: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

/**
 * The single source of truth for "who is in the chair". Cached per request so
 * the layout, topbar and page can all ask without extra round trips.
 */
export const getOperator = cache(async (): Promise<Operator | null> => {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return readSimulatorOperator();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from(OPERATORS_TABLE)
    .select("id, full_name, whatsapp, avatar_url, created_at")
    .eq("id", user.id)
    .maybeSingle<OperatorRow>();

  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : "";

  const metadataAvatar =
    typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null;

  const fullName = data?.full_name?.trim() || metadataName.trim();
  const whatsapp = data?.whatsapp ?? null;

  return {
    id: user.id,
    email: user.email ?? "",
    fullName,
    whatsapp,
    avatarUrl: data?.avatar_url ?? metadataAvatar,
    // Onboarding is complete only when we hold both the name and the number.
    onboarded: Boolean(fullName && whatsapp),
    createdAt: data?.created_at ?? user.created_at,
  };
});

/**
 * For pages inside the shell. The layout has already guarded the route, so a
 * miss here means the session expired mid-render — send them back to sign in
 * rather than surfacing an error boundary.
 */
export async function requireOperator(): Promise<Operator> {
  const operator = await getOperator();
  if (!operator) redirect(LOGIN_ROUTE);
  return operator;
}
