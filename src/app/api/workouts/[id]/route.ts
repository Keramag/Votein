import { ensureUser } from "@/lib/auth";
import { fail, json, notFound, parseBody, parseId } from "@/lib/api";
import { deleteWorkout, saveWorkout, workoutInput, workoutPrs } from "@/lib/workouts";
import { getWorkout } from "@/lib/workouts";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const id = parseId((await ctx.params).id);
  if (!id) return notFound();
  const p = await parseBody(req, workoutInput);
  if ("error" in p) return p.error;
  const user = await ensureUser();
  if (!saveWorkout(user.id, id, p.data)) return notFound();
  // set ids change on every save, so return the fresh workout with its PR flags
  return json({ workout: getWorkout(user.id, id), prs: workoutPrs(user.id, id) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const id = parseId((await ctx.params).id);
  if (!id) return notFound();
  const user = await ensureUser();
  return deleteWorkout(user.id, id) ? json({ ok: true }) : fail(404, "Not found");
}
