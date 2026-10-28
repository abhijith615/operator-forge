import "server-only";

import { cookies } from "next/headers";

/**
 * The key to this browser's FC Executive attempt.
 *
 * A separate cookie from the store-manager test's, so somebody who sits both
 * in one browser keeps two attempts and the two never cross. Same rules: the
 * secret lives in an httpOnly cookie; the database keeps only its hash.
 */

const FC_COOKIE = "of_fc_attempt";
const THIRTY_DAYS = 60 * 60 * 24 * 30;
const PATH = "/hiring-test/fc-executive";

export interface FcKey {
  id: string;
  token: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[0-9a-f]{64}$/i;

export async function readFcKey(): Promise<FcKey | null> {
  const value = (await cookies()).get(FC_COOKIE)?.value ?? "";
  const [id, token] = value.split(".");
  return id && token && UUID.test(id) && TOKEN.test(token) ? { id, token } : null;
}

/** Only where cookies can be set: a server action or a route handler. */
export async function writeFcKey(key: FcKey): Promise<void> {
  (await cookies()).set(FC_COOKIE, `${key.id}.${key.token}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: PATH,
    maxAge: THIRTY_DAYS,
  });
}

export async function clearFcKey(): Promise<void> {
  (await cookies()).set(FC_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: PATH, maxAge: 0 });
}
