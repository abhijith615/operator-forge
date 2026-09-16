"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { LOGIN_ROUTE, safeNext } from "@/lib/constants/routes";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Signs out and goes straight back to sign-in, for someone who registered
 * with a different email from the one they are signed in with.
 */
export async function switchChallengeAccount(form: FormData): Promise<void> {
  const next = safeNext(form.get("next")?.toString(), "/challenge");
  const supabase = await getSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect(`${LOGIN_ROUTE}?next=${encodeURIComponent(next)}`);
}
