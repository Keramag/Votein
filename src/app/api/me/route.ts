import { z } from "zod";
import { ensureUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { json, parseBody } from "@/lib/api";

export async function PUT(req: Request) {
  const p = await parseBody(req, z.object({ unit: z.enum(["kg", "lb"]) }));
  if ("error" in p) return p.error;
  const user = await ensureUser();
  db().prepare("update users set unit = ? where id = ?").run(p.data.unit, user.id);
  return json({ ok: true });
}
