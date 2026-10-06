import { ensureUser } from "@/lib/auth";
import { json, notFound, parseId } from "@/lib/api";
import { activateSplit } from "@/lib/splits";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = parseId((await ctx.params).id);
  if (!id) return notFound();
  const user = await ensureUser();
  return activateSplit(user.id, id) ? json({ ok: true }) : notFound();
}
