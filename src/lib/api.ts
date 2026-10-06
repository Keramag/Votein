import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export const json = (data: unknown, init?: ResponseInit) => NextResponse.json(data, init);
export const fail = (status: number, error: string) => NextResponse.json({ error }, { status });
export const notFound = () => fail(404, "Not found");

/** Mutations must be JSON, which browsers can't send cross-site without a CORS preflight. */
export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<{ data: T } | { error: Response }> {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return { error: fail(415, "Expected application/json") };
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { error: fail(400, "Invalid JSON") };
  }
  const r = schema.safeParse(body);
  if (!r.success) return { error: fail(400, r.error.issues[0]?.message ?? "Invalid body") };
  return { data: r.data };
}

export const parseId = (s: string) => {
  const n = Number(s);
  return Number.isInteger(n) && n > 0 ? n : null;
};
