/**
 * Route table kept free of React/icon imports so the edge middleware can use it
 * without pulling the component graph in.
 */
export const LOGIN_ROUTE = "/login";
export const ONBOARDING_ROUTE = "/onboarding";
export const HOME_ROUTE = "/mission";

/** Everything behind the shell. */
export const APP_ROUTES = [
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
] as const;

export function isAppRoute(pathname: string): boolean {
  return APP_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}
