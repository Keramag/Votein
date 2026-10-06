"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "./api";
import ExercisePicker from "./ExercisePicker";
import type { ExerciseMeta } from "@/lib/exercises";
import { WEEKDAYS, type SplitData } from "@/lib/program";

export default function SplitEditor({
  id,
  initial,
  meta: initialMeta,
  active,
  targets,
}: {
  id?: number;
  initial: SplitData;
  meta: Record<string, ExerciseMeta>;
  active?: boolean;
  targets: string[];
}) {
  const router = useRouter();
  const [split, setSplit] = useState<SplitData>(initial);
  const [meta, setMeta] = useState(initialMeta);
  const [pickerDay, setPickerDay] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const edit = (fn: (s: SplitData) => SplitData) => {
    setSplit(fn);
    setSaved(false);
  };
  const editDay = (d: number, patch: Partial<SplitData["days"][number]>) =>
    edit((s) => ({ ...s, days: s.days.map((x, i) => (i === d ? { ...x, ...patch } : x)) }));
  const editItem = (d: number, k: number, patch: Partial<SplitData["days"][number]["items"][number]>) =>
    editDay(d, { items: split.days[d].items.map((it, i) => (i === k ? { ...it, ...patch } : it)) });

  async function save() {
    setBusy(true);
    setError("");
    try {
      if (id) {
        await api(`/api/splits/${id}`, "PUT", split);
        setSaved(true);
        router.refresh();
      } else {
        const r = await api<{ id: number }>("/api/splits", "POST", split);
        router.replace(`/splits/${r.id}`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function activate() {
    setBusy(true);
    try {
      await api(`/api/splits/${id}/activate`, "POST");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this split?")) return;
    await api(`/api/splits/${id}`, "DELETE");
    router.push("/splits");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-4">
      <Link href="/splits" className="muted text-sm">
        ← Splits
      </Link>
      <input
        className="input mb-4 mt-2 border-transparent bg-transparent px-0 text-2xl font-bold sm:text-2xl"
        aria-label="Split name"
        placeholder="Split name"
        value={split.name}
        onChange={(e) => edit((s) => ({ ...s, name: e.target.value }))}
      />

      <div className="space-y-4">
        {split.days.map((day, d) => (
          <section key={d} className="card p-3">
            <div className="mb-2 flex items-center gap-2">
              <input
                className="input font-semibold"
                aria-label={`Day ${d + 1} name`}
                value={day.name}
                onChange={(e) => editDay(d, { name: e.target.value })}
              />
              <select
                className="input w-24 shrink-0"
                aria-label={`Day ${d + 1} weekday`}
                value={day.weekday ?? ""}
                onChange={(e) => editDay(d, { weekday: e.target.value === "" ? null : Number(e.target.value) })}
              >
                <option value="">Any</option>
                {WEEKDAYS.map((w, i) => (
                  <option key={w} value={i}>
                    {w}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-danger px-2"
                aria-label={`Remove day ${d + 1}`}
                onClick={() => edit((s) => ({ ...s, days: s.days.filter((_, i) => i !== d) }))}
                disabled={split.days.length <= 1}
              >
                ✕
              </button>
            </div>
            <ul className="space-y-2">
              {day.items.map((it, k) => (
                <li key={`${it.exerciseId}-${k}`} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm capitalize">{meta[it.exerciseId]?.name ?? it.exerciseId}</span>
                  <input
                    className="input w-14 px-1 text-center"
                    inputMode="numeric"
                    aria-label="Sets"
                    value={it.sets}
                    onChange={(e) => editItem(d, k, { sets: Math.min(20, Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1)) })}
                  />
                  <span className="muted text-xs">×</span>
                  <input
                    className="input w-20 px-1 text-center"
                    aria-label="Reps"
                    value={it.reps}
                    maxLength={12}
                    onChange={(e) => editItem(d, k, { reps: e.target.value })}
                  />
                  <button
                    className="btn px-2"
                    aria-label="Move up"
                    disabled={k === 0}
                    onClick={() => {
                      const items = [...day.items];
                      [items[k - 1], items[k]] = [items[k], items[k - 1]];
                      editDay(d, { items });
                    }}
                  >
                    ↑
                  </button>
                  <button
                    className="btn btn-danger px-2"
                    aria-label="Remove exercise"
                    onClick={() => editDay(d, { items: day.items.filter((_, i) => i !== k) })}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <button className="btn mt-3 w-full" onClick={() => setPickerDay(d)}>
              + Add exercise
            </button>
          </section>
        ))}
      </div>

      {split.days.length < 7 && (
        <button
          className="btn mt-4 w-full"
          onClick={() => edit((s) => ({ ...s, days: [...s.days, { name: `Day ${s.days.length + 1}`, weekday: null, items: [] }] }))}
        >
          + Add day
        </button>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn btn-primary flex-1" onClick={save} disabled={busy || !split.name.trim()}>
          {saved ? "Saved ✓" : id ? "Save changes" : "Create split"}
        </button>
        {id && !active && (
          <button className="btn" onClick={activate} disabled={busy}>
            Make active
          </button>
        )}
        {id && (
          <button className="btn btn-danger" onClick={remove}>
            Delete
          </button>
        )}
      </div>
      {id && active && <p className="muted mt-2 text-sm">This is your active split — it drives the Today page.</p>}

      {pickerDay !== null && (
        <ExercisePicker
          targets={targets}
          onClose={() => setPickerDay(null)}
          onPick={(e) => {
            setMeta((m) => ({ ...m, [e.id]: e }));
            editDay(pickerDay, { items: [...split.days[pickerDay].items, { exerciseId: e.id, sets: 3, reps: "8-12", restSec: 90 }] });
            setPickerDay(null);
          }}
        />
      )}
    </div>
  );
}
