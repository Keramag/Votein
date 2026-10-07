import { z } from "zod";
import { json, parseBody } from "@/lib/api";
import { exercises, metaFor } from "@/lib/exercises";
import { generateProgram } from "@/lib/generator";

const body = z.object({
  targets: z.record(z.string(), z.number().min(0).max(60)),
  lifts: z.record(z.string(), z.number().min(0).max(60)).optional(),
  days: z.number().int().min(1).max(7),
  minutes: z.number().int().min(15).max(240),
  equipment: z.array(z.string()).max(40),
  goal: z.enum(["strength", "hypertrophy", "powerbuilding"]).optional(),
  seed: z.number().int().optional(),
});

export async function POST(req: Request) {
  const p = await parseBody(req, body);
  if ("error" in p) return p.error;
  const program = generateProgram(p.data, exercises);
  const ids = program.days.flatMap((d) => d.items.map((i) => i.exerciseId));
  return json({ ...program, meta: metaFor(ids) });
}
