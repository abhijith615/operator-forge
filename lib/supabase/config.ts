export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

/**
 * Supabase is optional at develop time. When the keys are absent the app runs
 * in Simulator Mode: a local, cookie-backed operator identity so the whole
 * experience is walkable without provisioning a backend. See README.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const OPERATORS_TABLE = "operators";
