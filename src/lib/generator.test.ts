import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { generateProgram, type PoolExercise } from "./generator.ts";

const pool = JSON.parse(
  readFileSync(new URL("../data/exercises.json", import.meta.url), "utf8"),
) as PoolExercise[];

const targets = {
  pectorals: 12, lats: 10, "upper back": 10, delts: 10, quads: 12, hamstrings: 10,
  glutes: 10, biceps: 8, triceps: 8, calves: 8, abs: 8,
};
const full = ["body weight", "dumbbell", "barbell", "ez barbell", "cable", "leverage machine", "smith machine", "sled machine"];

for (const days of [1, 2, 3, 4, 5, 6, 7]) {
  test(`${days}-day program respects time limit and has no duplicate exercises`, () => {
    const p = generateProgram({ targets, days, minutes: 60, equipment: full }, pool);
    assert.ok(p.days.length >= 1 && p.days.length <= days);
    for (const m of p.minutes) assert.ok(m <= 60, `day over limit: ${m}`);
    const ids = p.days.flatMap((d) => d.items.map((i) => i.exerciseId));
    assert.equal(new Set(ids).size, ids.length);
    for (const d of p.days) for (const i of d.items) assert.ok(i.sets >= 1);
  });
}

test("only uses available equipment", () => {
  const p = generateProgram({ targets, days: 4, minutes: 60, equipment: ["body weight"] }, pool);
  const eq = new Map(pool.map((e) => [e.id, e.equipment]));
  for (const d of p.days) for (const i of d.items) assert.equal(eq.get(i.exerciseId), "body weight");
});

test("generous time reaches targets with a full gym", () => {
  const p = generateProgram({ targets, days: 5, minutes: 90, equipment: full }, pool);
  for (const s of p.summary) assert.ok(s.achieved >= s.target * 0.85, `${s.muscle} ${s.achieved}/${s.target}`);
});

test("tight time limit warns about shortfall", () => {
  const p = generateProgram({ targets, days: 2, minutes: 20, equipment: full }, pool);
  assert.ok(p.warnings.length > 0);
});

test("deterministic per seed, varies across seeds", () => {
  const a = generateProgram({ targets, days: 4, minutes: 60, equipment: full, seed: 5 }, pool);
  const b = generateProgram({ targets, days: 4, minutes: 60, equipment: full, seed: 5 }, pool);
  const c = generateProgram({ targets, days: 4, minutes: 60, equipment: full, seed: 6 }, pool);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.days, c.days);
});

test("strength goal programs only the chosen lifts", () => {
  const lifts = { lowbar: 8, bench: 8, row: 6, pullup: 0, deadlift: 4 };
  const p = generateProgram({ targets: {}, lifts, days: 4, minutes: 75, equipment: full, goal: "strength" }, pool);
  const names = new Map(pool.map((e) => [e.id, e.name]));
  const used = new Set(p.days.flatMap((d) => d.items.map((i) => names.get(i.exerciseId))));
  assert.deepEqual([...used].sort(), ["barbell bench press", "barbell bent over row", "barbell deadlift", "barbell low bar squat"]);
  for (const m of p.minutes) assert.ok(m <= 75);
  for (const s of p.summary) assert.equal(s.achieved, s.target);
});

test("strength lifts needing unavailable equipment are skipped with a warning", () => {
  const p = generateProgram({ targets: {}, lifts: { lowbar: 6, pullup: 6 }, days: 3, minutes: 60, equipment: ["barbell"], goal: "strength" }, pool);
  assert.equal(p.summary.length, 1);
  assert.ok(p.warnings.some((w) => w.includes("Weighted pull-up")));
});
