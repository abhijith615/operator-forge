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
