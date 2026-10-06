import { z } from "zod";
import { restoreKey } from "@/lib/auth";
import { fail, json, parseBody } from "@/lib/api";

export async function POST(req: Request) {
  const p = await parseBody(req, z.object({ key: z.string().min(10).max(100) }));
  if ("error" in p) return p.error;
  return (await restoreKey(p.data.key.trim())) ? json({ ok: true }) : fail(404, "Unknown key");
}
