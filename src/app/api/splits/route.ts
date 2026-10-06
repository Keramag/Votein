import { ensureUser } from "@/lib/auth";
import { json, parseBody } from "@/lib/api";
import { splitSchema } from "@/lib/program";
import { createSplit } from "@/lib/splits";

export async function POST(req: Request) {
  const p = await parseBody(req, splitSchema);
  if ("error" in p) return p.error;
  const user = await ensureUser();
  return json({ id: createSplit(user.id, p.data) }, { status: 201 });
}
