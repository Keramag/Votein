import { z } from "zod";
import { ensureUser } from "@/lib/auth";
import { fail, json, parseBody } from "@/lib/api";
import { createWorkout } from "@/lib/workouts";
import { getSplit } from "@/lib/splits";

const body = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  name: z.string().max(80).optional(),
  splitId: z.number().int().optional(),
  dayIndex: z.number().int().min(0).optional(),
});

export async function POST(req: Request) {
  const p = await parseBody(req, body);
  if ("error" in p) return p.error;
  const user = await ensureUser();
  const { splitId, dayIndex, ...rest } = p.data;
  let split;
  if (splitId !== undefined && dayIndex !== undefined) {
    const s = getSplit(user.id, splitId);
    if (!s || !s.data.days[dayIndex]) return fail(404, "Split day not found");
    split = { id: s.id, dayIndex, data: s.data };
  }
  return json({ id: createWorkout(user.id, { ...rest, split }) }, { status: 201 });
}
