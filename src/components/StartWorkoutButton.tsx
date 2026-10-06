"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";

/** Creates a workout (optionally from a split day) and opens it. */
export default function StartWorkoutButton({
  splitId,
  dayIndex,
  label = "Start workout",
  primary = true,
}: {
  splitId?: number;
  dayIndex?: number;
  label?: string;
  primary?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setBusy(true);
    setError("");
    try {
      const date = new Intl.DateTimeFormat("en-CA").format(new Date());
      const { id } = await api<{ id: number }>("/api/workouts", "POST", { date, splitId, dayIndex });
      router.push(`/workouts/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <button className={`btn ${primary ? "btn-primary" : ""}`} onClick={start} disabled={busy}>
        {busy ? "Starting…" : label}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </>
  );
}
