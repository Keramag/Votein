import { cookies, headers } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";

// No accounts: each browser gets a random secret key in an httpOnly cookie.
// The key can be copied to another device from Settings to share the data.
export const COOKIE = "votein_key";

export type User = { id: number; unit: "kg" | "lb" };

const hash = (key: string) => createHash("sha256").update(key).digest("hex");

function lookup(key: string): User | null {
  const row = db()
    .prepare("select id, unit from users where token_hash = ?")
    .get(hash(key)) as User | undefined;
  return row ?? null;
}

/** For server components: the current user, or null if this browser has no data yet. */
export async function currentUser(): Promise<User | null> {
  const key = (await cookies()).get(COOKIE)?.value;
  return key ? lookup(key) : null;
}

export async function setKeyCookie(key: string) {
  const secure = (await headers()).get("x-forwarded-proto") === "https";
  (await cookies()).set(COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 5,
  });
}

/** For route handlers: the current user, creating one (and the cookie) on first write. */
export async function ensureUser(): Promise<User> {
  const existing = (await cookies()).get(COOKIE)?.value;
  if (existing) {
    const u = lookup(existing);
    if (u) return u;
  }
  const key = randomBytes(32).toString("base64url");
  const r = db().prepare("insert into users (token_hash) values (?)").run(hash(key));
  await setKeyCookie(key);
  return { id: Number(r.lastInsertRowid), unit: "kg" };
}

export async function currentKey() {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

/** Switches this browser to an existing key; returns false if the key is unknown. */
export async function restoreKey(key: string) {
  if (!lookup(key)) return false;
  await setKeyCookie(key);
  return true;
}

/** Today's date (YYYY-MM-DD) in the browser's timezone, as reported by the `tz` cookie. */
export async function localToday() {
  const tz = (await cookies()).get("tz")?.value;
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
