// Program generator: weekly volume targets + days + session time + equipment -> weekly program.
// Pure and deterministic for a given seed; takes the exercise pool as an argument.
import { MUSCLES, MUSCLE_BY_KEY, secondaryMuscles, type Category } from "./muscles.ts";
import type { ProgramDay, ProgramItem } from "./program.ts";

export type Goal = "strength" | "hypertrophy" | "powerbuilding";

export type PoolExercise = {
  id: string;
  name: string;
  target: string;
  equipment: string;
  secondary: string[];
};

export type GenInput = {
  /** weekly working sets per muscle key */
  targets: Record<string, number>;
  days: number;
  /** max minutes per session */
  minutes: number;
  /** dataset equipment values that are available */
  equipment: string[];
  goal?: Goal;
  /** strength goal only: weekly working sets per lift key (see STRENGTH_LIFTS) */
  lifts?: Record<string, number>;
  seed?: number;
};

export type StrengthLift = {
  key: string;
  label: string;
  /** dataset exercise id */
  id: string;
  cat: "legs" | "push" | "pull";
  reps: string;
  restSec: number;
  /** default weekly sets */
  def: number;
};

export const STRENGTH_LIFTS: StrengthLift[] = [
  { key: "highbar", label: "High bar squat", id: "1436", cat: "legs", reps: "3-5", restSec: 180, def: 5 },
  { key: "lowbar", label: "Low bar squat", id: "1435", cat: "legs", reps: "3-5", restSec: 180, def: 4 },
  { key: "deadlift", label: "Deadlift", id: "0032", cat: "legs", reps: "2-5", restSec: 210, def: 4 },
  { key: "rdl", label: "Romanian deadlift", id: "0085", cat: "legs", reps: "5-8", restSec: 150, def: 3 },
  { key: "bench", label: "Bench press", id: "0025", cat: "push", reps: "3-5", restSec: 180, def: 9 },
  { key: "incline", label: "Incline bench press", id: "0047", cat: "push", reps: "5-8", restSec: 150, def: 3 },
  { key: "ohp", label: "Overhead press", id: "0091", cat: "push", reps: "3-6", restSec: 180, def: 6 },
  { key: "row", label: "Barbell row", id: "0027", cat: "pull", reps: "5-8", restSec: 150, def: 6 },
  { key: "pullup", label: "Weighted pull-up", id: "0841", cat: "pull", reps: "4-6", restSec: 150, def: 6 },
  { key: "dip", label: "Weighted dip", id: "3313", cat: "push", reps: "5-8", restSec: 150, def: 3 },
];

export type MuscleSummary = {
  muscle: string;
  /** display name when `muscle` is not a muscle key (strength lifts) */
  label?: string;
  target: number;
  /** direct sets + half credit for sets where the muscle is a secondary mover */
  achieved: number;
};

export type Program = {
  days: ProgramDay[];
  /** estimated minutes per day, same order as days */
  minutes: number[];
  summary: MuscleSummary[];
  warnings: string[];
};

const WARMUP_MIN = 5;
const WORK_SEC = 40;
const SETUP_SEC = 45;
const INDIRECT_CREDIT = 0.5;
const MAX_CREDIT_SHARE = 0.5; // indirect sets count for at most half of a muscle's target
const MIN_SETS = 2;
const MAX_SESSION_SETS = 10;

const PARAMS: Record<"strength" | "hypertrophy", { comp: [string, number]; iso: [string, number]; compRest: number; isoRest: number }> = {
  strength: { comp: ["4-6", 0], iso: ["8-12", 0], compRest: 180, isoRest: 120 },
  hypertrophy: { comp: ["6-10", 0], iso: ["10-15", 0], compRest: 120, isoRest: 75 },
};

const EQUIPMENT_SCORE: Record<string, number> = {
  barbell: 2,
  "olympic barbell": 2,
  "trap bar": 2,
  "ez barbell": 1.6,
  dumbbell: 1.6,
  cable: 1.5,
  "leverage machine": 1.4,
  "smith machine": 1.3,
  "sled machine": 1.3,
  weighted: 1,
  kettlebell: 1,
  "body weight": 1,
  "wheel roller": 1,
  band: 0.5,
  "resistance band": 0.5,
  "stability ball": 0.3,
  "bosu ball": 0.3,
  "medicine ball": 0.3,
};

const JUNK = /stretch|yoga|\bpose\b|mobility|foam|massage|\bv\. \d|isometric|hold\b/i;
const STAPLE =
  /\b(bench press|squat|deadlift|row|pull-?up|chin-?up|overhead press|shoulder press|military press|pulldown|leg press|lunge|hip thrust|curl|pushdown|triceps extension|lateral raise|calf raise|crunch|plank|push-?up|dip|face pull|shrug|leg extension|fly|raise|thrusts?)\b/i;
const MODIFIERS = new Set(
  "barbell dumbbell cable lever leverage smith ez ez-bar bar kettlebell band weighted seated standing incline decline flat lying bent over one arm alternate alternating wide-grip close-grip reverse grip overhand underhand narrow wide stance front with rope".split(" "),
);
const CANON = new Set([
  "bench press", "squat", "front squat", "deadlift", "romanian deadlift", "stiff leg deadlift", "overhead press",
  "shoulder press", "military press", "row", "pulldown", "lat pulldown", "pull-up", "pull up", "chin-up", "chin up",
  "leg press", "lunge", "split squat", "hip thrust", "glute bridge", "curl", "hammer curl", "preacher curl",
  "concentration curl", "triceps extension", "skull crusher", "pushdown", "triceps pushdown", "lateral raise",
  "front raise", "rear delt fly", "calf raise", "crunch", "leg raise", "leg curl", "leg extension", "fly",
  "face pull", "shrug", "push-up", "push up", "dip", "plank", "good morning", "step-up", "step up", "hack squat",
  "goblet squat", "pullover", "upright row", "hanging leg raise", "back extension", "chest press", "pec deck fly",
  "reverse fly", "kickback", "triceps dip",
]);
const canonical = (name: string) =>
  CANON.has(
    normalizeName(name)
      .replace(/[()]/g, "")
      .split(/\s+/)
      .filter((w) => !MODIFIERS.has(w))
      .join(" "),
  );
const COMPOUND_NAME =
  /\b(squat|deadlift|press|row|pull-?up|chin-?up|lunge|thrust|dip|push-?up|pulldown|step-?up|good morning)\b/i;
const ISOLATION_NAME = /\b(curl|extension|fly|raise|pushdown|kickback|shrug|crunch|plank|calf)\b/i;
const ODD = /\b(one arm|one leg|single|on knees|chair|twist|rotation|jump|plyo|kneeling|behind neck|neck|bosu|ball|wheel|band)\b/i;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Scored = PoolExercise & {
  score: number;
  compound: boolean;
  indirect: string[];
};

type Theme = { name: string; cats: Category[]; muscles?: string[] };

const ALL: Category[] = ["push", "pull", "legs", "core"];
const UPPER: Category[] = ["push", "pull", "core"];
const LOWER: Category[] = ["legs", "core"];

function themesFor(n: number, targets: Record<string, number>): Theme[] {
  const push: Theme = { name: "Push", cats: ["push", "core"] };
  const pull: Theme = { name: "Pull", cats: ["pull", "core"] };
  const legs: Theme = { name: "Legs", cats: LOWER };
  const named = (ts: Theme[]) => {
    const count = new Map<string, number>();
    for (const t of ts) count.set(t.name, (count.get(t.name) ?? 0) + 1);
    const seen = new Map<string, number>();
    return ts.map((t) => {
      if ((count.get(t.name) ?? 0) < 2) return t;
      const i = seen.get(t.name) ?? 0;
      seen.set(t.name, i + 1);
      return { ...t, name: `${t.name} ${"ABC"[i]}` };
    });
  };
  const full: Theme = { name: "Full body", cats: ALL };
  switch (n) {
    case 1:
      return [full];
    case 2:
      return named([full, full]);
    case 3: {
      const heavy = MUSCLES.some((m) => m.large && (targets[m.key] ?? 0) >= 12);
      return heavy ? named([full, full, full]) : [push, pull, legs];
    }
    case 4:
      return named([
        { name: "Upper", cats: UPPER },
        { name: "Lower", cats: LOWER },
        { name: "Upper", cats: UPPER },
        { name: "Lower", cats: LOWER },
      ]);
    case 5:
      return [
        push,
        pull,
        legs,
        { name: "Upper", cats: UPPER },
        { name: "Lower", cats: LOWER },
      ];
    case 6:
      return named([push, pull, legs, push, pull, legs]);
    default:
      return [
        ...named([push, pull, legs, push, pull, legs]),
        {
          name: "Arms & core",
          cats: [],
          muscles: ["biceps", "triceps", "forearms", "delts", "abs", "calves"],
        },
      ];
  }
}

const WEEKDAY_PATTERN: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 3, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};

type Slot = { muscle: string; ex: Scored; sets: number; rest: number; reps: string; lift?: boolean };

function normalizeName(n: string) {
  return n.replace(/\s*\((male|female)\)/gi, "").trim().toLowerCase();
}

export function slotSeconds(sets: number, rest: number) {
  return sets * WORK_SEC + Math.max(0, sets - 1) * rest + SETUP_SEC;
}

const dayMinutes = (slots: Slot[]) =>
  slots.length
    ? Math.ceil(WARMUP_MIN + slots.reduce((s, x) => s + slotSeconds(x.sets, x.rest), 0) / 60)
    : 0;

/** Spreads the chosen strength lifts over the days; returns the lifts that could be placed. */
function placeLifts(
  input: GenInput,
  byId: Map<string, PoolExercise>,
  n: number,
  dayslots: Slot[][],
  load: number[],
  allowed: (cat: StrengthLift["cat"], day: number) => boolean,
  warnings: string[],
) {
  const equip = new Set(input.equipment);
  const catLoad = dayslots.map(() => ({ legs: 0, push: 0, pull: 0 }));
  const picked = STRENGTH_LIFTS.filter((l) => (input.lifts?.[l.key] ?? 0) >= 1).map((l) => ({
    l,
    sets: Math.min(60, Math.round(input.lifts![l.key])),
  }));
  const usable = picked.filter(({ l }) => {
    const e = byId.get(l.id);
    if (e && equip.has(e.equipment)) return true;
    warnings.push(`${l.label} needs ${e?.equipment ?? "other"} equipment, which isn't selected.`);
    return false;
  });

  // heaviest demands first so they get the emptiest days
  for (const { l, sets: total } of usable.sort((a, b) => b.sets - a.sets)) {
    const e = byId.get(l.id)!;
    const days = Array.from({ length: n }, (_, d) => d).filter((d) => allowed(l.cat, d));
    if (!days.length) {
      warnings.push(`${l.label} doesn't fit this ${n}-day layout.`);
      continue;
    }
    const f = Math.min(days.length, Math.max(1, Math.ceil(total / 5)), 4);
    const chosen: number[] = [];
    for (let k = 0; k < f; k++) {
      let best = -1;
      let bestCost = Infinity;
      for (const d of days) {
        if (chosen.includes(d)) continue;
        // keep sessions of one lift apart and avoid stacking the same movement group
        const adjacent = chosen.some((c) => Math.abs(c - d) === 1) ? 4 : 0;
        const cost = load[d] + catLoad[d][l.cat] * 1.5 + adjacent;
        if (cost < bestCost) {
          bestCost = cost;
          best = d;
        }
      }
      chosen.push(best);
    }
    chosen.sort((a, b) => a - b);
    chosen.forEach((d, i) => {
      const sets = Math.floor(total / f) + (i < total % f ? 1 : 0);
      if (sets <= 0) return;
      dayslots[d].push({
        muscle: l.key,
        ex: { ...e, score: 0, compound: true, indirect: secondaryMuscles(e.secondary, e.target) },
        lift: true,
        sets,
        rest: l.restSec,
        reps: l.reps,
      });
      load[d] += sets;
      catLoad[d][l.cat] += sets;
    });
  }

  return usable;
}

function generateStrength(input: GenInput, pool: PoolExercise[]): Program {
  const n = Math.min(7, Math.max(1, Math.round(input.days)));
  const limit = Math.max(15, input.minutes);
  const warnings: string[] = [];
  const byId = new Map(pool.map((e) => [e.id, e]));

  const dayslots: Slot[][] = Array.from({ length: n }, () => []);
  const load = new Array<number>(n).fill(0);
  const usable = placeLifts(input, byId, n, dayslots, load, () => true, warnings);

  const liftOrder = (s: Slot) => STRENGTH_LIFTS.findIndex((l) => l.key === s.muscle);
  const setsOf = (key: string) => dayslots.reduce((a, d) => a + d.reduce((b, s) => b + (s.muscle === key ? s.sets : 0), 0), 0);
  const targetOf = (key: string) => Math.min(60, Math.round(input.lifts?.[key] ?? 0));

  // trim over-long days from the lift furthest ahead of its target
  for (const [di, day] of dayslots.entries()) {
    while (day.length && dayMinutes(day) > limit) {
      let vi = 0;
      let vScore = -Infinity;
      day.forEach((s, i) => {
        const sc = setsOf(s.muscle) / (targetOf(s.muscle) || 1) + i * 0.01;
        if (sc > vScore) {
          vScore = sc;
          vi = i;
        }
      });
      if (day.length === 1 && day[0].sets <= 1) break;
      if (day[vi].sets > 1) day[vi].sets--;
      else day.splice(vi, 1);
    }
    if (dayMinutes(day) > limit) warnings.push(`Day ${di + 1} can't fit in ${limit} min.`);
  }

  const kept = dayslots.map((slots) => slots.sort((a, b) => liftOrder(a) - liftOrder(b))).filter((s) => s.length);
  if (kept.length < n) warnings.push(`Dropped ${n - kept.length} empty training day(s).`);

  const pattern = WEEKDAY_PATTERN[kept.length] ?? [];
  const days: ProgramDay[] = kept.map((slots, i) => {
    const cats = new Set(slots.map((s) => STRENGTH_LIFTS.find((l) => l.key === s.muscle)!.cat));
    return {
      name: cats.size === 1 ? { legs: "Lower", push: "Push", pull: "Pull" }[[...cats][0]] : `Day ${i + 1}`,
      weekday: pattern[i] ?? null,
      items: slots.map<ProgramItem>((s) => ({ exerciseId: s.ex.id, sets: s.sets, reps: s.reps, restSec: s.rest })),
    };
  });
  // number repeated day names, like the hypertrophy layouts do
  const counts = new Map<string, number>();
  for (const d of days) counts.set(d.name, (counts.get(d.name) ?? 0) + 1);
  const seen = new Map<string, number>();
  for (const d of days)
    if ((counts.get(d.name) ?? 0) > 1) {
      const i = seen.get(d.name) ?? 0;
      seen.set(d.name, i + 1);
      d.name = `${d.name} ${"ABCDEFG"[i]}`;
    }

  const summary: MuscleSummary[] = usable.map(({ l }) => ({
    muscle: l.key,
    label: l.label,
    target: targetOf(l.key),
    achieved: setsOf(l.key),
  }));
  for (const s of summary)
    if (s.achieved < s.target) warnings.push(`${s.label}: ${s.achieved} of ${s.target} weekly sets fit. Add training days or session time to reach it.`);
  if (!usable.length && !warnings.length) warnings.push("Pick at least one lift.");

  return { days, minutes: kept.map(dayMinutes), summary, warnings };
}

export function generateProgram(input: GenInput, pool: PoolExercise[]): Program {
  const goal = input.goal ?? "hypertrophy";
  if (goal === "strength") return generateStrength(input, pool);
  const P = PARAMS.hypertrophy;
  const rand = mulberry32(input.seed ?? 1);
  const n = Math.min(7, Math.max(1, Math.round(input.days)));
  const limit = Math.max(15, input.minutes);
  const equip = new Set(input.equipment);
  const warnings: string[] = [];

  const targets: Record<string, number> = {};
  for (const m of MUSCLES) {
    const t = Math.round(input.targets[m.key] ?? 0);
    if (t > 0) targets[m.key] = t;
  }

  // rank usable exercises per muscle
  const seenNames = new Set<string>();
  const ranked = new Map<string, Scored[]>();
  for (const e of pool) {
    if (!equip.has(e.equipment) || !MUSCLE_BY_KEY.has(e.target) || JUNK.test(e.name)) continue;
    const norm = normalizeName(e.name);
    if (seenNames.has(norm)) continue;
    seenNames.add(norm);
    const indirect = secondaryMuscles(e.secondary, e.target);
    const score =
      (EQUIPMENT_SCORE[e.equipment] ?? 0.5) +
      Math.min(3, indirect.length) * 0.7 +
      (canonical(e.name) ? 3 : STAPLE.test(e.name) ? 1.5 : 0) -
      (ODD.test(e.name) ? 1 : 0) -
      Math.max(0, e.name.split(/\s+/).length - 4) * 0.4 +
      rand() * 0.9;
    const list = ranked.get(e.target) ?? [];
    const compound = ISOLATION_NAME.test(e.name) ? false : COMPOUND_NAME.test(e.name) || indirect.length >= 3;
    list.push({ ...e, score, compound, indirect });
    ranked.set(e.target, list);
  }
  for (const l of ranked.values()) l.sort((a, b) => b.score - a.score);

  const themes = themesFor(n, targets);
  const dayslots: Slot[][] = themes.map(() => []);
  const load = themes.map(() => 0);
  const used = new Set<string>();
  const credit: Record<string, number> = {};

  // powerbuilding: heavy lifts go in first, and their sets count toward the muscle targets
  const placed = goal === "powerbuilding" ? placeLifts(input, new Map(pool.map((e) => [e.id, e])), themes.length, dayslots, load, (cat, d) => themes[d].cats.includes(cat), warnings) : [];
  const liftDirect: Record<string, number> = {};
  for (const day of dayslots)
    for (const sl of day) {
      used.add(sl.ex.id);
      liftDirect[sl.ex.target] = (liftDirect[sl.ex.target] ?? 0) + sl.sets;
      for (const m of sl.ex.indirect) credit[m] = (credit[m] ?? 0) + INDIRECT_CREDIT * sl.sets;
    }

  const order = [...MUSCLES].sort((a, b) => Number(b.large) - Number(a.large));
  for (const m of order) {
    const target = targets[m.key];
    if (!target) continue;
    const list = (ranked.get(m.key) ?? []).filter((e) => !used.has(e.id));
    if (!list.length) {
      warnings.push(`No ${m.label.toLowerCase()} exercise available with the selected equipment.`);
      continue;
    }

    const need = target - (liftDirect[m.key] ?? 0);
    if (need <= 0) continue;
    const direct = Math.max(
      MIN_SETS,
      Math.ceil(need - Math.min(credit[m.key] ?? 0, target * MAX_CREDIT_SHARE)),
    );
    const allowed = themes
      .map((t, i) => (m.cat === "core" || t.cats.includes(m.cat) || t.muscles?.includes(m.key) ? i : -1))
      .filter((i) => i >= 0);
    if (!allowed.length) {
      warnings.push(`${m.label} doesn't fit this ${n}-day layout.`);
      continue;
    }
    const base = m.large ? (direct >= 16 ? 3 : direct >= 8 ? 2 : 1) : direct >= 8 ? 2 : 1;
    const f = Math.min(Math.max(base, Math.ceil(direct / MAX_SESSION_SETS)), allowed.length, n);

    // pick the evenly spaced day subset that lands on the lightest days
    let bestDays: number[] = [];
    let bestLoad = Infinity;
    for (let s = 0; s < allowed.length; s++) {
      const picks = [...new Set(Array.from({ length: f }, (_, k) => allowed[(s + Math.floor((k * allowed.length) / f)) % allowed.length]))];
      const l = picks.reduce((a, d) => a + load[d], 0);
      if (picks.length === f && l < bestLoad) {
        bestLoad = l;
        bestDays = picks;
      }
    }
    bestDays.sort((a, b) => a - b);

    bestDays.forEach((d, si) => {
      const sets = Math.floor(direct / f) + (si < direct % f ? 1 : 0);
      if (sets <= 0) return;
      const k = sets <= 3 ? 1 : sets <= 7 ? 2 : 3;
      const chosenEquip: Record<string, number> = {};
      for (let j = 0; j < k; j++) {
        const avail = ranked.get(m.key)!.filter((e) => !used.has(e.id));
        if (!avail.length) break;
        let pick = avail[0];
        let top = -Infinity;
        for (const e of avail.slice(0, 12)) {
          const s2 = e.score - 0.6 * (chosenEquip[e.equipment] ?? 0);
          if (s2 > top) {
            top = s2;
            pick = e;
          }
        }
        used.add(pick.id);
        chosenEquip[pick.equipment] = (chosenEquip[pick.equipment] ?? 0) + 1;
        const share = Math.floor(sets / k) + (j < sets % k ? 1 : 0);
        if (share <= 0) continue;
        dayslots[d].push({
          muscle: m.key,
          ex: pick,
          sets: share,
          rest: pick.compound ? P.compRest : P.isoRest,
          reps: pick.compound ? P.comp[0] : P.iso[0],
        });
        load[d] += share;
        for (const s of pick.indirect) credit[s] = (credit[s] ?? 0) + INDIRECT_CREDIT * share;
      }
    });
  }

  const achievedOf = (muscle: string) => {
    let direct = 0;
    let indirect = 0;
    for (const day of dayslots)
      for (const s of day) {
        if ((s.lift ? s.ex.target : s.muscle) === muscle) direct += s.sets;
        else if (s.ex.indirect.includes(muscle)) indirect += INDIRECT_CREDIT * s.sets;
      }
    return direct + Math.min(indirect, (targets[muscle] ?? 0) * MAX_CREDIT_SHARE);
  };

  // trim each over-long day, taking sets from the muscles that are furthest ahead of target
  for (const [di, day] of dayslots.entries()) {
    while (day.length && dayMinutes(day) > limit) {
      let vi = -1;
      let vScore = -Infinity;
      day.forEach((s, i) => {
        const frac = s.lift ? 0 : achievedOf(s.muscle) / (targets[s.muscle] || 1);
        const sc = frac * 10 + (s.ex.compound ? 0 : 1) + i * 0.01;
        if (sc > vScore) {
          vScore = sc;
          vi = i;
        }
      });
      if (day.length === 1 && day[0].sets <= MIN_SETS) break;
      if (day[vi].sets > MIN_SETS) day[vi].sets--;
      else day.splice(vi, 1);
    }
    if (dayMinutes(day) > limit) warnings.push(`${themes[di].name} can't fit in ${limit} min.`);
  }

  // order within a day: big muscles and compounds first
  const rank = (s: Slot) =>
    s.lift ? STRENGTH_LIFTS.findIndex((l) => l.key === s.muscle) - 100 : order.findIndex((m) => m.key === s.muscle) + (s.ex.compound ? 0 : 100);
  const kept = themes
    .map((t, i) => ({ t, slots: dayslots[i].sort((a, b) => rank(a) - rank(b)) }))
    .filter((d) => d.slots.length);
  if (kept.length < themes.length) warnings.push(`Dropped ${themes.length - kept.length} empty training day(s).`);

  const pattern = WEEKDAY_PATTERN[kept.length] ?? [];
  const days: ProgramDay[] = kept.map((d, i) => ({
    name: d.t.name,
    weekday: pattern[i] ?? null,
    items: d.slots.map<ProgramItem>((s) => ({
      exerciseId: s.ex.id,
      sets: s.sets,
      reps: s.reps,
      restSec: s.rest,
    })),
  }));

  const liftSummary: MuscleSummary[] = placed.map(({ l, sets }) => ({
    muscle: l.key,
    label: l.label,
    target: sets,
    achieved: dayslots.reduce((a, d) => a + d.reduce((b, sl) => b + (sl.muscle === l.key ? sl.sets : 0), 0), 0),
  }));
  const summary: MuscleSummary[] = MUSCLES.filter((m) => targets[m.key]).map((m) => ({
    muscle: m.key,
    target: targets[m.key],
    achieved: Math.round(achievedOf(m.key) * 2) / 2,
  }));
  for (const s of summary)
    if (s.achieved < s.target * 0.85 && !warnings.some((w) => w.toLowerCase().includes(MUSCLE_BY_KEY.get(s.muscle)!.label.toLowerCase())))
      warnings.push(
        `${MUSCLE_BY_KEY.get(s.muscle)!.label}: ${s.achieved} of ${s.target} weekly sets fit. Add training days or session time to reach it.`,
      );

  for (const s of liftSummary)
    if (s.achieved < s.target) warnings.push(`${s.label}: ${s.achieved} of ${s.target} weekly sets fit. Add training days or session time to reach it.`);

  return { days, minutes: kept.map((d) => dayMinutes(d.slots)), summary: [...liftSummary, ...summary], warnings };
}
