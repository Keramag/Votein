import { z } from "zod";
import { db, tx } from "./db";
import { computePRs, type ExerciseRecord, type PRType, type SetRow } from "./pr";
import type { SplitData } from "./program";

export const workoutInput = z.object({
  name: z.string().max(80),
  notes: z.string().max(2000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  finished: z.boolean(),
  exercises: z
    .array(
      z.object({
        exerciseId: z.string().min(1).max(20),
        sets: z
          .array(
            z.object({
              weight: z.number().min(0).max(2000).nullable(),
              reps: z.number().int().min(0).max(1000).nullable(),
              done: z.boolean(),
              target: z.string().max(12).nullable().optional(),
            }),
          )
          .max(50),
      }),
    )
    .max(60),
});
export type WorkoutInput = z.infer<typeof workoutInput>;

export type WorkoutSet = { id: number; weight: number | null; reps: number | null; done: boolean; target: string | null };
export type Workout = {
  id: number;
  name: string;
  notes: string;
  date: string;
  startedAt: string;
  finishedAt: string | null;
  exercises: { exerciseId: string; sets: WorkoutSet[] }[];
};

type WorkoutRow = {
  id: number;
  name: string;
  notes: string;
  date: string;
  started_at: string;
  finished_at: string | null;
};
type SetDbRow = {
  id: number;
  exercise_id: string;
  position: number;
  weight: number | null;
  reps: number | null;
  done: number;
  target_reps: string | null;
};

export const today = () => new Date().toISOString().slice(0, 10);

export function getWorkout(userId: number, id: number): Workout | null {
  const w = db()
    .prepare("select id, name, notes, date, started_at, finished_at from workouts where id = ? and user_id = ?")
    .get(id, userId) as WorkoutRow | undefined;
  if (!w) return null;
  const rows = db()
    .prepare(
      "select id, exercise_id, position, weight, reps, done, target_reps from workout_sets where workout_id = ? order by position, set_no",
    )
    .all(id) as SetDbRow[];
  const exercises: Workout["exercises"] = [];
  for (const r of rows) {
    let ex = exercises[r.position];
    if (!ex) ex = exercises[r.position] = { exerciseId: r.exercise_id, sets: [] };
    ex.sets.push({ id: r.id, weight: r.weight, reps: r.reps, done: !!r.done, target: r.target_reps });
  }
  return {
    id: w.id,
    name: w.name,
    notes: w.notes,
    date: w.date,
    startedAt: w.started_at,
    finishedAt: w.finished_at,
    exercises: exercises.filter(Boolean),
  };
}

function writeSets(workoutId: number, exercises: WorkoutInput["exercises"]) {
  const d = db();
  d.prepare("delete from workout_sets where workout_id = ?").run(workoutId);
  const ins = d.prepare(
    "insert into workout_sets (workout_id, exercise_id, position, set_no, weight, reps, done, target_reps) values (?,?,?,?,?,?,?,?)",
  );
  exercises.forEach((ex, pos) =>
    ex.sets.forEach((s, i) =>
      ins.run(workoutId, ex.exerciseId, pos, i, s.weight, s.reps, s.done ? 1 : 0, s.target ?? null),
    ),
  );
}

export function saveWorkout(userId: number, id: number, input: WorkoutInput): boolean {
  return tx(() => {
    const cur = db()
      .prepare("select finished_at from workouts where id = ? and user_id = ?")
      .get(id, userId) as { finished_at: string | null } | undefined;
    if (!cur) return false;
    const finishedAt = input.finished ? (cur.finished_at ?? new Date().toISOString()) : null;
    db()
      .prepare("update workouts set name = ?, notes = ?, date = ?, finished_at = ? where id = ?")
      .run(input.name, input.notes, input.date, finishedAt, id);
    writeSets(id, input.exercises);
    return true;
  });
}

export function deleteWorkout(userId: number, id: number) {
  return db().prepare("delete from workouts where id = ? and user_id = ?").run(id, userId).changes > 0;
}

/** The most recent completed sets for an exercise, used to prefill a new workout. */
export function lastSets(userId: number, exerciseId: string, excludeWorkoutId = 0) {
  const w = db()
    .prepare(
      `select w.id from workouts w join workout_sets s on s.workout_id = w.id
       where w.user_id = ? and s.exercise_id = ? and s.done = 1 and w.id != ?
       order by w.date desc, w.id desc limit 1`,
    )
    .get(userId, exerciseId, excludeWorkoutId) as { id: number } | undefined;
  if (!w) return [];
  return db()
    .prepare("select weight, reps from workout_sets where workout_id = ? and exercise_id = ? and done = 1 order by set_no")
    .all(w.id, exerciseId) as { weight: number | null; reps: number | null }[];
}

export function createWorkout(
  userId: number,
  opts: { date?: string; name?: string; split?: { id: number; dayIndex: number; data: SplitData } },
): number {
  return tx(() => {
    const day = opts.split?.data.days[opts.split.dayIndex];
    const r = db()
      .prepare(
        "insert into workouts (user_id, date, name, started_at, split_id, day_index) values (?,?,?,?,?,?)",
      )
      .run(
        userId,
        opts.date ?? today(),
        opts.name ?? (day ? `${opts.split!.data.name}: ${day.name}` : ""),
        new Date().toISOString(),
        opts.split?.id ?? null,
        opts.split?.dayIndex ?? null,
      );
    const id = Number(r.lastInsertRowid);
    if (day) {
      writeSets(
        id,
        day.items.map((it) => {
          const last = lastSets(userId, it.exerciseId);
          return {
            exerciseId: it.exerciseId,
            sets: Array.from({ length: it.sets }, (_, i) => {
              const l = last[i] ?? last[last.length - 1];
              return { weight: l?.weight ?? null, reps: l?.reps ?? null, done: false, target: it.reps };
            }),
          };
        }),
      );
    }
    return id;
  });
}

export type WorkoutSummary = {
  id: number;
  name: string;
  date: string;
  finished: boolean;
  exerciseIds: string[];
  sets: number;
  volume: number; // kg
  minutes: number | null;
};

export function listWorkouts(userId: number, limit = 30, offset = 0): WorkoutSummary[] {
  const ws = db()
    .prepare(
      "select id, name, date, started_at, finished_at from workouts where user_id = ? order by date desc, id desc limit ? offset ?",
    )
    .all(userId, limit, offset) as { id: number; name: string; date: string; started_at: string; finished_at: string | null }[];
  const stmt = db().prepare(
    "select exercise_id, position, weight, reps, done from workout_sets where workout_id = ? order by position, set_no",
  );
  return ws.map((w) => {
    const rows = stmt.all(w.id) as { exercise_id: string; position: number; weight: number | null; reps: number | null; done: number }[];
    const ids: string[] = [];
    let sets = 0;
    let volume = 0;
    for (const r of rows) {
      if (!ids.includes(r.exercise_id)) ids.push(r.exercise_id);
      if (r.done) {
        sets++;
        volume += (r.weight ?? 0) * (r.reps ?? 0);
      }
    }
    const minutes = w.finished_at
      ? Math.max(1, Math.round((Date.parse(w.finished_at) - Date.parse(w.started_at)) / 60000))
      : null;
    return { id: w.id, name: w.name, date: w.date, finished: !!w.finished_at, exerciseIds: ids, sets, volume, minutes };
  });
}

function allDoneSets(userId: number): SetRow[] {
  const rows = db()
    .prepare(
      `select s.id, s.workout_id, w.date, s.exercise_id, s.weight, s.reps
       from workout_sets s join workouts w on w.id = s.workout_id
       where w.user_id = ? and s.done = 1
       order by w.date, w.id, s.position, s.set_no`,
    )
    .all(userId) as { id: number; workout_id: number; date: string; exercise_id: string; weight: number | null; reps: number | null }[];
  return rows.map((r) => ({
    id: r.id,
    workoutId: r.workout_id,
    date: r.date,
    exerciseId: r.exercise_id,
    weight: r.weight,
    reps: r.reps,
  }));
}

export function personalRecords(userId: number): ExerciseRecord[] {
  const { records } = computePRs(allDoneSets(userId));
  return [...records.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}

/** PR types by set id for the given workout. */
export function workoutPrs(userId: number, workoutId: number): Record<number, PRType[]> {
  const { setPrs } = computePRs(allDoneSets(userId));
  const ids = new Set(
    (db().prepare("select id from workout_sets where workout_id = ?").all(workoutId) as { id: number }[]).map((r) => r.id),
  );
  const out: Record<number, PRType[]> = {};
  for (const [id, t] of setPrs) if (ids.has(id)) out[id] = t;
  return out;
}

export type RecentPr = { exerciseId: string; date: string; types: PRType[]; weight: number | null; reps: number | null };

export function recentPrs(userId: number, limit = 5): RecentPr[] {
  const rows = allDoneSets(userId);
  const { setPrs } = computePRs(rows);
  return rows
    .filter((r) => setPrs.has(r.id))
    .reverse()
    .slice(0, limit)
    .map((r) => ({ exerciseId: r.exerciseId, date: r.date, types: setPrs.get(r.id)!, weight: r.weight, reps: r.reps }));
}
