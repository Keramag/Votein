import { ensureUser } from "@/lib/auth";
import { json, notFound, parseBody, parseId } from "@/lib/api";
import { splitSchema } from "@/lib/program";
import { deleteSplit, updateSplit } from "@/lib/splits";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const id = parseId((await ctx.params).id);
  if (!id) return notFound();
  const p = await parseBody(req, splitSchema);
  if ("error" in p) return p.error;
  const user = await ensureUser();
  return updateSplit(user.id, id, p.data) ? json({ ok: true }) : notFound();
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const id = parseId((await ctx.params).id);
  if (!id) return notFound();
  const user = await ensureUser();
  return deleteSplit(user.id, id) ? json({ ok: true }) : notFound();
}
