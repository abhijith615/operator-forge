import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./config";

/**
 * Server-side Supabase client bound to the request cookie jar.
 * Returns `null` in Simulator Mode.
 */
export async function getSupabaseServerClient() {
  if (!isSupabaseConfigured) return null;

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component: middleware refreshes the session
          // instead, so this is safe to swallow.
        }
      },
    },
  });
}
