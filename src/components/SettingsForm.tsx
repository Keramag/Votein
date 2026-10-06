"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";
import type { Unit } from "@/lib/units";

export default function SettingsForm({ unit, syncKey }: { unit: Unit; syncKey: string | null }) {
  const router = useRouter();
  const [u, setU] = useState(unit);
  const [key, setKey] = useState("");
  const [shown, setShown] = useState(false);
  const [msg, setMsg] = useState("");

  async function setUnit(next: Unit) {
    setU(next);
    try {
      await api("/api/me", "PUT", { unit: next });
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function restore() {
    try {
      await api("/api/sync", "POST", { key: key.trim() });
      setMsg("Switched to that profile.");
      setKey("");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <section className="card p-4">
        <h2 className="mb-2 font-semibold">Weight unit</h2>
        <div className="flex gap-2">
          {(["kg", "lb"] as const).map((x) => (
            <button key={x} className={`btn flex-1 ${u === x ? "btn-primary" : ""}`} aria-pressed={u === x} onClick={() => void setUnit(x)}>
              {x}
            </button>
          ))}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="mb-1 font-semibold">Sync across devices</h2>
        <p className="muted mb-3 text-sm">
          There are no accounts. This browser holds a secret key that identifies your data. Copy it to another device to see the same workouts. Anyone with the key can view and edit your data, so keep it private.
        </p>
        {syncKey ? (
          <div className="mb-3 flex gap-2">
            <input readOnly className="input font-mono" value={shown ? syncKey : "•".repeat(24)} aria-label="Sync key" onFocus={(e) => e.currentTarget.select()} />
            <button className="btn" onClick={() => setShown(!shown)}>
              {shown ? "Hide" : "Show"}
            </button>
          </div>
        ) : (
          <p className="muted mb-3 text-sm">A key is created when you save your first workout or split.</p>
        )}
        <div className="flex gap-2">
          <input className="input font-mono" placeholder="Paste a key from another device" value={key} onChange={(e) => setKey(e.target.value)} />
          <button className="btn" disabled={key.trim().length < 10} onClick={restore}>
            Use key
          </button>
        </div>
        <p className="muted mt-2 text-xs">Using another key replaces this browser&apos;s link to its current data.</p>
      </section>
      {msg && <p className="text-sm" role="status">{msg}</p>}
    </div>
  );
}
