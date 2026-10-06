// Personal-record logic. Pure: operates on plain rows, no DB access.

export type SetRow = {
  id: number;
  workoutId: number;
  date: string;
  exerciseId: string;
  weight: number | null; // kg
  reps: number | null;
};

export type PRType = "weight" | "e1rm" | "reps";

/** Epley estimated one-rep max; ignores very high-rep sets, which are unreliable. */
export function e1rm(weight: number, reps: number) {
  if (weight <= 0 || reps <= 0 || reps > 20) return 0;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

type Best = { weight: number; e1rm: number; reps: number };
const emptyBest = (): Best => ({ weight: 0, e1rm: 0, reps: 0 });

export type ExerciseRecord = {
  exerciseId: string;
  weight?: { value: number; reps: number; date: string };
  e1rm?: { value: number; date: string };
  reps?: { value: number; date: string };
  sessions: number;
  lastDate: string;
};

/**
 * `rows` must be completed sets in chronological order (date, workout id, position, set no).
 * Returns per-exercise records and, for every set that set a record in its
 * workout, the record types. An exercise's first workout never produces PRs.
 */
export function computePRs(rows: SetRow[]) {
  const records = new Map<string, ExerciseRecord>();
  const setPrs = new Map<number, PRType[]>();
  const best = new Map<string, Best>(); // before the current workout
  const sessions = new Map<string, Set<number>>();

  // group by workout + exercise, preserving order
  const groups: SetRow[][] = [];
  let cur: SetRow[] = [];
  const key = (r: SetRow) => `${r.workoutId}:${r.exerciseId}`;
  for (const r of rows) {
    if (cur.length && key(cur[0]) !== key(r)) {
      groups.push(cur);
      cur = [];
    }
    cur.push(r);
  }
  if (cur.length) groups.push(cur);

  for (const g of groups) {
    const ex = g[0].exerciseId;
    const prior = best.get(ex);
    const next = prior ? { ...prior } : emptyBest();
    const flagged: Record<PRType, { id: number; v: number } | null> = {
      weight: null,
      e1rm: null,
      reps: null,
    };
    const rec: ExerciseRecord = records.get(ex) ?? {
      exerciseId: ex,
      sessions: 0,
      lastDate: g[0].date,
    };
    for (const r of g) {
      const w = r.weight ?? 0;
      const reps = r.reps ?? 0;
      if (reps <= 0) continue;
      const est = e1rm(w, reps);
      if (w > 0) {
        if (w > next.weight) {
          next.weight = w;
          flagged.weight = { id: r.id, v: w };
        }
        if (!rec.weight || w > rec.weight.value || (w === rec.weight.value && reps > rec.weight.reps))
          rec.weight = { value: w, reps, date: r.date };
        if (est > next.e1rm) {
          next.e1rm = est;
          flagged.e1rm = { id: r.id, v: est };
        }
        if (est > 0 && (!rec.e1rm || est > rec.e1rm.value)) rec.e1rm = { value: est, date: r.date };
      } else if (reps > next.reps) {
        next.reps = reps;
        flagged.reps = { id: r.id, v: reps };
      }
      if (w <= 0 && (!rec.reps || reps > rec.reps.value)) rec.reps = { value: reps, date: r.date };
    }
    if (prior) {
      for (const t of ["weight", "e1rm", "reps"] as const) {
        const f = flagged[t];
        if (f) setPrs.set(f.id, [...(setPrs.get(f.id) ?? []), t]);
      }
    }
    best.set(ex, next);
    const s = sessions.get(ex) ?? new Set();
    s.add(g[0].workoutId);
    sessions.set(ex, s);
    rec.sessions = s.size;
    rec.lastDate = g[0].date;
    records.set(ex, rec);
  }
  return { records, setPrs };
}
