// Program generator: weekly volume targets + days + session time + equipment -> weekly program.
// Pure and deterministic for a given seed; takes the exercise pool as an argument.
import { MUSCLES, MUSCLE_BY_KEY, secondaryMuscles, type Category } from "./muscles.ts";
import type { ProgramDay, ProgramItem } from "./program.ts";

export type Goal = "strength" | "hypertrophy" | "endurance";

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
  seed?: number;
};

export type MuscleSummary = {
  muscle: string;
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

const PARAMS: Record<Goal, { comp: [string, number]; iso: [string, number]; compRest: number; isoRest: number }> = {
  strength: { comp: ["4-6", 0], iso: ["8-12", 0], compRest: 180, isoRest: 120 },
  hypertrophy: { comp: ["6-10", 0], iso: ["10-15", 0], compRest: 120, isoRest: 75 },
  endurance: { comp: ["12-15", 0], iso: ["15-20", 0], compRest: 60, isoRest: 45 },
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

type Slot = { muscle: string; ex: Scored; sets: number; rest: number; reps: string };

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

export function generateProgram(input: GenInput, pool: PoolExercise[]): Program {
  const goal = input.goal ?? "hypertrophy";
  const P = PARAMS[goal];
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

  const order = [...MUSCLES].sort((a, b) => Number(b.large) - Number(a.large));
  for (const m of order) {
    const target = targets[m.key];
    if (!target) continue;
    const list = (ranked.get(m.key) ?? []).filter((e) => !used.has(e.id));
    if (!list.length) {
      warnings.push(`No ${m.label.toLowerCase()} exercise available with the selected equipment.`);
      continue;
    }

    const direct = Math.max(
      MIN_SETS,
      Math.ceil(target - Math.min(credit[m.key] ?? 0, target * MAX_CREDIT_SHARE)),
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
        if (s.muscle === muscle) direct += s.sets;
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
        const frac = achievedOf(s.muscle) / (targets[s.muscle] || 1);
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
  const rank = (s: Slot) => order.findIndex((m) => m.key === s.muscle) + (s.ex.compound ? 0 : 100);
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

  return { days, minutes: kept.map((d) => dayMinutes(d.slots)), summary, warnings };
}
