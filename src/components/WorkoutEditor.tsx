"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "./api";
import ExercisePicker, { fetchLastSets } from "./ExercisePicker";
import type { ExerciseMeta } from "@/lib/exercises";
import type { Workout } from "@/lib/workouts";
import type { PRType } from "@/lib/pr";
import { toDisplay, toKg, type Unit } from "@/lib/units";

type SetState = { weight: string; reps: string; done: boolean; target: string | null };
type ExState = { exerciseId: string; sets: SetState[] };
type Prev = { weight: number | null; reps: number | null }[];

const PR_LABEL: Record<PRType, string> = { weight: "Weight PR", e1rm: "1RM PR", reps: "Rep PR" };

function fromWorkout(w: Workout, unit: Unit): ExState[] {
  return w.exercises.map((e) => ({
    exerciseId: e.exerciseId,
    sets: e.sets.map((s) => ({
      weight: s.weight === null ? "" : String(toDisplay(s.weight, unit)),
      reps: s.reps === null ? "" : String(s.reps),
      done: s.done,
      target: s.target,
    })),
  }));
}

const num = (s: string) => {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export default function WorkoutEditor({
  workout,
  meta: initialMeta,
  previous: initialPrev,
  prs: initialPrs,
  unit,
  targets,
}: {
  workout: Workout;
  meta: Record<string, ExerciseMeta>;
  previous: Record<string, Prev>;
  prs: Record<number, PRType[]>;
  unit: Unit;
  targets: string[];
}) {
  const router = useRouter();
  const [name, setName] = useState(workout.name);
  const [notes, setNotes] = useState(workout.notes);
  const [date, setDate] = useState(workout.date);
  const [exs, setExs] = useState<ExState[]>(() => fromWorkout(workout, unit));
  const [meta, setMeta] = useState(initialMeta);
  const [prev, setPrev] = useState(initialPrev);
  const [prFlags, setPrFlags] = useState<Record<string, PRType[]>>(() => {
    const m: Record<string, PRType[]> = {};
    workout.exercises.forEach((e, i) =>
      e.sets.forEach((s, j) => {
        if (initialPrs[s.id]) m[`${i}:${j}`] = initialPrs[s.id];
      }),
    );
    return m;
  });
  const [picker, setPicker] = useState(false);
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const [errMsg, setErrMsg] = useState("");
  const finished = !!workout.finishedAt;

  const payload = useCallback(
    (fin: boolean) => ({
      name,
      notes,
      date,
      finished: fin,
      exercises: exs.map((e) => ({
        exerciseId: e.exerciseId,
        sets: e.sets.map((s) => {
          const w = num(s.weight);
          const r = num(s.reps);
          return {
            weight: w === null ? null : toKg(w, unit),
            reps: r === null ? null : Math.round(r),
            done: s.done,
            target: s.target,
          };
        }),
      })),
    }),
    [name, notes, date, exs, unit],
  );

  // Autosave: debounce edits, never run two saves at once.
  const latest = useRef(payload);
  useEffect(() => {
    latest.current = payload;
  }, [payload]);
  const dirty = useRef(false);
  const inFlight = useRef(false);
  const finishing = useRef(false);

  const save = useCallback(
    async (fin: boolean, keepalive = false) => {
      if (inFlight.current) {
        dirty.current = true;
        return;
      }
      inFlight.current = true;
      dirty.current = false;
      setStatus("saving");
      try {
        const r = await api<{ workout: Workout; prs: Record<number, PRType[]> }>(
          `/api/workouts/${workout.id}`,
          "PUT",
          latest.current(fin),
          keepalive,
        );
        const m: Record<string, PRType[]> = {};
        r.workout.exercises.forEach((e, i) =>
          e.sets.forEach((s, j) => {
            if (r.prs[s.id]) m[`${i}:${j}`] = r.prs[s.id];
          }),
        );
        setPrFlags(m);
        setStatus("saved");
        setErrMsg("");
      } catch (e) {
        setStatus("error");
        setErrMsg((e as Error).message);
      } finally {
        inFlight.current = false;
        if (dirty.current && !finishing.current) void save(false);
      }
    },
    [workout.id],
  );

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setStatus("saving");
    const t = setTimeout(() => void save(finished), 700);
    return () => clearTimeout(t);
  }, [name, notes, date, exs, save, finished]);

  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && status !== "saved" && void save(finished, true);
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [save, status, finished]);

  const setSet = (i: number, j: number, patch: Partial<SetState>) =>
    setExs((xs) => xs.map((e, a) => (a !== i ? e : { ...e, sets: e.sets.map((s, b) => (b !== j ? s : { ...s, ...patch })) })));

  const addSet = (i: number) =>
    setExs((xs) =>
      xs.map((e, a) => {
        if (a !== i) return e;
        const last = e.sets[e.sets.length - 1];
        return { ...e, sets: [...e.sets, { weight: last?.weight ?? "", reps: last?.reps ?? "", done: false, target: last?.target ?? null }] };
      }),
    );

  const removeSet = (i: number, j: number) =>
    setExs((xs) => xs.map((e, a) => (a !== i ? e : { ...e, sets: e.sets.filter((_, b) => b !== j) })).filter((e) => e.sets.length));

  const move = (i: number, d: -1 | 1) =>
    setExs((xs) => {
      const k = i + d;
      if (k < 0 || k >= xs.length) return xs;
      const c = [...xs];
      [c[i], c[k]] = [c[k], c[i]];
      return c;
    });

  async function addExercise(e: ExerciseMeta) {
    setPicker(false);
    setMeta((m) => ({ ...m, [e.id]: e }));
    const last = await fetchLastSets(e.id);
    setPrev((p) => ({ ...p, [e.id]: last }));
    const rows = last.length ? last : [{ weight: null, reps: null }, { weight: null, reps: null }, { weight: null, reps: null }];
    setExs((xs) => [
      ...xs,
      {
        exerciseId: e.id,
        sets: rows.map((r) => ({
          weight: r.weight === null ? "" : String(toDisplay(r.weight, unit)),
          reps: r.reps === null ? "" : String(r.reps),
          done: false,
          target: null,
        })),
      },
    ]);
  }

  async function finish() {
    finishing.current = true;
    // wait for any in-flight save, then write the final state
    while (inFlight.current) await new Promise((r) => setTimeout(r, 50));
    await save(true);
    finishing.current = false;
    router.push("/workouts");
    router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this workout?")) return;
    await api(`/api/workouts/${workout.id}`, "DELETE");
    router.push("/workouts");
    router.refresh();
  }

  const doneSets = exs.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const totalSets = exs.reduce((n, e) => n + e.sets.length, 0);

  return (
    <div className="mx-auto w-full max-w-2xl p-4">
      <div className="mb-1 flex items-center justify-between text-sm">
        <Link href="/workouts" className="muted">
          ← Workouts
        </Link>
        <span className={status === "error" ? "text-red-600" : "muted"} role="status">
          {status === "saving" ? "Saving…" : status === "error" ? `Not saved: ${errMsg}` : "Saved"}
        </span>
      </div>
      <input
        className="input mb-2 border-transparent bg-transparent px-0 text-2xl font-bold sm:text-2xl"
        placeholder="Workout name"
        aria-label="Workout name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="mb-4 flex items-center gap-3 text-sm">
        <input type="date" className="input w-auto" aria-label="Date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <span className="muted">
          {doneSets}/{totalSets} sets · {unit}
        </span>
        {finished && <span className="rounded-full bg-emerald-600/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">Finished</span>}
      </div>

      <div className="space-y-4">
        {exs.map((e, i) => {
          const m = meta[e.exerciseId];
          return (
            <section key={`${e.exerciseId}-${i}`} className="card p-3">
              <div className="mb-2 flex items-center gap-3">
                {m && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.image} alt="" width={48} height={48} className="h-12 w-12 rounded-md bg-stone-200 object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <Link href={`/exercises/${e.exerciseId}`} className="block truncate font-semibold capitalize">
                    {m?.name ?? e.exerciseId}
                  </Link>
                  <p className="muted truncate text-xs">{m && `${m.target} · ${m.equipment}`}</p>
                </div>
                <button className="btn px-2" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                  ↑
                </button>
                <button className="btn px-2" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === exs.length - 1}>
                  ↓
                </button>
              </div>
              <div className="muted grid grid-cols-[2rem_1fr_4.5rem_4rem_2.5rem] items-center gap-2 px-1 text-xs">
                <span>Set</span>
                <span>Previous</span>
                <span>{unit}</span>
                <span>Reps</span>
                <span />
              </div>
              {e.sets.map((s, j) => {
                const p = prev[e.exerciseId]?.[j];
                const flags = prFlags[`${i}:${j}`];
                return (
                  <div key={j} className="mt-1">
                    <div
                      className={`grid grid-cols-[2rem_1fr_4.5rem_4rem_2.5rem] items-center gap-2 rounded-lg px-1 py-0.5 ${
                        s.done ? "bg-emerald-600/10" : ""
                      }`}
                    >
                      <button className="muted text-sm" onClick={() => removeSet(i, j)} aria-label={`Remove set ${j + 1}`} title="Remove set">
                        {j + 1}
                      </button>
                      <span className="muted truncate text-xs">
                        {p ? `${p.weight ? toDisplay(p.weight, unit) : "BW"} × ${p.reps ?? "–"}` : (s.target ? `${s.target} reps` : "–")}
                      </span>
                      <input
                        className="input px-2 text-center"
                        inputMode="decimal"
                        aria-label={`Set ${j + 1} weight`}
                        placeholder="BW"
                        value={s.weight}
                        onChange={(ev) => setSet(i, j, { weight: ev.target.value })}
                      />
                      <input
                        className="input px-2 text-center"
                        inputMode="numeric"
                        aria-label={`Set ${j + 1} reps`}
                        placeholder={s.target ?? ""}
                        value={s.reps}
                        onChange={(ev) => setSet(i, j, { reps: ev.target.value.replace(/\D/g, "") })}
                      />
                      <button
                        className={`btn px-0 ${s.done ? "btn-primary" : ""}`}
                        aria-label={`Set ${j + 1} done`}
                        aria-pressed={s.done}
                        onClick={() => setSet(i, j, { done: !s.done })}
                      >
                        ✓
                      </button>
                    </div>
                    {flags && s.done && (
                      <p className="px-1 text-xs font-medium text-amber-600 dark:text-amber-400">🏆 {flags.map((f) => PR_LABEL[f]).join(" · ")}</p>
                    )}
                  </div>
                );
              })}
              <button className="btn mt-2 w-full" onClick={() => addSet(i)}>
                + Add set
              </button>
            </section>
          );
        })}
      </div>

      <button className="btn mt-4 w-full" onClick={() => setPicker(true)}>
        + Add exercise
      </button>

      <textarea
        className="input mt-4 min-h-20"
        placeholder="Notes"
        aria-label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="mt-4 flex gap-2">
        {!finished && (
          <button className="btn btn-primary flex-1" onClick={finish}>
            Finish workout
          </button>
        )}
        {finished && (
          <button className="btn btn-primary flex-1" onClick={() => router.push("/workouts")}>
            Done
          </button>
        )}
        <button className="btn btn-danger" onClick={remove}>
          Delete
        </button>
      </div>

      {picker && <ExercisePicker targets={targets} onPick={addExercise} onClose={() => setPicker(false)} />}
    </div>
  );
}
