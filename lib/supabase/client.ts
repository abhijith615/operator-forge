"use client";

import { createBrowserClient } from "@supabase/ssr";

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./config";

let cached: ReturnType<typeof createBrowserClient> | null = null;

/** Returns `null` in Simulator Mode so callers must handle the absence. */
export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) return null;
  cached ??= createBrowserClient(supabaseUrl, supabaseAnonKey);
  return cached;
}
