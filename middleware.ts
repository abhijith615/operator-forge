import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  HOME_ROUTE,
  LOGIN_ROUTE,
  ONBOARDING_ROUTE,
  isAppRoute,
} from "@/lib/constants/routes";

const SIMULATOR_COOKIE = "of.simulator.operator";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
const configured = Boolean(supabaseUrl && supabaseAnonKey);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  let signedIn = false;

  if (configured) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    // Refreshes the auth token as a side effect — do not remove.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  } else {
    signedIn = request.cookies.has(SIMULATOR_COOKIE);
  }

  const guarded = isAppRoute(pathname) || pathname.startsWith(ONBOARDING_ROUTE);

  if (guarded && !signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_ROUTE;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith(LOGIN_ROUTE) && signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = HOME_ROUTE;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image optimisation — the auth cookie
     * only needs refreshing on real navigations.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|mp4|webm)$).*)",
  ],
};
