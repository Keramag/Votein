import { currentUser } from "@/lib/auth";
import { json } from "@/lib/api";
import { lastSets } from "@/lib/workouts";

/** Sets from the most recent completed workout containing this exercise. */
export async function GET(_req: Request, ctx: { params: Promise<{ exerciseId: string }> }) {
  const user = await currentUser();
  const { exerciseId } = await ctx.params;
  return json({ sets: user ? lastSets(user.id, exerciseId) : [] });
}
