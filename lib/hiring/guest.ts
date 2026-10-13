import "server-only";

import { cookies } from "next/headers";

/**
 * The key to an attempt that was started with a name and no sign-in.
 *
 * Such an attempt belongs to no account, so something has to say "this
 * browser is the one that started it". That is a secret the database made up
 * when the attempt began, kept here in a cookie the page's own scripts cannot
 * read, and stored in the database only as a hash. The server reads it on
 * every save; without it an attempt's id alone opens nothing.
 *
 * It is tied to the browser, not the person: the same candidate on another
 * phone is, to this, somebody new. That is the price of not asking for an
 * email link, and why a signed-in sitting is still there for anybody who
 * needs to come back on another device.
 */

const GUEST_COOKIE = "of_hiring_attempt";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export interface GuestKey {
  id: string;
  token: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[0-9a-f]{64}$/i;

export async function readGuestKey(): Promise<GuestKey | null> {
  const value = (await cookies()).get(GUEST_COOKIE)?.value ?? "";
  const [id, token] = value.split(".");
  return id && token && UUID.test(id) && TOKEN.test(token) ? { id, token } : null;
}

/** Only callable where cookies can be set: a server action or a route handler. */
export async function writeGuestKey(key: GuestKey): Promise<void> {
  (await cookies()).set(GUEST_COOKIE, `${key.id}.${key.token}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/hiring-test",
    maxAge: THIRTY_DAYS,
  });
}
