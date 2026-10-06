"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";
import { EQUIPMENT_GROUPS, EQUIPMENT_PRESETS, MUSCLES, groupsToValues, muscleLabel } from "@/lib/muscles";
import { WEEKDAYS, type ProgramDay } from "@/lib/program";
import type { ExerciseMeta } from "@/lib/exercises";
import type { Goal, MuscleSummary } from "@/lib/generator";

type Result = {
  days: ProgramDay[];
  minutes: number[];
  summary: MuscleSummary[];
  warnings: string[];
  meta: Record<string, ExerciseMeta>;
};

const VOLUME_PRESETS = [
  { label: "Light", mult: 0.6 },
  { label: "Moderate", mult: 1 },
  { label: "High", mult: 1.4 },
];

const GOALS: { value: Goal; label: string }[] = [
  { value: "strength", label: "Strength (low reps)" },
  { value: "hypertrophy", label: "Muscle growth" },
  { value: "endurance", label: "Endurance (high reps)" },
];

export default function GenerateForm() {
  const router = useRouter();
  const [targets, setTargets] = useState<Record<string, number>>(() => Object.fromEntries(MUSCLES.map((m) => [m.key, m.def])));
  const [days, setDays] = useState(4);
  const [minutes, setMinutes] = useState(60);
  const [groups, setGroups] = useState<string[]>(EQUIPMENT_PRESETS[0].groups);
  const [goal, setGoal] = useState<Goal>("hypertrophy");
  const [seed, setSeed] = useState(1);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const totalSets = Object.values(targets).reduce((a, b) => a + b, 0);

  async function generate(nextSeed = seed) {
    setBusy(true);
    setError("");
    try {
      setResult(
        await api<Result>("/api/generate", "POST", {
          targets,
          days,
          minutes,
          equipment: groupsToValues(groups),
          goal,
          seed: nextSeed,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!result) return;
    setBusy(true);
    try {
      const name = `${days}-day ${GOALS.find((g) => g.value === goal)!.label.split(" (")[0].toLowerCase()} program`;
      const { id } = await api<{ id: number }>("/api/splits", "POST", { name, days: result.days });
      router.push(`/splits/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <h1 className="text-2xl font-bold">Program generator</h1>

      <section className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Weekly sets per muscle</h2>
          <div className="flex gap-1">
            {VOLUME_PRESETS.map((p) => (
              <button
                key={p.label}
                className="btn min-h-8 px-2 py-1 text-xs"
                onClick={() => setTargets(Object.fromEntries(MUSCLES.map((m) => [m.key, Math.round(m.def * p.mult)])))}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          {MUSCLES.map((m) => (
            <div key={m.key} className="flex items-center justify-between gap-2">
              <label htmlFor={`t-${m.key}`} className="text-sm">
                {m.label}
              </label>
              <div className="flex items-center gap-1">
                <button className="btn w-9 px-0" aria-label={`Fewer ${m.label} sets`} onClick={() => setTargets((t) => ({ ...t, [m.key]: Math.max(0, t[m.key] - 1) }))}>
                  −
                </button>
                <input
                  id={`t-${m.key}`}
                  className="input w-14 px-1 text-center"
                  inputMode="numeric"
                  value={targets[m.key]}
                  onChange={(e) => setTargets((t) => ({ ...t, [m.key]: Math.min(60, Number(e.target.value.replace(/\D/g, "")) || 0) }))}
                />
                <button className="btn w-9 px-0" aria-label={`More ${m.label} sets`} onClick={() => setTargets((t) => ({ ...t, [m.key]: Math.min(60, t[m.key] + 1) }))}>
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="muted mt-3 text-xs">{totalSets} sets per week in total. Set a muscle to 0 to skip it.</p>
      </section>

      <section className="card space-y-4 p-4">
        <div>
          <h2 className="mb-2 font-semibold">Training days per week</h2>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button key={n} className={`btn flex-1 px-0 ${days === n ? "btn-primary" : ""}`} aria-pressed={days === n} onClick={() => setDays(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="minutes" className="mb-2 block font-semibold">
            Time per session: {minutes} min
          </label>
          <input id="minutes" type="range" min={20} max={120} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="w-full accent-emerald-600" />
        </div>
        <div>
          <label htmlFor="goal" className="mb-2 block font-semibold">
            Goal
          </label>
          <select id="goal" className="input" value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
            {GOALS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="card p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Equipment</h2>
          <div className="flex flex-wrap gap-1">
            {EQUIPMENT_PRESETS.map((p) => (
              <button key={p.label} className="btn min-h-8 px-2 py-1 text-xs" onClick={() => setGroups(p.groups)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {EQUIPMENT_GROUPS.map((g) => (
            <label key={g.key} className="flex min-h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-600"
                checked={groups.includes(g.key)}
                onChange={(e) => setGroups((gs) => (e.target.checked ? [...gs, g.key] : gs.filter((x) => x !== g.key)))}
              />
              {g.label}
            </label>
          ))}
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        className="btn btn-primary w-full"
        disabled={busy || groups.length === 0 || totalSets === 0}
        onClick={() => {
          setSeed(1);
          void generate(1);
        }}
      >
        {busy && !result ? "Generating…" : "Generate program"}
      </button>

      {result && (
        <section className="space-y-4" aria-live="polite">
          <h2 className="text-xl font-bold">Your program</h2>
          {result.warnings.length > 0 && (
            <ul className="space-y-1 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              {result.warnings.map((w, i) => (
                <li key={i}>⚠ {w}</li>
              ))}
            </ul>
          )}
          {result.days.map((d, i) => (
            <div key={i} className="card p-3">
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="font-semibold">
                  {d.weekday !== null && <span className="muted mr-2 text-sm font-normal">{WEEKDAYS[d.weekday]}</span>}
                  {d.name}
                </h3>
                <span className="muted text-sm">~{result.minutes[i]} min</span>
              </div>
              <ul className="space-y-1 text-sm">
                {d.items.map((it, k) => (
                  <li key={k} className="flex justify-between gap-2">
                    <span className="truncate capitalize">
                      {result.meta[it.exerciseId]?.name}
                      <span className="muted"> · {muscleLabel(result.meta[it.exerciseId]?.target ?? "")}</span>
                    </span>
                    <span className="muted shrink-0">
                      {it.sets} × {it.reps}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="card p-3">
            <h3 className="mb-2 font-semibold">Weekly volume</h3>
            <ul className="space-y-2 text-sm">
              {result.summary.map((s) => (
                <li key={s.muscle}>
                  <div className="flex justify-between">
                    <span>{muscleLabel(s.muscle)}</span>
                    <span className="muted">
                      {s.achieved} / {s.target}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
                    <div className="h-full bg-emerald-600" style={{ width: `${Math.min(100, (s.achieved / s.target) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="muted mt-2 text-xs">Sets where a muscle assists (e.g. triceps in a bench press) count as half a set, up to half the target.</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" onClick={save} disabled={busy}>
              Save as split
            </button>
            <button
              className="btn"
              disabled={busy}
              onClick={() => {
                setSeed(seed + 1);
                void generate(seed + 1);
              }}
            >
              Shuffle exercises
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
