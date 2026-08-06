import { NextResponse, type NextRequest } from "next/server";

import { HOME_ROUTE, LOGIN_ROUTE, ONBOARDING_ROUTE } from "@/lib/constants/routes";
import { getOperator } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * OAuth + magic-link landing strip. Exchanges the code for a session, then
 * routes the operator to onboarding or straight onto the floor.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const authError = searchParams.get("error_description") ?? searchParams.get("error");

  if (authError) {
    const url = new URL(LOGIN_ROUTE, origin);
    url.searchParams.set("error", authError);
    return NextResponse.redirect(url);
  }

  const supabase = await getSupabaseServerClient();

  if (supabase && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const url = new URL(LOGIN_ROUTE, origin);
      url.searchParams.set("error", error.message);
      return NextResponse.redirect(url);
    }
  }

  const operator = await getOperator();

  if (!operator) {
    return NextResponse.redirect(new URL(LOGIN_ROUTE, origin));
  }

  if (!operator.onboarded) {
    return NextResponse.redirect(new URL(ONBOARDING_ROUTE, origin));
  }

  return NextResponse.redirect(new URL(next ?? HOME_ROUTE, origin));
}
