import { json } from "@/lib/api";
import { searchExercises, toMeta } from "@/lib/exercises";

export function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const limit = Math.min(60, Math.max(1, Number(sp.get("limit")) || 30));
  const results = searchExercises({
    q: sp.get("q") ?? undefined,
    target: sp.get("target") || undefined,
    equipment: sp.get("equipment") || undefined,
  });
  return json({ total: results.length, results: results.slice(0, limit).map(toMeta) });
}
