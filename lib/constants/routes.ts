/**
 * Route table kept free of React/icon imports so the edge middleware can use it
 * without pulling the component graph in.
 */
export const LOGIN_ROUTE = "/login";
export const ONBOARDING_ROUTE = "/onboarding";
export const HOME_ROUTE = "/mission";

/** Everything behind the shell. */
export const APP_ROUTES = [
  "/start",
  "/mission",
  "/assistant",
  "/messages",
  "/inventory",
  "/orders",
  "/people",
  "/customers",
  "/genome",
  "/leaderboard",
  "/settings",
  // Guarded twice: this puts it behind sign-in, and the page itself sends
  // anyone not in the `admins` table back to their shift.
  "/admin",
] as const;

export function isAppRoute(pathname: string): boolean {
  return APP_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * A `next` parameter is attacker-controlled. Only a single-slash, same-origin
 * path is ever followed — "//evil.com" and "https://evil.com" are both valid
 * values for a browser to treat as absolute, and both would turn our sign-in
 * into an open redirect.
 */
export function safeNext(value: string | null | undefined, fallback = HOME_ROUTE): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("\\")) return fallback;
  return value;
}
