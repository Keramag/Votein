"use client";

import { useEffect, useState } from "react";
import { api } from "./api";
import type { ExerciseMeta } from "@/lib/exercises";

type Result = { total: number; results: ExerciseMeta[] };

/** Bottom-sheet / modal exercise search. Calls onPick with the chosen exercise. */
export default function ExercisePicker({
  onPick,
  onClose,
  targets,
}: {
  onPick: (e: ExerciseMeta) => void;
  onClose: () => void;
  targets: string[];
}) {
  const [q, setQ] = useState("");
  const [target, setTarget] = useState("");
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      const params = new URLSearchParams({ q, target, limit: "40" });
      try {
        const res = await fetch(`/api/exercises?${params}`, { signal: ctl.signal });
        if (!res.ok) throw new Error();
        setData(await res.json());
        setError("");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("Couldn't load exercises");
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q, target]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Add exercise"
        className="card flex max-h-[85dvh] w-full max-w-lg flex-col rounded-b-none sm:rounded-b-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-stone-200 p-3 dark:border-stone-800">
          <input
            autoFocus
            className="input"
            placeholder="Search exercises…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="input w-32 shrink-0" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Muscle">
            <option value="">All</option>
            {targets.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button className="btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <ul className="min-h-40 flex-1 divide-y divide-stone-100 overflow-y-auto dark:divide-stone-800">
          {error && <li className="p-4 text-sm text-red-600">{error}</li>}
          {data?.results.map((e) => (
            <li key={e.id}>
              <button
                className="flex w-full items-center gap-3 p-2 text-left hover:bg-stone-100 dark:hover:bg-stone-800"
                onClick={() => onPick(e)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.image} alt="" width={48} height={48} loading="lazy" className="h-12 w-12 rounded-md bg-stone-200 object-cover" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium capitalize">{e.name}</span>
                  <span className="muted block truncate text-xs">
                    {e.target} · {e.equipment}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {data && data.results.length === 0 && <li className="muted p-4 text-sm">No matches.</li>}
          {data && data.total > data.results.length && (
            <li className="muted p-3 text-center text-xs">
              Showing {data.results.length} of {data.total}. Refine your search.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

export async function fetchLastSets(exerciseId: string) {
  try {
    const r = await api<{ sets: { weight: number | null; reps: number | null }[] }>(`/api/history/${exerciseId}`, "GET");
    return r.sets;
  } catch {
    return [];
  }
}
